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
exports.fromMD = fromMD;
const note_1 = require("../../utils/note");
const package_json_1 = require("../../../package.json");
function fromMD(filepath_1) {
    return __awaiter(this, arguments, void 0, function* (filepath, options = {}) {
        var _a, _b;
        let mdStatus;
        try {
            mdStatus = yield addon.api.sync.getMDStatus(filepath);
        }
        catch (e) {
            ztoolkit.log(`Import Error: ${String(e)}`);
            return;
        }
        let noteItem = options.noteId ? Zotero.Items.get(options.noteId) : undefined;
        if (!options.ignoreVersion &&
            typeof ((_a = mdStatus.meta) === null || _a === void 0 ? void 0 : _a.$version) === "number" &&
            typeof (noteItem === null || noteItem === void 0 ? void 0 : noteItem.version) === "number" &&
            ((_b = mdStatus.meta) === null || _b === void 0 ? void 0 : _b.$version) < (noteItem === null || noteItem === void 0 ? void 0 : noteItem.version)) {
            if (!Zotero.getMainWindow().confirm(`The target note seems to be newer than the file ${filepath}. Are you sure you want to import it anyway?`)) {
                return;
            }
        }
        const noteStatus = noteItem
            ? addon.api.sync.getNoteStatus(noteItem.id)
            : {
                meta: `<div data-schema-version="${package_json_1.config.dataSchemaVersion}">`,
                content: "",
                tail: "</div>",
            };
        if (!noteItem) {
            const _noteItem = yield addon.hooks.onCreateNote({
                noSave: true,
            });
            if (!_noteItem) {
                return;
            }
            noteItem = _noteItem;
            yield noteItem.saveTx({
                notifierData: {
                    autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
                },
            });
        }
        const normalizedMDStatus = noteItem && addon.api.obsidian.isManagedNote(noteItem)
            ? Object.assign(Object.assign({}, mdStatus), { content: addon.api.obsidian.extractUserMarkdown(mdStatus.content) }) : mdStatus;
        const parsedContent = yield addon.api.convert.md2note(normalizedMDStatus, noteItem, {
            isImport: true,
        });
        ztoolkit.log("import", noteStatus);
        if (options.append) {
            yield (0, note_1.addLineToNote)(noteItem, parsedContent, options.appendLineIndex || -1);
        }
        else {
            noteItem.setNote(noteStatus.meta + parsedContent + noteStatus.tail);
            yield noteItem.saveTx({
                notifierData: {
                    autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
                },
            });
        }
        if (noteItem && addon.api.obsidian.isManagedNote(noteItem)) {
            yield addon.api.obsidian.applyManagedFrontmatter(noteItem, mdStatus.meta);
        }
        return noteItem;
    });
}
