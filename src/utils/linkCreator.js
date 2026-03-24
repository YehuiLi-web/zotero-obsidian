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
exports.openLinkCreator = openLinkCreator;
const package_json_1 = require("../../package.json");
const hint_1 = require("./hint");
const locale_1 = require("./locale");
const note_1 = require("./note");
function openLinkCreator(currentNote, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!currentNote.id) {
            (0, hint_1.showHint)((0, locale_1.getString)("alert-linkCreator-emptyNote"));
            return;
        }
        const io = {
            openedNoteIDs: Array.from(new Set(Zotero.Notes._editorInstances
                .map((editor) => { var _a; return (_a = editor._item) === null || _a === void 0 ? void 0 : _a.id; })
                .filter((id) => id))),
            currentNoteID: currentNote.id,
            currentLineIndex: options === null || options === void 0 ? void 0 : options.lineIndex,
            mode: options === null || options === void 0 ? void 0 : options.mode,
            deferred: Zotero.Promise.defer(),
        };
        Services.ww.openWindow(
        // @ts-ignore
        null, `chrome://${package_json_1.config.addonRef}/content/linkCreator.xhtml`, `${package_json_1.config.addonRef}-linkCreator`, "chrome,modal,centerscreen,resizable=yes", io);
        yield io.deferred.promise;
        const targetNote = Zotero.Items.get(io.targetNoteID);
        if (!targetNote)
            return;
        const sourceNotes = Zotero.Items.get(io.sourceNoteIDs);
        let content = "";
        for (const note of sourceNotes) {
            content += yield addon.api.template.runQuickInsertTemplate(note, targetNote, { dryRun: false });
            content += "\n";
        }
        const lineIndex = io.lineIndex;
        yield (0, note_1.addLineToNote)(targetNote, content, lineIndex);
    });
}
