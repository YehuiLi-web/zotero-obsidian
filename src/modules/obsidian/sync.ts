import { showHint, showHintWithLink } from "../../utils/hint";
import { getString } from "../../utils/locale";
import { getPref } from "../../utils/prefs";
import { fileExists, jointPath } from "../../utils/str";
import { setupObsidianDashboards } from "./dashboard";
import {
  ensureObsidianSettings,
  ManagedRepairCandidate,
  ObsidianSettings,
  ObsidianSyncScope,
} from "./settings";
import {
  getChildNoteBridgeConfig,
  getChildNoteDisplayTitle,
  getChildNoteExcludeMap,
  getTopItemPreferredTitle,
  normalizeChildNoteTag,
} from "./childNotes";
import { normalizeFrontmatterObject } from "./frontmatter";
import { findExistingObsidianNote, openObsidianNote } from "./paths";
import {
  getItemMapKey,
  getObsidianItemNoteMap,
  resolveObsidianItemTemplateName,
  setObsidianItemNoteMap,
} from "./settings";
import { cleanInline } from "./shared";
import {
  getChildNoteTags,
  getManagedObsidianFileName,
  getManagedObsidianFileNameFresh,
  getManagedObsidianSourceHash,
  getMatchedChildNotes,
  isManagedObsidianNote,
  persistChildNoteExclusions,
} from "./managed";

async function createObsidianNote(
  topItem: Zotero.Item,
  options: {
    skipNotifierSync?: boolean;
  } = {},
) {
  const noteItem = new Zotero.Item("note");
  noteItem.libraryID = topItem.libraryID;
  noteItem.parentID = topItem.id;
  await noteItem.saveTx({
    notifierData: options.skipNotifierSync
      ? {
          skipOB: true,
        }
      : undefined,
  });

  const templateName = resolveObsidianItemTemplateName();
  const renderedTemplate = await addon.api.template.runItemTemplate(
    templateName,
    {
      itemIds: [topItem.id],
      targetNoteId: noteItem.id,
    },
  );
  noteItem.setNote(renderedTemplate);
  await noteItem.saveTx({
    notifierData: options.skipNotifierSync
      ? {
          skipOB: true,
        }
      : undefined,
  });

  const itemNoteMap = getObsidianItemNoteMap();
  itemNoteMap[getItemMapKey(topItem)] = noteItem.key;
  setObsidianItemNoteMap(itemNoteMap);
  return noteItem;
}

type ManagedRecoveryCandidate = {
  topItem: Zotero.Item;
  filepath: string;
  mdStatus: MDStatus;
};

function shouldReplaceManagedRecoveryCandidate(
  currentCandidate: ManagedRecoveryCandidate,
  nextCandidate: ManagedRecoveryCandidate,
) {
  const currentModified = currentCandidate.mdStatus.lastmodify.getTime() || 0;
  const nextModified = nextCandidate.mdStatus.lastmodify.getTime() || 0;
  if (nextModified !== currentModified) {
    return nextModified > currentModified;
  }
  return nextCandidate.filepath.localeCompare(currentCandidate.filepath) > 0;
}

