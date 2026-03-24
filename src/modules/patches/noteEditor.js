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
exports.patchNoteEditorCE = patchNoteEditorCE;
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const workspace_1 = require("../../utils/workspace");
function patchNoteEditorCE(win) {
    const NoteEditorProto = win.document.createXULElement("note-editor").constructor.prototype;
    new zotero_plugin_toolkit_1.PatchHelper().setData({
        target: NoteEditorProto,
        // @ts-ignore
        funcSign: "setBottomPlaceholderHeight",
        patcher: (origin) => 
        // @ts-ignore
        function (height = null) {
            // @ts-ignore
            const noteEditor = this;
            if (!noteEditor.tabID) {
                // @ts-ignore
                return origin.apply(this, [height]);
            }
            const tabContent = noteEditor.closest("tab-content");
            const sideBarState = win.Zotero_Tabs.getSidebarState("note");
            if (!noteEditor._zobPatched) {
                noteEditor._zobPatched = true;
                const box = noteEditor.querySelector("box");
                box.classList.add("zob-note-editor-box");
                box.style.width = "100%";
                // Adjust when toolbar changes
                box.style.minWidth = "328px";
                noteEditor.style.height = "100%";
                const hbox = win.document.createXULElement("hbox");
                hbox.setAttribute("id", "zob-note-editor-tab-container");
                hbox.style.height = "100%";
                const outlineContainer = win.document.createXULElement("zob-outline");
                outlineContainer.setAttribute("id", "zob-outline-container");
                outlineContainer.setAttribute("collapsed", sideBarState.open ? "false" : "true");
                outlineContainer.style.width = `${sideBarState.width}px`;
                const splitter = win.document.createXULElement("splitter");
                splitter.setAttribute("id", "zob-outline-splitter");
                splitter.setAttribute("collapse", "before");
                const splitterHandler = () => {
                    const width = outlineContainer.getBoundingClientRect().width;
                    tabContent.sidebarWidth = width;
                    win.Zotero_Tabs.updateSidebarLayout({ width });
                    win.ZoteroContextPane.update();
                    const workspace = (0, workspace_1.getWorkspaceByUID)(noteEditor.tabID);
                    if (workspace) {
                        workspace.updateToggleOutlineButton();
                    }
                };
                splitter.addEventListener("command", splitterHandler);
                splitter.addEventListener("mousemove", splitterHandler);
                hbox.appendChild(outlineContainer);
                hbox.appendChild(splitter);
                hbox.appendChild(box);
                noteEditor.appendChild(hbox);
                box.querySelector("#editor-view").docShell.windowDraggingAllowed =
                    true;
                zotero_plugin_toolkit_1.wait
                    .waitUntilAsync(() => noteEditor._editorInstance)
                    .then(() => {
                    const editor = noteEditor._editorInstance;
                    outlineContainer.item = noteEditor.item;
                    outlineContainer._editorElement = noteEditor;
                    outlineContainer.render();
                });
            }
            const box = noteEditor.querySelector(".zob-note-editor-box");
            noteEditor._bottomPlaceholder = height;
            if (typeof height !== "number") {
                height = 0;
            }
            box.style.height = `calc(100% - ${height}px)`;
            noteEditor.setToggleContextPaneButtonMode();
        },
        enabled: true,
    });
    updateExistingNoteTabs(win);
}
function updateExistingNoteTabs(win) {
    return __awaiter(this, void 0, void 0, function* () {
        const tabs = win.Zotero_Tabs._tabs;
        for (const tab of tabs) {
            if (!tab.type.startsWith("note")) {
                continue;
            }
            // Recreate tab to update sidebar state
            const item = Zotero.Items.get(tab.data.itemID);
            if (!item || !item.isNote()) {
                continue;
            }
            const currentIndex = tabs.indexOf(tab);
            const isSelected = win.Zotero_Tabs.selectedID === tab.id ? true : false;
            win.Zotero_Tabs.close(tab.id);
            yield zotero_plugin_toolkit_1.wait.waitUntilAsync(() => !win.Zotero_Tabs._getTab(tab.id).tab);
            Zotero.Notes.open(item.id, {}, {
                title: tab.title,
                tabIndex: currentIndex,
                openInBackground: !isSelected,
                parentItemKey: tab.data.parentItemKey,
            });
        }
    });
}
