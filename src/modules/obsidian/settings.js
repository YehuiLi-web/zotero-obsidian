"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.normalizeMetadataPreset = exports.getStandardFieldKeysForItemType = exports.getItemTypeLabel = exports.getMetadataFieldCatalog = exports.getFieldLabel = exports.getConfiguredFields = exports.getMetadataPresetSectionLabel = exports.cloneMetadataPreset = exports.cloneDefaultMetadataPreset = exports.createMetadataPresetID = exports.createDefaultMetadataPresetLibrary = exports.normalizeMetadataPresetLibrary = exports.persistMetadataPresetLibrary = exports.getActiveMetadataPresetProfile = exports.getMetadataPresetLibrary = exports.getMetadataPreset = exports.getItemMapKey = exports.setObsidianItemNoteMap = exports.getObsidianItemNoteMap = void 0;
exports.getBooleanPrefOrDefault = getBooleanPrefOrDefault;
exports.getStringPrefOrDefault = getStringPrefOrDefault;
exports.normalizeObsidianSyncScope = normalizeObsidianSyncScope;
exports.normalizeObsidianUpdateStrategy = normalizeObsidianUpdateStrategy;
exports.getManagedNoteContentConfig = getManagedNoteContentConfig;
exports.getMissingMetadataTranslationConfig = getMissingMetadataTranslationConfig;
exports.deriveObsidianPathDefaults = deriveObsidianPathDefaults;
exports.isObsidianVaultDirectory = isObsidianVaultDirectory;
exports.detectObsidianVaults = detectObsidianVaults;
exports.isObsidianConfigured = isObsidianConfigured;
exports.ensureObsidianSettings = ensureObsidianSettings;
exports.writeObsidianConnectionTestFile = writeObsidianConnectionTestFile;
exports.normalizeManagedFrontmatterFields = normalizeManagedFrontmatterFields;
exports.getManagedFrontmatterFields = getManagedFrontmatterFields;
exports.setManagedFrontmatterFields = setManagedFrontmatterFields;
exports.hasManagedFrontmatterField = hasManagedFrontmatterField;
exports.getManagedFrontmatterOption = getManagedFrontmatterOption;
exports.resolveManagedFrontmatterPreset = resolveManagedFrontmatterPreset;
exports.getManagedFrontmatterPresetLabel = getManagedFrontmatterPresetLabel;
exports.getManagedFrontmatterOptionLabel = getManagedFrontmatterOptionLabel;
exports.hasTemplateByName = hasTemplateByName;
exports.getObsidianItemTemplateOptions = getObsidianItemTemplateOptions;
exports.getObsidianItemTemplateLabel = getObsidianItemTemplateLabel;
exports.resolveObsidianItemTemplateName = resolveObsidianItemTemplateName;
exports.initObsidianStorage = initObsidianStorage;
exports.resetObsidianStorageState = resetObsidianStorageState;
const locale_1 = require("../../utils/locale");
const prefs_1 = require("../../utils/prefs");
const str_1 = require("../../utils/str");
const paths_1 = require("./paths");
const shared_1 = require("./shared");
const constants_1 = require("./constants");
// ── Re-exports from sub-modules ──
__exportStar(require("./types"), exports);
__exportStar(require("./constants"), exports);
var itemNoteMap_1 = require("./itemNoteMap");
Object.defineProperty(exports, "getObsidianItemNoteMap", { enumerable: true, get: function () { return itemNoteMap_1.getObsidianItemNoteMap; } });
Object.defineProperty(exports, "setObsidianItemNoteMap", { enumerable: true, get: function () { return itemNoteMap_1.setObsidianItemNoteMap; } });
Object.defineProperty(exports, "getItemMapKey", { enumerable: true, get: function () { return itemNoteMap_1.getItemMapKey; } });
var metadataPreset_1 = require("./metadataPreset");
Object.defineProperty(exports, "getMetadataPreset", { enumerable: true, get: function () { return metadataPreset_1.getMetadataPreset; } });
Object.defineProperty(exports, "getMetadataPresetLibrary", { enumerable: true, get: function () { return metadataPreset_1.getMetadataPresetLibrary; } });
Object.defineProperty(exports, "getActiveMetadataPresetProfile", { enumerable: true, get: function () { return metadataPreset_1.getActiveMetadataPresetProfile; } });
Object.defineProperty(exports, "persistMetadataPresetLibrary", { enumerable: true, get: function () { return metadataPreset_1.persistMetadataPresetLibrary; } });
Object.defineProperty(exports, "normalizeMetadataPresetLibrary", { enumerable: true, get: function () { return metadataPreset_1.normalizeMetadataPresetLibrary; } });
Object.defineProperty(exports, "createDefaultMetadataPresetLibrary", { enumerable: true, get: function () { return metadataPreset_1.createDefaultMetadataPresetLibrary; } });
Object.defineProperty(exports, "createMetadataPresetID", { enumerable: true, get: function () { return metadataPreset_1.createMetadataPresetID; } });
Object.defineProperty(exports, "cloneDefaultMetadataPreset", { enumerable: true, get: function () { return metadataPreset_1.cloneDefaultMetadataPreset; } });
Object.defineProperty(exports, "cloneMetadataPreset", { enumerable: true, get: function () { return metadataPreset_1.cloneMetadataPreset; } });
Object.defineProperty(exports, "getMetadataPresetSectionLabel", { enumerable: true, get: function () { return metadataPreset_1.getMetadataPresetSectionLabel; } });
Object.defineProperty(exports, "getConfiguredFields", { enumerable: true, get: function () { return metadataPreset_1.getConfiguredFields; } });
Object.defineProperty(exports, "getFieldLabel", { enumerable: true, get: function () { return metadataPreset_1.getFieldLabel; } });
Object.defineProperty(exports, "getMetadataFieldCatalog", { enumerable: true, get: function () { return metadataPreset_1.getMetadataFieldCatalog; } });
Object.defineProperty(exports, "getItemTypeLabel", { enumerable: true, get: function () { return metadataPreset_1.getItemTypeLabel; } });
Object.defineProperty(exports, "getStandardFieldKeysForItemType", { enumerable: true, get: function () { return metadataPreset_1.getStandardFieldKeysForItemType; } });
Object.defineProperty(exports, "normalizeMetadataPreset", { enumerable: true, get: function () { return metadataPreset_1.normalizeMetadataPreset; } });
// ── Pref helpers ──
function getBooleanPrefOrDefault(key, defaultValue) {
    const value = (0, prefs_1.getPref)(key);
    return typeof value === "boolean" ? value : defaultValue;
}
function getStringPrefOrDefault(key, defaultValue) {
    const value = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)(key) || ""));
    return value || defaultValue;
}
// ── Sync scope / update strategy normalization ──
function normalizeObsidianSyncScope(value) {
    switch ((0, shared_1.cleanInline)(value)) {
        case "currentList":
        case "library":
            return (0, shared_1.cleanInline)(value);
        default:
            return "selection";
    }
}
function normalizeObsidianUpdateStrategy(value) {
    switch ((0, shared_1.cleanInline)(value)) {
        case "overwrite":
        case "skip":
            return (0, shared_1.cleanInline)(value);
        default:
            return "managed";
    }
}
// ── Content config ──
function getManagedNoteContentConfig() {
    return {
        includeMetadata: getBooleanPrefOrDefault(constants_1.OBSIDIAN_INCLUDE_METADATA_PREF, true),
        includeAbstract: getBooleanPrefOrDefault(constants_1.OBSIDIAN_INCLUDE_ABSTRACT_PREF, true),
        includeHiddenInfo: getBooleanPrefOrDefault(constants_1.OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF, true),
        includeAnnotations: getBooleanPrefOrDefault(constants_1.OBSIDIAN_INCLUDE_ANNOTATIONS_PREF, true),
        includeChildNotes: getBooleanPrefOrDefault(constants_1.OBSIDIAN_INCLUDE_CHILD_NOTES_PREF, true),
    };
}
function getMissingMetadataTranslationConfig() {
    return {
        enabled: getBooleanPrefOrDefault(constants_1.OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF, false),
        includeTitle: getBooleanPrefOrDefault(constants_1.OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF, false),
        includeAbstract: getBooleanPrefOrDefault(constants_1.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF, false),
    };
}
// ── Path helpers ──
function deriveObsidianPathDefaults(vaultRoot) {
    const rawVaultRoot = (0, shared_1.cleanInline)(vaultRoot);
    const preferPosixStyle = rawVaultRoot.startsWith("/") && !rawVaultRoot.includes("\\");
    const normalizedVaultRoot = preferPosixStyle
        ? rawVaultRoot.replace(/\/+/g, "/").replace(/\/$/, "")
        : (0, str_1.formatPath)(rawVaultRoot);
    const joinPath = (...segments) => {
        if (!preferPosixStyle) {
            return (0, str_1.jointPath)(...segments);
        }
        return segments
            .filter(Boolean)
            .map((segment, index) => {
            if (index === 0) {
                return segment.replace(/\/+$/, "");
            }
            return segment.replace(/^\/+|\/+$/g, "");
        })
            .join("/");
    };
    const vaultName = normalizedVaultRoot.split(/[\\\/]/).filter(Boolean).pop() || "";
    return {
        vaultRoot: normalizedVaultRoot,
        vaultName,
        notesDir: normalizedVaultRoot
            ? joinPath(normalizedVaultRoot, "notes")
            : "",
        assetsDir: normalizedVaultRoot
            ? joinPath(normalizedVaultRoot, "assets", "zotero")
            : "",
        dashboardDir: normalizedVaultRoot
            ? preferPosixStyle
                ? joinPath(normalizedVaultRoot, "dashboards", "zotero")
                : (0, paths_1.getDefaultDashboardDir)(normalizedVaultRoot)
            : "",
    };
}
function normalizeComparablePath(path) {
    const normalized = (0, str_1.formatPath)((0, shared_1.cleanInline)(path));
    return Zotero.isWin ? normalized.toLowerCase() : normalized;
}
function getObsidianVaultSearchRoots() {
    const roots = new Map();
    const addRoot = (path) => {
        const normalized = (0, str_1.formatPath)((0, shared_1.cleanInline)(path));
        if (!normalized) {
            return;
        }
        roots.set(normalizeComparablePath(normalized), normalized);
    };
    const getDirsvcPath = (key) => {
        try {
            // @ts-ignore nsIFile is provided by the Zotero runtime
            return (0, str_1.formatPath)(Services.dirsvc.get(key, Ci.nsIFile).path);
        }
        catch (error) {
            return "";
        }
    };
    const homeDir = (0, str_1.formatPath)((0, shared_1.cleanInline)(String(PathUtils.homeDir || ""))) ||
        getDirsvcPath("Home");
    const documentsDir = getDirsvcPath("Docs") || (homeDir ? (0, str_1.jointPath)(homeDir, "Documents") : "");
    const desktopDir = getDirsvcPath("Desk") || (homeDir ? (0, str_1.jointPath)(homeDir, "Desktop") : "");
    const oneDriveDir = homeDir ? (0, str_1.jointPath)(homeDir, "OneDrive") : "";
    const configuredVaultRoot = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.vaultRoot") || ""));
    addRoot(homeDir);
    addRoot(documentsDir);
    addRoot(desktopDir);
    addRoot(oneDriveDir);
    addRoot(oneDriveDir ? (0, str_1.jointPath)(oneDriveDir, "Documents") : "");
    addRoot(oneDriveDir ? (0, str_1.jointPath)(oneDriveDir, "Desktop") : "");
    addRoot(homeDir ? (0, str_1.jointPath)(homeDir, "Obsidian") : "");
    addRoot(homeDir ? (0, str_1.jointPath)(homeDir, "Vaults") : "");
    addRoot(homeDir ? (0, str_1.jointPath)(homeDir, "ObsidianVault") : "");
    addRoot(documentsDir ? (0, str_1.jointPath)(documentsDir, "Obsidian") : "");
    addRoot(documentsDir ? (0, str_1.jointPath)(documentsDir, "Vaults") : "");
    addRoot(documentsDir ? (0, str_1.jointPath)(documentsDir, "ObsidianVault") : "");
    addRoot(configuredVaultRoot);
    return Array.from(roots.values());
}
function pathIsDirectory(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedPath = (0, str_1.formatPath)((0, shared_1.cleanInline)(path));
        if (!normalizedPath) {
            return false;
        }
        try {
            const info = yield IOUtils.stat(normalizedPath);
            return info.type === "directory";
        }
        catch (error) {
            return false;
        }
    });
}
function isObsidianVaultDirectory(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedPath = (0, str_1.formatPath)((0, shared_1.cleanInline)(path));
        if (!normalizedPath || !(yield pathIsDirectory(normalizedPath))) {
            return false;
        }
        return pathIsDirectory((0, str_1.jointPath)(normalizedPath, ".obsidian"));
    });
}
function getDirectoryChildren(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedPath = (0, str_1.formatPath)((0, shared_1.cleanInline)(path));
        if (!normalizedPath || !(yield pathIsDirectory(normalizedPath))) {
            return [];
        }
        try {
            return (yield IOUtils.getChildren(normalizedPath)).map((childPath) => (0, str_1.formatPath)(childPath));
        }
        catch (error) {
            return [];
        }
    });
}
function detectObsidianVaults() {
    return __awaiter(this, void 0, void 0, function* () {
        const detectedVaults = new Map();
        const addVault = (path) => {
            const normalizedPath = (0, str_1.formatPath)((0, shared_1.cleanInline)(path));
            if (!normalizedPath) {
                return;
            }
            detectedVaults.set(normalizeComparablePath(normalizedPath), {
                path: normalizedPath,
                name: (0, paths_1.getLastPathSegment)(normalizedPath) || normalizedPath,
            });
        };
        for (const rootPath of getObsidianVaultSearchRoots()) {
            if (yield isObsidianVaultDirectory(rootPath)) {
                addVault(rootPath);
            }
            const childPaths = yield getDirectoryChildren(rootPath);
            for (const childPath of childPaths) {
                if (yield isObsidianVaultDirectory(childPath)) {
                    addVault(childPath);
                }
            }
        }
        return Array.from(detectedVaults.values()).sort((left, right) => {
            const nameCompare = left.name.localeCompare(right.name, undefined, {
                sensitivity: "base",
            });
            return nameCompare || left.path.localeCompare(right.path);
        });
    });
}
function isObsidianConfigured() {
    return Boolean((0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.vaultRoot") || "")) ||
        (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.notesDir") || "")) ||
        (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.assetsDir") || "")));
}
// ── Settings resolution ──
function ensureObsidianSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        const vaultRoot = String((0, prefs_1.getPref)("obsidian.vaultRoot") || "").trim();
        const notesDirPref = String((0, prefs_1.getPref)("obsidian.notesDir") || "").trim();
        const assetsDirPref = String((0, prefs_1.getPref)("obsidian.assetsDir") || "").trim();
        const dashboardDirPref = String((0, prefs_1.getPref)(constants_1.OBSIDIAN_DASHBOARD_DIR_PREF) || "").trim();
        const defaults = deriveObsidianPathDefaults(vaultRoot);
        const notesDir = (0, str_1.formatPath)(notesDirPref || defaults.notesDir);
        if (!notesDir) {
            throw new Error((0, locale_1.getString)("obsidian-sync-missingNotesDir"));
        }
        if (vaultRoot && !(yield (0, str_1.fileExists)(vaultRoot))) {
            throw new Error((0, locale_1.getString)("obsidian-sync-missingVaultRoot"));
        }
        const assetsDir = (0, str_1.formatPath)(assetsDirPref ||
            defaults.assetsDir ||
            (0, str_1.jointPath)(PathUtils.parent(notesDir) || notesDir, "assets", "zotero"));
        const dashboardDir = (0, str_1.formatPath)(dashboardDirPref ||
            defaults.dashboardDir ||
            (0, paths_1.getDefaultDashboardDir)(vaultRoot, notesDir));
        const notesDirParent = PathUtils.parent(notesDir);
        if (notesDirParent) {
            yield Zotero.File.createDirectoryIfMissingAsync(notesDirParent);
        }
        yield Zotero.File.createDirectoryIfMissingAsync(notesDir);
        yield Zotero.File.createDirectoryIfMissingAsync(assetsDir);
        if (dashboardDir) {
            yield Zotero.File.createDirectoryIfMissingAsync(dashboardDir);
        }
        return {
            vaultRoot: (0, str_1.formatPath)(vaultRoot),
            notesDir,
            assetsDir,
            dashboardDir,
            autoSync: Boolean((0, prefs_1.getPref)("obsidian.autoSync")),
            openAfterSync: Boolean((0, prefs_1.getPref)(constants_1.OBSIDIAN_OPEN_AFTER_SYNC_PREF)),
            revealAfterSync: Boolean((0, prefs_1.getPref)("obsidian.revealAfterSync")),
            dashboardAutoSetup: getBooleanPrefOrDefault(constants_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, true),
            attachmentFolder: (0, paths_1.getAttachmentRelativeDir)(notesDir, assetsDir),
            itemTemplate: resolveObsidianItemTemplateName(),
            fileNameTemplate: getStringPrefOrDefault(constants_1.OBSIDIAN_FILE_NAME_TEMPLATE_PREF, constants_1.DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE),
            syncScope: normalizeObsidianSyncScope(String((0, prefs_1.getPref)(constants_1.OBSIDIAN_SYNC_SCOPE_PREF) || "")),
            updateStrategy: normalizeObsidianUpdateStrategy(String((0, prefs_1.getPref)(constants_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || "")),
            content: getManagedNoteContentConfig(),
            translation: getMissingMetadataTranslationConfig(),
        };
    });
}
// ── Connection test ──
function writeObsidianConnectionTestFile() {
    return __awaiter(this, void 0, void 0, function* () {
        const settings = yield ensureObsidianSettings();
        const targetPath = (0, str_1.jointPath)(settings.notesDir, constants_1.OBSIDIAN_CONNECTION_TEST_FILE_NAME);
        const content = [
            "# Obsidian Bridge Test",
            "",
            `Created: ${new Date().toISOString()}`,
            "",
            "If you can see this file, the plugin can write into your Obsidian folder.",
        ].join("\n");
        yield Zotero.File.putContentsAsync(targetPath, content);
        if (!(yield (0, str_1.fileExists)(targetPath))) {
            throw new Error("The test file could not be found after writing.");
        }
        return {
            path: targetPath,
            fileName: PathUtils.filename(targetPath),
            directory: settings.notesDir,
        };
    });
}
// ── Managed frontmatter fields ──
function normalizeManagedFrontmatterFields(raw) {
    if (!raw) {
        return [...constants_1.DEFAULT_MANAGED_FRONTMATTER_FIELDS];
    }
    try {
        const parsed = JSON.parse(raw);
        const allowedKeys = new Set(constants_1.MANAGED_FRONTMATTER_OPTIONS.map((option) => option.key));
        if (!Array.isArray(parsed)) {
            return [...constants_1.DEFAULT_MANAGED_FRONTMATTER_FIELDS];
        }
        const normalized = parsed
            .map((value) => (0, shared_1.cleanInline)(value))
            .filter((value) => allowedKeys.has(value));
        return Array.from(new Set(normalized));
    }
    catch (e) {
        return [...constants_1.DEFAULT_MANAGED_FRONTMATTER_FIELDS];
    }
}
function getManagedFrontmatterFields() {
    return normalizeManagedFrontmatterFields(String((0, prefs_1.getPref)(constants_1.OBSIDIAN_FRONTMATTER_FIELDS_PREF) || ""));
}
function setManagedFrontmatterFields(fields) {
    const normalized = normalizeManagedFrontmatterFields(JSON.stringify(fields || []));
    const { setPref } = require("../../utils/prefs");
    setPref(constants_1.OBSIDIAN_FRONTMATTER_FIELDS_PREF, JSON.stringify(normalized, null, 2));
    return normalized;
}
function hasManagedFrontmatterField(key) {
    return new Set(getManagedFrontmatterFields()).has(key);
}
function getManagedFrontmatterOption(key) {
    return constants_1.MANAGED_FRONTMATTER_OPTIONS.find((option) => option.key === key);
}
function sameManagedFrontmatterFields(left, right) {
    if (left.length !== right.length) {
        return false;
    }
    const leftSet = new Set(left);
    for (const value of right) {
        if (!leftSet.has(value)) {
            return false;
        }
    }
    return true;
}
function resolveManagedFrontmatterPreset(fields) {
    const matchedPreset = constants_1.MANAGED_FRONTMATTER_PRESETS.find((preset) => sameManagedFrontmatterFields(fields, preset.fields));
    return (matchedPreset === null || matchedPreset === void 0 ? void 0 : matchedPreset.id) || "custom";
}
function getManagedFrontmatterPresetLabel(presetId) {
    switch (presetId) {
        case "recommended":
            return (0, locale_1.getString)("obsidian-frontmatter-preset-recommended-title");
        case "minimal":
            return (0, locale_1.getString)("obsidian-frontmatter-preset-minimal-title");
        case "dataview":
            return (0, locale_1.getString)("obsidian-frontmatter-preset-dataview-title");
        default:
            return (0, locale_1.getString)("obsidian-frontmatter-preset-custom-title");
    }
}
function getManagedFrontmatterOptionLabel(key) {
    const localeKey = constants_1.MANAGED_FRONTMATTER_OPTION_LABEL_KEYS[key];
    return localeKey ? (0, locale_1.getString)(localeKey) : key;
}
// ── Template helpers ──
function hasTemplateByName(templateName) {
    const normalizedName = (0, shared_1.cleanInline)(templateName);
    if (!normalizedName) {
        return false;
    }
    return Boolean(addon.api.template.getTemplateText(normalizedName) ||
        addon.api.template.DEFAULT_TEMPLATES.find((template) => template.name === normalizedName));
}
function getObsidianItemTemplateOptions() {
    const templateNames = addon.api.template
        .getTemplateKeys()
        .map((templateName) => (0, shared_1.cleanInline)(templateName))
        .filter((templateName) => templateName.startsWith("[Item]"));
    return Array.from(new Set([
        (0, shared_1.cleanInline)(String((0, prefs_1.getPref)(constants_1.OBSIDIAN_ITEM_TEMPLATE_PREF) || "")),
        constants_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
        ...templateNames,
    ].filter(Boolean)));
}
function getObsidianItemTemplateLabel(templateName) {
    const normalized = (0, shared_1.cleanInline)(templateName);
    if (normalized.toLowerCase().startsWith("[item]")) {
        return normalized.slice(6).trim() || normalized;
    }
    return normalized;
}
function resolveObsidianItemTemplateName() {
    const configuredTemplate = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)(constants_1.OBSIDIAN_ITEM_TEMPLATE_PREF) || ""));
    if (configuredTemplate && hasTemplateByName(configuredTemplate)) {
        return configuredTemplate;
    }
    return constants_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE;
}
// ── Storage init / reset ──
function initObsidianStorage() {
    return __awaiter(this, void 0, void 0, function* () {
        const { initObsidianItemNoteMap } = yield Promise.resolve().then(() => require("./itemNoteMap"));
        const { initMetadataPresetLibrary } = yield Promise.resolve().then(() => require("./metadataPreset"));
        yield initObsidianItemNoteMap();
        yield initMetadataPresetLibrary();
    });
}
function resetObsidianStorageState() {
    const { resetObsidianItemNoteMapState } = require("./itemNoteMap");
    const { resetMetadataPresetLibraryState } = require("./metadataPreset");
    resetObsidianItemNoteMapState();
    resetMetadataPresetLibraryState();
}