async function findManagedRecoveryCandidates(
  notesDir: string,
  topItems?: Zotero.Item[],
) {
  const candidates = new Map<string, ManagedRecoveryCandidate>();
  const allowedItemMapKeys = topItems?.length
    ? new Set(topItems.map((topItem) => getItemMapKey(topItem)))
    : null;
  const mdRegex = /\.(md|MD|Md|mD)$/;

  await Zotero.File.iterateDirectory(
    notesDir,
    async (entry: OS.File.Entry) => {
      if (entry.isDir) {
        const subDirCandidates = await findManagedRecoveryCandidates(
          entry.path,
          topItems,
        );
        for (const [itemMapKey, candidate] of subDirCandidates.entries()) {
          const currentCandidate = candidates.get(itemMapKey);
          if (
            !currentCandidate ||
            shouldReplaceManagedRecoveryCandidate(currentCandidate, candidate)
          ) {
            candidates.set(itemMapKey, candidate);
          }
        }
        return;
      }
      if (!mdRegex.test(entry.name)) {
        return;
      }

      const mdStatus = await addon.api.sync.getMDStatus(entry.path);
      const meta = normalizeFrontmatterObject(mdStatus.meta);
      if (!meta.bridge_managed) {
        return;
      }

      const libraryID = Number(meta.$libraryID || 0);
      const topItemKey = cleanInline(String(meta.zotero_key || ""));
      if (!libraryID || !topItemKey) {
        return;
      }

      const topItem = (await Zotero.Items.getByLibraryAndKeyAsync(
        libraryID,
        topItemKey,
      )) as Zotero.Item | false;
      if (!topItem || !topItem.isRegularItem()) {
        return;
      }

      const itemMapKey = getItemMapKey(topItem);
      if (allowedItemMapKeys && !allowedItemMapKeys.has(itemMapKey)) {
        return;
      }

      const referencedNoteKey = cleanInline(
        String(meta.zotero_note_key || meta.$itemKey || ""),
      );
      if (referencedNoteKey) {
        const referencedNote = Zotero.Items.getByLibraryAndKey(
          libraryID,
          referencedNoteKey,
        ) as Zotero.Item | false;
        if (
          referencedNote &&
          referencedNote.isNote() &&
          !referencedNote.deleted &&
          referencedNote.parentID === topItem.id
        ) {
          return;
        }
      }

      if (findExistingObsidianNote(topItem)) {
        return;
      }

      const nextCandidate = {
        topItem,
        filepath: entry.path,
        mdStatus,
      };
      const currentCandidate = candidates.get(itemMapKey);
      if (
        !currentCandidate ||
        shouldReplaceManagedRecoveryCandidate(currentCandidate, nextCandidate)
      ) {
        candidates.set(itemMapKey, nextCandidate);
      }
    },
  );

  return candidates;
}

async function recoverManagedObsidianNoteFromFile(
  candidate: ManagedRecoveryCandidate,
  settings: ObsidianSettings,
) {
  const existingNote = findExistingObsidianNote(candidate.topItem);
  if (existingNote) {
    return existingNote;
  }

  // Try to restore a trashed note instead of creating a new one
  const meta = normalizeFrontmatterObject(candidate.mdStatus.meta);
  const referencedNoteKey = cleanInline(
    String(meta.zotero_note_key || meta.$itemKey || ""),
  );
  let noteItem: Zotero.Item | undefined;
  if (referencedNoteKey) {
    const trashedNote = Zotero.Items.getByLibraryAndKey(
      candidate.topItem.libraryID,
      referencedNoteKey,
    ) as Zotero.Item | false;
    if (
      trashedNote &&
      trashedNote.isNote() &&
      trashedNote.deleted &&
      trashedNote.parentID === candidate.topItem.id
    ) {
      trashedNote.deleted = false;
      await trashedNote.saveTx({
        notifierData: { skipOB: true },
      });
      noteItem = trashedNote;
    }
  }

  if (!noteItem) {
    noteItem = await createObsidianNote(candidate.topItem, {
      skipNotifierSync: true,
    });
  }

  // Update the item-note map to point to the recovered/created note
  const itemNoteMap = getObsidianItemNoteMap();
  itemNoteMap[getItemMapKey(candidate.topItem)] = noteItem.key;
  setObsidianItemNoteMap(itemNoteMap);

  await addon.api.$import.fromMD(candidate.filepath, {
    noteId: noteItem.id,
    ignoreVersion: true,
    skipNotifierSync: true,
    historyReason: "managed-recovery",
    historyAction: "import",
  });
  await addon.api.$export.saveMD(candidate.filepath, noteItem.id, {
    keepNoteLink: false,
    withYAMLHeader: true,
    attachmentDir: settings.assetsDir,
    attachmentFolder: settings.attachmentFolder,
    recordHistory: false,
    historyReason: "managed-recovery-refresh",
  });
  return noteItem;
}

