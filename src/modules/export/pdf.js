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
exports.savePDF = savePDF;
const package_json_1 = require("../../../package.json");
const hint_1 = require("../../utils/hint");
const note_1 = require("../../utils/note");
function savePDF(noteId) {
    return __awaiter(this, void 0, void 0, function* () {
        const html = yield (0, note_1.renderNoteHTML)(Zotero.Items.get(noteId));
        disablePrintFooterHeader();
        const { HiddenBrowser } = ChromeUtils.importESModule("chrome://zotero/content/HiddenBrowser.mjs");
        const browser = new HiddenBrowser({
            useHiddenFrame: false,
        });
        yield browser.load(`chrome://${package_json_1.config.addonRef}/content/printTemplate.xhtml`, {
            requireSuccessfulStatus: true,
        });
        yield browser.waitForDocument();
        browser.contentWindow.postMessage({ type: "print", html, style: Zotero.Prefs.get("note.css") || "" }, "*");
        browser.print();
        (0, hint_1.showHint)("Note Saved as PDF");
    });
}
function disablePrintFooterHeader() {
    Zotero.Prefs.resetBranch([], "print");
    Zotero.Prefs.set("print.print_footercenter", "", true);
    Zotero.Prefs.set("print.print_footerleft", "", true);
    Zotero.Prefs.set("print.print_footerright", "", true);
    Zotero.Prefs.set("print.print_headercenter", "", true);
    Zotero.Prefs.set("print.print_headerleft", "", true);
    Zotero.Prefs.set("print.print_headerright", "", true);
}
