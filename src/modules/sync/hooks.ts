import { showHint } from "../../utils/hint";
import { getErrorMessage, reportError } from "../../utils/errorUtils";
import { getString } from "../../utils/locale";
import { getPref } from "../../utils/prefs";
import { jointPath } from "../../utils/str";
import { isElementVisible } from "../../utils/window";
import {
  extractManagedObsidianUserMarkdown,
  extractUserSections,
} from "../obsidian/markdown";
import { resolveManagedNotePath } from "../obsidian/pathResolver";
import { cleanInline } from "../obsidian/shared";
import {
  getSyncComparisonCode,
  SyncCode,
  type SyncComparisonCache,
} from "./status";

export { setSyncing, callSyncing };

type PendingSyncRequest = NonNullable<typeof addon.data.sync.pending>;

async function shouldForceManagedActiveExport(
  noteItem: Zotero.Item,
  mdStatus: MDStatus,
  noteDir: string,
) {
  if (!addon.api.obsidian.isManagedNote(noteItem) || !mdStatus.meta) {
    return false;
  }
  const currentMarkdown = await addon.api.convert.note2md(noteItem, noteDir, {
    keepNoteLink: false,
    withYAMLHeader: false,
  });
  const currentUserSections = cleanInline(extractUserSections(currentMarkdown));
  const existingUserSections = cleanInline(
    extractManagedObsidianUserMarkdown(mdStatus.content) || "",
  );
  return currentUserSections !== existingUserSections;
}

function queuePendingSyncRequest(
  items: Zotero.Item[] | undefined,
  options: {
    quiet: boolean;
    skipActive: boolean;
    reason: string;
  },
) {
  const pending = addon.data.sync.pending || {
    all: false,
    noteIds: [],
    quiet: true,
    skipActive: true,
    reasons: [],
  };
  if (!items || !items.length) {
    pending.all = true;
    pending.noteIds = [];
  } else if (!pending.all) {
    pending.noteIds = Array.from(
      new Set(
        pending.noteIds.concat(
          items
            .map((item) => Number(item?.id || 0))
            .filter((noteId) => Number.isFinite(noteId) && noteId > 0),
        ),
      ),
    );
  }
  pending.quiet = pending.quiet && options.quiet;
  pending.skipActive = pending.skipActive && options.skipActive;
  if (options.reason) {
    pending.reasons = Array.from(new Set([...pending.reasons, options.reason]));
  }
  addon.data.sync.pending = pending;
}

function takePendingSyncRequest(): PendingSyncRequest | null {
  const pending = addon.data.sync.pending;
  addon.data.sync.pending = null;
  return pending;
}

function getPendingSyncReason(pending: PendingSyncRequest) {
  const reasons = pending.reasons.filter(Boolean);
  if (!reasons.length) {
    return "queued";
  }
  if (reasons.length === 1) {
    return reasons[0];
  }
  return `queued:${reasons.join(",")}`;
}

function shouldSkipManagedMetadataRefresh(
  noteItem: Zotero.Item,
  mdStatus: MDStatus,
) {
  return Boolean(
    addon.api.obsidian.isManagedNote(noteItem) &&
      mdStatus.meta &&
      extractManagedObsidianUserMarkdown(mdStatus.content) === null,
  );
}

function setSyncing() {
  const syncPeriod = getPref("syncPeriodSeconds") as number;
  const enableHint = addon.data.env === "development";
  if (syncPeriod > 0) {
    enableHint && showHint(`${getString("sync-start-hint")} ${syncPeriod} s`);
    const timer = ztoolkit.getGlobal("setInterval")(
      () => {
        if (!addon.data.alive) {
          showHint(getString("sync-stop-hint"));
          ztoolkit.getGlobal("clearInterval")(timer);
        }
        // Only when Zotero is active and focused
        if (
          Zotero.getMainWindow().document.hasFocus() &&
          (getPref("syncPeriodSeconds") as number) > 0
        ) {
          callSyncing(undefined, {
            quiet: true,
            skipActive: true,
            reason: "auto",
          });
        }
      },
      Number(syncPeriod) * 1000,
    );
  }
}