async function ensureManagedObsidianNote(
  topItem: Zotero.Item,
  settings: ObsidianSettings,
) {
  const existingNote = findExistingObsidianNote(topItem);
  if (existingNote) {
    return existingNote;
  }

  if (settings.notesDir && (await fileExists(settings.notesDir))) {
    const recoveryCandidate = (
      await findManagedRecoveryCandidates(settings.notesDir, [topItem])
    ).get(getItemMapKey(topItem));
    if (recoveryCandidate) {
      return recoverManagedObsidianNoteFromFile(recoveryCandidate, settings);
    }
  }

  return createObsidianNote(topItem);
}

async function maybeRenameLegacySyncedFile(
  noteItem: Zotero.Item,
  targetDir: string,
  desiredFilename: string,
) {
  if (!desiredFilename) {
    return desiredFilename;
  }
  const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
  const currentFilename = syncStatus.filename || "";
  if (
    syncStatus.path !== targetDir ||
    !currentFilename ||
    currentFilename === desiredFilename
  ) {
    return desiredFilename;
  }
  const currentPath = jointPath(syncStatus.path, currentFilename);
  const desiredPath = jointPath(targetDir, desiredFilename);
  if (!(await fileExists(currentPath)) || (await fileExists(desiredPath))) {
    return desiredFilename;
  }
  await Zotero.File.rename(currentPath, desiredFilename, {
    overwrite: false,
    unique: false,
  });
  return desiredFilename;
}

async function getManagedTargetPath(
  noteItem: Zotero.Item,
  settings: ObsidianSettings,
) {
  let filename =
    (await getManagedObsidianFileNameFresh(noteItem)) ||
    getManagedObsidianFileName(noteItem) ||
    (await addon.api.sync.getMDFileName(noteItem.id, settings.notesDir));
  filename = await maybeRenameLegacySyncedFile(
    noteItem,
    settings.notesDir,
    filename,
  );
  return jointPath(settings.notesDir, filename);
}

async function resolveManagedObsidianTargetPath(noteItem: Zotero.Item) {
  const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
  const syncedTargetPath =
    syncStatus.path && syncStatus.filename
      ? jointPath(syncStatus.path, syncStatus.filename)
      : "";
  if (syncedTargetPath && (await fileExists(syncedTargetPath))) {
    return syncedTargetPath;
  }

  const notesDir = String(getPref("obsidian.notesDir") || "").trim();
  if (!notesDir) {
    return "";
  }

  const managedFileName =
    (await getManagedObsidianFileNameFresh(noteItem)) ||
    getManagedObsidianFileName(noteItem) ||
    syncStatus.filename;
  if (!managedFileName) {
    return "";
  }

  const managedTargetPath = jointPath(notesDir, managedFileName);
  return (await fileExists(managedTargetPath)) ? managedTargetPath : "";
}

async function exportManagedObsidianNotes(
  noteItems: Zotero.Item[],
  targetFiles: string[],
  settings: ObsidianSettings,
) {
  if (settings.autoSync) {
    await addon.api.$export.syncMDBatch(
      settings.notesDir,
      noteItems.map((noteItem) => noteItem.id),
      undefined,
      {
        attachmentDir: settings.assetsDir,
        attachmentFolder: settings.attachmentFolder,
        historyReason: "obsidian-sync",
      },
    );
  } else {
    for (const [index, noteItem] of noteItems.entries()) {
      await addon.api.$export.saveMD(targetFiles[index], noteItem.id, {
        keepNoteLink: false,
        withYAMLHeader: true,
        attachmentDir: settings.assetsDir,
        attachmentFolder: settings.attachmentFolder,
        historyReason: "obsidian-sync",
      });
    }
  }

  if (settings.dashboardAutoSetup && settings.dashboardDir) {
    await setupObsidianDashboards({
      settings,
      quiet: true,
      openAfterSetup: false,
    });
  }
}

