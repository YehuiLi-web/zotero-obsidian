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
exports.createNoteFromTemplate = createNoteFromTemplate;
exports.createNoteFromMD = createNoteFromMD;
exports.createNote = createNote;
const locale_1 = require("../utils/locale");
const str_1 = require("../utils/str");
function getLibraryParentId() {
    var _a;
    return (_a = Zotero.getMainWindow()
        .ZoteroPane.getSelectedItems()
        .filter((item) => item.isRegularItem())[0]) === null || _a === void 0 ? void 0 : _a.id;
}
function getReaderParentId() {
    const currentReader = Zotero.Reader.getByTabID(Zotero.getMainWindow().Zotero_Tabs.selectedID);
    const parentItemId = Zotero.Items.get((currentReader === null || currentReader === void 0 ? void 0 : currentReader.itemID) || -1).parentItemID;
    return parentItemId;
}
function createNoteFromTemplate(noteType, parentType) {
    return __awaiter(this, void 0, void 0, function* () {
        if (noteType === "item") {
            const parentItemId = parentType === "reader" ? getReaderParentId() : getLibraryParentId();
            if (!parentItemId) {
                Zotero.getMainWindow().alert((0, locale_1.getString)("alert-notValidParentItemError"));
                return;
            }
            addon.hooks.onShowTemplatePicker("create", {
                noteType,
                parentItemId,
                // Only pre-select the top item if the parent is a reader item
                topItemIds: parentType === "reader" ? [parentItemId] : undefined,
            });
        }
        else {
            addon.hooks.onShowTemplatePicker("create", {
                noteType,
            });
        }
    });
}
function createNoteFromMD() {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if we can create a note
        if (!(yield createNote({ dryRun: true }))) {
            return;
        }
        const syncNotes = Zotero.getMainWindow().confirm((0, locale_1.getString)("alert-syncImportedNotes"));
        const filepaths = yield new ztoolkit.FilePicker("Import MarkDown", "multiple", [
            [`MarkDown(*.md)`, `*.md`],
            ["All Files", "*"],
        ]).open();
        if (!filepaths) {
            return;
        }
        for (const filepath of filepaths) {
            const noteItem = yield createNote();
            if (!noteItem) {
                continue;
            }
            yield addon.api.$import.fromMD(filepath, {
                noteId: noteItem.id,
                ignoreVersion: true,
            });
            if (noteItem && syncNotes) {
                const pathSplit = PathUtils.split((0, str_1.formatPath)(filepath));
                addon.api.sync.updateSyncStatus(noteItem.id, {
                    itemID: noteItem.id,
                    path: (0, str_1.formatPath)(pathSplit.slice(0, -1).join("/")),
                    filename: pathSplit.pop() || "",
                    lastsync: new Date().getTime(),
                    md5: "",
                    noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
                });
            }
        }
    });
}
function createNote() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        let noteItem;
        const ZoteroPane = Zotero.getActiveZoteroPane();
        const cView = ZoteroPane.collectionsView;
        if (!cView) {
            Zotero.getMainWindow().alert((0, locale_1.getString)("alert-notValidCollectionError"));
            return false;
        }
        const cRow = cView.selectedTreeRow;
        if (["library", "group", "collection"].includes(cRow.type)) {
            if (options.dryRun) {
                return true;
            }
            noteItem = new Zotero.Item("note");
            noteItem.libraryID = ZoteroPane.getSelectedLibraryID();
            if (cRow.type === "collection") {
                noteItem.addToCollection(cRow.ref.id);
            }
        }
        else {
            Zotero.getMainWindow().alert((0, locale_1.getString)("alert-notValidCollectionError"));
            return false;
        }
        if (!options.noSave) {
            yield noteItem.saveTx();
        }
        return noteItem;
    });
}
