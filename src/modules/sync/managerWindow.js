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
function showSyncManager() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if ((0, window_1.isWindowAlive)(addon.data.sync.manager.window)) {
            (_a = addon.data.sync.manager.window) === null || _a === void 0 ? void 0 : _a.focus();
            refresh();
        }
        else {
            const windowArgs = {
                _initPromise: Zotero.Promise.defer(),
            };
            const win = Zotero.getMainWindow().openDialog(`chrome://${package_json_1.config.addonRef}/content/syncManager.xhtml`, `${package_json_1.config.addonRef}-syncManager`, `chrome,centerscreen,resizable,status,dialog=no`, windowArgs);
            yield windowArgs._initPromise.promise;
            addon.data.sync.manager.window = win;
            updateData();
            addon.data.sync.manager.tableHelper = new ztoolkit.VirtualizedTable(win)
                .setContainerId("table-container")
                .setProp({
                id: "manager-table",
                // Do not use setLocale, as it modifies the Zotero.Intl.strings
                // Set locales directly to columns
                columns: [
                    {
                        dataKey: "noteName",
                        label: "syncManager-noteName",
                        fixedWidth: false,
                    },
                    {
                        dataKey: "lastSync",
                        label: "syncManager-lastSync",
                        fixedWidth: false,
                    },
                    {
                        dataKey: "filePath",
                        label: "syncManager-filePath",
                        fixedWidth: false,
                    },
                ].map((column) => Object.assign(column, {
                    label: (0, locale_1.getString)(column.label),
                })),
                showHeader: true,
                multiSelect: true,
                staticColumns: false,
                disableFontSizeScaling: true,
            })
                .setProp("getRowCount", () => addon.data.sync.manager.data.length)
                .setProp("getRowData", (index) => addon.data.sync.manager.data[index] || {
                noteName: "no data",
                lastSync: "no data",
                filePath: "no data",
            })
                .setProp("onSelectionChange", (selection) => {
                updateButtons();
            })
                .setProp("onKeyDown", (event) => {
                if (event.key == "Delete" ||
                    (Zotero.isMac && event.key == "Backspace")) {
                    unSyncNotes(getSelectedNoteIds());
                    refresh();
                    return false;
                }
                return true;
            })
                .setProp("onActivate", (ev) => {
                const noteIds = getSelectedNoteIds();
                noteIds.forEach((noteId) => addon.hooks.onOpenNote(noteId, "builtin"));
                return true;
            })
                .setProp("getRowString", (index) => { var _a; return ((_a = addon.data.sync.manager) === null || _a === void 0 ? void 0 : _a.data[index].noteName) || ""; })
                .setProp("onColumnSort", (columnIndex, ascending) => __awaiter(this, void 0, void 0, function* () {
                addon.data.sync.manager.columnIndex = columnIndex;
                addon.data.sync.manager.columnAscending = ascending > 0;
                yield updateData();
                yield refresh();
            }))
                .render();
            const refreshButton = win.document.querySelector("#refresh");
            const syncButton = win.document.querySelector("#sync");
            const unSyncButton = win.document.querySelector("#unSync");
            const detectButton = win.document.querySelector("#detect");
            refreshButton.addEventListener("click", (ev) => {
                refresh();
            });
            syncButton.addEventListener("click", (ev) => __awaiter(this, void 0, void 0, function* () {
                yield addon.hooks.onSyncing(Zotero.Items.get(getSelectedNoteIds()), {
                    quiet: false,
                    skipActive: false,
                    reason: "manual-manager",
                });
                refresh();
            }));
            unSyncButton.addEventListener("click", (ev) => {
                getSelectedNoteIds().forEach((noteId) => {
                    addon.api.sync.removeSyncNote(noteId);
                });
                refresh();
            });
            detectButton.addEventListener("click", () => {
                detectSyncedNotes();
            });
        }
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
                noteId: noteId,
                noteName: Zotero.Items.get(noteId).getNoteTitle(),
                lastSync: new Date(syncStatus.lastsync).toLocaleString(),
                filePath: (0, str_1.jointPath)(syncStatus.path, syncStatus.filename),
            };
        })
            .sort((a, b) => {
            if (!a || !b) {
                return 0;
            }
            const valueA = String(a[sortKey] || "");
            const valueB = String(b[sortKey] || "");
            return addon.data.sync.manager.columnAscending
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        });
    });
}
function updateTable() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            var _a;
            (_a = addon.data.sync.manager.tableHelper) === null || _a === void 0 ? void 0 : _a.render(undefined, (_) => {
                resolve();
            });
        });
    });
}
function updateButtons() {
    var _a;
    const win = addon.data.sync.manager.window;
    if (!win) {
        return;
    }
    const unSyncButton = win.document.querySelector("#unSync");
    if ((_a = addon.data.sync.manager.tableHelper) === null || _a === void 0 ? void 0 : _a.treeInstance.selection.selected.size) {
        unSyncButton.disabled = false;
    }
    else {
        unSyncButton.disabled = true;
    }
}
function refresh() {
    return __awaiter(this, void 0, void 0, function* () {
        updateData();
        yield updateTable();
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
        }))))
            return;
        for (const status of statusList) {
            addon.api.sync.updateSyncStatus(status.itemID, status);
        }
        yield addon.hooks.onSyncing();
        yield refresh();
    });
}