function getManagedMappedNoteItems() {
  const itemNoteMap = getObsidianItemNoteMap();
  const normalizedMap: Record<string, string> = {};
  const noteItems: Zotero.Item[] = [];

  for (const [itemMapKey, noteKey] of Object.entries(itemNoteMap)) {
    const [libraryIDText] = itemMapKey.split("/");
    const libraryID = Number(libraryIDText);
    if (!libraryID || !noteKey) {
      continue;
    }
    const noteItem = Zotero.Items.getByLibraryAndKey(libraryID, noteKey) as
      | Zotero.Item
      | false;
    if (
      !noteItem ||
      !noteItem.isNote() ||
      !noteItem.parentItem ||
      !noteItem.parentItem.isRegularItem()
    ) {
      continue;
    }
    normalizedMap[itemMapKey] = noteKey;
    noteItems.push(noteItem);
  }

  if (JSON.stringify(normalizedMap) !== JSON.stringify(itemNoteMap)) {
    setObsidianItemNoteMap(normalizedMap);
  }

  return noteItems;
}

function isManagedRepairCandidate(noteItem: Zotero.Item, mdStatus: MDStatus) {
  if (!noteItem?.isNote() || !noteItem.parentItem?.isRegularItem()) {
    return false;
  }
  const meta = normalizeFrontmatterObject(mdStatus.meta);
  if (!meta.bridge_managed) {
    return false;
  }
  const noteKey = cleanInline(String(meta.zotero_note_key || ""));
  const topItemKey = cleanInline(String(meta.zotero_key || ""));
  if (noteKey && noteKey !== noteItem.key) {
    return false;
  }
  if (topItemKey && topItemKey !== noteItem.parentItem.key) {
    return false;
  }
  return true;
}

function shouldReplaceManagedRepairCandidate(
  currentCandidate: ManagedRepairCandidate,
  nextCandidate: ManagedRepairCandidate,
) {
  if (
    (nextCandidate.syncStatus.lastsync || 0) !==
    (currentCandidate.syncStatus.lastsync || 0)
  ) {
    return (
      (nextCandidate.syncStatus.lastsync || 0) >
      (currentCandidate.syncStatus.lastsync || 0)
    );
  }
  if (nextCandidate.noteItem.version !== currentCandidate.noteItem.version) {
    return nextCandidate.noteItem.version > currentCandidate.noteItem.version;
  }
  return nextCandidate.noteItem.id > currentCandidate.noteItem.id;
}

