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
exports.renderNoteHTML = renderNoteHTML;
exports.parseHTMLLines = parseHTMLLines;
exports.getLinesInNote = getLinesInNote;
exports.addLineToNote = addLineToNote;
exports.getNoteTree = getNoteTree;
exports.getNoteTreeFlattened = getNoteTreeFlattened;
exports.getNoteTreeNodeById = getNoteTreeNodeById;
exports.copyEmbeddedImagesFromNote = copyEmbeddedImagesFromNote;
exports.copyEmbeddedImagesInHTML = copyEmbeddedImagesInHTML;
exports.importImageToNote = importImageToNote;
const TreeModel = require("tree-model");
const katex = require("katex");
const editor_1 = require("./editor");
const str_1 = require("./str");
const package_json_1 = require("../../package.json");
const parsing_1 = require("./parsing");
function parseHTMLLines(html) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield (0, parsing_1.getParsingServer)();
        return yield server.proxy.parseHTMLLines(html);
    });
}
function getLinesInNote(note, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!note) {
            return [];
        }
        const noteText = note.getNote();
        if (options === null || options === void 0 ? void 0 : options.convertToHTML) {
            return new Promise((resolve) => {
                addon.api.convert.note2html(note).then((html) => {
                    resolve(parseHTMLLines(html));
                });
            });
        }
        return parseHTMLLines(noteText);
    });
}
function setLinesToNote(note, lines) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!note) {
            return [];
        }
        const noteText = note.getNote();
        const containerIndex = noteText.search(/data-schema-version="[0-9]*/g);
        if (containerIndex === -1) {
            note.setNote(`<div data-schema-version="${package_json_1.config.dataSchemaVersion}">${lines.join("\n")}</div>`);
        }
        else {
            const noteHead = noteText.substring(0, containerIndex);
            note.setNote(`${noteHead}data-schema-version="${package_json_1.config.dataSchemaVersion}">${lines.join("\n")}</div>`);
        }
        yield note.saveTx();
    });
}
function addLineToNote(note_1, html_1) {
    return __awaiter(this, arguments, void 0, function* (note, html, lineIndex = -1, forceMetadata = false) {
        if (!note || !html) {
            return;
        }
        const noteLines = yield getLinesInNote(note);
        // No need to handle the case when lineIndex is out of range, as it will always be inserted at the very end
        if (lineIndex < 0) {
            lineIndex = noteLines.length;
        }
        ztoolkit.log(`insert to ${lineIndex}, it used to be ${noteLines[lineIndex]}`);
        ztoolkit.log(html);
        const editor = (0, editor_1.getEditorInstance)(note.id);
        if (editor && !forceMetadata) {
            // The note is opened. Add line via note editor
            // If the lineIndex is out of range, the line will be inserted at the end (after the last line)
            const pos = (0, editor_1.getPositionAtLine)(editor, lineIndex, lineIndex >= noteLines.length ? "end" : "start");
            ztoolkit.log("Add note line via note editor", pos);
            (0, editor_1.insert)(editor, html, pos);
            // The selection is automatically moved to the next line
        }
        else {
            // The note editor does not exits yet. Fall back to modify the metadata
            ztoolkit.log("Add note line via note metadata");
            noteLines.splice(lineIndex, 0, html);
            yield setLinesToNote(note, noteLines);
        }
    });
}
function renderNoteHTML(htmlOrNote, refNotes) {
    return __awaiter(this, void 0, void 0, function* () {
        let html;
        if (typeof htmlOrNote === "string") {
            html = htmlOrNote;
            refNotes = (refNotes || []).filter((item) => item.isNote());
        }
        else {
            const noteItem = htmlOrNote;
            if (!noteItem.isNote()) {
                throw new Error("Item is not a note");
            }
            html = noteItem.getNote();
            refNotes = [noteItem];
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const imageAttachments = refNotes.reduce((acc, note) => {
            acc.push(...Zotero.Items.get(note.getAttachments()));
            return acc;
        }, []);
        for (const attachment of imageAttachments) {
            if (yield attachment.fileExists()) {
                const imageNodes = Array.from(doc.querySelectorAll(`img[data-attachment-key="${attachment.key}"]`));
                if (imageNodes.length) {
                    try {
                        const b64 = yield (0, str_1.getItemDataURL)(attachment);
                        imageNodes.forEach((node) => {
                            node.setAttribute("src", b64);
                            const width = Number(node.getAttribute("width"));
                            const height = Number(node.getAttribute("height"));
                            // 650/470 is the default width of images in Word
                            const maxWidth = Zotero.isMac ? 470 : 650;
                            if (width > maxWidth) {
                                node.setAttribute("width", maxWidth.toString());
                                if (height) {
                                    node.setAttribute("height", Math.round((height * maxWidth) / width).toString());
                                }
                            }
                            if (node.hasAttribute("width")) {
                                node.style.width = `${node.getAttribute("width")}px`;
                            }
                            if (node.hasAttribute("height")) {
                                node.style.height = `${node.getAttribute("height")}px`;
                            }
                        });
                    }
                    catch (e) {
                        ztoolkit.log(e);
                    }
                }
            }
        }
        const bgNodes = doc.querySelectorAll("span[style]");
        for (const node of Array.from(bgNodes)) {
            // Browser converts #RRGGBBAA hex color to rgba function, and we convert it to rgb function,
            // because word processors don't understand colors with alpha channel
            if (node.style.backgroundColor &&
                node.style.backgroundColor.startsWith("rgba")) {
                node.style.backgroundColor =
                    node.style.backgroundColor
                        .replace("rgba", "rgb")
                        .split(",")
                        .slice(0, 3)
                        .join(",") + ")";
            }
        }
        const mathDelimiterRegex = /^\$+|\$+$/g;
        doc.querySelectorAll(".math").forEach((node) => {
            const displayMode = node.innerHTML.startsWith("$$");
            node.innerHTML = katex.renderToString(node.textContent.replace(mathDelimiterRegex, ""), {
                throwOnError: false,
                // output: "mathml",
                displayMode,
            });
        });
        return doc.body.innerHTML;
    });
}
function getNoteTree(note_1) {
    return __awaiter(this, arguments, void 0, function* (note, parseLink = true) {
        const timeLabel = `getNoteTree-${note.id}-${Math.random()}`;
        Zotero.getMainWindow().console.time(timeLabel);
        const noteLines = yield getLinesInNote(note);
        const parser = new DOMParser();
        const tree = new TreeModel();
        const root = tree.parse({
            id: -1,
            level: 0,
            lineIndex: -1,
            endIndex: -1,
        });
        let id = 0;
        let lastNode = root;
        const headingRegex = new RegExp("^<h([1-6])(.*?)</h[1-6]>");
        const linkRegex = new RegExp('href="(zotero://note/[^"]*)"');
        for (const i in noteLines) {
            let currentLevel = 7;
            const lineElement = noteLines[i];
            const matchHeadingResult = lineElement.match(headingRegex);
            const matchLinkResult = parseLink ? lineElement.match(linkRegex) : null;
            const isHeading = Boolean(matchHeadingResult);
            // Links in blockquote are ignored
            const isLink = Boolean(matchLinkResult) && !noteLines[i].startsWith("<blockquote");
            if (isHeading || isLink) {
                let name = "";
                let link = "";
                if (isHeading) {
                    currentLevel = parseInt(matchHeadingResult[1] || "7");
                }
                else {
                    link = matchLinkResult[1];
                }
                name = parser.parseFromString(lineElement, "text/html").body.innerText;
                // Find parent node
                let parentNode = lastNode;
                while (parentNode.model.level >= currentLevel) {
                    parentNode = parentNode.parent;
                }
                const currentNode = tree.parse({
                    id: id++,
                    level: currentLevel,
                    name: name,
                    lineIndex: parseInt(i),
                    endIndex: noteLines.length - 1,
                    link: link,
                });
                parentNode.addChild(currentNode);
                const currentIndex = parentNode.children.indexOf(currentNode);
                if (currentIndex > 0) {
                    const previousNode = parentNode.children[currentIndex - 1];
                    // Traverse the previous node tree and set the end index
                    previousNode.walk((node) => {
                        if (node.model.endIndex > parseInt(i) - 1) {
                            node.model.endIndex = parseInt(i) - 1;
                        }
                        Zotero.getMainWindow().console.timeEnd(timeLabel);
                        return true;
                    });
                    previousNode.model.endIndex = parseInt(i) - 1;
                }
                lastNode = currentNode;
            }
        }
        Zotero.getMainWindow().console.timeEnd(timeLabel);
        return root;
    });
}
function getNoteTreeFlattened(note_1) {
    return __awaiter(this, arguments, void 0, function* (note, options = { keepRoot: false, keepLink: false }) {
        if (!note) {
            return [];
        }
        return (yield getNoteTree(note)).all((node) => (options.keepRoot || node.model.lineIndex >= 0) &&
            (options.keepLink || node.model.level <= 6) &&
            (options.customFilter ? options.customFilter(node) : true));
    });
}
function getNoteTreeNodeById(note_1, id_1) {
    return __awaiter(this, arguments, void 0, function* (note, id, root = undefined) {
        root = root || (yield getNoteTree(note));
        return root.first(function (node) {
            return node.model.id === id;
        });
    });
}
function getNoteTreeNodesByLevel(note_1, level_1) {
    return __awaiter(this, arguments, void 0, function* (note, level, root = undefined) {
        root = root || (yield getNoteTree(note));
        return root.all(function (node) {
            return node.model.level === level;
        });
    });
}
function copyEmbeddedImagesFromNote(targetNote, sourceNotes) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Zotero.DB.executeTransaction(() => __awaiter(this, void 0, void 0, function* () {
            for (const fromNote of sourceNotes) {
                // Do not copy to itself, otherwise the note may break the DB
                if (!fromNote.id || !targetNote.id || fromNote.id === targetNote.id) {
                    continue;
                }
                yield Zotero.Notes.copyEmbeddedImages(fromNote, targetNote);
            }
        }));
    });
}
function copyEmbeddedImagesInHTML(html_1, targetNote_1) {
    return __awaiter(this, arguments, void 0, function* (html, targetNote, refNotes = []) {
        ztoolkit.log("parseEmbeddedImagesInHTML", html, targetNote === null || targetNote === void 0 ? void 0 : targetNote.getNoteTitle(), refNotes.length);
        if (!targetNote) {
            return html;
        }
        const attachments = refNotes.reduce((acc, note) => {
            acc.push(...Zotero.Items.get(note.getAttachments()));
            return acc;
        }, []);
        if (!attachments.length) {
            return html;
        }
        ztoolkit.log(attachments.length, "attachments found in refNotes");
        const doc = new DOMParser().parseFromString(html, "text/html");
        // Copy note image attachments and replace keys in the new note
        for (const attachment of attachments) {
            if (yield attachment.fileExists()) {
                const nodes = Array.from(doc.querySelectorAll(`img[data-attachment-key="${attachment.key}"]`));
                if (nodes.length) {
                    let copiedAttachment;
                    yield Zotero.DB.executeTransaction(() => __awaiter(this, void 0, void 0, function* () {
                        Zotero.DB.requireTransaction();
                        // Do not copy to itself, otherwise the note may break the DB
                        if (!attachment.parentID ||
                            !targetNote.id ||
                            attachment.parentID === targetNote.id) {
                            return;
                        }
                        copiedAttachment = yield Zotero.Attachments.copyEmbeddedImage({
                            attachment,
                            note: targetNote,
                        });
                    }));
                    if (!copiedAttachment) {
                        continue;
                    }
                    nodes.forEach((node) => node === null || node === void 0 ? void 0 : node.setAttribute("data-attachment-key", copiedAttachment.key));
                }
            }
        }
        ztoolkit.log("embed", doc.body.innerHTML);
        return doc.body.innerHTML;
    });
}
function dataURLtoBlob(dataurl) {
    var _a;
    const parts = dataurl.split(",");
    const matches = (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.match(/:(.*?);/);
    if (!matches || !matches[1]) {
        return;
    }
    const mime = matches[1];
    if (parts[0].indexOf("base64") !== -1) {
        const bstr = ztoolkit.getGlobal("atob")(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new (ztoolkit.getGlobal("Blob"))([u8arr], {
            type: mime,
        });
    }
    return null;
}
function importImageToNote(note_1, src_1) {
    return __awaiter(this, arguments, void 0, function* (note, src, type = "b64") {
        var _a;
        if (!note || !note.isNote()) {
            return "";
        }
        let blob;
        if (src.startsWith("data:")) {
            const dataBlob = dataURLtoBlob(src);
            if (!dataBlob) {
                return;
            }
            blob = dataBlob;
        }
        else if (type === "url") {
            let res;
            try {
                res = yield Zotero.HTTP.request("GET", src, { responseType: "blob" });
            }
            catch (e) {
                return;
            }
            blob = res.response;
        }
        else if (type === "file") {
            src = (0, str_1.formatPath)(src);
            const noteAttachmentKeys = Zotero.Items.get(note.getAttachments()).map((_i) => _i.key);
            const filename = (_a = src.split("/").pop()) === null || _a === void 0 ? void 0 : _a.split(".").shift();
            // The exported image is KEY.png by default.
            // If it is already an attachment, just keep it.
            if (noteAttachmentKeys.includes(filename || "")) {
                return filename;
            }
            const imageData = yield Zotero.File.getBinaryContentsAsync(src);
            const array = new Uint8Array(imageData.length);
            for (let i = 0; i < imageData.length; i++) {
                array[i] = imageData.charCodeAt(i);
            }
            blob = new Blob([array], { type: "image/png" });
        }
        else {
            return;
        }
        if (!blob) {
            ztoolkit.log("Failed to import image.");
            return;
        }
        const attachment = yield Zotero.Attachments.importEmbeddedImage({
            blob,
            parentItemID: note.id,
            saveOptions: {},
        });
        return attachment.key;
    });
}
