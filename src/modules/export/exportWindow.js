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
exports.showExportNoteOptions = showExportNoteOptions;
const package_json_1 = require("../../../package.json");
const str_1 = require("../../utils/str");
function showExportNoteOptions(noteIds_1) {
    return __awaiter(this, arguments, void 0, function* (noteIds, overwriteOptions = {}) {
        const items = Zotero.Items.get(noteIds);
        const noteItems = [];
        items.forEach((item) => {
            if (item.isNote()) {
                noteItems.push(item);
            }
            if (item.isRegularItem()) {
                noteItems.splice(0, 0, ...Zotero.Items.get(item.getNotes()));
            }
        });
        if (noteItems.length === 0) {
            return;
        }
        const io = {
            targetData: {
                left: noteItems.length - 1,
                title: (0, str_1.fill)((0, str_1.slice)(noteItems[0].getNoteTitle(), 40), 40),
            },
            deferred: Zotero.Promise.defer(),
            accepted: false,
            useBuiltInExport: false,
        };
        Zotero.getMainWindow().openDialog(`chrome://${package_json_1.config.addonRef}/content/exportNotes.xhtml`, `${package_json_1.config.addonRef}-exportNotes`, "chrome,centerscreen,resizable", io);
        yield io.deferred.promise;
        if (io.accepted) {
            yield addon.api.$export.exportNotes(noteItems, Object.assign(io, overwriteOptions));
        }
        if (io.useBuiltInExport) {
            const exporter = new (Zotero.getMainWindow().Zotero_File_Exporter)();
            exporter.items = Zotero.Items.get(noteIds);
            if (!exporter.items || !exporter.items.length)
                throw "no items currently selected";
            exporter.save();
        }
    });
}
