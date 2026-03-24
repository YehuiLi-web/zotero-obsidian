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
exports.exportNotes = exportNotes;
const link_1 = require("../../utils/link");
const locale_1 = require("../../utils/locale");
const note_1 = require("../../utils/note");
const str_1 = require("../../utils/str");
function exportNotes(noteItems, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const ZoteroPane = Zotero.getMainWindow().ZoteroPane;
        let inputNoteItems = noteItems;
        // If embedLink or exportNote, create a new note item
        if ((options.embedLink || options.exportNote) && !options.setAutoSync) {
            inputNoteItems = [];
            for (const noteItem of noteItems) {
                const noteID = yield ZoteroPane.newNote();
                const newNote = Zotero.Items.get(noteID);
                newNote.setNote(noteItem.getNote());
                yield newNote.saveTx({
                    skipSelect: true,
                    skipNotifier: true,
                    skipSyncedUpdate: true,
                });
                yield Zotero.DB.executeTransaction(() => __awaiter(this, void 0, void 0, function* () {
                    yield Zotero.Notes.copyEmbeddedImages(noteItem, newNote);
                }));
                if (options.embedLink) {
                    newNote.setNote(yield embedLinkedNotes(newNote));
                }
                yield newNote.saveTx();
                inputNoteItems.push(newNote);
            }
        }
        let linkedNoteItems = [];
        if (options.standaloneLink) {
            const linkedNoteIds = [];
            for (const noteItem of inputNoteItems) {
                const linkedIds = (0, link_1.getLinkedNotesRecursively)((0, link_1.getNoteLink)(noteItem) || "", linkedNoteIds);
                linkedNoteIds.push(...linkedIds);
            }
            const targetNoteItemIds = inputNoteItems.map((item) => item.id);
            linkedNoteItems = Zotero.Items.get(linkedNoteIds.filter((id) => !targetNoteItemIds.includes(id)));
        }
        const allNoteItems = Array.from(new Set(inputNoteItems.concat(linkedNoteItems)));
        if (options.exportMD) {
            if (options.setAutoSync) {
                const raw = yield new ztoolkit.FilePicker(`${(0, locale_1.getString)("fileInterface-sync")} MarkDown File`, "folder").open();
                if (raw) {
                    const syncDir = (0, str_1.formatPath)(raw);
                    // Hard reset sync status for input notes
                    for (const noteItem of inputNoteItems) {
                        yield toSync(noteItem, syncDir, true);
                    }
                    // Find linked notes that are not synced and include them in sync
                    for (const noteItem of linkedNoteItems) {
                        yield toSync(noteItem, syncDir, false);
                    }
                    yield addon.hooks.onSyncing(allNoteItems, {
                        quiet: true,
                        skipActive: false,
                        reason: "export",
                    });
                }
            }
            else {
                let exportDir = false;
                if (options.autoMDFileName) {
                    const raw = yield new ztoolkit.FilePicker(`${(0, locale_1.getString)("fileInterface-export")} MarkDown File`, "folder").open();
                    exportDir = raw && (0, str_1.formatPath)(raw);
                }
                for (const noteItem of allNoteItems) {
                    yield toMD(noteItem, {
                        filename: (exportDir &&
                            (0, str_1.jointPath)(exportDir, yield addon.api.sync.getMDFileName(noteItem.id, exportDir))) ||
                            undefined,
                        withYAMLHeader: options.withYAMLHeader,
                        keepNoteLink: true,
                    });
                }
            }
        }
        if (options.exportLatex) {
            if (allNoteItems.length > 1 && options.mergeLatex) {
                yield toMergedLatex(allNoteItems);
            }
            else {
                for (const noteItem of allNoteItems) {
                    yield toLatex(noteItem);
                }
            }
        }
        if (options.exportDocx) {
            for (const noteItem of allNoteItems) {
                yield toDocx(noteItem);
            }
        }
        if (options.exportFreeMind) {
            for (const noteItem of allNoteItems) {
                yield toFreeMind(noteItem);
            }
        }
        if (options.exportPDF) {
            for (const noteItem of allNoteItems) {
                yield addon.api.$export.savePDF(noteItem.id);
            }
        }
        if (options.embedLink && !options.exportNote) {
            // If not exportNote, delete temp notes
            for (const noteItem of allNoteItems) {
                const _w = ZoteroPane.findNoteWindow(noteItem.id);
                if (_w) {
                    _w.close();
                }
                yield Zotero.Items.erase(noteItem.id);
            }
        }
        else if (options.exportNote) {
            for (const noteItem of allNoteItems) {
                ZoteroPane.openNoteWindow(noteItem.id);
            }
        }
    });
}
function toMD(noteItem_1) {
    return __awaiter(this, arguments, void 0, function* (noteItem, options = {}) {
        let filename = options.filename;
        if (!filename) {
            const raw = yield new ztoolkit.FilePicker(`${Zotero.getString("fileInterface.export")} MarkDown File`, "save", [
                ["MarkDown File(*.md)", "*.md"],
                ["All Files", "*"],
            ], `${noteItem.getNoteTitle()}.md`).open();
            if (!raw)
                return;
            filename = (0, str_1.formatPath)(raw, ".md");
        }
        yield addon.api.$export.saveMD(filename, noteItem.id, options);
    });
}
function toLatex(noteItem_1) {
    return __awaiter(this, arguments, void 0, function* (noteItem, options = {}) {
        let filename = options.filename;
        if (!filename) {
            const raw = yield new ztoolkit.FilePicker(`${Zotero.getString("fileInterface.export")} Latex File`, "save", [
                ["Latex File(*.tex)", "*.tex"],
                ["All Files", "*"],
            ], `${noteItem.getNoteTitle()}.tex`).open();
            if (!raw)
                return;
            filename = (0, str_1.formatPath)(raw, ".tex");
        }
        yield addon.api.$export.saveLatex(filename, noteItem.id, options);
    });
}
function toMergedLatex(noteItems_1) {
    return __awaiter(this, arguments, void 0, function* (noteItems, options = {}) {
        let filename = options.filename;
        if (!filename) {
            const raw = yield new ztoolkit.FilePicker(`${Zotero.getString("fileInterface.export")} Latex File`, "save", [
                ["Latex File(*.tex)", "*.tex"],
                ["All Files", "*"],
            ], `export-notes-to-one-latex.tex`).open();
            if (!raw)
                return;
            filename = (0, str_1.formatPath)(raw, ".tex");
        }
        const noteIds = noteItems.map((item) => item.id);
        yield addon.api.$export.saveMergedLatex(filename, noteIds);
    });
}
function toSync(noteItem_1, syncDir_1) {
    return __awaiter(this, arguments, void 0, function* (noteItem, syncDir, overwrite = false) {
        if (!overwrite && addon.api.sync.isSyncNote(noteItem.id)) {
            return;
        }
        addon.api.sync.updateSyncStatus(noteItem.id, {
            path: syncDir,
            filename: yield addon.api.sync.getMDFileName(noteItem.id, syncDir),
            md5: "",
            noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
            lastsync: 0,
            itemID: noteItem.id,
        });
    });
}
function toDocx(noteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const raw = yield new ztoolkit.FilePicker(`${Zotero.getString("fileInterface.export")} MS Word Docx`, "save", [["MS Word Docx File(*.docx)", "*.docx"]], `${noteItem.getNoteTitle()}.docx`).open();
        if (!raw)
            return;
        const filename = (0, str_1.formatPath)(raw, ".docx");
        yield addon.api.$export.saveDocx(filename, noteItem.id);
    });
}
function toFreeMind(noteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const raw = yield new ztoolkit.FilePicker(`${Zotero.getString("fileInterface.export")} FreeMind XML`, "save", [["FreeMind XML File(*.mm)", "*.mm"]], `${noteItem.getNoteTitle()}.mm`).open();
        if (!raw)
            return;
        const filename = (0, str_1.formatPath)(raw, ".mm");
        yield addon.api.$export.saveFreeMind(filename, noteItem.id);
    });
}
function embedLinkedNotes(noteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const parser = new DOMParser();
        const globalCitationData = getNoteCitationData(noteItem);
        const newLines = [];
        const noteLines = yield (0, note_1.getLinesInNote)(noteItem);
        for (const i in noteLines) {
            newLines.push(noteLines[i]);
            const doc = parser.parseFromString(noteLines[i], "text/html");
            const linkParams = Array.from(doc.querySelectorAll("a"))
                .filter((a) => a === null || a === void 0 ? void 0 : a.href.startsWith("zotero://note/"))
                .map((a) => (0, link_1.getNoteLinkParams)(a === null || a === void 0 ? void 0 : a.href))
                .filter((p) => p.noteItem && !p.ignore);
            for (const linkParam of linkParams) {
                const html = yield addon.api.template.runTemplate("[QuickImportV2]", "link, noteItem", [linkParam.link, noteItem]);
                newLines.push(html);
                const citationData = getNoteCitationData(linkParam.noteItem);
                globalCitationData.items.push(...citationData.items);
            }
        }
        // Clean up globalCitationItems
        const seenCitationItemIDs = [];
        const finalCitationItems = [];
        for (const citationItem of globalCitationData.items) {
            const currentID = citationItem.uris[0];
            if (!(currentID in seenCitationItemIDs)) {
                finalCitationItems.push(citationItem);
                seenCitationItemIDs.push(currentID);
            }
        }
        return `<div data-schema-version="${globalCitationData.schemaVersion}" data-citation-items="${encodeURIComponent(JSON.stringify(finalCitationItems))}">${newLines.join("\n")}</div>`;
    });
}
function getNoteCitationData(noteItem) {
    var _a, _b;
    const parser = new DOMParser();
    const doc = parser.parseFromString(noteItem.getNote(), "text/html");
    const citationItems = (0, str_1.tryDecodeParse)(((_a = doc
        .querySelector("div[data-citation-items]")) === null || _a === void 0 ? void 0 : _a.getAttribute("data-citation-items")) || "[]");
    const citationData = {
        items: citationItems,
        schemaVersion: ((_b = doc
            .querySelector("div[data-schema-version]")) === null || _b === void 0 ? void 0 : _b.getAttribute("data-schema-version")) || "",
    };
    return citationData;
}
