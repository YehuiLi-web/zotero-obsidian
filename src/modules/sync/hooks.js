"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSyncing = setSyncing;
exports.callSyncing = callSyncing;
const hint_1 = require("../../utils/hint");
const locale_1 = require("../../utils/locale");
const prefs_1 = require("../../utils/prefs");
const str_1 = require("../../utils/str");
const window_1 = require("../../utils/window");
function setSyncing() {
    const syncPeriod = (0, prefs_1.getPref)("syncPeriodSeconds");
    const enableHint = addon.data.env === "development";
    if (syncPeriod > 0) {
        enableHint && (0, hint_1.showHint)(`${(0, locale_1.getString)("sync-start-hint")} ${syncPeriod} s`);
        const timer = ztoolkit.getGlobal("setInterval")(() => {
            if (!addon.data.alive) {
                (0, hint_1.showHint)((0, locale_1.getString)("sync-stop-hint"));
                ztoolkit.getGlobal("clearInterval")(timer);
            }
            // Only when Zotero is active and focused
            if (Zotero.getMainWindow().document.hasFocus() &&
                (0, prefs_1.getPref)("syncPeriodSeconds") > 0) {
                callSyncing(undefined, {
                    quiet: true,
                    skipActive: true,
                    reason: "auto",
                });
            }
        }, Number(syncPeriod) * 1000);
    }
}
function callSyncing() {
    return __awaiter(this, arguments, void 0, function* (items = [], { quiet, skipActive, reason } = {
        quiet: true,
        skipActive: true,
        reason: "unknown",
    }) {
        // Always log in development mode
        if (addon.data.env === "development") {
            quiet = false;
        }
        if (addon.data.sync.lock) {
            // Only allow one task
            return;
        }
        let progress;
        // Wrap the code in try...catch so that the lock can be released anyway
        try {
            addon.data.sync.lock = true;
            let skippedCount = 0;
            if (!items || !items.length) {
                items = Zotero.Items.get(yield addon.api.sync.getSyncNoteIds());
            }
            else {
                items = items.filter((item) => addon.api.sync.isSyncNote(item.id));
            }
            if (items.length === 0) {
                addon.data.sync.lock = false;
                return;
            }
            if (skipActive) {
                // Skip active note editors' targets
                const activeNoteIds = Zotero.Notes._editorInstances
                    .filter((editor) => {
                    const elem = editor._popup.closest("note-editor");
                    return elem && (0, window_1.isElementVisible)(elem);
                })
                    .map((editor) => editor._item.id);
                const filteredItems = items.filter((item) => !activeNoteIds.includes(item.id));
                skippedCount = items.length - filteredItems.length;
                items = filteredItems;
            }
            ztoolkit.log("sync start", reason, items.length, skippedCount);
            if (!quiet) {
                progress = new ztoolkit.ProgressWindow(`[${(0, locale_1.getString)("sync-running-hint-title")}] ${addon.data.env === "development" ? reason : "Obsidian Bridge"}`)
                    .createLine({
                    text: `[${(0, locale_1.getString)("sync-running-hint-check")}] 0/${items.length} ...`,
                    type: "default",
                    progress: 1,
                })
                    .show(-1);
            }
            // Export items of same dir in batch
            const toExport = {};
            const toImport = [];
            const toDiff = [];
            const mdStatusMap = {};
            let i = 1;
            for (const item of items) {
                const syncStatus = addon.api.sync.getSyncStatus(item.id);
                const filepath = syncStatus.path;
                const mdStatus = yield addon.api.sync.getMDStatus(item.id);
                mdStatusMap[item.id] = mdStatus;
                const compareResult = yield doCompare(item, mdStatus);
                switch (compareResult) {
                    case SyncCode.NoteAhead:
                        if (Object.keys(toExport).includes(filepath)) {
                            toExport[filepath].push(item.id);
                        }
                        else {
                            toExport[filepath] = [item.id];
                        }
                        break;
                    case SyncCode.MDAhead:
                        toImport.push(syncStatus);
                        break;
                    case SyncCode.NeedDiff:
                        toDiff.push(syncStatus);
                        break;
                    default:
                        break;
                }
                progress === null || progress === void 0 ? void 0 : progress.changeLine({
                    text: `[${(0, locale_1.getString)("sync-running-hint-check")}] ${i}/${items.length} ...`,
                    progress: ((i - 1) / items.length) * 100,
                });
                i += 1;
            }
            let totalCount = Object.keys(toExport).length;
            ztoolkit.log("will be synced:", totalCount, toImport.length, toDiff.length);
            i = 1;
            for (const filepath of Object.keys(toExport)) {
                progress === null || progress === void 0 ? void 0 : progress.changeLine({
                    text: `[${(0, locale_1.getString)("sync-running-hint-updateMD")}] ${i}/${items.length} ...`,
                    progress: ((i - 1) / items.length) * 100,
                });
                const itemIDs = toExport[filepath];
                yield addon.api.$export.syncMDBatch(filepath, itemIDs, itemIDs.map((id) => mdStatusMap[id].meta), {
                    historyReason: reason,
                });
                i += 1;
            }
            i = 1;
            totalCount = toImport.length;
            for (const syncStatus of toImport) {
                progress === null || progress === void 0 ? void 0 : progress.changeLine({
                    text: `[${(0, locale_1.getString)("sync-running-hint-updateNote")}] ${i}/${totalCount}, ${toDiff.length} queuing...`,
                    progress: ((i - 1) / totalCount) * 100,
                });
                const item = Zotero.Items.get(syncStatus.itemID);
                const filepath = (0, str_1.jointPath)(syncStatus.path, syncStatus.filename);
                yield addon.api.$import.fromMD(filepath, {
                    noteId: item.id,
                    historyReason: reason,
                });
                // Update md file to keep the metadata synced
                yield addon.api.$export.syncMDBatch(syncStatus.path, [item.id], [mdStatusMap[item.id].meta], {
                    historyReason: `${reason}-metadata-refresh`,
                    recordHistory: false,
                });
                i += 1;
            }
            i = 1;
            totalCount = toDiff.length;
            for (const syncStatus of toDiff) {
                progress === null || progress === void 0 ? void 0 : progress.changeLine({
                    text: `[${(0, locale_1.getString)("sync-running-hint-diff")}] ${i}/${totalCount}...`,
                    progress: ((i - 1) / totalCount) * 100,
                });
                yield addon.hooks.onShowSyncDiff(syncStatus.itemID, (0, str_1.jointPath)(syncStatus.path, syncStatus.filename));
                i += 1;
            }
            const syncCount = Object.keys(toExport).length + toImport.length + toDiff.length;
            progress === null || progress === void 0 ? void 0 : progress.changeLine({
                text: (syncCount
                    ? `[${(0, locale_1.getString)("sync-running-hint-finish")}] ${syncCount} ${(0, locale_1.getString)("sync-running-hint-synced")}`
                    : `[${(0, locale_1.getString)("sync-running-hint-finish")}] ${(0, locale_1.getString)("sync-running-hint-upToDate")}`) + (skippedCount ? `, ${skippedCount} skipped.` : ""),
                progress: 100,
            });
        }
        catch (e) {
            ztoolkit.log("[ObsidianBridge Syncing Error]", e);
            (0, hint_1.showHint)(`Sync Error: ${String(e)}`);
        }
        finally {
            progress === null || progress === void 0 ? void 0 : progress.startCloseTimer(5000);
        }
        addon.data.sync.lock = false;
    });
}
function doCompare(noteItem, mdStatus) {
    return __awaiter(this, void 0, void 0, function* () {
        const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
        // No file found
        if (!mdStatus.meta) {
            return SyncCode.NoteAhead;
        }
        // File meta is unavailable
        if (mdStatus.meta.$version < 0) {
            return SyncCode.NeedDiff;
        }
        let MDAhead = false;
        let noteAhead = false;
        const md5 = Zotero.Utilities.Internal.md5(mdStatus.content, false);
        const noteMd5 = Zotero.Utilities.Internal.md5(noteItem.getNote(), false);
        const frontmatterMd5 = mdStatus.meta
            ? Zotero.Utilities.Internal.md5(JSON.stringify(mdStatus.meta), false)
            : "";
        const managedSourceHash = addon.api.obsidian.isManagedNote(noteItem)
            ? yield addon.api.obsidian.getManagedSourceHash(noteItem)
            : "";
        // MD5 doesn't match (md side change)
        if (md5 !== syncStatus.md5) {
            MDAhead = true;
        }
        // Frontmatter changed (md side change, e.g. tags/status/rating edits)
        if (frontmatterMd5 &&
            syncStatus.frontmatterMd5 &&
            frontmatterMd5 !== syncStatus.frontmatterMd5) {
            MDAhead = true;
        }
        // MD5 doesn't match (note side change)
        if (noteMd5 !== syncStatus.noteMd5) {
            noteAhead = true;
        }
        // Note version doesn't match (note side change)
        // This might be unreliable when Zotero account is not login
        if (Number(mdStatus.meta.$version) !== noteItem.version) {
            noteAhead = true;
        }
        if (managedSourceHash && managedSourceHash !== syncStatus.managedSourceHash) {
            noteAhead = true;
        }
        if (noteAhead && MDAhead) {
            return SyncCode.NeedDiff;
        }
        else if (noteAhead) {
            return SyncCode.NoteAhead;
        }
        else if (MDAhead) {
            return SyncCode.MDAhead;
        }
        else {
            // const maxLastModifiedPeriod = 3000;
            // if (
            //   mdStatus.lastmodify &&
            //   syncStatus.lastsync &&
            //   // If the file is modified after the last sync, it's ahead
            //   Math.abs(mdStatus.lastmodify.getTime() - syncStatus.lastsync) >
            //     maxLastModifiedPeriod
            // ) {
            //   return SyncCode.MDAhead;
            // } else {
            //   return SyncCode.UpToDate;
            // }
            return SyncCode.UpToDate;
        }
    });
}
var SyncCode;
(function (SyncCode) {
    SyncCode[SyncCode["UpToDate"] = 0] = "UpToDate";
    SyncCode[SyncCode["NoteAhead"] = 1] = "NoteAhead";
    SyncCode[SyncCode["MDAhead"] = 2] = "MDAhead";
    SyncCode[SyncCode["NeedDiff"] = 3] = "NeedDiff";
})(SyncCode || (SyncCode = {}));
