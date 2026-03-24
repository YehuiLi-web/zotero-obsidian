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
exports.OutlinePicker = void 0;
const package_json_1 = require("../../../package.json");
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const base_1 = require("../base");
class OutlinePicker extends base_1.PluginCEBase {
    constructor() {
        super(...arguments);
        this.noteOutline = [];
        this.uid = Zotero.Utilities.randomString(8);
    }
    get content() {
        return MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/linkCreator/noteOutline.css"
  ></html:link>
</linkset>
<hbox class="toolbar">
  <hbox class="toolbar-start"></hbox>
  <hbox class="toolbar-middle"></hbox>
  <hbox class="toolbar-end"></hbox>
</hbox>
<vbox id="bn-select-note-outline-container">
  <vbox
    id="bn-select-note-outline-content"
    class="virtualized-table-container"
  >
    <html:div id="bn-select-note-outline-tree-${this.uid}"></html:div>
  </vbox>
</vbox>
<hbox id="bn-link-insert-position-container">
  <label>At section</label>
  <radiogroup id="bn-link-insert-position" orient="horizontal">
    <radio
      id="bn-link-insert-position-top"
      label="Start"
      value="start"
    ></radio>
    <radio
      id="bn-link-insert-position-bottom"
      label="End"
      value="end"
    ></radio>
  </radiogroup>
</hbox>
`);
    }
    get item() {
        return this._item;
    }
    set item(item) {
        this._item = item;
    }
    set lineIndex(index) {
        this._lineIndex = index;
    }
    get lineIndex() {
        return this._lineIndex;
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            this.loadNoteOutline();
        });
    }
    loadNoteOutline() {
        return __awaiter(this, void 0, void 0, function* () {
            const renderLock = Zotero.Promise.defer();
            this.noteOutlineView = new zotero_plugin_toolkit_1.VirtualizedTableHelper(window)
                .setContainerId(`bn-select-note-outline-tree-${this.uid}`)
                .setProp({
                id: `bn-select-note-outline-table-${this.uid}`,
                columns: [
                    {
                        dataKey: "level",
                        label: "Level",
                        width: 50,
                        staticWidth: true,
                    },
                    {
                        dataKey: "name",
                        label: "Table of Contents",
                        flex: 1,
                    },
                ],
                showHeader: true,
                multiSelect: false,
                staticColumns: true,
                disableFontSizeScaling: true,
            })
                .setProp("getRowCount", () => this.noteOutline.length || 0)
                .setProp("getRowData", (index) => {
                var _a;
                const model = (_a = this.noteOutline[index]) === null || _a === void 0 ? void 0 : _a.model;
                if (!model)
                    return { level: 0, name: "**Unknown**" };
                return {
                    level: model.level,
                    name: (model.level > 0 ? "··".repeat(model.level - 1) : "") + model.name,
                };
            })
                .setProp("onSelectionChange", (selection) => {
                this.onOutlineSelected(selection);
            })
                // For find-as-you-type
                .setProp("getRowString", (index) => { var _a; return ((_a = this.noteOutline[index]) === null || _a === void 0 ? void 0 : _a.model.name) || ""; })
                .render(-1, () => {
                renderLock.resolve();
            });
            yield renderLock.promise;
            // if (openedNotes.length === 1) {
            //   openedNotesView.treeInstance.selection.select(0);
            // }
        });
    }
    onOutlineSelected(selection) {
        this.dispatchSelectionChange(selection);
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.item) {
                return;
            }
            this.noteOutline = yield this._addon.api.note.getNoteTreeFlattened(this.item);
            // Fake a cursor position
            if (typeof this.lineIndex === "number") {
                // @ts-ignore - formatValues is not in the types
                const [name] = (yield ((_a = document === null || document === void 0 ? void 0 : document.l10n) === null || _a === void 0 ? void 0 : _a.formatValues([
                    {
                        id: `${package_json_1.config.addonRef}-outlinePicker-cursorLine`,
                        args: { line: this.lineIndex },
                    },
                ])));
                this.noteOutline.unshift({
                    model: {
                        level: 0,
                        name,
                        lineIndex: this._lineIndex,
                        endIndex: this._lineIndex,
                    },
                });
            }
            (_b = this.noteOutlineView) === null || _b === void 0 ? void 0 : _b.render(undefined);
        });
    }
    dispatchSelectionChange(selection) {
        this.dispatchEvent(new CustomEvent("selectionchange", {
            detail: {
                selectedSection: this.getSelectedSection(selection),
            },
        }));
    }
    getSelectedSection(selection) {
        var _a;
        const selected = (selection || this.noteOutlineView.treeInstance.selection).selected
            .values()
            .next().value;
        return (_a = this.noteOutline[selected]) === null || _a === void 0 ? void 0 : _a.model;
    }
}
exports.OutlinePicker = OutlinePicker;
