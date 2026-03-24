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
const watcher_1 = require("../sync/watcher");
const frontmatter_1 = require("../obsidian/frontmatter");
const markdown_1 = require("../obsidian/markdown");
const shared_1 = require("../obsidian/shared");
function getManagedObsidianUpdateStrategy() {
    const value = String((0, prefs_1.getPref)("obsidian.updateStrategy") || "").trim();
    if (value === "overwrite" || value === "skip") {
        return value;
    }
    return "managed";
}
function shouldUseManagedObsidianExport(noteItem, targetPath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (addon.api.obsidian.isManagedNote(noteItem)) {
            return true;
        }
        if (!(noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote()) || !noteItem.parentID || !(yield (0, str_1.fileExists)(targetPath))) {
            return false;
        }
        const topItem = ((_a = noteItem.parentItem) === null || _a === void 0 ? void 0 : _a.isRegularItem())
            ? noteItem.parentItem
            : Zotero.Items.get(noteItem.parentID);
        if (!(topItem === null || topItem === void 0 ? void 0 : topItem.isRegularItem())) {
            return false;
        }
        const mdStatus = yield addon.api.sync.getMDStatus(targetPath);
        const normalizedMeta = (0, frontmatter_1.normalizeFrontmatterObject)(mdStatus.meta);
        const topItemKey = (0, shared_1.cleanInline)(String(normalizedMeta.zotero_key || ""));
        if (normalizedMeta.bridge_managed &&
            (!topItemKey || topItemKey === topItem.key)) {
            return true;
        }
        return (mdStatus.content.includes(markdown_1.GENERATED_BLOCK_START) &&
            mdStatus.content.includes(markdown_1.USER_BLOCK_START));
    });
}
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
        const useManagedExport = yield shouldUseManagedObsidianExport(noteItem, filename);
        const skipManagedExistingFile = useManagedExport &&
            getManagedObsidianUpdateStrategy() === "skip" &&
            (yield (0, str_1.fileExists)(filename));
        if (skipManagedExistingFile) {
            (0, hint_1.showHintWithLink)(`Note kept unchanged: ${filename}`, "Show in Folder", () => {
                Zotero.File.reveal(filename);
            });
            return;
        }
        const previousContent = (yield (0, str_1.fileExists)(filename))
            ? ((yield Zotero.File.getContentsAsync(filename, "utf-8")) || "")
            : "";
        const managedContent = useManagedExport
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
        const managedSourceHash = useManagedExport
            ? yield addon.api.obsidian.getManagedSourceHash(noteItem)
            : "";
        yield Zotero.File.putContentsAsync(filename, content);
        const fileStat = yield IOUtils.stat(filename);
        const exportedMDStatus = addon.api.sync.getMDStatusFromContent(content);
        addon.api.sync.updateSyncStatus(noteItem.id, {
            path: dir,
            filename: PathUtils.split(filename).pop() || "",
            itemID: noteItem.id,
            md5: Zotero.Utilities.Internal.md5(exportedMDStatus.content, false),
            noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
            frontmatterMd5: exportedMDStatus.meta
                ? Zotero.Utilities.Internal.md5(JSON.stringify(exportedMDStatus.meta), false)
                : "",
            managedSourceHash,
            fileLastModified: Number(fileStat.lastModified || Date.now()),
            lastsync: new Date().getTime(),
        });
        (0, watcher_1.rememberWatchedFileState)(noteItem.id, Number(fileStat.lastModified || Date.now()));
        if (options.recordHistory !== false) {
            addon.api.sync.recordMarkdownHistory(noteItem, filename, {
                beforeContent: previousContent,
                afterContent: content,
                reason: options.historyReason || "manual-export",
                action: "export",
            });
        }
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
        const updateStrategy = getManagedObsidianUpdateStrategy();
        for (const noteItem of noteItems) {
            let filename = yield addon.api.sync.getMDFileName(noteItem.id, saveDir);
            filename = yield maybeRenameManagedSyncFile(noteItem, saveDir, filename);
            const filePath = (0, str_1.jointPath)(saveDir, filename);
            const useManagedExport = yield shouldUseManagedObsidianExport(noteItem, filePath);
            if (useManagedExport &&
                updateStrategy === "skip" &&
                (yield (0, str_1.fileExists)(filePath))) {
                i += 1;
                continue;
            }
            const previousContent = (yield (0, str_1.fileExists)(filePath))
                ? ((yield Zotero.File.getContentsAsync(filePath, "utf-8")) || "")
                : "";
            const managedContent = useManagedExport
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
            const managedSourceHash = useManagedExport
                ? yield addon.api.obsidian.getManagedSourceHash(noteItem)
                : "";
            yield Zotero.File.putContentsAsync(filePath, content);
            const fileStat = yield IOUtils.stat(filePath);
            const batchMDStatus = addon.api.sync.getMDStatusFromContent(content);
            addon.api.sync.updateSyncStatus(noteItem.id, {
                path: saveDir,
                filename,
                itemID: noteItem.id,
                md5: Zotero.Utilities.Internal.md5(batchMDStatus.content, false),
                noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
                frontmatterMd5: batchMDStatus.meta
                    ? Zotero.Utilities.Internal.md5(JSON.stringify(batchMDStatus.meta), false)
                    : "",
                managedSourceHash,
                fileLastModified: Number(fileStat.lastModified || Date.now()),
                lastsync: new Date().getTime(),
            });
            (0, watcher_1.rememberWatchedFileState)(noteItem.id, Number(fileStat.lastModified || Date.now()));
            if (options.recordHistory !== false) {
                addon.api.sync.recordMarkdownHistory(noteItem, filePath, {
                    beforeContent: previousContent,
                    afterContent: content,
                    reason: options.historyReason || "sync-batch",
                    action: options.historyAction || "export",
                });
            }
            i += 1;
        }
    });
}
