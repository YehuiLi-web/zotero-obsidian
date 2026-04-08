import { getErrorMessage } from "../../utils/errorUtils";
import { showHint, showHintWithLink } from "../../utils/hint";
import { getString } from "../../utils/locale";
import { getPref } from "../../utils/prefs";
import { fileExists } from "../../utils/str";
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
import {
  isManagedFrontmatterBridge,
  normalizeFrontmatterObject,
  resolveManagedFrontmatterLibraryID,
} from "./frontmatter";
import {
  rebuildFrontmatterIndex,
} from "./frontmatterIndex";
import {
  openObsidianNote,
  resolveManagedNote,
  resolveManagedNoteBinding,
} from "./paths";
import {
  resolveManagedNotePath,
  resolveManagedSyncTargetPath,
} from "./pathResolver";
import {
  getManagedNoteRegistryEntry,
  removeRegistryEntry,
} from "./registry";
import {
  getItemMapKey,
  getObsidianItemNoteMap,
  resolveObsidianItemTemplateName,
  setObsidianItemNoteMap,
} from "./settings";
import { cleanInline, getFieldSafe, parseExtraMap } from "./shared";
import {
  getChildNoteTags,
  getManagedObsidianSourceHash,
  getMatchedChildNotes,
  isManagedObsidianNote,
  persistChildNoteExclusions,
} from "./managed";
import { autofillMissingMetadataTranslations } from "./translation";

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
      if (!isManagedFrontmatterBridge(meta)) {
        return;
      }

      const topItemKey = cleanInline(String(meta.zotero_key || ""));
      const referencedNoteKey = cleanInline(
        String(meta.zotero_note_key || meta.$itemKey || ""),
      );
      const libraryID = resolveManagedFrontmatterLibraryID(meta, {
        zoteroKey: topItemKey,
        noteKey: referencedNoteKey,
      });
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

      if (await resolveManagedNote(topItem)) {
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
  const existingNote = await resolveManagedNote(candidate.topItem);
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
    managedSettings: settings,
    recordHistory: false,
    historyReason: "managed-recovery-refresh",
  });
  return noteItem;
}

async function ensureManagedObsidianNote(
  topItem: Zotero.Item,
  settings: ObsidianSettings,
) {
  const existingNote = await resolveManagedNote(topItem);
  if (existingNote) {
    return existingNote;
  }

  if (settings.notesDir && (await fileExists(settings.notesDir))) {
    const binding = await resolveManagedNoteBinding(topItem);
    if (binding.entry?.path) {
      const mdStatus = await addon.api.sync.getMDStatus(binding.entry.path);
      return recoverManagedObsidianNoteFromFile(
        {
          topItem,
          filepath: binding.entry.path,
          mdStatus,
        },
        settings,
      );
    }
    const recoveryCandidate = (
      await findManagedRecoveryCandidates(settings.notesDir, [topItem])
    ).get(getItemMapKey(topItem));
    if (recoveryCandidate) {
      return recoverManagedObsidianNoteFromFile(recoveryCandidate, settings);
    }
  }

  return createObsidianNote(topItem);
}

async function getManagedTargetPath(
  noteItem: Zotero.Item,
  settings: ObsidianSettings,
) {
  const resolution = await resolveManagedSyncTargetPath(noteItem, settings);
  return resolution.path;
}

function getManagedNotePresenceState(noteItem: Zotero.Item) {
  return getManagedNoteRegistryEntry(noteItem)?.presenceState || "missing";
}

async function restoreManagedObsidianNotes(
  noteItems: Zotero.Item[],
  options: {
    quiet?: boolean;
  } = {},
) {
  const managedNotes = noteItems.filter(
    (noteItem) =>
      noteItem?.isNote() &&
      noteItem.parentItem?.isRegularItem() &&
      getManagedNotePresenceState(noteItem) === "tombstoned",
  );
  if (!managedNotes.length) {
    if (!options.quiet) {
      showHint(getString("obsidian-sync-noTombstonedNotes"));
    }
    return { restored: 0 };
  }

  const settings = await ensureObsidianSettings();
  const targetFiles: string[] = [];
  for (const noteItem of managedNotes) {
    const resolution = await resolveManagedSyncTargetPath(noteItem, settings);
    targetFiles.push(resolution.path);
  }
  await exportManagedObsidianNotes(managedNotes, targetFiles, settings);
  if (!options.quiet) {
    showHint(
      getString("obsidian-sync-tombstonesRestored", {
        args: { count: managedNotes.length },
      }),
    );
  }
  return { restored: managedNotes.length };
}

