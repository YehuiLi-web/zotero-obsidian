"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchExportItems = patchExportItems;
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const prefs_1 = require("../../utils/prefs");
function patchExportItems(win) {
    const Zotero_File_Interface = win.Zotero_File_Interface;
    new zotero_plugin_toolkit_1.PatchHelper().setData({
        target: Zotero_File_Interface,
        // @ts-ignore
        funcSign: "exportItems",
        patcher: (origin) => 
        // @ts-ignore
        function () {
            if (!(0, prefs_1.getPref)("exportNotes.takeover")) {
                // @ts-ignore
                return origin.apply(this);
            }
            const items = win.ZoteroPane.getSelectedItems();
            if (items.every((item) => item.isNote())) {
                return addon.hooks.onShowExportNoteOptions(items.map((item) => item.id));
            }
            // @ts-ignore
            return origin.apply(this);
        },
        enabled: true,
    });
}
