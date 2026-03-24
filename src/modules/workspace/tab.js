"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAB_TYPE = void 0;
exports.TAB_TYPE = "note";
function scrollTabEditorTo(item, options = {}) {
    const tab = Zotero.getMainWindow().Zotero_Tabs._tabs.find((tab) => { var _a; return ((_a = tab.data) === null || _a === void 0 ? void 0 : _a.itemID) == item.id; });
    if (!tab || tab.type !== exports.TAB_TYPE)
        return;
    const workspace = Zotero.getMainWindow().document.querySelector(`#${tab.id} > zob-workspace`);
    if (!workspace)
        return;
    // @ts-ignore
    workspace.scrollEditorTo(options);
}
