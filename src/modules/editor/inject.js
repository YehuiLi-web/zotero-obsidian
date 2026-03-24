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
exports.injectEditorScripts = injectEditorScripts;
exports.injectEditorCSS = injectEditorCSS;
const str_1 = require("../../utils/str");
function injectEditorScripts(win) {
    return __awaiter(this, void 0, void 0, function* () {
        ztoolkit.UI.appendElement({
            tag: "script",
            id: "obsidianbridge-script",
            properties: {
                innerHTML: yield (0, str_1.getFileContent)(rootURI + "chrome/content/scripts/editorScript.js"),
            },
            ignoreIfExists: true,
        }, win.document.head);
    });
}
function injectEditorCSS(win) {
    return __awaiter(this, void 0, void 0, function* () {
        ztoolkit.UI.appendElement({
            tag: "style",
            id: "obsidianbridge-style",
            properties: {
                innerHTML: yield (0, str_1.getFileContent)(rootURI + "chrome/content/styles/editor.css"),
            },
            removeIfExists: true,
        }, win.document.head);
    });
}