async function callSyncing(
  items: Zotero.Item[] = [],
  { quiet, skipActive, reason } = {
    quiet: true,
    skipActive: true,
    reason: "unknown",
  },
) {
  // Always log in development mode
  if (addon.data.env === "development") {
    quiet = false;
  }
  if (addon.data.sync.lock) {
    queuePendingSyncRequest(items, { quiet, skipActive, reason });
    return;
  }
  let progress;
  // Wrap the code in try...catch so that the lock can be released anyway
  try {
    addon.data.sync.lock = true;
    let skippedCount = 0;
    const activeNoteIds = new Set<number>();
    if (!items || !items.length) {
      items = Zotero.Items.get(await addon.api.sync.getSyncNoteIds());
    } else {
      items = items.filter((item) => addon.api.sync.isSyncNote(item.id));
    }
    if (items.length === 0) {
      return;
    }
    if (skipActive) {
      // Active note editors should not receive markdown imports/diff prompts,
      // but Zotero-side edits still need to export to Obsidian.
      const visibleActiveNoteIds = Zotero.Notes._editorInstances
        .filter((editor) => {
          const elem = (editor._popup as XULPopupElement).closest(
            "note-editor",
          );
          return elem && isElementVisible(elem);
        })
        .map((editor) => editor._item.id)
        .filter((noteId) => Number.isFinite(noteId) && noteId > 0);
      visibleActiveNoteIds.forEach((noteId) => activeNoteIds.add(noteId));
    }
    ztoolkit.log("sync start", reason, items.length, skippedCount);

    if (!quiet) {
      progress = new ztoolkit.ProgressWindow(
        `[${getString("sync-running-hint-title")}] ${
          addon.data.env === "development" ? reason : "Obsidian Bridge"
        }`,
      )
        .createLine({
          text: `[${getString("sync-running-hint-check")}] 0/${
            items.length
          } ...`,
          type: "default",
          progress: 1,
        })
        .show(-1);
    }
    // Export items of same dir in batch
    const toExport = {} as Record<string, Zotero.Item[]>;
    const toImport: SyncStatus[] = [];
    const toDiff: SyncStatus[] = [];
    const mdStatusMap = {} as Record<number, MDStatus>;
    const comparisonCache: SyncComparisonCache = {
      managedSourceHashes: {},
      noteSnapshotMd5s: {},
    };
    let i = 1;
    for (const item of items) {
      const liveItem =
        ((await Zotero.Items.getAsync(item.id)) as Zotero.Item) || item;
      if (addon.api.obsidian.isManagedNote(liveItem)) {
        const resolution = await resolveManagedNotePath(liveItem, {
          includeTemplateFallback: false,
          refreshSyncStatus: false,
        });
        if (resolution.presenceState === "tombstoned") {
          skippedCount += 1;
          progress?.changeLine({
            text: `[${getString("sync-running-hint-check")}] ${i}/${
              items.length
            } ...`,
            progress: ((i - 1) / items.length) * 100,
          });
          i += 1;
          continue;
        }
      }
      const syncStatus = addon.api.sync.getSyncStatus(liveItem.id);
      const filepath = syncStatus.path;
      const mdStatus = await addon.api.sync.getMDStatus(liveItem.id);
      mdStatusMap[liveItem.id] = mdStatus;

      const compareResult = await getSyncComparisonCode(
        liveItem,
        mdStatus,
        comparisonCache,
      );
      const shouldSkipActiveImport =
        skipActive && activeNoteIds.has(liveItem.id);
      const shouldForceActiveExport =
        shouldSkipActiveImport &&
        Boolean(filepath) &&
        (await shouldForceManagedActiveExport(liveItem, mdStatus, filepath));
      switch (compareResult) {
        case SyncCode.NoteAhead:
          if (Object.keys(toExport).includes(filepath)) {
            toExport[filepath].push(liveItem);
          } else {
            toExport[filepath] = [liveItem];
          }
          break;
        case SyncCode.MDAhead:
          if (shouldForceActiveExport) {
            if (Object.keys(toExport).includes(filepath)) {
              toExport[filepath].push(liveItem);
            } else {
              toExport[filepath] = [liveItem];
            }
          } else if (shouldSkipActiveImport) {
            skippedCount += 1;
          } else {
            toImport.push(syncStatus);
          }
          break;
        case SyncCode.NeedDiff:
          if (shouldForceActiveExport) {
            if (Object.keys(toExport).includes(filepath)) {
              toExport[filepath].push(liveItem);
            } else {
              toExport[filepath] = [liveItem];
            }
          } else if (shouldSkipActiveImport) {
            skippedCount += 1;
          } else {
            toDiff.push(syncStatus);
          }
          break;
        case SyncCode.UpToDate:
          if (shouldForceActiveExport) {
            if (Object.keys(toExport).includes(filepath)) {
              toExport[filepath].push(liveItem);
            } else {
              toExport[filepath] = [liveItem];
            }
          }
          break;
        default:
          break;
      }
      progress?.changeLine({
        text: `[${getString("sync-running-hint-check")}] ${i}/${
          items.length
        } ...`,
        progress: ((i - 1) / items.length) * 100,
      });
      i += 1;
    }

    let totalCount = Object.keys(toExport).length;
    ztoolkit.log("will be synced:", totalCount, toImport.length, toDiff.length);

    i = 1;
    for (const filepath of Object.keys(toExport)) {
      progress?.changeLine({
        text: `[${getString("sync-running-hint-updateMD")}] ${i}/${
          items.length
        } ...`,
        progress: ((i - 1) / items.length) * 100,
      });
      const noteItems = toExport[filepath];
      const itemIDs = noteItems.map((item) => item.id);
      await addon.api.$export.syncMDBatch(
        filepath,
        itemIDs,
        itemIDs.map((id) => mdStatusMap[id].meta!),
        {
          historyReason: reason,
          noteItems,
          managedSourceHashes: comparisonCache.managedSourceHashes,
          noteSnapshotMd5s: comparisonCache.noteSnapshotMd5s,
        },
      );
      i += 1;
    }
    i = 1;
    totalCount = toImport.length;
    for (const syncStatus of toImport) {
      progress?.changeLine({
        text: `[${getString(
          "sync-running-hint-updateNote",
        )}] ${i}/${totalCount}, ${toDiff.length} queuing...`,
        progress: ((i - 1) / totalCount) * 100,
      });
      const item = Zotero.Items.get(syncStatus.itemID);
      const filepath = jointPath(syncStatus.path, syncStatus.filename);
      const skipMetadataRefresh = shouldSkipManagedMetadataRefresh(
        item,
        mdStatusMap[item.id],
      );
      await addon.api.$import.fromMD(filepath, {
        noteId: item.id,
        historyReason: reason,
      });
      if (!skipMetadataRefresh) {
        // Update md file to keep the metadata synced
        await addon.api.$export.syncMDBatch(
          syncStatus.path,
          [item.id],
          [mdStatusMap[item.id].meta!],
          {
            historyReason: `${reason}-metadata-refresh`,
            recordHistory: false,
          },
        );
      }
      i += 1;
    }
    i = 1;
    totalCount = toDiff.length;
    for (const syncStatus of toDiff) {
      progress?.changeLine({
        text: `[${getString("sync-running-hint-diff")}] ${i}/${totalCount}...`,
        progress: ((i - 1) / totalCount) * 100,
      });

      await addon.hooks.onShowSyncDiff(
        syncStatus.itemID,
        jointPath(syncStatus.path, syncStatus.filename),
      );
      i += 1;
    }
    const syncCount =
      Object.keys(toExport).length + toImport.length + toDiff.length;
    progress?.changeLine({
      text:
        (syncCount
          ? `[${getString(
              "sync-running-hint-finish",
            )}] ${syncCount} ${getString("sync-running-hint-synced")}`
          : `[${getString("sync-running-hint-finish")}] ${getString(
              "sync-running-hint-upToDate",
            )}`) + (skippedCount ? `, ${skippedCount} skipped.` : ""),
      progress: 100,
    });
  } catch (e) {
    reportError("Syncing", e, {
      hint: true,
      hintText: `Sync Error: ${getErrorMessage(e)}`,
      includeContextInHint: false,
      details: [reason],
    });
  } finally {
    progress?.startCloseTimer(5000);
    addon.data.sync.lock = false;
    const pending = takePendingSyncRequest();
    if (pending) {
      const pendingItems = pending.all
        ? undefined
        : Zotero.Items.get(pending.noteIds).filter(
            (item): item is Zotero.Item => Boolean(item),
          );
      await callSyncing(pendingItems, {
        quiet: pending.quiet,
        skipActive: pending.skipActive,
        reason: getPendingSyncReason(pending),
      });
    }
  }
}
