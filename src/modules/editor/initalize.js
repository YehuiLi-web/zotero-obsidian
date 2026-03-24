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
exports.registerEditorInstanceHook = registerEditorInstanceHook;
exports.unregisterEditorInstanceHook = unregisterEditorInstanceHook;
const image_1 = require("./image");
const inject_1 = require("./inject");
const plugins_1 = require("./plugins");
const menu_1 = require("./menu");
const popup_1 = require("./popup");
const toolbar_1 = require("./toolbar");
let prefsObserver = Symbol();
function registerEditorInstanceHook() {
    Zotero.Notes.registerEditorInstance = new Proxy(Zotero.Notes.registerEditorInstance, {
        apply: (target, thisArg, argumentsList) => {
            target.apply(thisArg, argumentsList);
            argumentsList.forEach(onEditorInstanceCreated);
        },
    });
    Zotero.Notes._editorInstances.forEach(onEditorInstanceCreated);
    // For unknown reasons, the css becomes undefined after font size change
    prefsObserver = Zotero.Prefs.registerObserver("note.fontSize", () => {
        Zotero.Notes._editorInstances.forEach((editor) => {
            (0, inject_1.injectEditorCSS)(editor._iframeWindow);
        });
    });
}
function unregisterEditorInstanceHook() {
    Zotero.Prefs.unregisterObserver(prefsObserver);
}
function onEditorInstanceCreated(editor) {
    return __awaiter(this, void 0, void 0, function* () {
        yield editor._initPromise;
        if (!addon.data.alive) {
            return;
        }
        // item.getNote may not be initialized yet
        if (Zotero.ItemTypes.getID("note") !== editor._item.itemTypeID) {
            return;
        }
        yield (0, inject_1.injectEditorScripts)(editor._iframeWindow);
        (0, inject_1.injectEditorCSS)(editor._iframeWindow);
        (0, image_1.initEditorImagePreviewer)(editor);
        yield (0, toolbar_1.initEditorToolbar)(editor);
        (0, popup_1.initEditorPopup)(editor);
        (0, menu_1.initEditorMenu)(editor);
        (0, plugins_1.initEditorPlugins)(editor);
    });
}