async function repairObsidianManagedLinks(
  options: {
    quiet?: boolean;
  } = {},
) {
  const previousMap = { ...getObsidianItemNoteMap() };
  let existingManagedNotes = getManagedMappedNoteItems();
  const notesDir = String(getPref("obsidian.notesDir") || "").trim();
  const settings =
    notesDir && (await fileExists(notesDir))
      ? await ensureObsidianSettings()
      : null;
  let restoredSyncStatuses = 0;
  let scannedSyncFiles = 0;
  const recoveredStatuses: SyncStatus[] = [];
  let recreatedNotes = 0;

  if (notesDir && (await fileExists(notesDir))) {
    const foundStatuses = await addon.api.sync.findAllSyncedFiles(notesDir);
    scannedSyncFiles = foundStatuses.length;
    for (const status of foundStatuses) {
      const currentStatus = addon.api.sync.getSyncStatus(status.itemID);
      const changed =
        currentStatus.path !== status.path ||
        currentStatus.filename !== status.filename ||
        currentStatus.md5 !== status.md5 ||
        currentStatus.noteMd5 !== status.noteMd5 ||
        currentStatus.managedSourceHash !== status.managedSourceHash ||
        currentStatus.itemID !== status.itemID;
      addon.api.sync.updateSyncStatus(status.itemID, status);
      recoveredStatuses.push(status);
      if (changed) {
        restoredSyncStatuses += 1;
      }
    }
  }

  if (settings?.notesDir && (await fileExists(settings.notesDir))) {
    const recoveryCandidates = await findManagedRecoveryCandidates(
      settings.notesDir,
    );
    for (const candidate of recoveryCandidates.values()) {
      if (findExistingObsidianNote(candidate.topItem)) {
        continue;
      }
      const recoveredNote = await recoverManagedObsidianNoteFromFile(
        candidate,
        settings,
      );
      existingManagedNotes = [...existingManagedNotes, recoveredNote];
      recoveredStatuses.push(addon.api.sync.getSyncStatus(recoveredNote.id));
      restoredSyncStatuses += 1;
      recreatedNotes += 1;
    }
  }

  const candidateMap = new Map<string, ManagedRepairCandidate>();
  for (const noteItem of existingManagedNotes) {
    const topItem = noteItem.parentItem;
    if (!topItem?.isRegularItem()) {
      continue;
    }
    candidateMap.set(getItemMapKey(topItem), {
      noteItem,
      syncStatus: addon.api.sync.getSyncStatus(noteItem.id),
      mdStatus: await addon.api.sync.getMDStatus(noteItem.id),
    });
  }

  const candidateNoteIDs = new Set<number>([
    ...(await addon.api.sync.getSyncNoteIds()),
    ...recoveredStatuses.map((status) => status.itemID),
    ...existingManagedNotes.map((noteItem) => noteItem.id),
  ]);

  let conflicts = 0;
  for (const noteID of candidateNoteIDs) {
    const noteItem = Zotero.Items.get(noteID);
    if (!noteItem?.isNote() || !noteItem.parentItem?.isRegularItem()) {
      continue;
    }
    const mdStatus = await addon.api.sync.getMDStatus(noteItem.id);
    if (!isManagedRepairCandidate(noteItem, mdStatus)) {
      continue;
    }
    const topItemKey = getItemMapKey(noteItem.parentItem);
    const nextCandidate = {
      noteItem,
      syncStatus: addon.api.sync.getSyncStatus(noteItem.id),
      mdStatus,
    };
    const currentCandidate = candidateMap.get(topItemKey);
    if (!currentCandidate) {
      candidateMap.set(topItemKey, nextCandidate);
      continue;
    }
    if (currentCandidate.noteItem.key === nextCandidate.noteItem.key) {
      continue;
    }
    conflicts += 1;
    if (shouldReplaceManagedRepairCandidate(currentCandidate, nextCandidate)) {
      candidateMap.set(topItemKey, nextCandidate);
    }
  }

  const repairedMap = Array.from(candidateMap.entries()).reduce<
    Record<string, string>
  >((result, [itemMapKey, candidate]) => {
    result[itemMapKey] = candidate.noteItem.key;
    return result;
  }, {});
  setObsidianItemNoteMap(repairedMap);

  for (const candidate of candidateMap.values()) {
    const syncStatus = addon.api.sync.getSyncStatus(candidate.noteItem.id);
    addon.api.sync.updateSyncStatus(candidate.noteItem.id, {
      ...syncStatus,
      managedSourceHash: await getManagedObsidianSourceHash(candidate.noteItem),
    });
  }

  const restoredMappings = Array.from(
    new Set([...Object.keys(previousMap), ...Object.keys(repairedMap)]),
  ).filter(
    (itemMapKey) => previousMap[itemMapKey] !== repairedMap[itemMapKey],
  ).length;

  const result = {
    restoredMappings,
    restoredSyncStatuses,
    conflicts,
    scannedSyncFiles,
    candidateNotes: candidateMap.size,
    recreatedNotes,
  };

  if (!options.quiet) {
    if (
      !result.restoredMappings &&
      !result.restoredSyncStatuses &&
      !result.candidateNotes
    ) {
      showHint(getString("obsidian-repairManagedLinks-none"));
    } else {
      showHint(
        getString("obsidian-repairManagedLinks-finished", {
          args: {
            mappings: result.restoredMappings,
            records: result.restoredSyncStatuses,
            conflicts: result.conflicts,
          },
        }),
      );
    }
  }

  return result;
}

