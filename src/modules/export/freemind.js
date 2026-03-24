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
exports.saveFreeMind = saveFreeMind;
const hint_1 = require("../../utils/hint");
const note_1 = require("../../utils/note");
const str_1 = require("../../utils/str");
function saveFreeMind(filename, noteId) {
    return __awaiter(this, void 0, void 0, function* () {
        const noteItem = Zotero.Items.get(noteId);
        yield Zotero.File.putContentsAsync(filename, yield note2mm(noteItem));
        (0, hint_1.showHintWithLink)(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
            Zotero.File.reveal(filename);
        });
    });
}
function note2mm(noteItem_1) {
    return __awaiter(this, arguments, void 0, function* (noteItem, options = { withContent: true }) {
        const root = yield (0, note_1.getNoteTree)(noteItem, false);
        const textNodeForEach = (e, callbackfn) => {
            if (e.nodeType === Zotero.getMainWindow().document.TEXT_NODE) {
                callbackfn(e);
                return;
            }
            e.childNodes.forEach((_e) => textNodeForEach(_e, callbackfn));
        };
        let lines = [];
        if (options.withContent) {
            const doc = new DOMParser().parseFromString(yield (0, note_1.renderNoteHTML)(noteItem), "text/html");
            textNodeForEach(doc.body, (e) => {
                e.data = (0, str_1.htmlEscape)(doc, e.data);
            });
            lines = (yield (0, note_1.parseHTMLLines)(doc.body.innerHTML)).map((line) => (0, str_1.htmlUnescape)(line));
        }
        const convertClosingTags = (htmlStr) => {
            const regConfs = [
                {
                    reg: /<br[^>]*?>/g,
                    cbk: (str) => "<br></br>",
                },
                {
                    reg: /<img[^>]*?>/g,
                    cbk: (str) => {
                        return `<img ${str.match(/src="[^"]+"/g)}></img>`;
                    },
                },
            ];
            for (const regConf of regConfs) {
                htmlStr = htmlStr.replace(regConf.reg, regConf.cbk);
            }
            return htmlStr;
        };
        const convertNode = (node) => {
            mmXML += `<node ID="${node.model.id}" TEXT="${(0, str_1.htmlEscape)(Zotero.getMainWindow().document, node.model.name || noteItem.getNoteTitle())}"><hook NAME="AlwaysUnfoldedNode" />`;
            if (options.withContent &&
                node.model.lineIndex >= 0 &&
                node.model.endIndex >= 0) {
                mmXML += `<richcontent TYPE="NOTE" CONTENT-TYPE="xml/"><html><head></head><body>${convertClosingTags(lines
                    .slice(node.model.lineIndex, node.hasChildren()
                    ? node.children[0].model.lineIndex
                    : node.model.endIndex + 1)
                    .join("\n"))}</body></html></richcontent>`;
            }
            if (node.hasChildren()) {
                node.children.forEach((child) => {
                    convertNode(child);
                });
            }
            mmXML += "</node>";
        };
        let mmXML = '<map version="freeplane 1.9.0">';
        convertNode(root);
        mmXML += "</map>";
        ztoolkit.log(mmXML);
        return mmXML;
    });
}
