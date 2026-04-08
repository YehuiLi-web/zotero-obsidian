import { addLineToNote } from "../../utils/note";
import { logError } from "../../utils/errorUtils";
import { config } from "../../../package.json";
import { rememberWatchedFileState } from "../sync/watcher";
import {
  isManagedFrontmatterBridge,
  normalizeFrontmatterObject,
} from "../obsidian/frontmatter";
import { refreshFrontmatterIndexEntry } from "../obsidian/frontmatterIndex";
import { rememberManagedResolvedPath } from "../obsidian/pathResolver";
import {
  GENERATED_BLOCK_START,
  USER_BLOCK_START,
} from "../obsidian/markdown";
import { cleanInline } from "../obsidian/shared";
import {
  getItemMapKey,
  getObsidianItemNoteMap,
  setObsidianItemNoteMap,
} from "../obsidian/settings";

export async function fromMD(
  filepath: string,
  options: {
    noteId?: number;
    ignoreVersion?: boolean;
    append?: boolean;
    appendLineIndex?: number;
    skipNotifierSync?: boolean;
    recordHistory?: boolean;
    historyReason?: string;
    historyAction?: SyncHistoryEntry["action"];
  } = {},
) {
  const safeGetNoteDiffText = async (item: Zotero.Item) => {
    try {
      const noteStatus = addon.api.sync.getNoteStatus(item.id);
      if (!noteStatus?.content?.trim()) {
        return "";
      }
      return (await addon.api.convert.note2noteDiff(item)) || "";
    } catch (error) {
      logError("Import markdown snapshot note diff text", error, item.id);
      return "";
    }
  };

  let mdStatus: MDStatus;
  try {
    mdStatus = await addon.api.sync.getMDStatus(filepath);
  } catch (e) {
    logError("Import markdown read status", e, filepath);
    return;
  }
  let noteItem = options.noteId ? Zotero.Items.get(options.noteId) : undefined;
  if (
    !options.ignoreVersion &&
    typeof mdStatus.meta?.$version === "number" &&
    typeof noteItem?.version === "number" &&
    mdStatus.meta?.$version < noteItem?.version
  ) {
    if (
      !Zotero.getMainWindow().confirm(
        `The target note seems to be newer than the file ${filepath}. Are you sure you want to import it anyway?`,
      )
    ) {
      return;
    }
  }
  const noteStatus = noteItem
    ? addon.api.sync.getNoteStatus(noteItem.id)
    : {
        meta: `<div data-schema-version="${config.dataSchemaVersion}">`,
        content: "",
        tail: "</div>",
      };

  if (!noteItem) {
    const _noteItem = await addon.hooks.onCreateNote({
      noSave: true,
    });
    if (!_noteItem) {
      return;
    }
    noteItem = _noteItem;
    await noteItem.saveTx({
      notifierData: {
        autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
        ...(options.skipNotifierSync ? { skipOB: true } : {}),
      },
    });
  }
  if (!noteItem) {
    return;
  }
  const beforeNoteText = await safeGetNoteDiffText(noteItem);
  const normalizedMeta = normalizeFrontmatterObject(mdStatus.meta);
  const parentTopItem =
    noteItem?.isNote() && noteItem.parentItem?.isRegularItem()
      ? noteItem.parentItem
      : noteItem?.isNote() && noteItem?.parentID
        ? Zotero.Items.get(noteItem.parentID)
        : false;
  const hasManagedMarkers =
    mdStatus.content.includes(GENERATED_BLOCK_START) &&
    mdStatus.content.includes(USER_BLOCK_START);
  const inferredManagedByMeta = Boolean(
    parentTopItem &&
      parentTopItem.isRegularItem() &&
      isManagedFrontmatterBridge(normalizedMeta, {
        zoteroKey: parentTopItem.key,
        noteKey: noteItem.key,
      }),
  );
  const inferredManagedByContent = Boolean(
    parentTopItem && parentTopItem.isRegularItem() && hasManagedMarkers,
  );
  const isManagedNote = Boolean(
    noteItem &&
      (addon.api.obsidian.isManagedNote(noteItem) ||
        inferredManagedByMeta ||
        inferredManagedByContent),
  );
  if (
    isManagedNote &&
    noteItem &&
    parentTopItem &&
    parentTopItem.isRegularItem() &&
    !addon.api.obsidian.isManagedNote(noteItem)
  ) {
    const itemMapKey = getItemMapKey(parentTopItem);
    const itemNoteMap = getObsidianItemNoteMap();
    const mappedNoteKey = cleanInline(String(itemNoteMap[itemMapKey] || ""));
    const mappedNote = mappedNoteKey
      ? (Zotero.Items.getByLibraryAndKey(
          parentTopItem.libraryID,
          mappedNoteKey,
        ) as Zotero.Item | false)
      : false;
    if (
      !mappedNoteKey ||
      mappedNoteKey === noteItem.key ||
      !mappedNote ||
      !mappedNote.isNote() ||
      mappedNote.parentID !== parentTopItem.id
    ) {
      itemNoteMap[itemMapKey] = noteItem.key;
      setObsidianItemNoteMap(itemNoteMap);
    }
  }
  const managedUserMarkdown = isManagedNote
    ? addon.api.obsidian.extractUserMarkdown(mdStatus.content)
    : null;
  const normalizedMDStatus =
    isManagedNote && typeof managedUserMarkdown === "string"
      ? {
          ...mdStatus,
          content: managedUserMarkdown,
        }
      : isManagedNote
        ? {
            ...mdStatus,
            content: "",
          }
        : mdStatus;
  const skippedManagedBodyImport =
    isManagedNote && typeof managedUserMarkdown !== "string";
  const parsedContent = await addon.api.convert.md2note(normalizedMDStatus, noteItem, {
    isImport: true,
  });
  ztoolkit.log("import", noteStatus);

  if (skippedManagedBodyImport) {
    ztoolkit.log(
      "[ObsidianBridge] skipped managed note body import because USER block markers are missing or invalid",
      filepath,
    );
  } else if (options.append) {
    await addLineToNote(noteItem, parsedContent, options.appendLineIndex || -1);
  } else {
    // For managed notes, prepend the parent item's title so the Zotero note
    // keeps showing the article title instead of the first USER-block heading
    // (e.g. "笔记区" / "Workspace").
    let titlePrefix = "";
    if (isManagedNote && parentTopItem && parentTopItem.isRegularItem()) {
      const escapedTitle = cleanInline(
        parentTopItem.getField("title" as any) as string,
      )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      if (escapedTitle) {
        titlePrefix = `<h1>${escapedTitle}</h1>`;
      }
    }
    noteItem.setNote(
      noteStatus!.meta + titlePrefix + parsedContent + noteStatus!.tail,
    );
    await noteItem.saveTx({
      notifierData: {
        autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
        ...(options.skipNotifierSync ? { skipOB: true } : {}),
      },
    });
  }
  if (isManagedNote) {
    await addon.api.obsidian.applyManagedFrontmatter(noteItem, mdStatus.meta);
  }
  const shouldTrackImport =
    isManagedNote || addon.api.sync.isSyncNote(noteItem.id);
  if (shouldTrackImport) {
    const afterNoteText = await safeGetNoteDiffText(noteItem);
    rememberWatchedFileState(noteItem.id, mdStatus.lastmodify.getTime());
    addon.api.sync.updateSyncStatus(noteItem.id, {
      ...addon.api.sync.getSyncStatus(noteItem.id),
      path: mdStatus.filedir,
      filename: mdStatus.filename,
      itemID: noteItem.id,
      frontmatterMd5: mdStatus.meta
        ? Zotero.Utilities.Internal.md5(
            JSON.stringify(mdStatus.meta),
            false,
          )
        : "",
      fileLastModified: mdStatus.lastmodify.getTime(),
      lastsync: Date.now(),
    });
    await refreshFrontmatterIndexEntry(
      filepath,
      mdStatus.meta,
      mdStatus.lastmodify?.getTime?.() || Date.now(),
    );
    if (isManagedNote) {
      await rememberManagedResolvedPath(noteItem, filepath, {
        refreshSyncStatus: true,
      });
    }
    if (options.recordHistory !== false && !skippedManagedBodyImport) {
      addon.api.sync.recordNoteHistory(noteItem, filepath, {
        beforeText: beforeNoteText,
        afterText: afterNoteText,
        reason: options.historyReason || "manual-import",
        action: options.historyAction || "import",
        afterFrontmatter: mdStatus.meta,
      });
    }
  }
  return noteItem;
}
