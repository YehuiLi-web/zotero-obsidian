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
exports.openWorkspaceWindow = openWorkspaceWindow;
const package_json_1 = require("../../../package.json");
function openWorkspaceWindow(item_1) {
    return __awaiter(this, arguments, void 0, function* (item, options = {}) {
        const windowArgs = {
            _initPromise: Zotero.Promise.defer(),
        };
        const win = Zotero.getMainWindow().openDialog(`chrome://${package_json_1.config.addonRef}/content/workspaceWindow.xhtml`, "_blank", `chrome,centerscreen,resizable,status,dialog=no`, windowArgs);
        yield windowArgs._initPromise.promise;
        const container = win.document.querySelector("#workspace-container");
        const workspace = yield addon.hooks.onInitWorkspace(container, item);
        workspace === null || workspace === void 0 ? void 0 : workspace.scrollEditorTo(options);
        win.focus();
        win.updateTitle();
        return win;
    });
}
