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
exports.showHint = showHint;
exports.showHintWithLink = showHintWithLink;
exports.showRestartHint = showRestartHint;
const package_json_1 = require("../../package.json");
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const config_1 = require("./config");
const wait_1 = require("./wait");
zotero_plugin_toolkit_1.ProgressWindowHelper.setIconURI("default", `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`);
function showHint(text) {
    if (addon.data.hint.silent)
        return;
    return new zotero_plugin_toolkit_1.ProgressWindowHelper(config_1.PROGRESS_TITLE)
        .createLine({ text, progress: 100, type: "default" })
        .show();
}
function showHintWithLink(text, linkText, linkCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        if (addon.data.hint.silent)
            return;
        const progress = new zotero_plugin_toolkit_1.ProgressWindowHelper(config_1.PROGRESS_TITLE)
            .createLine({ text, progress: 100, type: "default" })
            .show(-1);
        // Just a placeholder
        progress.addDescription(`<a href="https://zotero.org">${linkText}</a>`);
        yield (0, wait_1.waitUtilAsync)(() => 
        // @ts-ignore
        Boolean(progress.lines && progress.lines[0]._itemText));
        // @ts-ignore
        progress.lines[0]._hbox.ownerDocument
            .querySelector("label[href]")
            .addEventListener("click", (ev) => __awaiter(this, void 0, void 0, function* () {
            ev.stopPropagation();
            ev.preventDefault();
            linkCallback(ev);
        }));
        return progress;
    });
}
function showRestartHint() {
    const ps = Services.prompt;
    const buttonFlags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING +
        ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING;
    const index = ps.confirmEx(
    // @ts-ignore
    null, Zotero.getString("general.restartRequired"), Zotero.getString("general.restartRequiredForChange", Zotero.appName), buttonFlags, Zotero.getString("general.restartNow"), Zotero.getString("general.restartLater"), null, null, {});
    if (index == 0) {
        Zotero.Utilities.Internal.quit(true);
    }
}
