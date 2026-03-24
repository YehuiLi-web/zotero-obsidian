"use strict";
// ── Obsidian Item Note Map ──
// Manages the persistent mapping between Zotero items and their Obsidian note keys.
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
exports.getSharedObsidianStorageState = getSharedObsidianStorageState;
exports.getObsidianStorageFilePath = getObsidianStorageFilePath;
exports.writeObsidianStorageJSONFile = writeObsidianStorageJSONFile;
exports.clearObsidianStoragePrefs = clearObsidianStoragePrefs;
exports.initObsidianItemNoteMap = initObsidianItemNoteMap;
exports.getObsidianItemNoteMap = getObsidianItemNoteMap;
exports.setObsidianItemNoteMap = setObsidianItemNoteMap;
exports.resetObsidianItemNoteMapState = resetObsidianItemNoteMapState;
exports.getItemMapKey = getItemMapKey;
const prefs_1 = require("../../utils/prefs");
const str_1 = require("../../utils/str");
const package_json_1 = require("../../../package.json");
const constants_1 = require("./constants");
let _obsidianItemNoteMapCache = null;
let _obsidianItemNoteMapSaveTimer = null;
function getSharedObsidianStorageState() {
    var _a;
    const addonData = ((_a = Zotero[package_json_1.config.addonRef]) === null || _a === void 0 ? void 0 : _a.data) || addon.data;
    if (!addonData.obsidian) {
        addonData.obsidian = {};
    }
    return addonData.obsidian;
}
function getObsidianStorageFilePath(fileName) {
    return PathUtils.join(Zotero.DataDirectory.dir, fileName);
}
function writeObsidianStorageJSONFile(filePath, data) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Zotero.File.putContentsAsync(filePath, JSON.stringify(data, null, 2));
    });
}
function clearObsidianStoragePrefs(prefKeys) {
    for (const prefKey of prefKeys) {
        try {
            (0, prefs_1.clearPref)(prefKey);
        }
        catch (e) {
            ztoolkit.log(`[Obsidian Bridge] failed to clear pref ${prefKey}`, e);
        }
    }
}
function readObsidianItemNoteMapPref() {
    try {
        return JSON.parse(String((0, prefs_1.getPref)(constants_1.OBSIDIAN_ITEM_NOTE_MAP_PREF) || "{}"));
    }
    catch (e) {
        return {};
    }
}
function persistObsidianItemNoteMapFile(map_1) {
    return __awaiter(this, arguments, void 0, function* (map, clearLegacyPref = true) {
        getSharedObsidianStorageState().itemNoteMap = map;
        const mapFile = getObsidianStorageFilePath(constants_1.OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME);
        yield writeObsidianStorageJSONFile(mapFile, map);
        if (clearLegacyPref) {
            clearObsidianStoragePrefs([constants_1.OBSIDIAN_ITEM_NOTE_MAP_PREF]);
        }
    });
}
function initObsidianItemNoteMap() {
    return __awaiter(this, void 0, void 0, function* () {
        const mapFile = getObsidianStorageFilePath(constants_1.OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME);
        let mapLoadedFromFile = false;
        const legacyMap = readObsidianItemNoteMapPref();
        const hasLegacyItemNoteMapPref = Object.keys(legacyMap).length > 0;
        if (yield (0, str_1.fileExists)(mapFile)) {
            try {
                const raw = yield Zotero.File.getContentsAsync(mapFile);
                _obsidianItemNoteMapCache = JSON.parse(raw);
                mapLoadedFromFile = true;
            }
            catch (e) {
                ztoolkit.log(`[Obsidian Bridge] failed to load ${constants_1.OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME}`, e);
            }
        }
        if (!_obsidianItemNoteMapCache) {
            _obsidianItemNoteMapCache = legacyMap;
        }
        getSharedObsidianStorageState().itemNoteMap = _obsidianItemNoteMapCache || {};
        try {
            if (mapLoadedFromFile) {
                clearObsidianStoragePrefs([constants_1.OBSIDIAN_ITEM_NOTE_MAP_PREF]);
            }
            else if (hasLegacyItemNoteMapPref) {
                yield persistObsidianItemNoteMapFile(_obsidianItemNoteMapCache);
            }
            else {
                clearObsidianStoragePrefs([constants_1.OBSIDIAN_ITEM_NOTE_MAP_PREF]);
            }
        }
        catch (e) {
            ztoolkit.log(`[Obsidian Bridge] failed to persist ${constants_1.OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME}`, e);
        }
    });
}
function getObsidianItemNoteMap() {
    const sharedMap = getSharedObsidianStorageState().itemNoteMap;
    if (sharedMap && sharedMap !== _obsidianItemNoteMapCache) {
        _obsidianItemNoteMapCache = sharedMap;
    }
    if (!_obsidianItemNoteMapCache) {
        _obsidianItemNoteMapCache = readObsidianItemNoteMapPref();
    }
    return _obsidianItemNoteMapCache;
}
function setObsidianItemNoteMap(map) {
    _obsidianItemNoteMapCache = map;
    getSharedObsidianStorageState().itemNoteMap = map;
    if (_obsidianItemNoteMapSaveTimer) {
        clearTimeout(_obsidianItemNoteMapSaveTimer);
    }
    _obsidianItemNoteMapSaveTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        try {
            _obsidianItemNoteMapSaveTimer = null;
            yield persistObsidianItemNoteMapFile(_obsidianItemNoteMapCache || {});
        }
        catch (e) {
            ztoolkit.log("[Obsidian Bridge] async map save failed", e);
        }
    }), 1000);
}
function resetObsidianItemNoteMapState() {
    if (_obsidianItemNoteMapSaveTimer) {
        clearTimeout(_obsidianItemNoteMapSaveTimer);
        _obsidianItemNoteMapSaveTimer = null;
    }
    _obsidianItemNoteMapCache = null;
    const sharedState = getSharedObsidianStorageState();
    delete sharedState.itemNoteMap;
}
function getItemMapKey(item) {
    return `${item.libraryID}/${item.key}`;
}
