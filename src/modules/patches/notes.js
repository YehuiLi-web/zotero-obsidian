"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchNotes = patchNotes;
const workspace_1 = require("../../utils/workspace");
function patchNotes() {
    Zotero.Notes.toggleSidebar = function (open) {
        const win = Zotero.getMainWindow();
        if (!win) {
            return;
        }
        const tabID = win.Zotero_Tabs.selectedID;
        const workspace = (0, workspace_1.getWorkspaceByUID)(tabID);
        if (!workspace) {
            return;
        }
        workspace.toggleOutline(open);
    };
    Zotero.Notes.setSidebarWidth = function (width) {
        const win = Zotero.getMainWindow();
        if (!win) {
            return;
        }
        const tabID = win.Zotero_Tabs.selectedID;
        const workspace = (0, workspace_1.getWorkspaceByUID)(tabID);
        if (!workspace) {
            return;
        }
        workspace.toggleOutline(width);
    };
}
