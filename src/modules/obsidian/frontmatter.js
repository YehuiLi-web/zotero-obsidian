"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANAGED_FRONTMATTER_RESERVED_KEYS = exports.MANAGED_FRONTMATTER_SYSTEM_TAGS = exports.MANAGED_NOTE_SCHEMA_VERSION = void 0;
exports.normalizeManagedTag = normalizeManagedTag;
exports.getManagedFrontmatterTags = getManagedFrontmatterTags;
exports.getManagedFrontmatterNonSystemTags = getManagedFrontmatterNonSystemTags;
exports.normalizeManagedRating = normalizeManagedRating;
exports.buildFrontmatter = buildFrontmatter;
exports.buildManagedFrontmatterData = buildManagedFrontmatterData;
exports.normalizeFrontmatterObject = normalizeFrontmatterObject;
exports.normalizeFrontmatterList = normalizeFrontmatterList;
exports.mergeFrontmatterLists = mergeFrontmatterLists;
exports.parseMarkdownFrontmatter = parseMarkdownFrontmatter;
exports.mergeManagedFrontmatter = mergeManagedFrontmatter;
const YAML = require("yamljs");
const settings_1 = require("./settings");
const shared_1 = require("./shared");
const MANAGED_NOTE_SCHEMA_VERSION = 1;
exports.MANAGED_NOTE_SCHEMA_VERSION = MANAGED_NOTE_SCHEMA_VERSION;
const MANAGED_FRONTMATTER_SYSTEM_TAGS = new Set(["literature", "zotero"]);
exports.MANAGED_FRONTMATTER_SYSTEM_TAGS = MANAGED_FRONTMATTER_SYSTEM_TAGS;
const MANAGED_FRONTMATTER_RESERVED_KEYS = new Set([
    "title",
    "aliases",
    "title_translation",
    "zotero_key",
    "zotero_note_key",
    "item_type",
    "item_type_zh",
    "date",
    "year",
    "doi",
    "citation_key",
    "publication",
    "item_link",
    "pdf_link",
    "authors",
    "collections",
    "zotero_tags",
    "tags",
    "status",
    "reading_status",
    "rating",
    "bridge_managed",
    "bridge_schema",
    "$version",
    "$libraryID",
    "$itemKey",
]);
exports.MANAGED_FRONTMATTER_RESERVED_KEYS = MANAGED_FRONTMATTER_RESERVED_KEYS;
function normalizeManagedTag(value) {
    return (0, shared_1.cleanInline)(value).replace(/^#+/, "");
}
function normalizeFrontmatterObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    return Object.assign({}, value);
}
function normalizeFrontmatterList(value) {
    let values = [];
    if (Array.isArray(value)) {
        values = value;
    }
    else if ((0, shared_1.isPlainObject)(value)) {
        const entries = Object.entries(value);
        const looksLikeIndexedObject = entries.every(([key]) => /^\d+$/.test(key));
        values = looksLikeIndexedObject
            ? entries
                .sort((left, right) => Number(left[0]) - Number(right[0]))
                .map(([, item]) => item)
            : [value];
    }
    else if (value) {
        values = [value];
    }
    return values.map((item) => (0, shared_1.cleanInline)(item)).filter(Boolean);
}
function mergeFrontmatterLists(...values) {
    return Array.from(new Set(values.flatMap((value) => normalizeFrontmatterList(value))));
}
function getManagedFrontmatterTags(value) {
    return Array.from(new Set(normalizeFrontmatterList(value)
        .map((tag) => normalizeManagedTag(tag))
        .filter(Boolean)));
}
function getManagedFrontmatterNonSystemTags(value) {
    return getManagedFrontmatterTags(value).filter((tag) => !MANAGED_FRONTMATTER_SYSTEM_TAGS.has(tag.toLowerCase()));
}
function normalizeManagedRating(value) {
    const normalized = (0, shared_1.cleanInline)(value);
    if (!normalized) {
        return "";
    }
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) {
        return normalized;
    }
    const rounded = Math.round(numeric);
    if (rounded <= 0) {
        return "";
    }
    return Math.min(rounded, 5);
}
function buildFrontmatter(frontmatter) {
    const serializeScalar = (value) => {
        if (typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        return (0, shared_1.yamlQuote)(value);
    };
    const serializeValue = (value, indentLevel) => {
        const indent = "  ".repeat(indentLevel);
        if (Array.isArray(value)) {
            if (!value.length) {
                return `${indent}[]`;
            }
            return value
                .map((item) => {
                if (Array.isArray(item) || (0, shared_1.isPlainObject)(item)) {
                    return `${indent}-\n${serializeValue(item, indentLevel + 1)}`;
                }
                return `${indent}- ${serializeScalar(item)}`;
            })
                .join("\n");
        }
        if ((0, shared_1.isPlainObject)(value)) {
            const entries = Object.entries(value);
            if (!entries.length) {
                return `${indent}{}`;
            }
            return entries
                .map(([key, item]) => {
                if (Array.isArray(item) || (0, shared_1.isPlainObject)(item)) {
                    return `${indent}${key}:\n${serializeValue(item, indentLevel + 1)}`;
                }
                return `${indent}${key}: ${serializeScalar(item)}`;
            })
                .join("\n");
        }
        return `${indent}${serializeScalar(value)}`;
    };
    const lines = Object.entries(frontmatter).map(([key, value]) => {
        if (Array.isArray(value) || (0, shared_1.isPlainObject)(value)) {
            return `${key}:\n${serializeValue(value, 1)}`;
        }
        return `${key}: ${serializeScalar(value)}`;
    });
    return `---\n${lines.join("\n")}\n---`;
}
function buildManagedFrontmatterData(context, creatorsList, zoteroTagsList, collectionsList, topItem, noteItem, existingFrontmatter = {}) {
    const year = Number.parseInt((0, shared_1.cleanInline)(context.dateY), 10);
    const selectedFields = new Set((0, settings_1.getManagedFrontmatterFields)());
    const status = (0, shared_1.cleanInline)((0, shared_1.firstValue)(context.reading_status, context.status, existingFrontmatter.reading_status, existingFrontmatter.status, "inbox"));
    const rating = normalizeManagedRating((0, shared_1.firstValue)((0, shared_1.getFieldSafe)(topItem, "rating"), context.rating, existingFrontmatter.rating));
    const tags = mergeFrontmatterLists(["literature", "zotero"], getManagedFrontmatterNonSystemTags(zoteroTagsList));
    const frontmatter = {
        title: (0, shared_1.cleanInline)(context.title),
        zotero_key: (0, shared_1.cleanInline)(context.qnkey),
        zotero_note_key: (0, shared_1.cleanInline)(noteItem.key),
        tags,
        reading_status: status || "inbox",
        bridge_managed: true,
        bridge_schema: MANAGED_NOTE_SCHEMA_VERSION,
        $version: noteItem.version,
        $libraryID: noteItem.libraryID,
    };
    if (selectedFields.has("titleTranslation")) {
        const titleTranslation = (0, shared_1.cleanInline)(context.titleTranslation);
        if (titleTranslation) {
            frontmatter.aliases = [titleTranslation];
            frontmatter.title_translation = titleTranslation;
        }
    }
    if (selectedFields.has("itemType")) {
        const itemType = (0, shared_1.cleanInline)(context.itemType);
        const itemTypeZh = (0, shared_1.cleanInline)(context.itemTypeZh);
        if (itemType) {
            frontmatter.item_type = itemType;
        }
        if (itemTypeZh) {
            frontmatter.item_type_zh = itemTypeZh;
        }
    }
    if (selectedFields.has("date")) {
        const date = (0, shared_1.cleanInline)(context.date);
        const normalizedYear = Number.isFinite(year)
            ? year
            : (0, shared_1.cleanInline)(context.dateY);
        if (date) {
            frontmatter.date = date;
        }
        if (normalizedYear !== "") {
            frontmatter.year = normalizedYear;
        }
    }
    if (selectedFields.has("doi")) {
        const doi = (0, shared_1.cleanInline)(context.DOI);
        if (doi) {
            frontmatter.doi = doi;
        }
    }
    if (selectedFields.has("citationKey")) {
        const citationKey = (0, shared_1.cleanInline)(context.citationKey);
        if (citationKey) {
            frontmatter.citation_key = citationKey;
        }
    }
    if (selectedFields.has("publication")) {
        const publication = (0, shared_1.cleanInline)((0, shared_1.firstValue)(context.publicationTitle, context.proceedingsTitle, context.bookTitle, context.publisher));
        if (publication) {
            frontmatter.publication = publication;
        }
    }
    if (selectedFields.has("itemLink")) {
        const itemLink = (0, shared_1.cleanInline)(context.itemLink);
        if (itemLink) {
            frontmatter.item_link = itemLink;
        }
    }
    if (selectedFields.has("pdfLink")) {
        const pdfLink = (0, shared_1.cleanInline)(context.pdfLink);
        if (pdfLink) {
            frontmatter.pdf_link = pdfLink;
        }
    }
    if (selectedFields.has("authors")) {
        const authors = creatorsList
            .map((value) => (0, shared_1.cleanInline)(value))
            .filter(Boolean);
        if (authors.length) {
            frontmatter.authors = authors;
        }
    }
    if (selectedFields.has("collections")) {
        const collections = collectionsList
            .map((value) => (0, shared_1.cleanInline)(value))
            .filter(Boolean);
        if (collections.length) {
            frontmatter.collections = collections;
        }
    }
    if (selectedFields.has("zoteroTags")) {
        const zoteroTags = zoteroTagsList
            .map((value) => (0, shared_1.cleanInline)(value))
            .filter(Boolean);
        if (zoteroTags.length) {
            frontmatter.zotero_tags = zoteroTags;
        }
    }
    if (rating !== "" && selectedFields.has("rating")) {
        frontmatter.rating = rating;
    }
    return frontmatter;
}
function parseMarkdownFrontmatter(markdown) {
    const normalized = (0, shared_1.normalizeMarkdown)(markdown);
    const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!match) {
        return {};
    }
    try {
        return normalizeFrontmatterObject(YAML.parse(match[1]));
    }
    catch (e) {
        const toolkit = globalThis.ztoolkit;
        if (toolkit && typeof toolkit.log === "function") {
            toolkit.log("[ObsidianBridge] failed to parse managed frontmatter", e);
        }
        return {};
    }
}
function mergeManagedFrontmatter(existingFrontmatter, generatedFrontmatter) {
    const merged = Object.assign({}, generatedFrontmatter);
    const preservedFrontmatter = normalizeFrontmatterObject(existingFrontmatter);
    for (const [key, value] of Object.entries(preservedFrontmatter)) {
        if (!MANAGED_FRONTMATTER_RESERVED_KEYS.has(key)) {
            merged[key] = value;
        }
    }
    merged.aliases = mergeFrontmatterLists((0, settings_1.hasManagedFrontmatterField)("titleTranslation")
        ? preservedFrontmatter.aliases
        : [], (0, settings_1.hasManagedFrontmatterField)("titleTranslation")
        ? generatedFrontmatter.aliases
        : []);
    if (!merged.aliases.length) {
        delete merged.aliases;
    }
    // Preserve only user-added tags from Obsidian (not from Zotero or system).
    // This ensures that when a tag is deleted in Zotero, it is also removed
    // from the merged `tags` field, while user-only tags are kept.
    const existingTags = getManagedFrontmatterTags(preservedFrontmatter.tags);
    const zoteroSourceTags = new Set(getManagedFrontmatterTags(preservedFrontmatter.zotero_tags));
    const userOnlyTags = existingTags.filter((tag) => !MANAGED_FRONTMATTER_SYSTEM_TAGS.has(tag.toLowerCase()) &&
        !zoteroSourceTags.has(tag));
    merged.tags = mergeFrontmatterLists(generatedFrontmatter.tags, userOnlyTags);
    return merged;
}
