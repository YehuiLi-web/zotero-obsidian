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
exports.getDefaultDashboardDir = getDefaultDashboardDir;
exports.splitComparablePath = splitComparablePath;
exports.isSamePathSegment = isSamePathSegment;
exports.getRelativePath = getRelativePath;
exports.looksLikeAbsolutePath = looksLikeAbsolutePath;
exports.getAttachmentRelativeDir = getAttachmentRelativeDir;
exports.buildObsidianOpenURI = buildObsidianOpenURI;
exports.openObsidianNote = openObsidianNote;
exports.getLastPathSegment = getLastPathSegment;
exports.makeLibrarySelectLink = makeLibrarySelectLink;
exports.makeLibraryOpenLink = makeLibraryOpenLink;
exports.buildCollectionItemSelectURI = buildCollectionItemSelectURI;
exports.getItemCollections = getItemCollections;
exports.getBestItemLink = getBestItemLink;
exports.makeLibraryLink = makeLibraryLink;
exports.getBestAttachmentLink = getBestAttachmentLink;
exports.escapeForDoubleQuotedString = escapeForDoubleQuotedString;
exports.getVaultRelativeFolder = getVaultRelativeFolder;
exports.sanitizeFileNamePart = sanitizeFileNamePart;
exports.sanitizeFileNameToken = sanitizeFileNameToken;
exports.ensureMarkdownExtension = ensureMarkdownExtension;
exports.getManagedObsidianUniqueKey = getManagedObsidianUniqueKey;
exports.buildManagedFileNameTemplateContext = buildManagedFileNameTemplateContext;
exports.applyManagedFileNameTemplate = applyManagedFileNameTemplate;
exports.getManagedFileNamePattern = getManagedFileNamePattern;
exports.buildManagedObsidianFileName = buildManagedObsidianFileName;
exports.findExistingObsidianNote = findExistingObsidianNote;
const prefs_1 = require("../../utils/prefs");
const str_1 = require("../../utils/str");
const shared_1 = require("./shared");
const settings_1 = require("./settings");
function getDefaultDashboardDir(vaultRoot, notesDir = "") {
    const normalizedVaultRoot = (0, str_1.formatPath)(vaultRoot);
    if (normalizedVaultRoot) {
        return (0, str_1.jointPath)(normalizedVaultRoot, "dashboards", "zotero");
    }
    const normalizedNotesDir = (0, str_1.formatPath)(notesDir);
    const fallbackRoot = PathUtils.parent(normalizedNotesDir) || normalizedNotesDir;
    return fallbackRoot ? (0, str_1.jointPath)(fallbackRoot, "dashboards", "zotero") : "";
}
function splitComparablePath(path) {
    return PathUtils.split((0, str_1.formatPath)(path)).filter(Boolean);
}
function isSamePathSegment(left, right) {
    return Zotero.isWin
        ? left.toLowerCase() === right.toLowerCase()
        : left === right;
}
function getRelativePath(fromDir, toDir) {
    const fromParts = splitComparablePath(fromDir);
    const toParts = splitComparablePath(toDir);
    if (!fromParts.length || !toParts.length) {
        return (0, str_1.formatPath)(toDir);
    }
    if (!isSamePathSegment(fromParts[0], toParts[0])) {
        return (0, str_1.formatPath)(toDir);
    }
    let commonIndex = 0;
    const maxLength = Math.min(fromParts.length, toParts.length);
    while (commonIndex < maxLength &&
        isSamePathSegment(fromParts[commonIndex], toParts[commonIndex])) {
        commonIndex += 1;
    }
    const upSegments = new Array(fromParts.length - commonIndex).fill("..");
    const downSegments = toParts.slice(commonIndex);
    const relativePath = [...upSegments, ...downSegments].join("/");
    return relativePath || "";
}
function looksLikeAbsolutePath(path) {
    return (/^[a-zA-Z]:[\\/]/.test(path) || /^\\\\/.test(path) || path.startsWith("/"));
}
function getAttachmentRelativeDir(noteDir, attachmentDir) {
    const relativeDir = getRelativePath(noteDir, attachmentDir);
    return relativeDir === "." ? "" : (0, str_1.formatPath)(relativeDir);
}
function getLastPathSegment(path) {
    const parts = PathUtils.split((0, str_1.formatPath)(path));
    return parts.pop() || "";
}
function buildObsidianOpenURI(targetPath) {
    const normalizedTargetPath = (0, str_1.formatPath)(targetPath);
    const vaultRoot = String((0, prefs_1.getPref)("obsidian.vaultRoot") || "").trim();
    const configuredVaultName = String((0, prefs_1.getPref)("obsidian.vaultName") || "").trim();
    const vaultName = configuredVaultName || getLastPathSegment(vaultRoot);
    if (vaultRoot && vaultName) {
        const relativePath = getRelativePath(vaultRoot, normalizedTargetPath)
            .replace(/\\/g, "/")
            .replace(/^\.\/+/, "");
        if (relativePath && !looksLikeAbsolutePath(relativePath)) {
            return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relativePath)}`;
        }
    }
    return `obsidian://open?path=${encodeURIComponent(normalizedTargetPath)}`;
}
function openObsidianNote(targetPath) {
    const uri = buildObsidianOpenURI(targetPath);
    const appPath = String((0, prefs_1.getPref)("obsidian.appPath") || "").trim();
    if (appPath) {
        try {
            const classes = Components.classes;
            const interfaces = Components.interfaces;
            const process = classes["@mozilla.org/process/util;1"].createInstance(interfaces.nsIProcess);
            process.init(Zotero.File.pathToFile(appPath));
            process.runw(false, [uri], 1);
            return true;
        }
        catch (e) {
            ztoolkit.log("[ObsidianBridge] failed to open uri via app process", e);
        }
    }
    try {
        if (typeof Zotero.launchURL === "function") {
            Zotero.launchURL(uri);
            return true;
        }
    }
    catch (e) {
        ztoolkit.log("[ObsidianBridge] failed to open uri via launchURL", e);
    }
    return false;
}
function buildLibraryURI(action, item) {
    if (!(item === null || item === void 0 ? void 0 : item.key)) {
        return "";
    }
    if (item.libraryID === 1) {
        return `zotero://${action}/library/items/${item.key}`;
    }
    const library = Zotero.Libraries.get(item.libraryID);
    const groupID = library && typeof library.id === "number" ? library.id : 0;
    if (!groupID) {
        return `zotero://${action}/library/items/${item.key}`;
    }
    return `zotero://${action}/groups/${groupID}/items/${item.key}`;
}
function makeLibrarySelectLink(item) {
    return buildLibraryURI("select", item);
}
function makeLibraryOpenLink(item) {
    return buildLibraryURI("open", item);
}
function makeLibraryLink(item) {
    return makeLibraryOpenLink(item);
}
function buildCollectionItemSelectURI(item, collection) {
    const collectionKey = (0, shared_1.cleanInline)(collection && typeof collection === "object" ? collection.key || "" : "");
    if (!(item === null || item === void 0 ? void 0 : item.key) || !collectionKey) {
        return makeLibrarySelectLink(item);
    }
    if (item.libraryID === 1) {
        return `zotero://select/library/collections/${collectionKey}/items/${item.key}`;
    }
    const library = Zotero.Libraries.get(item.libraryID);
    const groupID = library && typeof library.id === "number" ? library.id : 0;
    if (!groupID) {
        return `zotero://select/library/collections/${collectionKey}/items/${item.key}`;
    }
    return `zotero://select/groups/${groupID}/collections/${collectionKey}/items/${item.key}`;
}
function getItemCollections(item) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(item === null || item === void 0 ? void 0 : item.id)) {
            return [];
        }
        const collectionResults = (yield Zotero.Collections.getCollectionsContainingItems([item.id]));
        return Array.isArray(collectionResults) ? collectionResults : [];
    });
}
function getBestItemLink(item) {
    return __awaiter(this, void 0, void 0, function* () {
        const collections = yield getItemCollections(item);
        return buildCollectionItemSelectURI(item, collections[0]);
    });
}
function getBestAttachmentLink(item) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!item || typeof item.getBestAttachment !== "function") {
            return "";
        }
        const attachment = yield item.getBestAttachment();
        if (!attachment) {
            return "";
        }
        return makeLibraryOpenLink(attachment);
    });
}
function escapeForDoubleQuotedString(value) {
    return (0, str_1.formatPath)(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function getVaultRelativeFolder(vaultRoot, targetDir) {
    const normalizedVaultRoot = (0, str_1.formatPath)(vaultRoot);
    const normalizedTargetDir = (0, str_1.formatPath)(targetDir);
    if (!normalizedVaultRoot || !normalizedTargetDir) {
        return "";
    }
    const relativePath = getRelativePath(normalizedVaultRoot, normalizedTargetDir)
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/\/+$/, "");
    return looksLikeAbsolutePath(relativePath) ? "" : relativePath;
}
function sanitizeFileNamePart(value) {
    return (0, shared_1.cleanInline)(value)
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120);
}
function sanitizeFileNameToken(value) {
    return (0, shared_1.cleanInline)(value)
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ")
        .replace(/-+/g, "-")
        .replace(/^[.\s-]+|[.\s-]+$/g, "")
        .slice(0, 120);
}
function ensureMarkdownExtension(fileName) {
    const normalized = (0, shared_1.cleanInline)(fileName).replace(/[.\s]+$/g, "");
    if (!normalized) {
        return "";
    }
    return /\.md$/i.test(normalized) ? normalized : `${normalized}.md`;
}
function buildManagedIdentityHash(value) {
    var _a, _b, _c;
    const normalized = (0, shared_1.cleanInline)(value);
    if (!normalized) {
        return "";
    }
    const md5 = (_c = (_b = (_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.Zotero) === null || _a === void 0 ? void 0 : _a.Utilities) === null || _b === void 0 ? void 0 : _b.Internal) === null || _c === void 0 ? void 0 : _c.md5;
    if (typeof md5 === "function") {
        const digest = (0, shared_1.cleanInline)(String(md5(normalized, false) || ""));
        if (digest) {
            return digest.slice(0, 10).toUpperCase();
        }
    }
    let hashA = 0x811c9dc5;
    let hashB = 0x85ebca6b;
    for (let index = 0; index < normalized.length; index += 1) {
        const code = normalized.charCodeAt(index);
        hashA ^= code;
        hashA = Math.imul(hashA, 0x01000193) >>> 0;
        hashB ^= code;
        hashB = Math.imul(hashB, 0xc2b2ae35) >>> 0;
        hashB ^= hashB >>> 13;
        hashB >>>= 0;
    }
    return `${hashA.toString(36)}${hashB.toString(36)}`
        .toUpperCase()
        .padStart(10, "0")
        .slice(0, 10);
}
function getManagedObsidianUniqueKey(topItem) {
    const identityHash = buildManagedIdentityHash(`${topItem.libraryID || 0}:${(0, shared_1.cleanInline)(topItem.key)}`);
    if (identityHash) {
        return sanitizeFileNameToken(identityHash);
    }
    return (sanitizeFileNameToken(`${topItem.libraryID}-${topItem.key}`) ||
        sanitizeFileNameToken(topItem.key));
}
function buildManagedFileNameTemplateContext(topItem, noteItem) {
    const extraMap = (0, shared_1.parseExtraMap)((0, shared_1.getFieldSafe)(topItem, "extra"));
    const creators = topItem.getCreators();
    const creatorNames = creators
        .map((creator) => {
        if (creator.name) {
            return creator.name;
        }
        return [creator.firstName, creator.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
    })
        .map((value) => sanitizeFileNameToken(value))
        .filter(Boolean);
    return {
        title: sanitizeFileNameToken((0, shared_1.getFieldSafe)(topItem, "title") || topItem.key),
        libraryID: sanitizeFileNameToken(String(topItem.libraryID || "")),
        key: sanitizeFileNameToken(topItem.key),
        uniqueKey: getManagedObsidianUniqueKey(topItem),
        noteKey: sanitizeFileNameToken(noteItem.key),
        year: sanitizeFileNameToken((0, shared_1.getDateYear)((0, shared_1.getFieldSafe)(topItem, "date"))),
        firstCreator: creatorNames[0] || "",
        creators: creatorNames.join(", "),
        citationKey: sanitizeFileNameToken((0, shared_1.getFieldSafe)(topItem, "citationKey") || extraMap.citationKey || ""),
        publication: sanitizeFileNameToken((0, shared_1.firstValue)((0, shared_1.getFieldSafe)(topItem, "publicationTitle"), (0, shared_1.getFieldSafe)(topItem, "proceedingsTitle"), (0, shared_1.getFieldSafe)(topItem, "bookTitle"), (0, shared_1.getFieldSafe)(topItem, "publisher"))),
        itemType: sanitizeFileNameToken((0, shared_1.getFieldSafe)(topItem, "itemType")),
    };
}
function applyManagedFileNameTemplate(template, context) {
    const normalizedTemplate = (0, shared_1.cleanInline)(template || settings_1.DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE)
        .replace(/\.md$/i, "")
        .trim();
    const rendered = normalizedTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => sanitizeFileNameToken(context[token] || ""));
    return rendered
        .replace(/\s+/g, " ")
        .replace(/\s*([(){}\[\]])\s*/g, "$1")
        .replace(/^[.\s-]+|[.\s-]+$/g, "")
        .trim();
}
function getManagedFileNamePattern() {
    const userTemplate = String((0, prefs_1.getPref)(settings_1.OBSIDIAN_FILE_NAME_TEMPLATE_PREF) || "").trim();
    return userTemplate || settings_1.DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE;
}
function buildManagedObsidianFileName(topItem, noteItem) {
    const context = buildManagedFileNameTemplateContext(topItem, noteItem);
    const fallbackBaseName = `${sanitizeFileNamePart((0, shared_1.getFieldSafe)(topItem, "title") || topItem.key) ||
        topItem.key}--${context.uniqueKey || context.key}`;
    const fileName = applyManagedFileNameTemplate(getManagedFileNamePattern(), context);
    return ensureMarkdownExtension(fileName || fallbackBaseName);
}
function findExistingObsidianNote(topItem) {
    const itemNoteMap = (0, settings_1.getObsidianItemNoteMap)();
    const itemMapKey = (0, settings_1.getItemMapKey)(topItem);
    const mappedNoteKey = itemNoteMap[itemMapKey];
    if (!mappedNoteKey) {
        return false;
    }
    const mappedNote = Zotero.Items.getByLibraryAndKey(topItem.libraryID, mappedNoteKey);
    if (mappedNote &&
        mappedNote.isNote() &&
        !mappedNote.deleted &&
        mappedNote.parentID === topItem.id) {
        return mappedNote;
    }
    // Clean up stale map entry so recovery or creation can proceed
    if (!mappedNote || mappedNote.deleted) {
        delete itemNoteMap[itemMapKey];
        (0, settings_1.setObsidianItemNoteMap)(itemNoteMap);
    }
    return false;
}
