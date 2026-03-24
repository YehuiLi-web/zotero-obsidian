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
exports.OutlinePane = void 0;
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const package_json_1 = require("../../../package.json");
const str_1 = require("../../utils/str");
const wait_1 = require("../../utils/wait");
const workspace_1 = require("../../utils/workspace");
const base_1 = require("../base");
const prefs_1 = require("../../utils/prefs");
const hint_1 = require("../../utils/hint");
const persistKey = "persist.workspaceOutline";
class OutlinePane extends base_1.PluginCEBase {
    constructor() {
        super(...arguments);
        this._outlineType = workspace_1.OutlineType.empty;
        this.toolbarButtonCommandHandler = (ev) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.item)
                return;
            const type = this._unwrapID(ev.target.id);
            switch (type) {
                case "toggleOutlinePane": {
                    const workspace = (0, workspace_1.getWorkspaceByUID)(((_a = this.editor) === null || _a === void 0 ? void 0 : _a._tabID) || "");
                    if (!workspace)
                        return;
                    workspace.toggleOutline(false);
                    break;
                }
                case "useTreeView":
                case "useMindMap":
                case "useBubbleMap": {
                    this.outlineType = OutlinePane.outlineMenuIDs[type];
                    yield this.updateOutline();
                    break;
                }
                case "saveImage":
                case "saveSVG": {
                    this.saveImage(type);
                    break;
                }
                case "saveFreeMind": {
                    this.saveFreeMind();
                    break;
                }
                case "saveMore": {
                    this._addon.hooks.onShowExportNoteOptions([this.item.id]);
                    break;
                }
                default: {
                    break;
                }
            }
        });
        this.messageHandler = (ev) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            switch (ev.data.type) {
                case "jumpNode": {
                    if (!this.editor) {
                        return;
                    }
                    this._addon.api.editor.scroll(this.editor, ev.data.lineIndex);
                    return;
                }
                case "openNote": {
                    const linkParams = this._addon.api.convert.link2params(ev.data.link);
                    if (!linkParams.noteItem) {
                        return;
                    }
                    this._addon.hooks.onOpenNote(linkParams.noteItem.id, "preview", {
                        lineIndex: linkParams.lineIndex || undefined,
                    });
                    return;
                }
                case "moveNode": {
                    if (!this.item)
                        return;
                    const tree = yield this._addon.api.note.getNoteTree(this.item);
                    const fromNode = yield this._addon.api.note.getNoteTreeNodeById(this.item, ev.data.fromID, tree);
                    const toNode = yield this._addon.api.note.getNoteTreeNodeById(this.item, ev.data.toID, tree);
                    this._addon.api.editor.moveHeading(this._addon.api.editor.getEditorInstance(this.item.id), fromNode, toNode, ev.data.moveType);
                    return;
                }
                case "editNode": {
                    if (!this.editor) {
                        return;
                    }
                    this._addon.api.editor.updateHeadingTextAtLine(this.editor, ev.data.lineIndex, ev.data.text.replace(/[\r\n]/g, ""));
                    return;
                }
                case "saveSVGReturn": {
                    const filename = yield new zotero_plugin_toolkit_1.FilePickerHelper(`${Zotero.getString("fileInterface.export")} SVG Image`, "save", [["SVG File(*.svg)", "*.svg"]], `${(_a = this.item) === null || _a === void 0 ? void 0 : _a.getNoteTitle()}.svg`).open();
                    if (filename) {
                        yield Zotero.File.putContentsAsync((0, str_1.formatPath)(filename), ev.data.image);
                        (0, hint_1.showHintWithLink)(`Image Saved to ${filename}`, "Show in Folder", (ev) => {
                            Zotero.File.reveal(filename);
                        });
                    }
                    return;
                }
                case "saveImageReturn": {
                    const filename = yield new zotero_plugin_toolkit_1.FilePickerHelper(`${Zotero.getString("fileInterface.export")} PNG Image`, "save", [["PNG File(*.png)", "*.png"]], `${(_b = this.item) === null || _b === void 0 ? void 0 : _b.getNoteTitle()}.png`).open();
                    if (filename) {
                        const parts = ev.data.image.split(",");
                        const bstr = atob(parts[1]);
                        let n = bstr.length;
                        const u8arr = new Uint8Array(n);
                        while (n--) {
                            u8arr[n] = bstr.charCodeAt(n);
                        }
                        yield IOUtils.write((0, str_1.formatPath)(filename), u8arr);
                        (0, hint_1.showHintWithLink)(`Image Saved to ${filename}`, "Show in Folder", (ev) => {
                            Zotero.File.reveal(filename);
                        });
                    }
                    return;
                }
                default:
                    return;
            }
        });
    }
    get content() {
        return this._parseContentID(MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/workspace/outline.css"
  ></html:link>
</linkset>
<hbox id="left-toolbar">
  <toolbarbutton
    id="toggleOutlinePane"
    class="zotero-tb-button"
    data-l10n-id="${package_json_1.config.addonRef}-toggleOutlinePane"
  ></toolbarbutton>
  <toolbarbutton
    id="setOutline"
    class="zotero-tb-button"
    data-l10n-id="${package_json_1.config.addonRef}-setOutline"
    type="menu"
    wantdropmarker="true"
  >
    <menupopup id="setOutlinePopup">
      <menuitem
        id="useTreeView"
        type="radio"
        data-l10n-id="${package_json_1.config.addonRef}-useTreeView"
      ></menuitem>
      <menuitem
        id="useMindMap"
        type="radio"
        data-l10n-id="${package_json_1.config.addonRef}-useMindMap"
      ></menuitem>
      <menuitem
        id="useBubbleMap"
        type="radio"
        data-l10n-id="${package_json_1.config.addonRef}-useBubbleMap"
      ></menuitem>
    </menupopup>
  </toolbarbutton>
  <toolbarbutton
    id="saveOutline"
    class="zotero-tb-button"
    data-l10n-id="${package_json_1.config.addonRef}-saveOutline"
    type="menu"
    wantdropmarker="true"
  >
    <menupopup id="saveOutlinePopup">
      <menuitem
        id="saveImage"
        data-l10n-id="${package_json_1.config.addonRef}-saveOutlineImage"
      ></menuitem>
      <menuitem
        id="saveSVG"
        data-l10n-id="${package_json_1.config.addonRef}-saveOutlineSVG"
      ></menuitem>
      <menuitem
        id="saveFreeMind"
        data-l10n-id="${package_json_1.config.addonRef}-saveOutlineFreeMind"
      ></menuitem>
      <menuitem
        id="saveMore"
        data-l10n-id="${package_json_1.config.addonRef}-saveMore"
      ></menuitem>
    </menupopup>
  </toolbarbutton>
</hbox>
<iframe id="outline" class="container"></iframe>`));
    }
    get outlineType() {
        return this._outlineType;
    }
    set outlineType(newType) {
        if (newType === workspace_1.OutlineType.empty) {
            newType = workspace_1.OutlineType.treeView;
        }
        if (newType > workspace_1.OutlineType.bubbleMap) {
            newType = workspace_1.OutlineType.treeView;
        }
        this._outlineType = newType;
        this._persistState();
    }
    get item() {
        return this._item;
    }
    set item(val) {
        this._item = val;
    }
    get editor() {
        return this._editorElement._editorInstance;
    }
    init() {
        var _a;
        MozXULElement.insertFTLIfNeeded(`${package_json_1.config.addonRef}-outline.ftl`);
        this._outlineContainer = this._queryID("outline");
        (_a = this._queryID("left-toolbar")) === null || _a === void 0 ? void 0 : _a.addEventListener("command", this.toolbarButtonCommandHandler);
        this._notifierID = Zotero.Notifier.registerObserver(this, ["item"], "zob-outline");
        this._prefObserverID = (0, prefs_1.registerPrefObserver)(persistKey, this._restoreState.bind(this));
    }
    destroy() {
        var _a;
        (0, prefs_1.unregisterPrefObserver)(this._prefObserverID);
        Zotero.Notifier.unregisterObserver(this._notifierID);
        (_a = this._outlineContainer.contentWindow) === null || _a === void 0 ? void 0 : _a.removeEventListener("message", this.messageHandler);
    }
    notify(event, type, ids, extraData) {
        if (!this.item)
            return;
        if (extraData.skipOB)
            return;
        if (event === "modify" && type === "item") {
            if (ids.includes(this.item.id)) {
                this.updateOutline();
            }
        }
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this._restoreState();
            if (this.outlineType === workspace_1.OutlineType.empty) {
                this.outlineType = workspace_1.OutlineType.treeView;
            }
            yield this.updateOutline();
        });
    }
    updateOutline() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            if (!this.item)
                return;
            const toggleOutlinePane = this.querySelector(`#${this._wrapID("toggleOutlinePane")}`);
            if ((_a = this.editor) === null || _a === void 0 ? void 0 : _a._tabID) {
                toggleOutlinePane === null || toggleOutlinePane === void 0 ? void 0 : toggleOutlinePane.removeAttribute("hidden");
            }
            else {
                toggleOutlinePane === null || toggleOutlinePane === void 0 ? void 0 : toggleOutlinePane.setAttribute("hidden", "true");
            }
            (_b = this._outlineContainer.contentWindow) === null || _b === void 0 ? void 0 : _b.removeEventListener("message", this.messageHandler);
            this._outlineContainer.setAttribute("src", OutlinePane.outlineSources[this.outlineType]);
            yield (0, wait_1.waitUtilAsync)(() => {
                var _a;
                return ((_a = this._outlineContainer.contentWindow) === null || _a === void 0 ? void 0 : _a.document.readyState) ===
                    "complete";
            });
            (_c = this._outlineContainer.contentWindow) === null || _c === void 0 ? void 0 : _c.addEventListener("message", this.messageHandler);
            const nodes = yield this._addon.api.note.getNoteTreeFlattened(this.item, {
                keepLink: !!(0, prefs_1.getPref)("workspace.outline.keepLinks"),
            });
            (_d = this._outlineContainer.contentWindow) === null || _d === void 0 ? void 0 : _d.postMessage({
                type: "setMindMapData",
                nodes,
                expandLevel: (0, prefs_1.getPref)("workspace.outline.expandLevel"),
            }, "*");
            // Update button hidden
            const isTreeView = this.outlineType === workspace_1.OutlineType.treeView;
            for (const key of ["saveImage", "saveSVG"]) {
                const elem = this._queryID(key);
                if (isTreeView) {
                    elem === null || elem === void 0 ? void 0 : elem.setAttribute("disabled", "true");
                }
                else {
                    elem === null || elem === void 0 ? void 0 : elem.removeAttribute("disabled");
                }
            }
            // Update set outline menu
            (_e = this._queryID("setOutlinePopup")) === null || _e === void 0 ? void 0 : _e.childNodes.forEach((elem) => elem.removeAttribute("checked"));
            (_f = this._queryID(Object.keys(OutlinePane.outlineMenuIDs)[this.outlineType])) === null || _f === void 0 ? void 0 : _f.setAttribute("checked", "true");
        });
    }
    saveImage(type) {
        var _a;
        (_a = this._outlineContainer.contentWindow) === null || _a === void 0 ? void 0 : _a.postMessage({
            type,
        }, "*");
    }
    saveFreeMind() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!((_a = this.item) === null || _a === void 0 ? void 0 : _a.id))
                return;
            // TODO: uncouple this part
            const filename = yield new zotero_plugin_toolkit_1.FilePickerHelper(`${Zotero.getString("fileInterface.export")} FreeMind XML`, "save", [["FreeMind XML File(*.mm)", "*.mm"]], `${this.item.getNoteTitle()}.mm`).open();
            if (filename) {
                yield this._addon.api.$export.saveFreeMind(filename, this.item.id);
            }
        });
    }
    _persistState() {
        var _a;
        // Tab outline use Zotero_Tabs state
        if ((_a = this.editor) === null || _a === void 0 ? void 0 : _a._tabID)
            return;
        let state = (0, prefs_1.getPrefJSON)(persistKey);
        if ((state === null || state === void 0 ? void 0 : state.outlineType) === this.outlineType) {
            return;
        }
        state = Object.assign(Object.assign({}, state), { outlineType: this.outlineType });
        (0, prefs_1.setPref)(persistKey, JSON.stringify(state));
    }
    _restoreState() {
        var _a;
        // Tab outline use Zotero_Tabs state
        if ((_a = this.editor) === null || _a === void 0 ? void 0 : _a._tabID)
            return;
        const state = (0, prefs_1.getPrefJSON)(persistKey);
        if (typeof state.outlineType === "number" &&
            state.outlineType !== this.outlineType) {
            this.outlineType = state.outlineType;
            this.updateOutline();
        }
    }
}
exports.OutlinePane = OutlinePane;
OutlinePane.outlineSources = [
    "",
    `chrome://${package_json_1.config.addonRef}/content/treeView.html`,
    `chrome://${package_json_1.config.addonRef}/content/mindMap.html`,
    `chrome://${package_json_1.config.addonRef}/content/bubbleMap.html`,
];
OutlinePane.outlineMenuIDs = {
    "": workspace_1.OutlineType.empty,
    useTreeView: workspace_1.OutlineType.treeView,
    useMindMap: workspace_1.OutlineType.mindMap,
    useBubbleMap: workspace_1.OutlineType.bubbleMap,
};