async function resyncAllManagedObsidianNotes(successMessage?: string) {
  try {
    const settings = await ensureObsidianSettings();
    let noteItems = getManagedMappedNoteItems();
    if (settings.notesDir && (await fileExists(settings.notesDir))) {
      const recoveryCandidates = await findManagedRecoveryCandidates(
        settings.notesDir,
      );
      for (const candidate of recoveryCandidates.values()) {
        if (findExistingObsidianNote(candidate.topItem)) {
          continue;
        }
        noteItems = [
          ...noteItems,
          await recoverManagedObsidianNoteFromFile(candidate, settings),
        ];
      }
    }
    if (!noteItems.length) {
      showHint(getString("obsidian-sync-noManagedNotes"));
      return;
    }
    const targetFiles: string[] = [];
    for (const noteItem of noteItems) {
      targetFiles.push(await getManagedTargetPath(noteItem, settings));
    }
    await exportManagedObsidianNotes(noteItems, targetFiles, settings);
    showHint(
      successMessage ||
        getString("obsidian-sync-managedNotesResynced", {
          args: {
            count: noteItems.length,
          },
        }),
    );
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    ztoolkit.log("[ObsidianBridge] resync failed", e);
    showHint(
      getString("obsidian-sync-error", { args: { detail: message } }),
    );
  }
}

function dedupeRegularItems(items: Zotero.Item[]) {
  const itemMap = new Map<number, Zotero.Item>();
  for (const item of items) {
    if (item?.isRegularItem()) {
      itemMap.set(item.id, item);
    }
  }
  return Array.from(itemMap.values());
}

async function getRegularItemsForSyncScope(
  scope: ObsidianSyncScope,
): Promise<Zotero.Item[]> {
  const ZoteroPane = Zotero.getMainWindow().ZoteroPane;
  if (scope === "library") {
    const libraryID = ZoteroPane.getSelectedLibraryID();
    if (!libraryID) {
      return [];
    }
    return dedupeRegularItems(
      await Zotero.Items.getAll(libraryID, true, false),
    );
  }

  if (scope === "currentList") {
    const collectionTree = ZoteroPane.collectionsView;
    const collectionTreeRow = collectionTree && collectionTree.selectedTreeRow;
    if (!collectionTreeRow) {
      return [];
    }
    return dedupeRegularItems(
      (await collectionTreeRow.getItems()).filter(
        (item: unknown): item is Zotero.Item =>
          Boolean((item as Zotero.Item | undefined)?.isRegularItem?.()),
      ),
    );
  }

  return dedupeRegularItems(
    ZoteroPane.getSelectedItems().filter((item): item is Zotero.Item =>
      item.isRegularItem(),
    ),
  );
}