async function rebindManagedObsidianNotes(
  noteItems: Zotero.Item[],
  options: {
    quiet?: boolean;
  } = {},
) {
  let rebound = 0;
  let unresolved = 0;
  for (const noteItem of noteItems.filter(
    (candidate) => candidate?.isNote() && candidate.parentItem?.isRegularItem(),
  )) {
    const resolution = await resolveManagedNotePath(noteItem, {
      includeTemplateFallback: false,
      refreshSyncStatus: true,
    });
    if (resolution.matchedExistingFile) {
      rebound += 1;
    } else {
      unresolved += 1;
    }
  }
  if (!options.quiet) {
    showHint(
      getString("obsidian-sync-rebindResult", {
        args: { rebound, unresolved },
      }),
    );
  }
  return { rebound, unresolved };
}

async function unlinkManagedObsidianNotes(
  noteItems: Zotero.Item[],
  options: {
    quiet?: boolean;
  } = {},
) {
  let unlinked = 0;
  const itemNoteMap = { ...getObsidianItemNoteMap() };
  for (const noteItem of noteItems.filter(
    (candidate) => candidate?.isNote() && candidate.parentItem?.isRegularItem(),
  )) {
    const topItem = noteItem.parentItem!;
    delete itemNoteMap[getItemMapKey(topItem)];
    removeRegistryEntry(noteItem);
    await addon.api.sync.removeSyncNote(noteItem.id);
    unlinked += 1;
  }
  setObsidianItemNoteMap(itemNoteMap);
  if (!options.quiet) {
    showHint(
      getString("obsidian-sync-unlinkResult", {
        args: { count: unlinked },
      }),
    );
  }
  return { unlinked };
}

