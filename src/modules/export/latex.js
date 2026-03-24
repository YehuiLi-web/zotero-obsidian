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
exports.saveLatex = saveLatex;
exports.saveMergedLatex = saveMergedLatex;
const hint_1 = require("../../utils/hint");
const prefs_1 = require("../../utils/prefs");
const str_1 = require("../../utils/str");
function saveLatex(filename_1, noteId_1) {
    return __awaiter(this, arguments, void 0, function* (filename, noteId, options = {}) {
        const noteItem = Zotero.Items.get(noteId);
        const dir = (0, str_1.jointPath)(...PathUtils.split((0, str_1.formatPath)(filename)).slice(0, -1));
        yield IOUtils.makeDirectory(dir);
        const hasImage = noteItem.getNote().includes("<img");
        if (hasImage) {
            const attachmentsDir = (0, str_1.jointPath)(dir, (0, prefs_1.getPref)("syncAttachmentFolder"));
            yield IOUtils.makeDirectory(attachmentsDir);
        }
        const [latexContent, bibString] = yield addon.api.convert.note2latex(noteItem, dir, options);
        yield Zotero.File.putContentsAsync(filename, latexContent);
        (0, hint_1.showHintWithLink)(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
            Zotero.File.reveal(filename);
        });
        if (bibString && bibString.length > 0) {
            const raw = yield new ztoolkit.FilePicker(`${Zotero.getString("fileInterface.export")} Bibtex File`, "save", [["Bibtex File(*.bib)", "*.bib"]], `references.bib`).open();
            if (!raw) {
                ztoolkit.log("[Bib Export] Bib file export canceled.");
                return;
            }
            const bibFilename = (0, str_1.formatPath)(raw, ".bib");
            yield Zotero.File.putContentsAsync(bibFilename, bibString);
            (0, hint_1.showHintWithLink)(`Bibliographic Saved to ${bibFilename}`, "Show in Folder", (ev) => {
                Zotero.File.reveal(bibFilename);
            });
        }
    });
}
function saveMergedLatex(filename, noteIds) {
    return __awaiter(this, void 0, void 0, function* () {
        const noteItems = noteIds.map((noteId) => Zotero.Items.get(noteId));
        const dir = (0, str_1.jointPath)(...PathUtils.split((0, str_1.formatPath)(filename)).slice(0, -1));
        yield IOUtils.makeDirectory(dir);
        const hasImage = noteItems.some((item) => item.getNote().includes("<img"));
        if (hasImage) {
            const attachmentsDir = (0, str_1.jointPath)(dir, (0, prefs_1.getPref)("syncAttachmentFolder"));
            yield IOUtils.makeDirectory(attachmentsDir);
        }
        let latexContent = "";
        let bibString = "";
        const separatedString = "\n\n";
        for (const noteItem of noteItems) {
            const [latexContent_, bibString_] = yield addon.api.convert.note2latex(noteItem, dir, {});
            latexContent += latexContent_;
            latexContent += separatedString;
            if (bibString_.length > 0) {
                bibString += bibString_;
                bibString += separatedString;
            }
        }
        yield Zotero.File.putContentsAsync(filename, latexContent);
        (0, hint_1.showHintWithLink)(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
            Zotero.File.reveal(filename);
        });
        if (bibString.length > 0) {
            const raw = yield new ztoolkit.FilePicker(`${Zotero.getString("fileInterface.export")} Bibtex File`, "save", [["Bibtex File(*.bib)", "*.bib"]], `references.bib`).open();
            if (!raw) {
                ztoolkit.log("[Bib Export] Bib file export canceled.");
                return;
            }
            const bibFilename = (0, str_1.formatPath)(raw, ".bib");
            yield Zotero.File.putContentsAsync(bibFilename, bibString);
            (0, hint_1.showHintWithLink)(`Bibliographic Saved to ${bibFilename}`, "Show in Folder", (ev) => {
                Zotero.File.reveal(bibFilename);
            });
        }
    });
}