async function promptChildNotesForSingleItemSync(
  topItem: Zotero.Item,
  managedNoteItem?: Zotero.Item | false | null,
) {
  const childNoteConfig = getChildNoteBridgeConfig();
  const matchedNotes = getMatchedChildNotes(
    topItem,
    managedNoteItem,
    childNoteConfig,
  );
  if (!childNoteConfig.promptSelect || matchedNotes.length <= 1) {
    return true;
  }

  const excludedKeys = new Set(
    getChildNoteExcludeMap()[getItemMapKey(topItem)] || [],
  );
  const matchedTagSet = new Set(childNoteConfig.matchTags);
  const checkboxIDs = new Map<string, string>();
  const dialogData = {
    accepted: false,
    selectedKeys: [] as string[],
  };
  const dialog = new ztoolkit.Dialog(1, 1)
    .setDialogData(dialogData)
    .addCell(0, 0, {
      tag: "vbox",
      attributes: { flex: 1 },
      styles: {
        gap: "14px",
        padding: "10px 8px 2px",
        minWidth: "0",
      },
      children: [
        {
          tag: "vbox",
          attributes: { flex: 0 },
          styles: {
            gap: "8px",
          },
          children: [
            {
              tag: "label",
              properties: {
                textContent: getTopItemPreferredTitle(topItem),
              },
              styles: {
                fontSize: "18px",
                fontWeight: "700",
                lineHeight: "1.35",
                wordBreak: "break-word",
              },
            },
            {
              tag: "description",
              properties: {
                textContent: getString("obsidian-childNotePicker-help"),
              },
              styles: {
                color: "var(--text-color-deemphasized)",
                lineHeight: "1.55",
                whiteSpace: "normal",
              },
            },
          ],
        },
        {
          tag: "div",
          namespace: "html",
          styles: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "stretch",
            gap: "10px",
            minHeight: "280px",
            maxHeight: "340px",
            overflowY: "auto",
            padding: "12px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.03)",
            boxSizing: "border-box",
          },
          children: matchedNotes.map((noteItem) => {
            const checkboxID = `obsidian-child-note-${noteItem.key}`;
            checkboxIDs.set(noteItem.key, checkboxID);
            const matchedTags = getChildNoteTags(noteItem).filter((tag) =>
              matchedTagSet.has(normalizeChildNoteTag(tag)),
            );
            const cardChildren: any[] = [
              {
                tag: "div",
                namespace: "html",
                styles: {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                },
                children: [
                  {
                    tag: "input",
                    namespace: "html",
                    id: checkboxID,
                    properties: {
                      type: "checkbox",
                      checked: !excludedKeys.has(noteItem.key),
                    },
                    styles: {
                      marginTop: "3px",
                      accentColor: "var(--accent-blue)",
                      flexShrink: "0",
                    },
                  },
                  {
                    tag: "div",
                    namespace: "html",
                    styles: {
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      minWidth: "0",
                      flex: "1",
                    },
                    children: [
                      {
                        tag: "div",
                        namespace: "html",
                        properties: {
                          textContent: getChildNoteDisplayTitle(
                            noteItem,
                            topItem,
                          ),
                        },
                        styles: {
                          fontSize: "15px",
                          fontWeight: "700",
                          lineHeight: "1.45",
                          wordBreak: "break-word",
                        },
                      },
                      {
                        tag: "div",
                        namespace: "html",
                        styles: {
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        },
                        children: matchedTags.map((tag) => ({
                          tag: "span",
                          namespace: "html",
                          properties: {
                            textContent: tag,
                          },
                          styles: {
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: "rgba(64, 156, 255, 0.16)",
                            color: "var(--accent-blue)",
                            fontSize: "12px",
                            fontWeight: "600",
                            lineHeight: "1.3",
                          },
                        })),
                      },
                    ],
                  },
                ],
              },
            ];
            return {
              tag: "label",
              namespace: "html",
              attributes: {
                for: checkboxID,
              },
              styles: {
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                background: "rgba(0, 0, 0, 0.16)",
                cursor: "pointer",
                boxSizing: "border-box",
              },
              children: cardChildren,
            };
          }),
        },
      ],
    })
    .addButton(getString("obsidian-childNotePicker-confirm"), "accept", {
      callback: () => {
        dialogData.accepted = true;
        dialogData.selectedKeys = matchedNotes
          .filter((noteItem) => {
            const checkbox = dialog.window?.document.getElementById(
              checkboxIDs.get(noteItem.key) || "",
            ) as HTMLInputElement | null;
            return Boolean(checkbox?.checked);
          })
          .map((noteItem) => noteItem.key);
      },
    })
    .addButton(getString("obsidian-childNotePicker-cancel"), "cancel")
    .open(getString("obsidian-childNotePicker-title"), {
      width: 620,
      height: 520,
      centerscreen: true,
      resizable: true,
      fitContent: false,
    });

  await dialog.dialogData.loadLock?.promise;
  const acceptButton = dialog.window?.document.getElementById(
    "accept",
  ) as HTMLButtonElement | null;
  const cancelButton = dialog.window?.document.getElementById(
    "cancel",
  ) as HTMLButtonElement | null;
  for (const button of [acceptButton, cancelButton]) {
    if (!button) continue;
    button.style.minWidth = "140px";
    button.style.height = "38px";
    button.style.borderRadius = "10px";
    button.style.fontWeight = "600";
    button.style.padding = "0 18px";
  }
  if (acceptButton) {
    acceptButton.style.background = "var(--accent-blue)";
    acceptButton.style.color = "#fff";
    acceptButton.style.border = "none";
    acceptButton.focus();
  }
  if (cancelButton) {
    cancelButton.style.background = "rgba(255, 255, 255, 0.06)";
    cancelButton.style.color = "var(--text-color)";
    cancelButton.style.border = "1px solid rgba(255, 255, 255, 0.08)";
  }

  await dialog.dialogData.unloadLock?.promise;
  if (!dialogData.accepted) {
    return false;
  }

  persistChildNoteExclusions(topItem, matchedNotes, dialogData.selectedKeys);
  return true;
}

