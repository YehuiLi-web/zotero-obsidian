"use strict";
// ── Obsidian Metadata Preset Management ──
// Handles MetadataPreset CRUD, persistence, normalization, and catalog queries.
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
exports.cloneDefaultMetadataPreset = cloneDefaultMetadataPreset;
exports.cloneMetadataPreset = cloneMetadataPreset;
exports.getMetadataPresetSectionLabel = getMetadataPresetSectionLabel;
exports.getItemTypeLabel = getItemTypeLabel;
exports.getStandardFieldKeysForItemType = getStandardFieldKeysForItemType;
exports.getFieldLabel = getFieldLabel;
exports.getMetadataFieldCatalog = getMetadataFieldCatalog;
exports.getConfiguredFields = getConfiguredFields;
exports.normalizeMetadataPreset = normalizeMetadataPreset;
exports.normalizeMetadataPresetLibrary = normalizeMetadataPresetLibrary;
exports.createDefaultMetadataPresetLibrary = createDefaultMetadataPresetLibrary;
exports.getActiveMetadataPresetProfile = getActiveMetadataPresetProfile;
exports.createMetadataPresetID = createMetadataPresetID;
exports.getMetadataPreset = getMetadataPreset;
exports.persistMetadataPresetLibrary = persistMetadataPresetLibrary;
exports.getMetadataPresetLibrary = getMetadataPresetLibrary;
exports.resetMetadataPresetLibraryState = resetMetadataPresetLibraryState;
exports.initMetadataPresetLibrary = initMetadataPresetLibrary;
const locale_1 = require("../../utils/locale");
const prefs_1 = require("../../utils/prefs");
const str_1 = require("../../utils/str");
const shared_1 = require("./shared");
const constants_1 = require("./constants");
const itemNoteMap_1 = require("./itemNoteMap");
let _metadataPresetLibraryCache = null;
let _metadataPresetLibrarySaveTimer = null;
// ── Clone helpers ──
function cloneDefaultMetadataPreset() {
    return JSON.parse(JSON.stringify(constants_1.DEFAULT_METADATA_PRESET));
}
function cloneMetadataPreset(preset) {
    return JSON.parse(JSON.stringify(preset || cloneDefaultMetadataPreset()));
}
function cloneMetadataPresetLibrary(library) {
    return JSON.parse(JSON.stringify(library));
}
// ── Preset name helpers (i18n) ──
function getDefaultMetadataPresetName() {
    return (0, locale_1.getString)("obsidian-metadataPreset-defaultName");
}
function getMigratedMetadataPresetName() {
    return (0, locale_1.getString)("obsidian-metadataPreset-migratedName");
}
function getUntitledMetadataPresetName() {
    return (0, locale_1.getString)("obsidian-metadataPreset-untitledName");
}
function getMetadataPresetSectionLabel(sectionKey) {
    return sectionKey === "default"
        ? (0, locale_1.getString)("obsidian-metadataPreset-defaultSection")
        : getItemTypeLabel(sectionKey);
}
// ── Item type / field label helpers ──
function getItemTypeLabel(itemType) {
    const localeKey = constants_1.ITEM_TYPE_LABELS[itemType];
    if (localeKey) {
        return (0, locale_1.getString)(localeKey);
    }
    try {
        const itemTypeID = Zotero.ItemTypes.getID(itemType);
        const localized = itemTypeID &&
            typeof Zotero.ItemTypes.getLocalizedString === "function"
            ? (0, shared_1.cleanInline)(Zotero.ItemTypes.getLocalizedString(itemTypeID))
            : "";
        if (localized) {
            return localized;
        }
    }
    catch (e) {
        // fall through
    }
    return (0, shared_1.cleanInline)(itemType);
}
function getStandardFieldKeysForItemType(itemType) {
    const itemTypeKeys = itemType === "default" ? Object.keys(constants_1.ITEM_TYPE_LABELS) : [itemType];
    const fieldKeys = new Set();
    for (const itemTypeKey of itemTypeKeys) {
        try {
            const itemTypeID = Zotero.ItemTypes.getID(itemTypeKey);
            if (!itemTypeID) {
                continue;
            }
            const fieldIDs = Zotero.ItemFields.getItemTypeFields(itemTypeID);
            for (const fieldID of fieldIDs || []) {
                const fieldKey = (0, shared_1.cleanInline)(Zotero.ItemFields.getName(fieldID));
                if (fieldKey) {
                    fieldKeys.add(fieldKey);
                }
            }
        }
        catch (e) {
            continue;
        }
    }
    return Array.from(fieldKeys);
}
function getFieldLabel(fieldKey) {
    if (constants_1.FIELD_LABELS[fieldKey]) {
        return (0, locale_1.getString)(constants_1.FIELD_LABELS[fieldKey]);
    }
    try {
        const fieldID = Zotero.ItemFields.getID(fieldKey);
        if (fieldID) {
            const localized = (0, shared_1.cleanInline)(Zotero.ItemFields.getLocalizedString(fieldID));
            if (localized) {
                return localized;
            }
        }
    }
    catch (e) {
        // fall through
    }
    return fieldKey;
}
function getMetadataFieldCatalog(sectionKey, preset) {
    const fieldKeys = new Set([
        ...getStandardFieldKeysForItemType(sectionKey),
        ...constants_1.DERIVED_METADATA_FIELD_KEYS,
        ...(preset.visible.default || []),
        ...(preset.hidden.default || []),
        ...(preset.visible[sectionKey] || []),
        ...(preset.hidden[sectionKey] || []),
    ]);
    return Array.from(fieldKeys).sort((left, right) => {
        const leftLabel = `${getFieldLabel(left)} ${left}`.toLowerCase();
        const rightLabel = `${getFieldLabel(right)} ${right}`.toLowerCase();
        return leftLabel.localeCompare(rightLabel, undefined, {
            sensitivity: "base",
        });
    });
}
function getConfiguredFields(section, itemType) {
    const result = [...(section.default || []), ...(section[itemType] || [])];
    return Array.from(new Set(result));
}
// ── Preset normalization ──
function normalizeMetadataPreset(raw) {
    if (!raw) {
        return cloneDefaultMetadataPreset();
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (e) {
        throw new Error("Metadata preset must be valid JSON.");
    }
    const normalized = cloneDefaultMetadataPreset();
    for (const sectionKey of ["visible", "hidden"]) {
        if (!(parsed === null || parsed === void 0 ? void 0 : parsed[sectionKey]) || typeof parsed[sectionKey] !== "object") {
            continue;
        }
        const normalizedSection = normalized[sectionKey];
        for (const typeKey of Object.keys(parsed[sectionKey])) {
            const values = parsed[sectionKey][typeKey];
            if (Array.isArray(values)) {
                normalizedSection[typeKey] = values
                    .map((value) => String(value).trim())
                    .filter(Boolean);
            }
        }
    }
    return normalized;
}
function normalizeMetadataPresetLibrary(raw, activePresetPref = "") {
    var _a;
    const fallback = createDefaultMetadataPresetLibrary();
    if (!raw) {
        return fallback;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (e) {
        return fallback;
    }
    const profiles = Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.presets) ? parsed.presets : [];
    const normalizedProfiles = [];
    const usedIDs = new Set();
    for (const profile of profiles) {
        const id = (0, shared_1.cleanInline)((profile === null || profile === void 0 ? void 0 : profile.id) || "");
        if (!id || usedIDs.has(id)) {
            continue;
        }
        usedIDs.add(id);
        normalizedProfiles.push({
            id,
            name: (0, shared_1.cleanInline)((profile === null || profile === void 0 ? void 0 : profile.name) || "") || getUntitledMetadataPresetName(),
            preset: normalizeMetadataPreset(JSON.stringify((profile === null || profile === void 0 ? void 0 : profile.preset) || {})),
        });
    }
    if (!normalizedProfiles.length) {
        return fallback;
    }
    const activePresetId = (0, shared_1.cleanInline)(activePresetPref) || (0, shared_1.cleanInline)((parsed === null || parsed === void 0 ? void 0 : parsed.activePresetId) || "");
    return {
        activePresetId: ((_a = normalizedProfiles.find((profile) => profile.id === activePresetId)) === null || _a === void 0 ? void 0 : _a.id) ||
            normalizedProfiles[0].id,
        presets: normalizedProfiles,
    };
}
// ── Library CRUD ──
function createDefaultMetadataPresetLibrary() {
    return {
        activePresetId: constants_1.DEFAULT_METADATA_PRESET_ID,
        presets: [
            {
                id: constants_1.DEFAULT_METADATA_PRESET_ID,
                name: getDefaultMetadataPresetName(),
                preset: cloneDefaultMetadataPreset(),
            },
        ],
    };
}
function getActiveMetadataPresetProfile(library) {
    return (library.presets.find((profile) => profile.id === library.activePresetId) ||
        library.presets[0]);
}
function createMetadataPresetID(name) {
    const base = (0, shared_1.cleanInline)(name)
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
        .replace(/^-|-$/g, "") || "preset";
    return `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function getMetadataPreset() {
    return cloneMetadataPreset(getActiveMetadataPresetProfile(getMetadataPresetLibrary()).preset);
}
// ── Persistence ──
function persistMetadataPresetLibraryFile(library_1) {
    return __awaiter(this, arguments, void 0, function* (library, clearLegacyPrefs = true) {
        (0, itemNoteMap_1.getSharedObsidianStorageState)().metadataPresetLibrary = library;
        const presetFile = (0, itemNoteMap_1.getObsidianStorageFilePath)(constants_1.OBSIDIAN_METADATA_PRESET_FILE_NAME);
        yield (0, itemNoteMap_1.writeObsidianStorageJSONFile)(presetFile, library);
        if (clearLegacyPrefs) {
            (0, itemNoteMap_1.clearObsidianStoragePrefs)([
                constants_1.OBSIDIAN_METADATA_PRESET_PREF,
                constants_1.OBSIDIAN_METADATA_PRESET_LIBRARY_PREF,
                constants_1.OBSIDIAN_METADATA_PRESET_ACTIVE_PREF,
            ]);
        }
    });
}
function persistMetadataPresetLibrary(library) {
    const activeProfile = getActiveMetadataPresetProfile(library);
    const normalizedLibrary = {
        activePresetId: activeProfile.id,
        presets: library.presets.map((profile) => ({
            id: profile.id,
            name: (0, shared_1.cleanInline)(profile.name) || getUntitledMetadataPresetName(),
            preset: cloneMetadataPreset(profile.preset),
        })),
    };
    _metadataPresetLibraryCache = normalizedLibrary;
    (0, itemNoteMap_1.getSharedObsidianStorageState)().metadataPresetLibrary = normalizedLibrary;
    if (_metadataPresetLibrarySaveTimer) {
        clearTimeout(_metadataPresetLibrarySaveTimer);
    }
    _metadataPresetLibrarySaveTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        try {
            _metadataPresetLibrarySaveTimer = null;
            yield persistMetadataPresetLibraryFile(_metadataPresetLibraryCache || createDefaultMetadataPresetLibrary());
        }
        catch (e) {
            ztoolkit.log("[Obsidian Bridge] async save failed", e);
        }
    }), 1000);
    return normalizedLibrary;
}
function getMetadataPresetLibrary() {
    const sharedLibrary = (0, itemNoteMap_1.getSharedObsidianStorageState)().metadataPresetLibrary;
    if (sharedLibrary && sharedLibrary !== _metadataPresetLibraryCache) {
        _metadataPresetLibraryCache = sharedLibrary;
    }
    if (_metadataPresetLibraryCache) {
        return cloneMetadataPresetLibrary(_metadataPresetLibraryCache);
    }
    return createDefaultMetadataPresetLibrary();
}
function resetMetadataPresetLibraryState() {
    if (_metadataPresetLibrarySaveTimer) {
        clearTimeout(_metadataPresetLibrarySaveTimer);
        _metadataPresetLibrarySaveTimer = null;
    }
    _metadataPresetLibraryCache = null;
    const sharedState = (0, itemNoteMap_1.getSharedObsidianStorageState)();
    delete sharedState.metadataPresetLibrary;
}
// ── Initialization ──
function initMetadataPresetLibrary() {
    return __awaiter(this, void 0, void 0, function* () {
        const presetFile = (0, itemNoteMap_1.getObsidianStorageFilePath)(constants_1.OBSIDIAN_METADATA_PRESET_FILE_NAME);
        let presetLoadedFromFile = false;
        if (yield (0, str_1.fileExists)(presetFile)) {
            try {
                const raw = yield Zotero.File.getContentsAsync(presetFile);
                _metadataPresetLibraryCache = normalizeMetadataPresetLibrary(raw);
                presetLoadedFromFile = true;
            }
            catch (e) {
                ztoolkit.log(`[Obsidian Bridge] failed to load ${constants_1.OBSIDIAN_METADATA_PRESET_FILE_NAME}`, e);
            }
        }
        const activePresetPref = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)(constants_1.OBSIDIAN_METADATA_PRESET_ACTIVE_PREF) || ""));
        const libraryRaw = String((0, prefs_1.getPref)(constants_1.OBSIDIAN_METADATA_PRESET_LIBRARY_PREF) || "").trim();
        const legacyRaw = String((0, prefs_1.getPref)(constants_1.OBSIDIAN_METADATA_PRESET_PREF) || "").trim();
        const hasLegacyMetadataPresetPrefs = Boolean(libraryRaw || legacyRaw || activePresetPref);
        if (!_metadataPresetLibraryCache) {
            if (libraryRaw) {
                _metadataPresetLibraryCache = normalizeMetadataPresetLibrary(libraryRaw, activePresetPref);
            }
            else {
                const library = createDefaultMetadataPresetLibrary();
                if (legacyRaw) {
                    const legacyPreset = normalizeMetadataPreset(legacyRaw);
                    if (JSON.stringify(legacyPreset) !==
                        JSON.stringify(constants_1.DEFAULT_METADATA_PRESET)) {
                        library.presets.push({
                            id: "migrated",
                            name: getMigratedMetadataPresetName(),
                            preset: legacyPreset,
                        });
                        library.activePresetId = "migrated";
                    }
                }
                _metadataPresetLibraryCache = library;
            }
        }
        if (!_metadataPresetLibraryCache) {
            _metadataPresetLibraryCache = createDefaultMetadataPresetLibrary();
        }
        (0, itemNoteMap_1.getSharedObsidianStorageState)().metadataPresetLibrary =
            _metadataPresetLibraryCache;
        try {
            if (presetLoadedFromFile) {
                (0, itemNoteMap_1.clearObsidianStoragePrefs)([
                    constants_1.OBSIDIAN_METADATA_PRESET_PREF,
                    constants_1.OBSIDIAN_METADATA_PRESET_LIBRARY_PREF,
                    constants_1.OBSIDIAN_METADATA_PRESET_ACTIVE_PREF,
                ]);
            }
            else if (hasLegacyMetadataPresetPrefs) {
                yield persistMetadataPresetLibraryFile(_metadataPresetLibraryCache);
            }
        }
        catch (e) {
            ztoolkit.log(`[Obsidian Bridge] failed to persist ${constants_1.OBSIDIAN_METADATA_PRESET_FILE_NAME}`, e);
        }
    });
}
