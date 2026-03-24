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
exports.USER_BLOCK_END = exports.USER_BLOCK_START = exports.GENERATED_BLOCK_END = exports.GENERATED_BLOCK_START = void 0;
exports.buildItemContext = buildItemContext;
exports.getVisibleFieldValue = getVisibleFieldValue;
exports.getHiddenFieldValue = getHiddenFieldValue;
exports.buildMetadataCallout = buildMetadataCallout;
exports.buildTagsCallout = buildTagsCallout;
exports.buildAbstractCallout = buildAbstractCallout;
exports.buildHiddenInfoCallout = buildHiddenInfoCallout;
exports.getDefaultUserSections = getDefaultUserSections;
exports.escapeRegex = escapeRegex;
exports.extractHeadingSection = extractHeadingSection;
exports.extractLegacySummaryValue = extractLegacySummaryValue;
exports.normalizeLegacyUserSections = normalizeLegacyUserSections;
exports.extractUserSections = extractUserSections;
exports.stripFrontmatter = stripFrontmatter;
exports.extractMarkedBlock = extractMarkedBlock;
exports.extractManagedObsidianUserMarkdown = extractManagedObsidianUserMarkdown;
const package_json_1 = require("../../../package.json");
const locale_1 = require("../../utils/locale");
const settings_1 = require("./settings");
const paths_1 = require("./paths");
const shared_1 = require("./shared");
const GENERATED_BLOCK_START = `<!-- ${package_json_1.config.addonRef}:BEGIN GENERATED -->`;
exports.GENERATED_BLOCK_START = GENERATED_BLOCK_START;
const GENERATED_BLOCK_END = `<!-- ${package_json_1.config.addonRef}:END GENERATED -->`;
exports.GENERATED_BLOCK_END = GENERATED_BLOCK_END;
const USER_BLOCK_START = `<!-- ${package_json_1.config.addonRef}:BEGIN USER -->`;
exports.USER_BLOCK_START = USER_BLOCK_START;
const USER_BLOCK_END = `<!-- ${package_json_1.config.addonRef}:END USER -->`;
exports.USER_BLOCK_END = USER_BLOCK_END;
const LEGACY_USER_SECTION_MARKERS = [
    "\n## 笔记区",
    "\n## Reading Summary",
    "\n## Notes",
    "\n## Questions",
    "\n## Related",
];
function getObsidianNoteLocaleStrings() {
    return {
        metadataTitle: (0, locale_1.getString)("obsidian-note-metadata-title"),
        metadataKeyLabel: (0, locale_1.getString)("obsidian-note-metadata-column-key"),
        metadataValueLabel: (0, locale_1.getString)("obsidian-note-metadata-column-value"),
        tagsTitle: (0, locale_1.getString)("obsidian-note-tags-title"),
        abstractTitle: (0, locale_1.getString)("obsidian-note-abstract-title"),
        abstractTranslationTitle: (0, locale_1.getString)("obsidian-note-abstractTranslation-title"),
        hiddenInfoTitle: (0, locale_1.getString)("obsidian-note-hiddenInfo-title"),
        emptyAbstract: (0, locale_1.getString)("obsidian-note-emptyAbstract"),
        emptyAbstractTranslation: (0, locale_1.getString)("obsidian-note-emptyAbstractTranslation"),
        workspaceHeading: `## ${(0, locale_1.getString)("obsidian-note-userSection-workspace")}`,
        summaryHeading: `### ${(0, locale_1.getString)("obsidian-note-userSection-summary")}`,
        problemHeading: `### ${(0, locale_1.getString)("obsidian-note-userSection-problem")}`,
        methodHeading: `### ${(0, locale_1.getString)("obsidian-note-userSection-method")}`,
        conclusionHeading: `### ${(0, locale_1.getString)("obsidian-note-userSection-conclusion")}`,
        notesHeading: `## ${(0, locale_1.getString)("obsidian-note-userSection-notes")}`,
        questionsHeading: `## ${(0, locale_1.getString)("obsidian-note-userSection-questions")}`,
        relatedHeading: `## ${(0, locale_1.getString)("obsidian-note-userSection-related")}`,
    };
}
function getUserSectionMarkers() {
    const strings = getObsidianNoteLocaleStrings();
    return Array.from(new Set([
        `\n${strings.workspaceHeading}`,
        `\n${strings.notesHeading}`,
        `\n${strings.questionsHeading}`,
        `\n${strings.relatedHeading}`,
        ...LEGACY_USER_SECTION_MARKERS,
    ]));
}
function buildItemContext(topItem) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const extraMap = (0, shared_1.parseExtraMap)((0, shared_1.getFieldSafe)(topItem, "extra"));
        const creators = topItem.getCreators();
        const creatorsList = creators
            .map((creator) => {
            if (typeof creator.name === "string" && creator.name.trim()) {
                return creator.name.trim();
            }
            return [creator.firstName, creator.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
        })
            .filter(Boolean);
        const zoteroTagsList = topItem
            .getTags()
            .map((tag) => tag.tag)
            .filter(Boolean);
        const collectionResults = (yield Zotero.Collections.getCollectionsContainingItems([topItem.id]));
        const collectionsList = (Array.isArray(collectionResults) ? collectionResults : [])
            .map((collection) => (0, shared_1.cleanInline)(collection.name || ""))
            .filter(Boolean);
        const itemJSON = (typeof topItem.toJSON === "function" ? topItem.toJSON() : {});
        const relations = (itemJSON.relations || {});
        const relatedList = Array.from(new Set(Object.values(relations)
            .flatMap((value) => (Array.isArray(value) ? value : [value]))
            .map((value) => (0, shared_1.cleanInline)(value))
            .filter(Boolean)));
        const rawFieldKeys = Array.from(new Set([
            "itemType",
            "title",
            "shortTitle",
            "abstractNote",
            "date",
            "dateAdded",
            "dateModified",
            "extra",
            ...(0, settings_1.getStandardFieldKeysForItemType)((0, shared_1.cleanInline)(itemJSON.itemType || (0, shared_1.getFieldSafe)(topItem, "itemType"))),
            ...Object.keys(itemJSON),
            ...Object.keys(extraMap),
        ]));
        const context = {};
        for (const key of rawFieldKeys) {
            context[key] = (0, shared_1.firstValue)((0, shared_1.getFieldSafe)(topItem, key), (0, shared_1.getScalarJSONValue)(itemJSON[key]), extraMap[key]);
        }
        const titleTranslation = (0, shared_1.firstValue)((0, shared_1.getFieldSafe)(topItem, "titleTranslation"), extraMap.titleTranslation);
        const abstractTranslation = (0, shared_1.firstValue)((0, shared_1.getFieldSafe)(topItem, "abstractTranslation"), extraMap.abstractTranslation);
        const abstract = (0, shared_1.getFieldSafe)(topItem, "abstractNote");
        Object.assign(context, {
            itemType: (0, shared_1.firstValue)(itemJSON.itemType, context.itemType, extraMap.itemType),
            itemTypeZh: (0, settings_1.getItemTypeLabel)((0, shared_1.firstValue)(itemJSON.itemType, context.itemType, extraMap.itemType) || ""),
            title: (0, shared_1.firstValue)(context.title, topItem.key),
            titleTranslation,
            creators: creatorsList.join(", "),
            collection: collectionsList.join("；"),
            tags: zoteroTagsList.join("；"),
            related: relatedList.join("；"),
            // Prefer a collection-specific select URI so Zotero opens the item inside its collection.
            itemLink: yield (0, paths_1.getBestItemLink)(topItem),
            pdfLink: yield (0, paths_1.getBestAttachmentLink)(topItem),
            qnkey: topItem.key,
            dateY: ((_a = (0, shared_1.cleanInline)(context.date).match(/(19|20)\d{2}/)) === null || _a === void 0 ? void 0 : _a[0]) || "",
            datetimeAdded: context.dateAdded,
            datetimeModified: context.dateModified,
            abstract,
            abstractNote: abstract,
            abstractTranslation,
        });
        return {
            context,
            creatorsList,
            zoteroTagsList,
            collectionsList,
        };
    });
}
function getVisibleFieldValue(fieldKey, context) {
    const value = (0, shared_1.cleanInline)(context[fieldKey] || "");
    if (!value) {
        return "";
    }
    if (fieldKey === "DOI") {
        return `[${value}](https://doi.org/${value})`;
    }
    if (fieldKey === "itemLink") {
        return `[My Library](${value})`;
    }
    if (fieldKey === "pdfLink") {
        return `[PDF](${value})`;
    }
    if (fieldKey === "url") {
        return `[Link](${value})`;
    }
    return (0, shared_1.escapeTableValue)(value);
}
function getHiddenFieldValue(fieldKey, context) {
    const value = (0, shared_1.cleanInline)(context[fieldKey] || "");
    if (!value) {
        return "";
    }
    if (fieldKey === "DOI") {
        return `[${value}](https://doi.org/${value})`;
    }
    if (fieldKey === "itemLink") {
        return `[My Library](${value})`;
    }
    if (fieldKey === "pdfLink") {
        return `[PDF](${value})`;
    }
    if (fieldKey === "url") {
        return `[Link](${value})`;
    }
    return value;
}
function buildMetadataCallout(visibleFields, context) {
    const strings = getObsidianNoteLocaleStrings();
    const rows = visibleFields
        .map((fieldKey) => {
        const value = getVisibleFieldValue(fieldKey, context);
        if (!value) {
            return "";
        }
        const label = (0, settings_1.getFieldLabel)(fieldKey);
        return `> |${label}|${value}|`;
    })
        .filter(Boolean);
    if (!rows.length) {
        return "";
    }
    return [
        `> [!info]+ <center>${strings.metadataTitle}</center>`,
        ">",
        `> |<div style="width: 5em">${strings.metadataKeyLabel}</div>|${strings.metadataValueLabel}|`,
        "> |--:|:--|",
        ...rows,
        "> ^Metadata",
    ].join("\n");
}
function buildTagsCallout(zoteroTagsList) {
    const { tagsTitle } = getObsidianNoteLocaleStrings();
    const lines = [
        `> [!example]- <center>${tagsTitle}</center>`,
        ">",
        "> - Obsidian: #literature #zotero",
    ];
    if (zoteroTagsList.length) {
        lines.push(`> - Zotero: ${zoteroTagsList.join("；")}`);
    }
    return lines.join("\n");
}
function buildAbstractCallout(title, text, type, emptyPlaceholder) {
    const strings = getObsidianNoteLocaleStrings();
    const lines = (0, shared_1.formatAbstractLines)(text);
    if (!lines.length) {
        lines.push(emptyPlaceholder || strings.emptyAbstract);
    }
    return [
        `> [!${type}]- <center>${title}</center>`,
        ">",
        ...lines.map((line) => `> ${line}`),
    ].join("\n");
}
function buildHiddenInfoCallout(hiddenFields, context) {
    const { hiddenInfoTitle } = getObsidianNoteLocaleStrings();
    const lines = hiddenFields
        .map((fieldKey) => {
        const value = getHiddenFieldValue(fieldKey, context);
        if (!value) {
            return "";
        }
        return `> ${fieldKey}:: ${value}`;
    })
        .filter(Boolean);
    if (!lines.length) {
        return "";
    }
    return [`> [!tldr]- <center>${hiddenInfoTitle}</center>`, ">", ...lines].join("\n");
}
function getDefaultUserSections() {
    const strings = getObsidianNoteLocaleStrings();
    return [
        strings.workspaceHeading,
        "",
        strings.summaryHeading,
        "",
        "- ",
        "",
        strings.problemHeading,
        "",
        "- ",
        "",
        strings.methodHeading,
        "",
        "- ",
        "",
        strings.conclusionHeading,
        "",
        "- ",
        "",
        strings.notesHeading,
        "",
        "",
        strings.questionsHeading,
        "",
        "- ",
        "",
        strings.relatedHeading,
        "",
        "- ",
    ].join("\n");
}
function escapeRegex(source) {
    return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function extractHeadingSection(markdown, heading) {
    var _a;
    const normalized = String(markdown || "").replace(/\r\n/g, "\n");
    const headingRegex = new RegExp(`(?:^|\\n)${escapeRegex(heading)}\\s*(?:\\n|$)([\\s\\S]*?)(?=\\n##\\s+|$)`);
    const match = normalized.match(headingRegex);
    return ((_a = match === null || match === void 0 ? void 0 : match[1]) === null || _a === void 0 ? void 0 : _a.trim()) || "";
}
function extractLegacySummaryValue(summaryBlock, label) {
    const regex = new RegExp(`^-\\s*${escapeRegex(label)}\\s*:?\\s*(.*)$`, "mi");
    const match = summaryBlock.match(regex);
    return (0, shared_1.cleanInline)((match === null || match === void 0 ? void 0 : match[1]) || "");
}
function normalizeLegacyUserSections(markdown) {
    if (!/^##\s+Reading Summary/m.test(markdown) ||
        !/^\s*-\s*One-sentence summary\s*:/m.test(markdown)) {
        return markdown;
    }
    const strings = getObsidianNoteLocaleStrings();
    const summaryBlock = extractHeadingSection(markdown, "## Reading Summary");
    const notesBlock = extractHeadingSection(markdown, "## Notes");
    const questionsBlock = extractHeadingSection(markdown, "## Questions");
    const relatedBlock = extractHeadingSection(markdown, "## Related");
    return [
        strings.workspaceHeading,
        "",
        strings.summaryHeading,
        "",
        `- ${extractLegacySummaryValue(summaryBlock, "One-sentence summary")}`,
        "",
        strings.problemHeading,
        "",
        `- ${extractLegacySummaryValue(summaryBlock, "Core problem")}`,
        "",
        strings.methodHeading,
        "",
        `- ${extractLegacySummaryValue(summaryBlock, "Main method")}`,
        "",
        strings.conclusionHeading,
        "",
        `- ${extractLegacySummaryValue(summaryBlock, "Key result")}`,
        "",
        strings.notesHeading,
        "",
        notesBlock,
        "",
        strings.questionsHeading,
        "",
        questionsBlock || "- ",
        "",
        strings.relatedHeading,
        "",
        relatedBlock || "- ",
    ].join("\n");
}
function stripFrontmatter(markdown) {
    return (0, shared_1.normalizeMarkdown)(markdown)
        .replace(/^---\n[\s\S]*?\n---\n*/m, "")
        .trim();
}
function extractMarkedBlock(markdown, startMarker, endMarker) {
    const normalized = (0, shared_1.normalizeMarkdown)(markdown);
    const startIndex = normalized.indexOf(startMarker);
    if (startIndex < 0) {
        return null;
    }
    const contentStart = startIndex + startMarker.length;
    const endIndex = normalized.indexOf(endMarker, contentStart);
    return normalized.slice(contentStart, endIndex >= 0 ? endIndex : undefined);
}
function extractUserSections(markdown) {
    const normalized = stripFrontmatter(markdown);
    if (!normalized) {
        return getDefaultUserSections();
    }
    const markedUserSections = extractMarkedBlock(normalized, USER_BLOCK_START, USER_BLOCK_END);
    if (markedUserSections !== null) {
        return (normalizeLegacyUserSections(markedUserSections.trim()) ||
            getDefaultUserSections());
    }
    const indices = getUserSectionMarkers()
        .map((marker) => normalized.indexOf(marker))
        .filter((index) => index >= 0)
        .sort((left, right) => left - right);
    if (!indices.length) {
        const strings = getObsidianNoteLocaleStrings();
        const looksLikeGeneratedLayout = /^---\n[\s\S]*?\n---/.test(normalized) ||
            /^#\s+/m.test(normalized) ||
            /> \[!info\].*<\/center>/i.test(normalized) ||
            new RegExp(`^##\\s+(${escapeRegex(strings.abstractTitle)}|Abstract)`, "m").test(normalized);
        return looksLikeGeneratedLayout ? getDefaultUserSections() : normalized;
    }
    const extracted = normalized.slice(indices[0] + 1).trim();
    return normalizeLegacyUserSections(extracted) || getDefaultUserSections();
}
function extractManagedObsidianUserMarkdown(markdown) {
    const normalized = stripFrontmatter(markdown);
    const hasUserStart = normalized.includes(USER_BLOCK_START);
    const hasUserEnd = normalized.includes(USER_BLOCK_END);
    if (hasUserStart !== hasUserEnd) {
        return null;
    }
    if (hasUserStart && hasUserEnd) {
        return extractUserSections(markdown);
    }
    const hasLegacyUserSections = getUserSectionMarkers().some((marker) => normalized.includes(marker));
    if (hasLegacyUserSections) {
        return extractUserSections(markdown);
    }
    return null;
}
