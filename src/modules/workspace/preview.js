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
exports.openNotePreview = openNotePreview;
const package_json_1 = require("../../../package.json");
const wait_1 = require("../../utils/wait");
const workspace_1 = require("../../utils/workspace");
function openNotePreview(noteItem, workspaceUID, options = {}) {
    const key = Zotero.ItemPaneManager.registerSection({
        paneID: `zob-note-preview-${workspaceUID}-${noteItem.id}`,
        pluginID: package_json_1.config.addonID,
        header: {
            icon: "chrome://zotero/skin/16/universal/note.svg",
            l10nID: `${package_json_1.config.addonRef}-note-preview-header`,
        },
        sidenav: {
            icon: "chrome://zotero/skin/20/universal/note.svg",
            l10nID: `${package_json_1.config.addonRef}-note-preview-sidenav`,
            l10nArgs: JSON.stringify({ title: noteItem.getNoteTitle() }),
        },
        bodyXHTML: `
<linkset>
  <html:link
    rel="localization"
    href="${package_json_1.config.addonRef}-notePreview.ftl"
  ></html:link>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/workspace/workspace.css"
  ></html:link>
</linkset>
<note-editor data-id="${noteItem.id}" class="zob-note-preview"></note-editor>`,
        sectionButtons: [
            {
                type: "openNote",
                icon: "chrome://zotero/skin/16/universal/open-link.svg",
                l10nID: `${package_json_1.config.addonRef}-note-preview-open`,
                onClick: ({ event }) => {
                    const position = event.shiftKey ? "window" : "tab";
                    // @ts-ignore - plugin instance
                    Zotero[package_json_1.config.addonRef].hooks.onOpenNote(noteItem.id, position);
                },
            },
            {
                type: "closePreview",
                icon: "chrome://zotero/skin/16/universal/minus.svg",
                l10nID: `${package_json_1.config.addonRef}-note-preview-close`,
                onClick: () => {
                    Zotero.ItemPaneManager.unregisterSection(key || "");
                },
            },
            {
                type: "fullHeight",
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/full-16.svg`,
                l10nID: `${package_json_1.config.addonRef}-note-preview-full`,
                onClick: ({ body }) => {
                    var _a;
                    const iframe = body.querySelector("iframe");
                    const details = getItemDetails(body);
                    const head = (_a = body
                        .closest("item-pane-custom-section")) === null || _a === void 0 ? void 0 : _a.querySelector(".head");
                    const heightKey = "--details-height";
                    if (iframe === null || iframe === void 0 ? void 0 : iframe.style.getPropertyValue(heightKey)) {
                        iframe.style.removeProperty(heightKey);
                        // @ts-ignore
                        if (details.pinnedPane === key) {
                            // @ts-ignore
                            details.pinnedPane = "";
                        }
                    }
                    else {
                        iframe === null || iframe === void 0 ? void 0 : iframe.style.setProperty(heightKey, `${details.clientHeight - head.clientHeight - 8}px`);
                        // @ts-ignore
                        details.pinnedPane = key;
                        // @ts-ignore
                        details.scrollToPane(key);
                    }
                },
            },
        ],
        onItemChange: ({ body, setEnabled }) => {
            if ((0, workspace_1.getWorkspaceUID)(body) !== workspaceUID) {
                setEnabled(false);
                return;
            }
            body.dataset.enabled = "true";
            setEnabled(true);
        },
        onRender: ({ body, setSectionSummary }) => {
            setSectionSummary(noteItem.getNoteTitle());
        },
        onAsyncRender: (_a) => __awaiter(this, [_a], void 0, function* ({ body, item }) {
            if (!(item === null || item === void 0 ? void 0 : item.isNote()))
                return;
            const editorElement = body.querySelector("note-editor");
            yield (0, wait_1.waitUtilAsync)(() => Boolean(editorElement._initialized));
            if (!editorElement._initialized) {
                throw new Error("initNoteEditor: waiting initialization failed");
            }
            editorElement.mode = "edit";
            editorElement.viewMode = "library";
            editorElement.parent = noteItem === null || noteItem === void 0 ? void 0 : noteItem.parentItem;
            editorElement.item = noteItem;
            yield (0, wait_1.waitUtilAsync)(() => Boolean(editorElement._editorInstance));
            yield editorElement._editorInstance._initPromise;
            if (typeof options.lineIndex === "number") {
                addon.api.editor.scroll(editorElement._editorInstance, options.lineIndex);
            }
            if (typeof options.sectionName === "string") {
                addon.api.editor.scrollToSection(editorElement._editorInstance, options.sectionName);
            }
        }),
        onDestroy: ({ body }) => {
            if (!body.dataset.enabled) {
                return;
            }
            Zotero.ItemPaneManager.unregisterSection(key || "");
        },
    });
    const workspace = (0, workspace_1.getWorkspaceByUID)(workspaceUID);
    workspace === null || workspace === void 0 ? void 0 : workspace.toggleContext(true);
    setTimeout(() => {
        workspace === null || workspace === void 0 ? void 0 : workspace.scrollToPane(String(key));
    }, 500);
    // If registration failed, it is already opened, just scroll to it
    if (!key) {
        scrollPreviewEditorTo(noteItem, workspaceUID, options);
    }
}
function getItemDetails(elem) {
    var _a;
    if ((_a = elem.ownerGlobal) === null || _a === void 0 ? void 0 : _a.Zotero_Tabs) {
        return elem.ownerGlobal.ZoteroContextPane.context._getItemContext(elem.ownerGlobal.Zotero_Tabs.selectedID);
    }
    return elem.closest("zob-details");
}
function scrollPreviewEditorTo(item, workspaceUID, options = {}) {
    var _a;
    const workspace = (0, workspace_1.getWorkspaceByUID)(workspaceUID);
    if (!workspace)
        return;
    const editor = workspace.getPreviewEditor(item.id);
    if (!editor)
        return;
    const section = editor.closest("item-pane-custom-section");
    // @ts-ignore
    (_a = getItemDetails(editor)) === null || _a === void 0 ? void 0 : _a.scrollToPane(section.dataset.pane);
    if (typeof options.lineIndex === "number") {
        addon.api.editor.scroll(editor._editorInstance, options.lineIndex);
    }
    if (typeof options.sectionName === "string") {
        addon.api.editor.scrollToSection(editor._editorInstance, options.sectionName);
    }
}
