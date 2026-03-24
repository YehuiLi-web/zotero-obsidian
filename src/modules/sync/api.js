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
exports.initSyncList = initSyncList;
exports.removeSyncNote = removeSyncNote;
exports.isSyncNote = isSyncNote;
exports.getSyncNoteIds = getSyncNoteIds;
exports.addSyncNote = addSyncNote;
exports.updateSyncStatus = updateSyncStatus;
exports.getSyncStatus = getSyncStatus;
exports.getNoteStatus = getNoteStatus;
exports.getMDStatus = getMDStatus;
exports.getMDStatusFromContent = getMDStatusFromContent;
exports.getMDFileName = getMDFileName;
exports.findAllSyncedFiles = findAllSyncedFiles;
const YAML = require("yamljs");
const prefs_1 = require("../../utils/prefs");
const package_json_1 = require("../../../package.json");
const str_1 = require("../../utils/str");
const managed_1 = require("../obsidian/managed");
function initSyncList() {
    var _a;
    const rawKeys = (0, prefs_1.getPref)("syncNoteIds");
    if (!rawKeys.startsWith("[") || !rawKeys.endsWith("]")) {
        const keys = rawKeys.split(",").map((id) => String(id));
        (0, prefs_1.setPref)("syncNoteIds", JSON.stringify(keys));
    }
    addon.data.sync.data = new ztoolkit.LargePref(`${package_json_1.config.prefsPrefix}.syncNoteIds`, `${package_json_1.config.prefsPrefix}.syncDetail-`, "parser");
    // Due to the bug in v1.1.4-22, the sync data may be corrupted
    const keys = (_a = addon.data.sync.data) === null || _a === void 0 ? void 0 : _a.getKeys().map((key) => String(key));
    (0, prefs_1.setPref)("syncNoteIds", JSON.stringify(keys));
}
function getSyncNoteIds() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const keys = (_a = addon.data.sync.data) === null || _a === void 0 ? void 0 : _a.getKeys().map((key) => Number(key)).filter((key) => !!key);
        if (!keys) {
            return [];
        }
        return (yield Zotero.Items.getAsync(keys))
            .filter((item) => item.isNote())
            .map((item) => item.id);
    });
}
function isSyncNote(noteId) {
    var _a;
    return !!((_a = addon.data.sync.data) === null || _a === void 0 ? void 0 : _a.hasKey(String(noteId)));
}
function addSyncNote(noteId) {
    var _a;
    (_a = addon.data.sync.data) === null || _a === void 0 ? void 0 : _a.setKey(String(noteId));
}
function removeSyncNote(noteId) {
    var _a;
    (_a = addon.data.sync.data) === null || _a === void 0 ? void 0 : _a.deleteKey(String(noteId));
}
function updateSyncStatus(noteId, status) {
    var _a;
    (_a = addon.data.sync.data) === null || _a === void 0 ? void 0 : _a.setValue(String(noteId), status);
}
function getNoteStatus(noteId) {
    const noteItem = Zotero.Items.get(noteId);
    if (!(noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote())) {
        return;
    }
    const fullContent = noteItem.getNote();
    const ret = {
        meta: "",
        content: "",
        tail: "</div>",
        lastmodify: Zotero.Date.sqlToDate(noteItem.dateModified, true),
    };
    const metaRegex = /^<div[^>]*>/;
    // Not wrapped inside div
    if (!metaRegex.test(fullContent)) {
        ret.meta = `<div data-schema-version="${package_json_1.config.dataSchemaVersion}">`;
        ret.content = fullContent || "";
        return ret;
    }
    const metaMatch = fullContent.match(metaRegex);
    ret.meta = metaMatch ? metaMatch[0] : "";
    ret.content = fullContent.substring(ret.meta.length, fullContent.length - ret.tail.length);
    return ret;
}
function getSyncStatus(noteId) {
    var _a;
    const defaultStatus = {
        path: "",
        filename: "",
        md5: "",
        noteMd5: "",
        managedSourceHash: "",
        lastsync: new Date().getTime(),
        itemID: -1,
    };
    const status = Object.assign(Object.assign({}, defaultStatus), (_a = addon.data.sync.data) === null || _a === void 0 ? void 0 : _a.getValue(String(noteId)));
    status.path = (0, str_1.formatPath)(status.path);
    return status;
}
function getMDStatusFromContent(contentRaw) {
    contentRaw = contentRaw.replace(/\r\n/g, "\n");
    const result = contentRaw.match(/^---\n(.*\n)+?---$/gm);
    const ret = {
        meta: { $version: -1 },
        content: contentRaw,
        filedir: "",
        filename: "",
        lastmodify: new Date(0),
    };
    if (result) {
        const yaml = result[0].replace(/---/g, "");
        ret.content = contentRaw.slice(result[0].length);
        try {
            ret.meta = YAML.parse(yaml);
        }
        catch (e) {
            ztoolkit.log(e);
        }
    }
    return ret;
}
function getMDStatus(source) {
    return __awaiter(this, void 0, void 0, function* () {
        let ret = {
            meta: null,
            content: "",
            filedir: "",
            filename: "",
            lastmodify: new Date(0),
        };
        try {
            let filepath = "";
            if (typeof source === "string") {
                filepath = source;
            }
            else if (typeof source === "number") {
                const syncStatus = getSyncStatus(source);
                filepath = (0, str_1.jointPath)(syncStatus.path, syncStatus.filename);
            }
            else if (source.isNote && source.isNote()) {
                const syncStatus = getSyncStatus(source.id);
                filepath = (0, str_1.jointPath)(syncStatus.path, syncStatus.filename);
            }
            filepath = (0, str_1.formatPath)(filepath);
            if (yield (0, str_1.fileExists)(filepath)) {
                const contentRaw = (yield Zotero.File.getContentsAsync(filepath, "utf-8"));
                ret = getMDStatusFromContent(contentRaw);
                const pathSplit = PathUtils.split(filepath);
                ret.filedir = (0, str_1.formatPath)(pathSplit.slice(0, -1).join("/"));
                ret.filename = pathSplit.pop() || "";
                const stat = yield IOUtils.stat(filepath);
                ret.lastmodify = new Date(stat.lastModified || 0);
            }
        }
        catch (e) {
            ztoolkit.log(e);
        }
        return ret;
    });
}
function getMDFileName(noteId, searchDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const syncStatus = getSyncStatus(noteId);
        const noteItem = Zotero.Items.get(noteId);
        const managedFileName = (yield (0, managed_1.getManagedObsidianFileNameFresh)(noteItem)) ||
            addon.api.obsidian.getManagedFileName(noteItem);
        if (managedFileName && searchDir && syncStatus.path === searchDir) {
            return managedFileName;
        }
        // If the note is already synced, use the filename in sync status
        if ((!searchDir || searchDir === syncStatus.path) &&
            syncStatus.filename &&
            (yield (0, str_1.fileExists)((0, str_1.jointPath)(syncStatus.path, syncStatus.filename)))) {
            return syncStatus.filename;
        }
        // If the note is not synced or the synced file does not exists, search for the latest file with the same key
        if (managedFileName) {
            return managedFileName;
        }
        if (searchDir !== undefined && (yield (0, str_1.fileExists)(searchDir))) {
            const mdRegex = /\.(md|MD|Md|mD)$/;
            let matchedFileName = null;
            let matchedDate = 0;
            yield Zotero.File.iterateDirectory(searchDir, (entry) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                if (entry.isDir)
                    return;
                if (mdRegex.test(entry.name)) {
                    if (((_a = entry.name.split(".").shift()) === null || _a === void 0 ? void 0 : _a.split("-").pop()) === noteItem.key) {
                        const stat = yield IOUtils.stat(entry.path);
                        if (stat.lastModified || 0 > matchedDate) {
                            matchedFileName = entry.name;
                            matchedDate = stat.lastModified || 0;
                        }
                    }
                }
            }));
            if (matchedFileName) {
                return matchedFileName;
            }
        }
        // If no file found, use the template to generate a new filename
        let filename = yield addon.api.template.runTemplate("[ExportMDFileNameV2]", "noteItem", [noteItem]);
        // trim the filename to remove any leading or trailing spaces or line breaks
        filename = filename.trim();
        return filename;
    });
}
function findAllSyncedFiles(searchDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = [];
        const mdRegex = /\.(md|MD|Md|mD)$/;
        yield Zotero.File.iterateDirectory(searchDir, (entry) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (entry.isDir) {
                const subDirResults = yield findAllSyncedFiles(entry.path);
                results.push(...subDirResults);
                return;
            }
            if (mdRegex.test(entry.name)) {
                const MDStatus = yield getMDStatus(entry.path);
                if (!((_a = MDStatus.meta) === null || _a === void 0 ? void 0 : _a.$libraryID) || !((_b = MDStatus.meta) === null || _b === void 0 ? void 0 : _b.$itemKey)) {
                    return;
                }
                const item = yield Zotero.Items.getByLibraryAndKeyAsync(MDStatus.meta.$libraryID, MDStatus.meta.$itemKey);
                if (!item || !item.isNote()) {
                    return;
                }
                const mdMeta = MDStatus.meta;
                const managedSourceHash = (mdMeta === null || mdMeta === void 0 ? void 0 : mdMeta.bridge_managed) && item.isNote()
                    ? yield addon.api.obsidian.getManagedSourceHash(item)
                    : "";
                results.push({
                    path: MDStatus.filedir,
                    filename: MDStatus.filename,
                    md5: Zotero.Utilities.Internal.md5(MDStatus.content, false),
                    noteMd5: Zotero.Utilities.Internal.md5(item.getNote(), false),
                    managedSourceHash,
                    lastsync: MDStatus.lastmodify.getTime(),
                    itemID: item.id,
                });
            }
        }));
        return results;
    });
}
