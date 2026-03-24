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
exports.saveMD = saveMD;
exports.syncMDBatch = syncMDBatch;
const hint_1 = require("../../utils/hint");
const prefs_1 = require("../../utils/prefs");
const str_1 = require("../../utils/str");
function maybeRenameManagedSyncFile(noteItem, saveDir, nextFilename) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!addon.api.obsidian.isManagedNote(noteItem)) {
            return nextFilename;
        }
        const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
        const currentFilename = syncStatus.filename || "";
        if (!currentFilename ||
            currentFilename === nextFilename ||
            syncStatus.path !== saveDir) {
            return nextFilename;
        }
        const currentPath = (0, str_1.jointPath)(syncStatus.path, currentFilename);
        const nextPath = (0, str_1.jointPath)(saveDir, nextFilename);
        if (!(yield (0, str_1.fileExists)(currentPath)) || (yield (0, str_1.fileExists)(nextPath))) {
            return nextFilename;
        }
        yield Zotero.File.rename(currentPath, nextFilename, {
            overwrite: false,
            unique: false,
        });
        return nextFilename;
    });
}
function saveMD(filename_1, noteId_1) {
    return __awaiter(this, arguments, void 0, function* (filename, noteId, options = {}) {
        const noteItem = Zotero.Items.get(noteId);
        const dir = (0, str_1.jointPath)(...PathUtils.split((0, str_1.formatPath)(filename)).slice(0, -1));
        yield Zotero.File.createDirectoryIfMissingAsync(dir);
        const attachmentDir = options.attachmentDir ||
            (0, str_1.jointPath)(dir, (0, prefs_1.getPref)("syncAttachmentFolder"));
        const attachmentFolder = options.attachmentFolder || (0, prefs_1.getPref)("syncAttachmentFolder");
        const hasImage = noteItem.getNote().includes("<img");
        if (hasImage) {
            yield Zotero.File.createDirectoryIfMissingAsync(attachmentDir);
        }
        const managedContent = addon.api.obsidian.isManagedNote(noteItem)
            ? yield addon.api.obsidian.renderMarkdown(noteItem, {
                noteDir: dir,
                attachmentDir,
                attachmentFolder,
                targetPath: filename,
            })
            : "";
        const content = managedContent ||
            (yield addon.api.convert.note2md(noteItem, dir, Object.assign(Object.assign({}, options), { attachmentDir,
                attachmentFolder })));
        const managedSourceHash = addon.api.obsidian.isManagedNote(noteItem)
            ? yield addon.api.obsidian.getManagedSourceHash(noteItem)
            : "";
        yield Zotero.File.putContentsAsync(filename, content);
        addon.api.sync.updateSyncStatus(noteItem.id, {
            path: dir,
            filename: PathUtils.split(filename).pop() || "",
            itemID: noteItem.id,
            md5: Zotero.Utilities.Internal.md5(addon.api.sync.getMDStatusFromContent(content).content, false),
            noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
            managedSourceHash,
            lastsync: new Date().getTime(),
        });
        (0, hint_1.showHintWithLink)(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
            Zotero.File.reveal(filename);
        });
    });
}
function syncMDBatch(saveDir_1, noteIds_1, metaList_1) {
    return __awaiter(this, arguments, void 0, function* (saveDir, noteIds, metaList, options = {}) {
        const noteItems = Zotero.Items.get(noteIds);
        yield Zotero.File.createDirectoryIfMissingAsync(saveDir);
        const attachmentDir = options.attachmentDir ||
            (0, str_1.jointPath)(saveDir, (0, prefs_1.getPref)("syncAttachmentFolder"));
        const attachmentFolder = options.attachmentFolder || (0, prefs_1.getPref)("syncAttachmentFolder");
        const hasImage = noteItems.some((noteItem) => noteItem.getNote().includes("<img"));
        if (hasImage) {
            yield Zotero.File.createDirectoryIfMissingAsync(attachmentDir);
        }
        let i = 0;
        for (const noteItem of noteItems) {
            let filename = yield addon.api.sync.getMDFileName(noteItem.id, saveDir);
            filename = yield maybeRenameManagedSyncFile(noteItem, saveDir, filename);
            const filePath = (0, str_1.jointPath)(saveDir, filename);
            const managedContent = addon.api.obsidian.isManagedNote(noteItem)
                ? yield addon.api.obsidian.renderMarkdown(noteItem, {
                    noteDir: saveDir,
                    attachmentDir,
                    attachmentFolder,
                    targetPath: filePath,
                    cachedYAMLHeader: metaList === null || metaList === void 0 ? void 0 : metaList[i],
                })
                : "";
            const content = managedContent ||
                (yield addon.api.convert.note2md(noteItem, saveDir, {
                    keepNoteLink: false,
                    withYAMLHeader: true,
                    cachedYAMLHeader: metaList === null || metaList === void 0 ? void 0 : metaList[i],
                    attachmentDir,
                    attachmentFolder,
                }));
            const managedSourceHash = addon.api.obsidian.isManagedNote(noteItem)
                ? yield addon.api.obsidian.getManagedSourceHash(noteItem)
                : "";
            yield Zotero.File.putContentsAsync(filePath, content);
            addon.api.sync.updateSyncStatus(noteItem.id, {
                path: saveDir,
                filename,
                itemID: noteItem.id,
                md5: Zotero.Utilities.Internal.md5(addon.api.sync.getMDStatusFromContent(content).content, false),
                noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
                managedSourceHash,
                lastsync: new Date().getTime(),
            });
            i += 1;
        }
    });
}
