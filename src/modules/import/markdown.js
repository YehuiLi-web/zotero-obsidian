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
const watcher_1 = require("../sync/watcher");
const frontmatter_1 = require("../obsidian/frontmatter");
const markdown_1 = require("../obsidian/markdown");
const shared_1 = require("../obsidian/shared");
const settings_1 = require("../obsidian/settings");
function fromMD(filepath_1) {
    return __awaiter(this, arguments, void 0, function* (filepath, options = {}) {
        var _a, _b, _c;
        const safeGetNoteDiffText = (item) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const noteStatus = addon.api.sync.getNoteStatus(item.id);
                if (!((_a = noteStatus === null || noteStatus === void 0 ? void 0 : noteStatus.content) === null || _a === void 0 ? void 0 : _a.trim())) {
                    return "";
                }
                return (yield addon.api.convert.note2noteDiff(item)) || "";
            }
            catch (error) {
                ztoolkit.log("[ObsidianBridge] failed to snapshot note diff text", error);
                return "";
            }
        });
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
                notifierData: Object.assign({ autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY }, (options.skipNotifierSync ? { skipOB: true } : {})),
            });
        }
        if (!noteItem) {
            return;
        }
        const beforeNoteText = yield safeGetNoteDiffText(noteItem);
        const normalizedMeta = (0, frontmatter_1.normalizeFrontmatterObject)(mdStatus.meta);
        const parentTopItem = (noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote()) && ((_c = noteItem.parentItem) === null || _c === void 0 ? void 0 : _c.isRegularItem())
            ? noteItem.parentItem
            : (noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote()) && (noteItem === null || noteItem === void 0 ? void 0 : noteItem.parentID)
                ? Zotero.Items.get(noteItem.parentID)
                : false;
        const hasManagedMarkers = mdStatus.content.includes(markdown_1.GENERATED_BLOCK_START) &&
            mdStatus.content.includes(markdown_1.USER_BLOCK_START);
        const inferredManagedByMeta = Boolean(parentTopItem &&
            parentTopItem.isRegularItem() &&
            normalizedMeta.bridge_managed &&
            (!(0, shared_1.cleanInline)(String(normalizedMeta.zotero_key || "")) ||
                (0, shared_1.cleanInline)(String(normalizedMeta.zotero_key || "")) ===
                    parentTopItem.key));
        const inferredManagedByContent = Boolean(parentTopItem && parentTopItem.isRegularItem() && hasManagedMarkers);
        const isManagedNote = Boolean(noteItem &&
            (addon.api.obsidian.isManagedNote(noteItem) ||
                inferredManagedByMeta ||
                inferredManagedByContent));
        if (isManagedNote &&
            noteItem &&
            parentTopItem &&
            parentTopItem.isRegularItem() &&
            !addon.api.obsidian.isManagedNote(noteItem)) {
            const itemMapKey = (0, settings_1.getItemMapKey)(parentTopItem);
            const itemNoteMap = (0, settings_1.getObsidianItemNoteMap)();
            const mappedNoteKey = (0, shared_1.cleanInline)(String(itemNoteMap[itemMapKey] || ""));
            const mappedNote = mappedNoteKey
                ? Zotero.Items.getByLibraryAndKey(parentTopItem.libraryID, mappedNoteKey)
                : false;
            if (!mappedNoteKey ||
                mappedNoteKey === noteItem.key ||
                !mappedNote ||
                !mappedNote.isNote() ||
                mappedNote.parentID !== parentTopItem.id) {
                itemNoteMap[itemMapKey] = noteItem.key;
                (0, settings_1.setObsidianItemNoteMap)(itemNoteMap);
            }
        }
        const managedUserMarkdown = isManagedNote
            ? addon.api.obsidian.extractUserMarkdown(mdStatus.content)
            : null;
        const normalizedMDStatus = isManagedNote && typeof managedUserMarkdown === "string"
            ? Object.assign(Object.assign({}, mdStatus), { content: managedUserMarkdown }) : isManagedNote
            ? Object.assign(Object.assign({}, mdStatus), { content: "" }) : mdStatus;
        const skippedManagedBodyImport = isManagedNote && typeof managedUserMarkdown !== "string";
        const parsedContent = yield addon.api.convert.md2note(normalizedMDStatus, noteItem, {
            isImport: true,
        });
        ztoolkit.log("import", noteStatus);
        if (skippedManagedBodyImport) {
            ztoolkit.log("[ObsidianBridge] skipped managed note body import because USER block markers are missing or invalid", filepath);
        }
        else if (options.append) {
            yield (0, note_1.addLineToNote)(noteItem, parsedContent, options.appendLineIndex || -1);
        }
        else {
            // For managed notes, prepend the parent item's title so the Zotero note
            // keeps showing the article title instead of the first USER-block heading
            // (e.g. "笔记区" / "Workspace").
            let titlePrefix = "";
            if (isManagedNote && parentTopItem && parentTopItem.isRegularItem()) {
                const escapedTitle = (0, shared_1.cleanInline)(parentTopItem.getField("title"))
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                if (escapedTitle) {
                    titlePrefix = `<h1>${escapedTitle}</h1>`;
                }
            }
            noteItem.setNote(noteStatus.meta + titlePrefix + parsedContent + noteStatus.tail);
            yield noteItem.saveTx({
                notifierData: Object.assign({ autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY }, (options.skipNotifierSync ? { skipOB: true } : {})),
            });
        }
        if (isManagedNote) {
            yield addon.api.obsidian.applyManagedFrontmatter(noteItem, mdStatus.meta);
        }
        const shouldTrackImport = isManagedNote || addon.api.sync.isSyncNote(noteItem.id);
        if (shouldTrackImport) {
            const afterNoteText = yield safeGetNoteDiffText(noteItem);
            (0, watcher_1.rememberWatchedFileState)(noteItem.id, mdStatus.lastmodify.getTime());
            addon.api.sync.updateSyncStatus(noteItem.id, Object.assign(Object.assign({}, addon.api.sync.getSyncStatus(noteItem.id)), { path: mdStatus.filedir, filename: mdStatus.filename, itemID: noteItem.id, frontmatterMd5: mdStatus.meta
                    ? Zotero.Utilities.Internal.md5(JSON.stringify(mdStatus.meta), false)
                    : "", fileLastModified: mdStatus.lastmodify.getTime(), lastsync: Date.now() }));
            if (options.recordHistory !== false && !skippedManagedBodyImport) {
                addon.api.sync.recordNoteHistory(noteItem, filepath, {
                    beforeText: beforeNoteText,
                    afterText: afterNoteText,
                    reason: options.historyReason || "manual-import",
                    action: options.historyAction || "import",
                    afterFrontmatter: mdStatus.meta,
                });
            }
        }
        return noteItem;
    });
}
