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
exports.registerNoteLinkProxyHandler = registerNoteLinkProxyHandler;
const link_1 = require("../utils/link");
function registerNoteLinkProxyHandler() {
    const openNoteExtension = {
        noContent: true,
        doAction: (uri) => __awaiter(this, void 0, void 0, function* () {
            const linkParams = (0, link_1.getNoteLinkParams)(uri.spec);
            if (linkParams.noteItem) {
                addon.hooks.onOpenNote(linkParams.noteItem.id, "auto", {
                    lineIndex: linkParams.lineIndex,
                    sectionName: linkParams.sectionName,
                });
            }
        }),
        newChannel: function (uri) {
            this.doAction(uri);
        },
    };
    // @ts-ignore
    Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions["zotero://note"] = openNoteExtension;
}
