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
exports.showSyncManager = showSyncManager;
const package_json_1 = require("../../../package.json");
const link_1 = require("../../utils/link");
const locale_1 = require("../../utils/locale");
const str_1 = require("../../utils/str");
const window_1 = require("../../utils/window");
function managerText(zh, en) {
    return String(Zotero.locale || "").toLowerCase().startsWith("zh") ? zh : en;
}
function showSyncManager() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if ((0, window_1.isWindowAlive)(addon.data.sync.manager.window)) {
            (_a = addon.data.sync.manager.window) === null || _a === void 0 ? void 0 : _a.focus();
            yield refresh();
            return;
        }
        const windowArgs = {
            _initPromise: Zotero.Promise.defer(),
        };
        const win = Zotero.getMainWindow().openDialog(`chrome://${package_json_1.config.addonRef}/content/syncManager.xhtml`, `${package_json_1.config.addonRef}-syncManager`, `chrome,centerscreen,resizable,status,dialog=no`, windowArgs);
        yield windowArgs._initPromise.promise;
        addon.data.sync.manager.window = win;
        yield updateData();
        yield updateHistoryData();
        addon.data.sync.manager.tableHelper = new ztoolkit.VirtualizedTable(win)
            .setContainerId("table-container")
            .setProp({
            id: "manager-table",
            columns: [
                {
                    dataKey: "noteName",
                    label: (0, locale_1.getString)("syncManager-noteName"),
                    fixedWidth: false,
                },
                {
                    dataKey: "lastSync",
                    label: (0, locale_1.getString)("syncManager-lastSync"),
                    fixedWidth: false,
                },
                {
                    dataKey: "filePath",
                    label: (0, locale_1.getString)("syncManager-filePath"),
                    fixedWidth: false,
                },
            ],
            showHeader: true,
            multiSelect: true,
            staticColumns: false,
            disableFontSizeScaling: true,
        })
            .setProp("getRowCount", () => addon.data.sync.manager.data.length)
            .setProp("getRowData", (index) => {
            const row = addon.data.sync.manager.data[index];
            return {
                noteName: (row === null || row === void 0 ? void 0 : row.noteName) || "no data",
                lastSync: (row === null || row === void 0 ? void 0 : row.lastSync) || "no data",
                filePath: (row === null || row === void 0 ? void 0 : row.filePath) || "no data",
            };
        })
            .setProp("onSelectionChange", () => {
            updateButtons();
            void refreshHistory();
        })
            .setProp("onKeyDown", (event) => {
            if (event.key == "Delete" || (Zotero.isMac && event.key == "Backspace")) {
                void unSyncNotes(getSelectedNoteIds());
                return false;
            }
            return true;
        })
            .setProp("onActivate", () => {
            const noteIds = getSelectedNoteIds();
            noteIds.forEach((noteId) => addon.hooks.onOpenNote(noteId, "builtin"));
            return true;
        })
            .setProp("getRowString", (index) => { var _a; return ((_a = addon.data.sync.manager) === null || _a === void 0 ? void 0 : _a.data[index].noteName) || ""; })
            .setProp("onColumnSort", (columnIndex, ascending) => __awaiter(this, void 0, void 0, function* () {
            addon.data.sync.manager.columnIndex = columnIndex;
            addon.data.sync.manager.columnAscending = ascending > 0;
            yield refresh();
        }))
            .render();
        addon.data.sync.manager.historyTableHelper = new ztoolkit.VirtualizedTable(win)
            .setContainerId("history-table-container")
            .setProp({
            id: "manager-history-table",
            columns: [
                {
                    dataKey: "timestamp",
                    label: managerText("时间", "Time"),
                    fixedWidth: false,
                },
                {
                    dataKey: "action",
                    label: managerText("动作", "Action"),
                    fixedWidth: false,
                },
                {
                    dataKey: "reason",
                    label: managerText("来源", "Reason"),
                    fixedWidth: false,
                },
            ],
            showHeader: true,
            multiSelect: false,
            staticColumns: false,
            disableFontSizeScaling: true,
        })
            .setProp("getRowCount", () => addon.data.sync.manager.historyData.length)
            .setProp("getRowData", (index) => {
            const row = addon.data.sync.manager.historyData[index];
            return {
                timestamp: (row === null || row === void 0 ? void 0 : row.timestamp) || "no data",
                action: (row === null || row === void 0 ? void 0 : row.action) || "no data",
                reason: (row === null || row === void 0 ? void 0 : row.reason) || "no data",
            };
        })
            .setProp("onSelectionChange", () => {
            updateHistoryPreview();
        })
            .setProp("onActivate", () => {
            var _a;
            const entry = getSelectedHistoryEntry() || addon.data.sync.manager.historyData[0];
            if ((_a = entry === null || entry === void 0 ? void 0 : entry.entry) === null || _a === void 0 ? void 0 : _a.noteId) {
                addon.hooks.onOpenNote(entry.entry.noteId, "builtin");
            }
            return true;
        })
            .setProp("getRowString", (index) => { var _a; return ((_a = addon.data.sync.manager) === null || _a === void 0 ? void 0 : _a.historyData[index].preview) || ""; })
            .render();
        const refreshButton = win.document.querySelector("#refresh");
        const syncButton = win.document.querySelector("#sync");
        const unSyncButton = win.document.querySelector("#unSync");
        const detectButton = win.document.querySelector("#detect");
        const clearHistoryButton = win.document.querySelector("#clearHistory");
        refreshButton.addEventListener("click", () => {
            void refresh();
        });
        syncButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
            yield addon.hooks.onSyncing(Zotero.Items.get(getSelectedNoteIds()), {
                quiet: false,
                skipActive: false,
                reason: "manual-manager",
            });
            yield refresh();
        }));
        unSyncButton.addEventListener("click", () => {
            void unSyncNotes(getSelectedNoteIds());
        });
        detectButton.addEventListener("click", () => {
            void detectSyncedNotes();
        });
        clearHistoryButton.addEventListener("click", () => {
            void clearHistoryForSelection();
        });
        updateHistoryPreview();
        updateButtons();
    });
}
const sortDataKeys = ["noteName", "lastSync", "filePath"];
function updateData() {
    return __awaiter(this, void 0, void 0, function* () {
        const sortKey = sortDataKeys[addon.data.sync.manager.columnIndex];
        addon.data.sync.manager.data = (yield addon.api.sync.getSyncNoteIds())
            .map((noteId) => {
            const syncStatus = addon.api.sync.getSyncStatus(noteId);
            return {
                noteId,
                noteName: Zotero.Items.get(noteId).getNoteTitle(),
                lastSync: new Date(syncStatus.lastsync).toLocaleString(),
                filePath: (0, str_1.jointPath)(syncStatus.path, syncStatus.filename),
            };
        })
            .sort((a, b) => {
            const valueA = String((a === null || a === void 0 ? void 0 : a[sortKey]) || "");
            const valueB = String((b === null || b === void 0 ? void 0 : b[sortKey]) || "");
            return addon.data.sync.manager.columnAscending
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        });
    });
}
function updateHistoryData() {
    return __awaiter(this, arguments, void 0, function* (noteIds = getSelectedNoteIds()) {
        addon.data.sync.manager.historyData = addon.api.sync
            .getHistory(noteIds, 100)
            .map((entry) => ({
            id: entry.id,
            timestamp: new Date(entry.timestamp).toLocaleString(),
            action: addon.api.sync.getHistoryActionLabel(entry),
            reason: entry.reason || "unknown",
            filePath: entry.filePath,
            preview: addon.api.sync.formatHistoryPreview(entry),
            entry,
        }));
    });
}
function updateTable() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            var _a;
            (_a = addon.data.sync.manager.tableHelper) === null || _a === void 0 ? void 0 : _a.render(undefined, () => {
                resolve();
            });
        });
    });
}
function updateHistoryTable() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            var _a;
            (_a = addon.data.sync.manager.historyTableHelper) === null || _a === void 0 ? void 0 : _a.render(undefined, () => {
                resolve();
            });
        });
    });
}
function updateButtons() {
    const win = addon.data.sync.manager.window;
    if (!win) {
        return;
    }
    const unSyncButton = win.document.querySelector("#unSync");
    const clearHistoryButton = win.document.querySelector("#clearHistory");
    unSyncButton.disabled = !getSelectedNoteIds().length;
    clearHistoryButton.disabled = !addon.data.sync.manager.historyData.length;
}
function updateHistoryPreview() {
    var _a;
    const preview = (_a = addon.data.sync.manager.window) === null || _a === void 0 ? void 0 : _a.document.querySelector("#history-preview");
    if (!preview) {
        return;
    }
    const entry = getSelectedHistoryEntry() || addon.data.sync.manager.historyData[0];
    preview.textContent =
        (entry === null || entry === void 0 ? void 0 : entry.preview) ||
            managerText("选择一条同步记录即可查看本次同步的 diff。", "Select a history record to inspect the diff.");
}
function refresh() {
    return __awaiter(this, void 0, void 0, function* () {
        yield updateData();
        yield updateTable();
        yield refreshHistory();
        updateButtons();
    });
}
function refreshHistory() {
    return __awaiter(this, void 0, void 0, function* () {
        yield updateHistoryData();
        yield updateHistoryTable();
        updateHistoryPreview();
        updateButtons();
    });
}
function getSelectedNoteIds() {
    var _a, _b;
    const ids = [];
    for (const idx of ((_b = (_a = addon.data.sync.manager.tableHelper) === null || _a === void 0 ? void 0 : _a.treeInstance.selection.selected) === null || _b === void 0 ? void 0 : _b.keys()) ||
        []) {
        ids.push(addon.data.sync.manager.data[idx].noteId);
    }
    return ids;
}
function getSelectedHistoryEntry() {
    var _a;
    const selected = (_a = addon.data.sync.manager.historyTableHelper) === null || _a === void 0 ? void 0 : _a.treeInstance.selection.selected;
    const firstSelected = selected ? Array.from(selected.keys())[0] : undefined;
    return typeof firstSelected === "number"
        ? addon.data.sync.manager.historyData[firstSelected]
        : undefined;
}
function clearHistoryForSelection() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const noteIds = getSelectedNoteIds();
        const confirmed = (_a = addon.data.sync.manager.window) === null || _a === void 0 ? void 0 : _a.confirm(noteIds.length
            ? managerText("清除所选笔记的同步历史？", "Clear sync history for the selected notes?")
            : managerText("当前没有选中笔记。要清除全部同步历史吗？", "No notes are selected. Clear all sync history?"));
        if (!confirmed) {
            return;
        }
        addon.api.sync.clearHistory(noteIds);
        yield refreshHistory();
    });
}
function unSyncNotes(itemIds) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (itemIds.length === 0) {
            return;
        }
        const unSyncLinkedNotes = (_a = addon.data.sync.manager.window) === null || _a === void 0 ? void 0 : _a.confirm(`Un-sync their linked notes?`);
        if (unSyncLinkedNotes) {
            for (const item of Zotero.Items.get(itemIds)) {
                const linkedIds = (0, link_1.getLinkedNotesRecursively)((0, link_1.getNoteLink)(item) || "", itemIds);
                itemIds.push(...linkedIds);
            }
        }
        for (const itemId of itemIds) {
            yield addon.api.sync.removeSyncNote(itemId);
        }
        yield refresh();
    });
}
function detectSyncedNotes() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const dir = yield new addon.data.ztoolkit.FilePicker("Select folder to detect", "folder").open();
        if (!dir)
            return;
        const statusList = yield addon.api.sync.findAllSyncedFiles(dir);
        let current = 0;
        for (const status of statusList) {
            if (addon.api.sync.isSyncNote(status.itemID)) {
                current++;
            }
        }
        const total = statusList.length;
        const newCount = total - current;
        if (!((_a = addon.data.sync.manager.window) === null || _a === void 0 ? void 0 : _a.confirm((0, locale_1.getString)("syncManager-detectConfirmInfo", {
            args: {
                total,
                new: newCount,
                current,
                dir,
            },
        })))) {
            return;
        }
        for (const status of statusList) {
            addon.api.sync.updateSyncStatus(status.itemID, status);
        }
        yield addon.hooks.onSyncing();
        yield refresh();
    });
}
