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
exports.showTemplatePicker = showTemplatePicker;
const note_1 = require("../../utils/note");
const templatePicker_1 = require("../../utils/templatePicker");
function showTemplatePicker() {
    return __awaiter(this, arguments, void 0, function* (mode = "insert", data = {}) {
        addon.data.template.picker.mode = mode;
        addon.data.template.picker.data = data;
        const selected = yield (0, templatePicker_1.openTemplatePicker)();
        // For pick mode, return selected templates
        if (mode === "pick") {
            return selected;
        }
        if (!selected.length) {
            return;
        }
        const name = selected[0];
        yield handleTemplateOperation(name);
    });
}
function handleTemplateOperation(name) {
    return __awaiter(this, void 0, void 0, function* () {
        ztoolkit.log(name);
        // TODO: add preview when command is selected
        switch (addon.data.template.picker.mode) {
            case "create":
                yield createTemplateNoteCallback(name);
                break;
            case "export":
                yield exportTemplateCallback(name);
                break;
            case "insert":
            default:
                yield insertTemplateCallback(name);
                break;
        }
        addon.data.template.picker.mode = "insert";
        addon.data.template.picker.data = {};
    });
}
function insertTemplateCallback(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetNoteItem = Zotero.Items.get(addon.data.template.picker.data.noteId);
        let html = "";
        if (name.toLowerCase().startsWith("[item]")) {
            html = yield addon.api.template.runItemTemplate(name, {
                targetNoteId: targetNoteItem.id,
            });
        }
        else {
            html = yield addon.api.template.runTextTemplate(name, {
                targetNoteId: targetNoteItem.id,
            });
        }
        let lineIndex = addon.data.template.picker.data.lineIndex;
        // Insert to the end of the line
        if (lineIndex >= 0) {
            lineIndex += 1;
        }
        yield (0, note_1.addLineToNote)(targetNoteItem, html, lineIndex);
    });
}
function createTemplateNoteCallback(name) {
    return __awaiter(this, void 0, void 0, function* () {
        addon.data.template.picker.data.librarySelectedIds =
            Zotero.getMainWindow().ZoteroPane.getSelectedItems(true);
        switch (addon.data.template.picker.data.noteType) {
            case "standalone": {
                const noteItem = yield addon.hooks.onCreateNote();
                if (!noteItem) {
                    return;
                }
                addon.data.template.picker.data.noteId = noteItem.id;
                break;
            }
            case "item": {
                const parentID = addon.data.template.picker.data.parentItemId;
                const noteItem = new Zotero.Item("note");
                noteItem.libraryID = Zotero.Items.get(parentID).libraryID;
                noteItem.parentID = parentID;
                yield noteItem.saveTx();
                addon.data.template.picker.data.noteId = noteItem.id;
                break;
            }
            default:
                return;
        }
        yield insertTemplateCallback(name);
    });
}
function exportTemplateCallback(name) {
    return __awaiter(this, void 0, void 0, function* () {
        addon.data.template.picker.data.librarySelectedIds =
            Zotero.getMainWindow().ZoteroPane.getSelectedItems(true);
        // Create temp note
        const noteItem = new Zotero.Item("note");
        noteItem.libraryID = Zotero.Libraries.userLibraryID;
        yield noteItem.saveTx();
        addon.data.template.picker.data.noteId = noteItem.id;
        yield insertTemplateCallback(name);
        // Export note
        yield addon.hooks.onShowExportNoteOptions([noteItem.id], {
            setAutoSync: false,
        });
        // Delete temp note
        yield Zotero.Items.erase(noteItem.id);
    });
}
