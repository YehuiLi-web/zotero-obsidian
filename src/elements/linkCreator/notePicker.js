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
exports.NotePicker = void 0;
const package_json_1 = require("../../../package.json");
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const base_1 = require("../base");
const prefs_1 = require("../../utils/prefs");
const _require = window.require;
const CollectionTree = _require("chrome://zotero/content/collectionTree.js");
const ItemTree = _require("chrome://zotero/content/itemTree.js");
const { getCSSItemTypeIcon } = _require("components/icons");
const persistKey = "persist.notePicker";
class NotePicker extends base_1.PluginCEBase {
    constructor() {
        super(...arguments);
        this.openedNotes = [];
        this.recentNotes = [];
        this.activeSelectionType = "none";
        this.uid = Zotero.Utilities.randomString(8);
        this._cachedLibraryIDs = [];
        this._cachedSelectedNoteIDs = [];
        this._disableSelectionChange = false;
    }
    get content() {
        return MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/linkCreator/notePicker.css"
  ></html:link>
</linkset>
<vbox id="select-items-dialog" class="container">
  <vbox id="zotero-select-items-container" class="container" flex="1">
    <hbox id="search-toolbar" class="toolbar">
      <hbox class="toolbar-start"></hbox>
      <hbox class="toolbar-middle"></hbox>
      <hbox class="toolbar-end"></hbox>
    </hbox>
    <vbox class="container">
      <hbox id="collections-items-container">
        <vbox
          id="zotero-collections-tree-container"
          class="virtualized-table-container"
        >
          <html:div id="zotero-collections-tree"></html:div>
        </vbox>
        <splitter id="collections-items-splitter" orient="horizontal" collapse="after"></splitter>
        <hbox
          id="zotero-items-pane-content"
          class="virtualized-table-container"
          flex="1"
        >
          <html:div id="zotero-items-tree"></html:div>
        </hbox>
      </hbox>
      <hbox id="bn-select-opened-notes-container" class="container">
        <vbox
          id="bn-select-opened-notes-content"
          class="container virtualized-table-container bn-note-list-container"
        >
          <html:div id="bn-select-opened-notes-tree-${this.uid}"></html:div>
        </vbox>
         <vbox
          id="bn-select-recent-notes-content"
          class="container virtualized-table-container bn-note-list-container"
        >
          <html:div id="bn-select-recent-notes-tree-${this.uid}"></html:div>
        </vbox>
      </hbox>
    </vbox>
  </vbox>
</vbox>
`);
    }
    set openedNoteIDs(ids) {
        this.openedNotes = Zotero.Items.get(ids).filter((item) => item.isNote());
        if (this.openedNotesView) {
            this.openedNotesView.render();
            return;
        }
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            window.addEventListener("unload", () => {
                this.destroy();
            });
            this._collectionsList = this.querySelector("#zotero-collections-tree-container");
            this._restoreState();
            (_a = this.querySelector("#collections-items-splitter")) === null || _a === void 0 ? void 0 : _a.addEventListener("mouseup", () => {
                this._persistState();
            });
            this._prefObserverID = (0, prefs_1.registerPrefObserver)(persistKey, this._restoreState.bind(this));
        });
    }
    destroy() {
        var _a, _b;
        (_a = this.collectionsView) === null || _a === void 0 ? void 0 : _a.unregister();
        (_b = this.itemsView) === null || _b === void 0 ? void 0 : _b.unregister();
        (0, prefs_1.unregisterPrefObserver)(this._prefObserverID);
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadLibraryNotes();
            this.loadQuickSearch();
            yield this.loadOpenedNotes();
            this.recentNotes = this.getRecentNotes();
            yield this.loadRecentNotes();
        });
    }
    loadLibraryNotes() {
        return __awaiter(this, void 0, void 0, function* () {
            this.itemsView = yield ItemTree.init(this.querySelector("#zotero-items-tree"), {
                onSelectionChange: () => {
                    this.onItemSelected();
                },
                id: "select-items-dialog",
                dragAndDrop: false,
                persistColumns: true,
                columnPicker: true,
                emptyMessage: Zotero.getString("pane.items.loading"),
            });
            this.itemsView.isSelectable = (index, selectAll = false) => {
                const row = this.itemsView.getRow(index);
                if (!row) {
                    return false;
                }
                // @ts-ignore
                if (!row.ref.isNote())
                    return false;
                if (this.itemsView.collectionTreeRow.isTrash()) {
                    // @ts-ignore
                    return row.ref.deleted;
                }
                else {
                    // @ts-ignore
                    return this.itemsView._searchItemIDs.has(row.id);
                }
            };
            this.itemsView.setItemsPaneMessage(Zotero.getString("pane.items.loading"));
            // Wait otherwise the collection tree will not be initialized
            yield Zotero.Promise.delay(10);
            this.collectionsView = yield CollectionTree.init(this.querySelector("#zotero-collections-tree"), {
                onSelectionChange: Zotero.Utilities.debounce(() => this.onCollectionSelected(), 100),
            });
            this.collectionsView.hideSources = ["duplicates", "trash", "feeds"];
            yield this.collectionsView.makeVisible();
        });
    }
    loadQuickSearch() {
        var _a;
        const searchBox = document.createXULElement("quick-search-textbox");
        searchBox.id = "zotero-tb-search";
        searchBox.setAttribute("timeout", "250");
        searchBox.setAttribute("dir", "reverse");
        searchBox.addEventListener("command", () => this.onSearch());
        (_a = this.querySelector("#search-toolbar > .toolbar-end")) === null || _a === void 0 ? void 0 : _a.appendChild(searchBox);
        // @ts-ignore
        searchBox.updateMode();
    }
    loadOpenedNotes() {
        return __awaiter(this, void 0, void 0, function* () {
            const renderLock = Zotero.Promise.defer();
            this.openedNotesView = new zotero_plugin_toolkit_1.VirtualizedTableHelper(window)
                .setContainerId(`bn-select-opened-notes-tree-${this.uid}`)
                .setProp({
                id: `bn-select-opened-notes-table-${this.uid}`,
                columns: [
                    {
                        dataKey: "title",
                        label: "Opened Notes",
                        flex: 1,
                    },
                ],
                showHeader: true,
                multiSelect: false,
                staticColumns: true,
                disableFontSizeScaling: true,
            })
                .setProp("getRowCount", () => this.openedNotes.length || 0)
                .setProp("getRowData", (index) => {
                const note = this.openedNotes[index];
                return {
                    title: note.getNoteTitle(),
                };
            })
                .setProp("onSelectionChange", (selection) => {
                this.onOpenedNoteSelected(selection);
            })
                // For find-as-you-type
                .setProp("getRowString", (index) => this.openedNotes[index].getNoteTitle() || "")
                .setProp("renderItem", (index, selection, oldElem, columns) => {
                let div;
                if (oldElem) {
                    div = oldElem;
                    div.innerHTML = "";
                }
                else {
                    div = document.createElement("div");
                    div.className = "row";
                }
                div.classList.toggle("selected", selection.isSelected(index));
                div.classList.toggle("focused", selection.focused == index);
                const rowData = this.openedNotes[index];
                for (const column of columns) {
                    const span = document.createElement("span");
                    // @ts-ignore
                    span.className = `cell ${column === null || column === void 0 ? void 0 : column.className}`;
                    span.textContent = rowData.getNoteTitle();
                    const icon = getCSSItemTypeIcon("note");
                    icon.classList.add("cell-icon");
                    span.prepend(icon);
                    div.append(span);
                }
                return div;
            })
                .render(-1, () => {
                renderLock.resolve();
            });
            yield renderLock.promise;
            // if (this.openedNotes.length === 1) {
            //   this.openedNotesView.treeInstance.selection.select(0);
            // }
        });
    }
    loadRecentNotes() {
        return __awaiter(this, void 0, void 0, function* () {
            const renderLock = Zotero.Promise.defer();
            this.recentNotesView = new zotero_plugin_toolkit_1.VirtualizedTableHelper(window)
                .setContainerId(`bn-select-recent-notes-tree-${this.uid}`)
                .setProp({
                id: `bn-select-recent-notes-table-${this.uid}`,
                columns: [
                    {
                        dataKey: "title",
                        label: "Recent Notes",
                        flex: 1,
                    },
                ],
                showHeader: true,
                multiSelect: false,
                staticColumns: true,
                disableFontSizeScaling: true,
            })
                .setProp("getRowCount", () => this.recentNotes.length || 0)
                .setProp("getRowData", (index) => {
                const note = this.recentNotes[index];
                return {
                    title: note.getNoteTitle(),
                };
            })
                .setProp("onSelectionChange", (selection) => {
                this.onRecentNoteSelected(selection);
            })
                // For find-as-you-type
                .setProp("getRowString", (index) => this.recentNotes[index].getNoteTitle() || "")
                .setProp("renderItem", (index, selection, oldElem, columns) => {
                let div;
                if (oldElem) {
                    div = oldElem;
                    div.innerHTML = "";
                }
                else {
                    div = document.createElement("div");
                    div.className = "row";
                }
                div.classList.toggle("selected", selection.isSelected(index));
                div.classList.toggle("focused", selection.focused == index);
                const rowData = this.recentNotes[index];
                for (const column of columns) {
                    const span = document.createElement("span");
                    // @ts-ignore
                    span.className = `cell ${column === null || column === void 0 ? void 0 : column.className}`;
                    span.textContent = rowData.getNoteTitle();
                    const icon = getCSSItemTypeIcon("note");
                    icon.classList.add("cell-icon");
                    span.prepend(icon);
                    div.append(span);
                }
                return div;
            })
                .render(-1, () => {
                renderLock.resolve();
            });
            yield renderLock.promise;
            if (this.recentNotes.length > 0) {
                setTimeout(() => {
                    this.recentNotesView.treeInstance.selection.select(0);
                    this.onRecentNoteSelected(this.recentNotesView.treeInstance.selection);
                }, 200);
            }
        });
    }
    onSearch() {
        var _a;
        if (this.itemsView) {
            const searchVal = (_a = this.querySelector("#zotero-tb-search-textbox")) === null || _a === void 0 ? void 0 : _a.value;
            this.itemsView.setFilter("search", searchVal);
        }
    }
    onCollectionSelected() {
        return __awaiter(this, void 0, void 0, function* () {
            const collectionTreeRow = this.collectionsView.getRow(this.collectionsView.selection.focused);
            if (!this.collectionsView.selection.count)
                return;
            // Collection not changed
            if (this.itemsView &&
                this.itemsView.collectionTreeRow &&
                this.itemsView.collectionTreeRow.id == collectionTreeRow.id) {
                return;
            }
            // @ts-ignore
            if (!collectionTreeRow._zobPatched) {
                // @ts-ignore
                collectionTreeRow._zobPatched = true;
                const getItems = collectionTreeRow.getItems.bind(collectionTreeRow);
                // @ts-ignore
                collectionTreeRow.getItems = function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const items = (yield getItems());
                        return items.filter((item) => item.isNote());
                    });
                };
            }
            collectionTreeRow.setSearch("");
            Zotero.Prefs.set("lastViewedFolder", collectionTreeRow.id);
            this.itemsView.setItemsPaneMessage(Zotero.getString("pane.items.loading"));
            // Load library data if necessary
            const library = Zotero.Libraries.get(collectionTreeRow.ref.libraryID);
            if (library) {
                if (!library.getDataLoaded("item")) {
                    Zotero.debug("Waiting for items to load for library " + library.libraryID);
                    yield library.waitForDataLoad("item");
                }
            }
            yield this.itemsView.changeCollectionTreeRow(collectionTreeRow);
            this.itemsView.clearItemsPaneMessage();
            this.collectionsView.runListeners("select");
        });
    }
    onItemSelected() {
        if (this._disableSelectionChange) {
            return;
        }
        this.activeSelectionType = "library";
        const selectedIDs = this.itemsView.getSelectedItems(true);
        // Compare the selected IDs with the cached IDs
        // Since the library selection change can be triggered multiple times or with no change
        if (arraysEqual(this._cachedLibraryIDs, selectedIDs)) {
            return;
        }
        this.deselectOtherPanes();
        this.dispatchSelectionChange();
    }
    onOpenedNoteSelected(selection) {
        if (this._disableSelectionChange) {
            return;
        }
        this.activeSelectionType = "tabs";
        this.deselectOtherPanes();
        this.dispatchSelectionChange(selection);
    }
    onRecentNoteSelected(selection) {
        if (this._disableSelectionChange) {
            return;
        }
        this.activeSelectionType = "recent";
        this.deselectOtherPanes();
        this.dispatchSelectionChange(selection);
    }
    deselectItemsPane() {
        var _a, _b;
        (_b = (_a = this.itemsView) === null || _a === void 0 ? void 0 : _a.selection) === null || _b === void 0 ? void 0 : _b.clearSelection();
    }
    deselectOpenedNotePane() {
        var _a, _b, _c;
        (_c = (_b = (_a = this.openedNotesView) === null || _a === void 0 ? void 0 : _a.treeInstance) === null || _b === void 0 ? void 0 : _b.selection) === null || _c === void 0 ? void 0 : _c.clearSelection();
    }
    deselectRecentNotePane() {
        var _a, _b, _c;
        (_c = (_b = (_a = this.recentNotesView) === null || _a === void 0 ? void 0 : _a.treeInstance) === null || _b === void 0 ? void 0 : _b.selection) === null || _c === void 0 ? void 0 : _c.clearSelection();
    }
    deselectOtherPanes() {
        this._disableSelectionChange = true;
        if (this.activeSelectionType !== "library")
            this.deselectItemsPane();
        if (this.activeSelectionType !== "tabs")
            this.deselectOpenedNotePane();
        if (this.activeSelectionType !== "recent")
            this.deselectRecentNotePane();
        this._disableSelectionChange = false;
    }
    getRecentNotes() {
        return ((0, prefs_1.getPref)("linkCreator.recentNotes") || "")
            .split(",")
            .map((id) => Zotero.Items.get(parseInt(id)))
            .filter((item) => item && item.isNote());
    }
    saveRecentNotes() {
        const selectedNotes = this.getSelectedNotes();
        if (!selectedNotes.length) {
            return;
        }
        const recentNotes = [...selectedNotes.map((note) => note.id)];
        for (const note of this.recentNotes) {
            if (!recentNotes.includes(note.id)) {
                recentNotes.push(note.id);
            }
        }
        // Save only 10 recent notes
        (0, prefs_1.setPref)("linkCreator.recentNotes", recentNotes.slice(0, 10).join(","));
    }
    dispatchSelectionChange(selection) {
        if (this._disableSelectionChange) {
            return false;
        }
        const selectedNotes = this.getSelectedNotes(selection);
        const selectedNoteIDs = selectedNotes.map((n) => n.id);
        if (arraysEqual(this._cachedSelectedNoteIDs, selectedNoteIDs)) {
            return false;
        }
        this._cachedSelectedNoteIDs = selectedNoteIDs;
        this.dispatchEvent(new CustomEvent("selectionchange", {
            detail: {
                selectedNotes,
            },
        }));
        return true;
    }
    getSelectedNotes(selection) {
        if (this.activeSelectionType == "none") {
            return [];
        }
        else if (this.activeSelectionType == "library") {
            return this.itemsView.getSelectedItems();
        }
        else if (this.activeSelectionType == "tabs") {
            return Array.from((selection || this.openedNotesView.treeInstance.selection).selected).map((index) => this.openedNotes[index]);
        }
        else if (this.activeSelectionType == "recent") {
            return Array.from((selection || this.recentNotesView.treeInstance.selection).selected).map((index) => this.recentNotes[index]);
        }
        return [];
    }
    _persistState() {
        var _a;
        let state = (0, prefs_1.getPrefJSON)(persistKey);
        const collectionsListWidth = (_a = getComputedStyle(this._collectionsList)) === null || _a === void 0 ? void 0 : _a.width;
        if ((state === null || state === void 0 ? void 0 : state.collectionsListWidth) === collectionsListWidth) {
            return;
        }
        state = Object.assign(Object.assign({}, state), { collectionsListWidth });
        (0, prefs_1.setPref)(persistKey, JSON.stringify(state));
    }
    _restoreState() {
        var _a;
        const state = (0, prefs_1.getPrefJSON)(persistKey);
        if (typeof state.collectionsListWidth === "string" &&
            state.collectionsListWidth !==
                Number((_a = getComputedStyle(this._collectionsList)) === null || _a === void 0 ? void 0 : _a.width)) {
            this._collectionsList.style.width = state.collectionsListWidth;
        }
    }
}
exports.NotePicker = NotePicker;
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length)
        return false;
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    if (set1.size !== set2.size)
        return false;
    for (const item of set1) {
        if (!set2.has(item))
            return false;
    }
    return true;
}