async function syncSelectedItemsToObsidian() {
  try {
    const settings = await ensureObsidianSettings();
    const selectedItems = await getRegularItemsForSyncScope(settings.syncScope);
    if (!selectedItems.length) {
      showHint(
        settings.syncScope === "selection"
          ? getString("obsidian-sync-noSelection")
          : getString("obsidian-sync-noItemsInScope"),
      );
      return;
    }

    if (selectedItems.length === 1) {
      const topItem = selectedItems[0];
      const confirmed = await promptChildNotesForSingleItemSync(
        topItem,
        findExistingObsidianNote(topItem),
      );
      if (!confirmed) {
        return;
      }
    }

    const noteItems: Zotero.Item[] = [];
    const targetFiles: string[] = [];

    for (const topItem of selectedItems) {
      const noteItem = await ensureManagedObsidianNote(topItem, settings);
      noteItems.push(noteItem);
      targetFiles.push(await getManagedTargetPath(noteItem, settings));
    }

    await exportManagedObsidianNotes(noteItems, targetFiles, settings);

    if (targetFiles[0]) {
      await showHintWithLink(
        getString("obsidian-sync-finished", {
          args: { count: selectedItems.length },
        }),
        getString("obsidian-sync-showInFolder"),
        () => {
          Zotero.File.reveal(targetFiles[0]);
        },
      );
    }

    if (settings.revealAfterSync && targetFiles[0]) {
      Zotero.File.reveal(targetFiles[0]);
    }
    if (settings.openAfterSync && targetFiles[0]) {
      openObsidianNote(targetFiles[0]);
    }
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    ztoolkit.log("[ObsidianBridge] sync failed", e);
    showHint(
      getString("obsidian-sync-error", { args: { detail: message } }),
    );
  }
}

async function openItemsInObsidian(items: Zotero.Item[]) {
  const [topItem] = dedupeRegularItems(items);
  if (!topItem) {
    showHint(getString("obsidian-sync-noSelection"));
    return;
  }

  const noteItem = findExistingObsidianNote(topItem);
  const targetPath = noteItem
    ? await resolveManagedObsidianTargetPath(noteItem)
    : "";
  if (!targetPath || !openObsidianNote(targetPath)) {
    showHint(getString("obsidian-open-failed"));
  }
}

export {
  openItemsInObsidian,
  repairObsidianManagedLinks,
  resyncAllManagedObsidianNotes,
  syncSelectedItemsToObsidian,
};
