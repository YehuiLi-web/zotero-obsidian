"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceTab = exports.OutlineType = void 0;
exports.getWorkspaceByUID = getWorkspaceByUID;
exports.getWorkspaceUID = getWorkspaceUID;
const package_json_1 = require("../../package.json");
var OutlineType;
(function (OutlineType) {
    OutlineType[OutlineType["empty"] = 0] = "empty";
    OutlineType[OutlineType["treeView"] = 1] = "treeView";
    OutlineType[OutlineType["mindMap"] = 2] = "mindMap";
    OutlineType[OutlineType["bubbleMap"] = 3] = "bubbleMap";
})(OutlineType || (exports.OutlineType = OutlineType = {}));
function getWorkspaceUID(element) {
    var _a;
    const win = element.ownerDocument.defaultView;
    // There can be fake Zotero_Tabs added by contextPane.ts
    if ((_a = win === null || win === void 0 ? void 0 : win.Zotero_Tabs) === null || _a === void 0 ? void 0 : _a.getTabInfo) {
        return win.Zotero_Tabs.getTabInfo().id;
    }
    const workspace = element.closest("zob-workspace");
    if (workspace === null || workspace === void 0 ? void 0 : workspace.dataset.uid) {
        return workspace.dataset.uid;
    }
    return undefined;
}
function getWorkspaceByUID(uid) {
    var _a;
    if (uid.startsWith("tab-")) {
        return new WorkspaceTab(uid);
    }
    const workspace = (_a = addon.data.workspace.instances[uid]) === null || _a === void 0 ? void 0 : _a.deref();
    if (!(workspace === null || workspace === void 0 ? void 0 : workspace.ownerDocument)) {
        delete addon.data.workspace.instances[uid];
        return undefined;
    }
    return workspace;
}
class WorkspaceTab {
    constructor(tabID) {
        this.uid = tabID;
        // @ts-ignore
        this._addon = Zotero[package_json_1.config.addonInstance];
    }
    get _tabContent() {
        const tabContent = Zotero.getMainWindow().document.querySelector(`#${this.uid}`);
        if (!tabContent) {
            throw new Error(`WorkspaceTab: Tab content ${this.uid} not found.`);
        }
        return tabContent;
    }
    get item() {
        return Zotero.Items.get(Zotero.getMainWindow().Zotero_Tabs.getTabInfo(this.uid).data.itemID);
    }
    get editor() {
        return Zotero.Notes.getByTabID(this.uid);
    }
    scrollEditorTo(options) {
        if (typeof options.lineIndex === "number") {
            this._addon.api.editor.scroll(this.editor, options.lineIndex);
        }
        if (typeof options.sectionName === "string") {
            this._addon.api.editor.scrollToSection(this.editor, options.sectionName);
        }
    }
    toggleContext(open) {
        Zotero.getMainWindow().ZoteroContextPane.collapsed = !open;
    }
    toggleOutline(param) {
        const win = Zotero.getMainWindow();
        const outlineContainer = this._tabContent.querySelector("#zob-outline-container");
        if (!outlineContainer) {
            return;
        }
        let open;
        let width = false;
        if (typeof param === "number") {
            open = param > 0;
            width = param;
        }
        else {
            open = param !== null && param !== void 0 ? param : (outlineContainer === null || outlineContainer === void 0 ? void 0 : outlineContainer.getAttribute("collapsed")) === "true";
        }
        outlineContainer.setAttribute("collapsed", open ? "false" : "true");
        if (typeof width === "number") {
            outlineContainer.style.width = `${width}px`;
        }
        // @ts-ignore
        this._tabContent.sidebarWidth = param;
        win.Zotero_Tabs.updateSidebarLayout({ width: param });
        win.ZoteroContextPane.update();
        this.updateToggleOutlineButton();
    }
    updateToggleOutlineButton() {
        var _a, _b, _c;
        const open = Zotero.getMainWindow().Zotero_Tabs.getSidebarState("note").open;
        const toggleButtonInEditor = (_c = (_b = (_a = this.editor) === null || _a === void 0 ? void 0 : _a._iframeWindow) === null || _b === void 0 ? void 0 : _b.document) === null || _c === void 0 ? void 0 : _c.querySelector(".toolbar-button.zob-toggle-left-pane");
        if (toggleButtonInEditor) {
            toggleButtonInEditor.style.display = open ? "none" : "inherit";
        }
        // We don't need to hide the outline button in the outline pane,
        // because it's hidden when outline pane is collapsed.
    }
    scrollToPane(key) {
        const itemDetails = Zotero.getMainWindow().ZoteroContextPane.context._getItemContext(this.uid);
        return itemDetails.scrollToPane(key);
    }
    getPreviewEditor(itemID) {
        const itemDetails = Zotero.getMainWindow().ZoteroContextPane.context._getItemContext(this.uid);
        return itemDetails.querySelector(`note-editor[data-id="${itemID}"]`);
    }
}
exports.WorkspaceTab = WorkspaceTab;