async function resolveManagedObsidianTargetPath(noteItem: Zotero.Item) {
  const resolution = await resolveManagedNotePath(noteItem, {
    settings: {
      vaultRoot: String(getPref("obsidian.vaultRoot") || "").trim(),
      notesDir: String(getPref("obsidian.notesDir") || "").trim(),
    },
    includeTemplateFallback: false,
    refreshSyncStatus: true,
  });
  return resolution.matchedExistingFile ? resolution.path : "";
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
        managedSettings: settings,
        historyReason: "obsidian-sync",
        targetFiles,
      },
    );
  } else {
    for (const [index, noteItem] of noteItems.entries()) {
      await addon.api.$export.saveMD(targetFiles[index], noteItem.id, {
        keepNoteLink: false,
        withYAMLHeader: true,
        attachmentDir: settings.assetsDir,
        attachmentFolder: settings.attachmentFolder,
        managedSettings: settings,
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
  if (
    !isManagedFrontmatterBridge(meta, {
      zoteroKey: noteItem.parentItem.key,
      noteKey: noteItem.key,
    })
  ) {
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
      if (await resolveManagedNote(candidate.topItem)) {
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
    const resolution = await resolveManagedNotePath(candidate.noteItem, {
      settings,
      includeTemplateFallback: false,
      refreshSyncStatus: true,
    });
    conflicts += resolution.conflicts.length;
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

  if (settings?.notesDir && (await fileExists(settings.notesDir))) {
    await rebuildFrontmatterIndex(settings.notesDir);
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
        if (await resolveManagedNote(candidate.topItem)) {
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
    ztoolkit.log("[ObsidianBridge] resync failed", e);
    showHint(
      getString("obsidian-sync-error", {
        args: { detail: getErrorMessage(e) },
      }),
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
  if (!shouldPromptForChildNotes(childNoteConfig.promptSelect, matchedNotes)) {
    return true;
  }

  const dialogState = createChildNotePickerState(topItem, matchedNotes);
  const dialogData = createChildNotePickerDialogData();
  const dialog = new ztoolkit.Dialog(1, 1)
    .setDialogData(dialogData)
    .addCell(0, 0, buildChildNotePickerDialogCell(dialogState))
    .addButton(getString("obsidian-childNotePicker-confirm"), "accept", {
      callback: () => {
        dialogData.accepted = true;
        dialogData.selectedKeys = collectSelectedChildNoteKeys(
          dialog.window,
          dialogState.matchedNotes,
          dialogState.checkboxIDs,
        );
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

  await styleChildNotePickerDialog(dialog);

  await dialog.dialogData.unloadLock?.promise;
  if (!dialogData.accepted) {
    return false;
  }

  persistChildNoteExclusions(
    topItem,
    dialogState.matchedNotes,
    dialogData.selectedKeys,
  );
  return true;
}

type ChildNotePickerState = {
  topItem: Zotero.Item;
  matchedNotes: Zotero.Item[];
  excludedKeys: Set<string>;
  matchedTagSet: Set<string>;
  checkboxIDs: Map<string, string>;
};

type ChildNotePickerDialogData = {
  accepted: boolean;
  selectedKeys: string[];
};

function shouldPromptForChildNotes(
  promptSelect: boolean,
  matchedNotes: Zotero.Item[],
) {
  return promptSelect && matchedNotes.length > 1;
}

function createChildNotePickerDialogData(): ChildNotePickerDialogData {
  return {
    accepted: false,
    selectedKeys: [],
  };
}

function createChildNotePickerState(
  topItem: Zotero.Item,
  matchedNotes: Zotero.Item[],
): ChildNotePickerState {
  return {
    topItem,
    matchedNotes,
    excludedKeys: new Set(getChildNoteExcludeMap()[getItemMapKey(topItem)] || []),
    matchedTagSet: new Set(getChildNoteBridgeConfig().matchTags),
    checkboxIDs: new Map<string, string>(),
  };
}

function getChildNotePickerCheckboxID(noteItem: Zotero.Item) {
  return `obsidian-child-note-${noteItem.key}`;
}

function getMatchedBridgeTags(
  noteItem: Zotero.Item,
  matchedTagSet: Set<string>,
) {
  return getChildNoteTags(noteItem).filter((tag) =>
    matchedTagSet.has(normalizeChildNoteTag(tag)),
  );
}

function buildChildNoteTagChip(tag: string) {
  return {
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
  };
}

function buildChildNotePickerCard(
  topItem: Zotero.Item,
  noteItem: Zotero.Item,
  excludedKeys: Set<string>,
  matchedTagSet: Set<string>,
  checkboxIDs: Map<string, string>,
) {
  const checkboxID = getChildNotePickerCheckboxID(noteItem);
  checkboxIDs.set(noteItem.key, checkboxID);
  const matchedTags = getMatchedBridgeTags(noteItem, matchedTagSet);

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
    children: [
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
                  textContent: getChildNoteDisplayTitle(noteItem, topItem),
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
                children: matchedTags.map(buildChildNoteTagChip),
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildChildNotePickerDialogCell(state: ChildNotePickerState) {
  return {
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
              textContent: getTopItemPreferredTitle(state.topItem),
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
        children: state.matchedNotes.map((noteItem) =>
          buildChildNotePickerCard(
            state.topItem,
            noteItem,
            state.excludedKeys,
            state.matchedTagSet,
            state.checkboxIDs,
          ),
        ),
      },
    ],
  };
}

function collectSelectedChildNoteKeys(
  dialogWindow: Window | null | undefined,
  matchedNotes: Zotero.Item[],
  checkboxIDs: Map<string, string>,
) {
  return matchedNotes
    .filter((noteItem) => {
      const checkbox = dialogWindow?.document.getElementById(
        checkboxIDs.get(noteItem.key) || "",
      ) as HTMLInputElement | null;
      return Boolean(checkbox?.checked);
    })
    .map((noteItem) => noteItem.key);
}

async function styleChildNotePickerDialog(dialog: any) {
  await dialog.dialogData.loadLock?.promise;

  const acceptButton = dialog.window?.document.getElementById(
    "accept",
  ) as HTMLButtonElement | null;
  const cancelButton = dialog.window?.document.getElementById(
    "cancel",
  ) as HTMLButtonElement | null;

  for (const button of [acceptButton, cancelButton]) {
    if (!button) {
      continue;
    }
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
        await resolveManagedNote(topItem),
      );
      if (!confirmed) {
        return;
      }
    }

    const translationReport = await autofillMissingMetadataTranslations(
      selectedItems,
      settings.translation,
    );
    for (const warning of translationReport.warnings) {
      showHint(warning.message);
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
    ztoolkit.log("[ObsidianBridge] sync failed", e);
    showHint(
      getString("obsidian-sync-error", {
        args: { detail: getErrorMessage(e) },
      }),
    );
  }
}

async function openItemsInObsidian(items: Zotero.Item[]) {
  const [topItem] = dedupeRegularItems(items);
  if (!topItem) {
    showHint(getString("obsidian-sync-noSelection"));
    return;
  }

  const noteItem = await resolveManagedNote(topItem);
  const targetPath = noteItem
    ? await resolveManagedObsidianTargetPath(noteItem)
    : "";
  if (!targetPath || !openObsidianNote(targetPath)) {
    showHint(getString("obsidian-open-failed"));
  }
}

export {
  getManagedNotePresenceState,
  openItemsInObsidian,
  repairObsidianManagedLinks,
  rebindManagedObsidianNotes,
  resyncAllManagedObsidianNotes,
  restoreManagedObsidianNotes,
  syncSelectedItemsToObsidian,
  unlinkManagedObsidianNotes,
};
