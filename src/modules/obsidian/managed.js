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
exports.extractManagedObsidianUserMarkdown = void 0;
exports.applyManagedObsidianFrontmatter = applyManagedObsidianFrontmatter;
exports.getChildNoteTags = getChildNoteTags;
exports.getManagedObsidianFileNameFresh = getManagedObsidianFileNameFresh;
exports.getMatchedChildNotes = getMatchedChildNotes;
exports.getManagedObsidianFileName = getManagedObsidianFileName;
exports.getManagedObsidianNoteForItem = getManagedObsidianNoteForItem;
exports.getManagedObsidianSourceHash = getManagedObsidianSourceHash;
exports.isManagedObsidianNote = isManagedObsidianNote;
exports.persistChildNoteExclusions = persistChildNoteExclusions;
exports.renderManagedObsidianNoteMarkdown = renderManagedObsidianNoteMarkdown;
const str_1 = require("../../utils/str");
const locale_1 = require("../../utils/locale");
const prefs_1 = require("../../utils/prefs");
const childNotes_1 = require("./childNotes");
const frontmatter_1 = require("./frontmatter");
const markdown_1 = require("./markdown");
Object.defineProperty(exports, "extractManagedObsidianUserMarkdown", { enumerable: true, get: function () { return markdown_1.extractManagedObsidianUserMarkdown; } });
const paths_1 = require("./paths");
const settings_1 = require("./settings");
const shared_1 = require("./shared");
function applyManagedObsidianFrontmatter(noteItem, meta) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const normalizedMeta = (0, frontmatter_1.normalizeFrontmatterObject)(meta);
        const topItem = (yield findManagedTopItemFresh(noteItem)) ||
            findManagedTopItem(noteItem) ||
            findManagedTopItemFromMeta(noteItem, normalizedMeta);
        if (!(noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote()) || !topItem || !topItem.isRegularItem() || !meta) {
            return false;
        }
        let dirty = false;
        if ((0, shared_1.hasFrontmatterKey)(normalizedMeta, "reading_status") ||
            (0, shared_1.hasFrontmatterKey)(normalizedMeta, "status")) {
            const currentExtra = (0, shared_1.getFieldSafe)(topItem, "extra");
            const nextExtra = (0, shared_1.updateExtraField)(currentExtra, "reading_status", (0, shared_1.cleanInline)((0, shared_1.firstValue)(normalizedMeta.reading_status, normalizedMeta.status)), ["reading_status", "status"]);
            if (nextExtra !== currentExtra) {
                topItem.setField("extra", nextExtra);
                dirty = true;
            }
        }
        if ((0, shared_1.hasFrontmatterKey)(normalizedMeta, "rating")) {
            const nextRating = (0, frontmatter_1.normalizeManagedRating)(normalizedMeta.rating);
            const currentRating = (0, frontmatter_1.normalizeManagedRating)((0, shared_1.getFieldSafe)(topItem, "rating"));
            if (String(nextRating) !== String(currentRating)) {
                const nextRatingValue = nextRating === "" ? "" : String(nextRating);
                const currentExtra = (0, shared_1.getFieldSafe)(topItem, "extra");
                const ratingFieldID = typeof ((_a = Zotero.ItemFields) === null || _a === void 0 ? void 0 : _a.getID) === "function"
                    ? Zotero.ItemFields.getID("rating")
                    : 0;
                const canUseNativeRating = Boolean(ratingFieldID) &&
                    typeof ((_b = Zotero.ItemFields) === null || _b === void 0 ? void 0 : _b.isValidForType) === "function" &&
                    Zotero.ItemFields.isValidForType(ratingFieldID, topItem.itemTypeID);
                try {
                    if (canUseNativeRating) {
                        topItem.setField("rating", nextRatingValue);
                        const nextExtra = (0, shared_1.updateExtraField)(currentExtra, "rating", "");
                        if (nextExtra !== currentExtra) {
                            topItem.setField("extra", nextExtra);
                        }
                        dirty = true;
                    }
                    else {
                        const nextExtra = (0, shared_1.updateExtraField)(currentExtra, "rating", nextRatingValue);
                        if (nextExtra !== currentExtra) {
                            topItem.setField("extra", nextExtra);
                            dirty = true;
                        }
                    }
                }
                catch (e) {
                    const nextExtra = (0, shared_1.updateExtraField)(currentExtra, "rating", nextRatingValue);
                    if (nextExtra !== currentExtra) {
                        topItem.setField("extra", nextExtra);
                        dirty = true;
                    }
                }
            }
        }
        if ((0, shared_1.hasFrontmatterKey)(normalizedMeta, "tags") ||
            (0, shared_1.hasFrontmatterKey)(normalizedMeta, "zotero_tags")) {
            // `zotero_tags` is the authoritative back-sync surface when present.
            // `tags` remains useful for Obsidian-native organization and as a
            // compatibility fallback for older files that do not include
            // `zotero_tags`.
            const currentTags = topItem
                .getTags()
                .map((tag) => (0, shared_1.cleanInline)(tag.tag))
                .filter(Boolean);
            const currentTagLookup = new Map(currentTags.map((tag) => [(0, frontmatter_1.normalizeManagedTag)(tag).toLowerCase(), tag]));
            const desiredTags = (0, shared_1.hasFrontmatterKey)(normalizedMeta, "zotero_tags")
                ? (0, frontmatter_1.getManagedFrontmatterNonSystemTags)(normalizedMeta.zotero_tags)
                : (0, frontmatter_1.getManagedFrontmatterNonSystemTags)(normalizedMeta.tags);
            const desiredTagLookup = new Set(desiredTags.map((tag) => tag.toLowerCase()));
            for (const currentTag of currentTags) {
                const normalizedTag = (0, frontmatter_1.normalizeManagedTag)(currentTag).toLowerCase();
                if (frontmatter_1.MANAGED_FRONTMATTER_SYSTEM_TAGS.has(normalizedTag) ||
                    desiredTagLookup.has(normalizedTag)) {
                    continue;
                }
                topItem.removeTag(currentTag);
                dirty = true;
            }
            for (const desiredTag of desiredTags) {
                if (currentTagLookup.has(desiredTag.toLowerCase())) {
                    continue;
                }
                topItem.addTag(desiredTag, 0);
                dirty = true;
            }
        }
        if (!dirty) {
            return false;
        }
        yield topItem.saveTx({
            notifierData: {
                skipOB: true,
            },
        });
        return true;
    });
}
function findManagedTopItemFromMeta(noteItem, meta) {
    const topItem = getManagedNoteParentItem(noteItem);
    if (!topItem) {
        return false;
    }
    const normalizedMeta = (0, frontmatter_1.normalizeFrontmatterObject)(meta);
    if (!normalizedMeta.bridge_managed) {
        return false;
    }
    const topItemKey = (0, shared_1.cleanInline)(String(normalizedMeta.zotero_key || ""));
    if (topItemKey && topItemKey !== topItem.key) {
        return false;
    }
    return topItem;
}
function getManagedAnnotationItems(topItem) {
    const attachmentIDs = typeof topItem.getAttachments === "function"
        ? topItem.getAttachments()
        : [];
    return attachmentIDs
        .map((itemID) => Zotero.Items.get(itemID))
        .filter((item) => Boolean((item === null || item === void 0 ? void 0 : item.isAttachment) &&
        item.isAttachment() &&
        typeof item.isPDFAttachment === "function" &&
        item.isPDFAttachment()))
        .flatMap((attachmentItem) => typeof attachmentItem.getAnnotations === "function"
        ? attachmentItem.getAnnotations()
        : [])
        .filter((annotationItem) => Boolean((annotationItem === null || annotationItem === void 0 ? void 0 : annotationItem.isAnnotation) && annotationItem.isAnnotation()));
}
function buildManagedAnnotationSourceSnapshot(topItem) {
    return getManagedAnnotationItems(topItem)
        .map((annotationItem) => ({
        id: annotationItem.id,
        key: annotationItem.key,
        version: annotationItem.version,
        dateModified: (0, shared_1.cleanInline)(annotationItem.dateModified),
        type: (0, shared_1.cleanInline)(annotationItem.annotationType),
        pageLabel: (0, shared_1.cleanInline)(annotationItem.annotationPageLabel),
        color: (0, shared_1.cleanInline)(annotationItem.annotationColor),
        sortIndex: (0, shared_1.cleanInline)(annotationItem.annotationSortIndex),
        text: (0, shared_1.cleanInline)(annotationItem.annotationText),
        comment: (0, shared_1.cleanInline)(annotationItem.annotationComment),
        tags: annotationItem
            .getTags()
            .map((tag) => (0, shared_1.cleanInline)(tag.tag))
            .filter(Boolean)
            .sort(),
    }))
        .sort((left, right) => {
        const leftSort = `${left.pageLabel} ${left.sortIndex} ${left.key}`;
        const rightSort = `${right.pageLabel} ${right.sortIndex} ${right.key}`;
        return leftSort.localeCompare(rightSort);
    });
}
function saveAnnotationImageToAssets(annotationItem, attachmentDir, attachmentFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const annotationJSON = yield Zotero.Annotations.toJSON(annotationItem);
            const imageData = annotationJSON === null || annotationJSON === void 0 ? void 0 : annotationJSON.image;
            if (!imageData || typeof imageData !== "string") {
                return "";
            }
            const match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!match) {
                return "";
            }
            const ext = match[1] === "jpeg" ? "jpg" : match[1];
            const fileName = `annotation-${annotationItem.key}.${ext}`;
            const absPath = (0, str_1.formatPath)((0, str_1.jointPath)(attachmentDir, fileName));
            if (!(yield (0, str_1.fileExists)(absPath))) {
                const binaryStr = atob(match[2]);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                yield Zotero.File.createDirectoryIfMissingAsync(attachmentDir);
                yield IOUtils.write(absPath, bytes);
            }
            const relativePath = attachmentFolder
                ? `${attachmentFolder}/${fileName}`
                : fileName;
            return Zotero.isWin
                ? Zotero.File.normalizeToUnix(relativePath)
                : relativePath;
        }
        catch (e) {
            ztoolkit.log("[ObsidianBridge] saveAnnotationImageToAssets failed", e);
            return "";
        }
    });
}
function renderManagedAnnotationsMarkdown(topItem, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const snapshot = buildManagedAnnotationSourceSnapshot(topItem);
        const annotationItems = getManagedAnnotationItems(topItem);
        const annotationMap = new Map();
        for (const item of annotationItems) {
            annotationMap.set(item.key, item);
        }
        const blocks = [];
        for (const annotation of snapshot) {
            const titleParts = [
                annotation.pageLabel ? `p.${annotation.pageLabel}` : "",
                annotation.type ? (0, shared_1.cleanInline)(annotation.type) : "",
            ].filter(Boolean);
            const heading = `### ${titleParts.join(" · ") || annotation.key}`;
            const sectionBlocks = [heading];
            if (annotation.text) {
                sectionBlocks.push(annotation.text
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .map((line) => `> ${line}`)
                    .join("\n"));
            }
            else if (annotation.type === "image" &&
                (options === null || options === void 0 ? void 0 : options.attachmentDir)) {
                const annotationItem = annotationMap.get(annotation.key);
                if (annotationItem) {
                    const imagePath = yield saveAnnotationImageToAssets(annotationItem, options.attachmentDir, options.attachmentFolder || "");
                    if (imagePath) {
                        sectionBlocks.push(`![p.${annotation.pageLabel || annotation.key}](${imagePath})`);
                    }
                    else {
                        sectionBlocks.push("> [Image annotation]");
                    }
                }
                else {
                    sectionBlocks.push("> [Image annotation]");
                }
            }
            else if (annotation.type === "image") {
                sectionBlocks.push("> [Image annotation]");
            }
            if (annotation.comment) {
                sectionBlocks.push(annotation.comment);
            }
            if (annotation.tags.length) {
                sectionBlocks.push(`Tags: ${annotation.tags.map((tag) => `\`${tag}\``).join(", ")}`);
            }
            blocks.push(sectionBlocks.join("\n\n").trim());
        }
        if (!blocks.length) {
            return "";
        }
        return ["## Annotations", ...blocks].join("\n\n");
    });
}
function getChildNoteTags(noteItem) {
    return noteItem
        .getTags()
        .map((tag) => (0, shared_1.cleanInline)(tag.tag))
        .filter(Boolean)
        .sort();
}
function getManagedNoteParentItem(noteItem) {
    var _a;
    if (!(noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote())) {
        return false;
    }
    if ((_a = noteItem.parentItem) === null || _a === void 0 ? void 0 : _a.isRegularItem()) {
        return noteItem.parentItem;
    }
    if (!noteItem.parentID) {
        return false;
    }
    const parentItem = Zotero.Items.get(noteItem.parentID);
    return (parentItem === null || parentItem === void 0 ? void 0 : parentItem.isRegularItem()) ? parentItem : false;
}
function getMatchedChildNotes(topItem, managedNoteItem, config = (0, childNotes_1.getChildNoteBridgeConfig)()) {
    if (!config.matchTags.length) {
        return [];
    }
    const managedNoteId = managedNoteItem ? managedNoteItem.id : 0;
    const targetTags = new Set(config.matchTags);
    return topItem
        .getNotes()
        .filter((noteID) => Number(noteID) && Number(noteID) !== Number(managedNoteId))
        .map((noteID) => Zotero.Items.get(noteID))
        .filter((item) => Boolean((item === null || item === void 0 ? void 0 : item.isNote) && item.isNote()))
        .filter((noteItem) => getChildNoteTags(noteItem).some((tag) => targetTags.has((0, childNotes_1.normalizeChildNoteTag)(tag))));
}
function getBridgedChildNotes(topItem, managedNoteItem, options = {}) {
    const matchedNotes = getMatchedChildNotes(topItem, managedNoteItem);
    if (matchedNotes.length <= 1) {
        return matchedNotes;
    }
    if (Array.isArray(options.selectedNoteKeys)) {
        const selectedNoteKeys = new Set(options.selectedNoteKeys.map((noteKey) => (0, shared_1.cleanInline)(noteKey)));
        return matchedNotes.filter((noteItem) => selectedNoteKeys.has(noteItem.key));
    }
    const excludedKeys = new Set((0, childNotes_1.getChildNoteExcludeMap)()[(0, settings_1.getItemMapKey)(topItem)] || []);
    return matchedNotes.filter((noteItem) => !excludedKeys.has(noteItem.key));
}
function persistChildNoteExclusions(topItem, matchedNotes, selectedNoteKeys) {
    const itemMapKey = (0, settings_1.getItemMapKey)(topItem);
    const excludeMap = (0, childNotes_1.getChildNoteExcludeMap)();
    if (matchedNotes.length <= 1) {
        delete excludeMap[itemMapKey];
        (0, childNotes_1.setChildNoteExcludeMap)(excludeMap);
        return;
    }
    const selectedKeys = new Set(selectedNoteKeys.map((noteKey) => (0, shared_1.cleanInline)(noteKey)));
    const excludedKeys = matchedNotes
        .map((noteItem) => noteItem.key)
        .filter((noteKey) => !selectedKeys.has(noteKey));
    if (excludedKeys.length) {
        excludeMap[itemMapKey] = excludedKeys;
    }
    else {
        delete excludeMap[itemMapKey];
    }
    (0, childNotes_1.setChildNoteExcludeMap)(excludeMap);
}
function buildManagedChildNoteSourceSnapshot(topItem, managedNoteItem) {
    return getBridgedChildNotes(topItem, managedNoteItem).map((noteItem) => ({
        id: noteItem.id,
        key: noteItem.key,
        version: noteItem.version,
        dateModified: (0, shared_1.cleanInline)(noteItem.dateModified),
        title: (0, childNotes_1.getChildNoteDisplayTitle)(noteItem, topItem),
        tags: getChildNoteTags(noteItem),
        noteHash: Zotero.Utilities.Internal.md5(noteItem.getNote() || "", false),
    }));
}
function renderBridgedChildNotesMarkdown(topItem, managedNoteItem, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const bridgedNotes = getBridgedChildNotes(topItem, managedNoteItem);
        if (!bridgedNotes.length) {
            return "";
        }
        const renderedBlocks = [];
        for (const childNote of bridgedNotes) {
            const rendered = yield addon.api.convert.note2md(childNote, options.noteDir, {
                keepNoteLink: false,
                withYAMLHeader: false,
                attachmentDir: options.attachmentDir,
                attachmentFolder: options.attachmentFolder,
            });
            const cleaned = (0, markdown_1.stripFrontmatter)(rendered);
            if (!cleaned) {
                continue;
            }
            const normalized = (0, childNotes_1.ensureChildNoteHeading)(childNote, topItem, cleaned);
            renderedBlocks.push(normalized);
        }
        if (!renderedBlocks.length) {
            return "";
        }
        return ["---", ...renderedBlocks].join("\n\n");
    });
}
function findManagedTopItem(noteItem) {
    const topItem = getManagedNoteParentItem(noteItem);
    if (!topItem) {
        return false;
    }
    const itemNoteMap = (0, settings_1.getObsidianItemNoteMap)();
    return itemNoteMap[(0, settings_1.getItemMapKey)(topItem)] === noteItem.key ? topItem : false;
}
function findManagedTopItemFresh(noteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote()) || !noteItem.parentID) {
            return false;
        }
        const topItem = (yield Zotero.Items.getAsync(noteItem.parentID, {
            noCache: true,
        }));
        if (!topItem || !topItem.isRegularItem()) {
            return false;
        }
        const itemNoteMap = (0, settings_1.getObsidianItemNoteMap)();
        return itemNoteMap[(0, settings_1.getItemMapKey)(topItem)] === noteItem.key ? topItem : false;
    });
}
function getManagedTopItemForRelatedItem(item) {
    var _a, _b, _c, _d;
    if (!item) {
        return false;
    }
    if (item.isRegularItem()) {
        return item;
    }
    if (item.isNote() && ((_a = item.parentItem) === null || _a === void 0 ? void 0 : _a.isRegularItem())) {
        return item.parentItem;
    }
    if (typeof item.isAttachment === "function" &&
        item.isAttachment() &&
        ((_b = item.parentItem) === null || _b === void 0 ? void 0 : _b.isRegularItem())) {
        return item.parentItem;
    }
    if (typeof item.isAnnotation === "function" &&
        item.isAnnotation() &&
        ((_d = (_c = item.parentItem) === null || _c === void 0 ? void 0 : _c.parentItem) === null || _d === void 0 ? void 0 : _d.isRegularItem())) {
        return item.parentItem.parentItem;
    }
    return false;
}
function isManagedObsidianNote(noteItem) {
    return Boolean(findManagedTopItem(noteItem));
}
function getManagedObsidianNoteForItem(item) {
    if (item && item.isNote && item.isNote() && isManagedObsidianNote(item)) {
        return item;
    }
    const topItem = getManagedTopItemForRelatedItem(item);
    return topItem ? (0, paths_1.findExistingObsidianNote)(topItem) : false;
}
function getManagedObsidianFileName(noteItem) {
    const topItem = findManagedTopItem(noteItem);
    if (!topItem) {
        return "";
    }
    return ((0, paths_1.buildManagedObsidianFileName)(topItem, noteItem) ||
        (0, paths_1.ensureMarkdownExtension)(`${(0, paths_1.sanitizeFileNamePart)((0, shared_1.getFieldSafe)(topItem, "title") || topItem.key) ||
            topItem.key} -- ${(0, paths_1.getManagedObsidianUniqueKey)(topItem) || topItem.key}`));
}
function getManagedObsidianFileNameFresh(noteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const topItem = yield findManagedTopItemFresh(noteItem);
        if (!topItem) {
            return "";
        }
        return ((0, paths_1.buildManagedObsidianFileName)(topItem, noteItem) ||
            (0, paths_1.ensureMarkdownExtension)(`${(0, paths_1.sanitizeFileNamePart)((0, shared_1.getFieldSafe)(topItem, "title") || topItem.key) ||
                topItem.key} -- ${(0, paths_1.getManagedObsidianUniqueKey)(topItem) || topItem.key}`));
    });
}
function getManagedObsidianSourceHash(noteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const topItem = (yield findManagedTopItemFresh(noteItem)) ||
            findManagedTopItem(noteItem) ||
            getManagedNoteParentItem(noteItem);
        if (!topItem) {
            return "";
        }
        const { context, creatorsList, zoteroTagsList, collectionsList } = yield (0, markdown_1.buildItemContext)(topItem);
        const metadataPreset = (0, settings_1.getMetadataPreset)();
        const contentConfig = (0, settings_1.getManagedNoteContentConfig)();
        const updateStrategy = (0, settings_1.normalizeObsidianUpdateStrategy)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || ""));
        const payload = {
            topItem: {
                id: topItem.id,
                key: topItem.key,
                libraryID: topItem.libraryID,
                version: topItem.version,
                dateModified: (0, shared_1.cleanInline)(topItem.dateModified),
            },
            context,
            creatorsList: [...creatorsList].sort(),
            zoteroTagsList: [...zoteroTagsList].map((tag) => (0, shared_1.cleanInline)(tag)).sort(),
            collectionsList: [...collectionsList]
                .map((name) => (0, shared_1.cleanInline)(name))
                .sort(),
            metadataPreset,
            frontmatterFields: (0, settings_1.getManagedFrontmatterFields)(),
            visibleFields: (0, settings_1.getConfiguredFields)(metadataPreset.visible, context.itemType),
            hiddenFields: (0, settings_1.getConfiguredFields)(metadataPreset.hidden, context.itemType),
            contentConfig,
            updateStrategy,
            annotations: contentConfig.includeAnnotations
                ? buildManagedAnnotationSourceSnapshot(topItem)
                : [],
            childNoteTags: (0, childNotes_1.getChildNoteBridgeConfig)().matchTags,
            bridgedChildNotes: buildManagedChildNoteSourceSnapshot(topItem, noteItem),
        };
        return Zotero.Utilities.Internal.md5((0, shared_1.stableJSONStringify)(payload), false);
    });
}
function renderManagedObsidianNoteMarkdown(noteItem, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const topItem = (yield findManagedTopItemFresh(noteItem)) ||
            findManagedTopItem(noteItem) ||
            getManagedNoteParentItem(noteItem);
        if (!topItem) {
            return "";
        }
        const { context, creatorsList, zoteroTagsList, collectionsList } = yield (0, markdown_1.buildItemContext)(topItem);
        const metadataPreset = (0, settings_1.getMetadataPreset)();
        const contentConfig = (0, settings_1.getManagedNoteContentConfig)();
        const updateStrategy = (0, settings_1.normalizeObsidianUpdateStrategy)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || ""));
        const visibleFields = (0, settings_1.getConfiguredFields)(metadataPreset.visible, context.itemType);
        const hiddenFields = (0, settings_1.getConfiguredFields)(metadataPreset.hidden, context.itemType);
        const existingMarkdown = updateStrategy !== "overwrite" &&
            options.targetPath &&
            (yield (0, str_1.fileExists)(options.targetPath))
            ? (yield Zotero.File.getContentsAsync(options.targetPath, "utf-8"))
            : "";
        const existingFrontmatter = updateStrategy === "overwrite"
            ? {}
            : options.cachedYAMLHeader || (0, frontmatter_1.parseMarkdownFrontmatter)(existingMarkdown);
        const noteMarkdown = yield addon.api.convert.note2md(noteItem, options.noteDir, {
            keepNoteLink: false,
            withYAMLHeader: false,
            attachmentDir: options.attachmentDir,
            attachmentFolder: options.attachmentFolder,
        });
        const noteUserSections = (0, markdown_1.extractUserSections)(noteMarkdown);
        const existingUserSections = existingMarkdown
            ? (0, markdown_1.extractManagedObsidianUserMarkdown)(existingMarkdown)
            : null;
        const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
        const currentNoteMd5 = Zotero.Utilities.Internal.md5(noteItem.getNote(), false);
        const shouldPreferNoteUserSections = updateStrategy === "overwrite" ||
            !existingMarkdown ||
            !existingUserSections ||
            (addon.api.sync.isSyncNote(noteItem.id) &&
                Boolean(syncStatus.noteMd5) &&
                currentNoteMd5 !== syncStatus.noteMd5);
        const userSections = shouldPreferNoteUserSections
            ? noteUserSections
            : existingUserSections;
        const annotationsMarkdown = contentConfig.includeAnnotations
            ? yield renderManagedAnnotationsMarkdown(topItem, {
                attachmentDir: options.attachmentDir,
                attachmentFolder: options.attachmentFolder,
            })
            : "";
        const aiChildNotesMarkdown = yield renderBridgedChildNotesMarkdown(topItem, noteItem, options);
        const managedFrontmatter = (0, frontmatter_1.mergeManagedFrontmatter)(existingFrontmatter, (0, frontmatter_1.buildManagedFrontmatterData)(context, creatorsList, zoteroTagsList, collectionsList, topItem, noteItem, existingFrontmatter));
        const generatedBlock = [
            `# ${context.title}`,
            contentConfig.includeMetadata
                ? (0, markdown_1.buildMetadataCallout)(visibleFields, context)
                : "",
            contentConfig.includeMetadata ? (0, markdown_1.buildTagsCallout)(zoteroTagsList) : "",
            contentConfig.includeAbstract
                ? (0, markdown_1.buildAbstractCallout)((0, locale_1.getString)("obsidian-note-abstract-title"), context.abstract, "quote", (0, locale_1.getString)("obsidian-note-emptyAbstract"))
                : "",
            contentConfig.includeAbstract
                ? (0, markdown_1.buildAbstractCallout)((0, locale_1.getString)("obsidian-note-abstractTranslation-title"), context.abstractTranslation, "note", (0, locale_1.getString)("obsidian-note-emptyAbstractTranslation"))
                : "",
            annotationsMarkdown,
            contentConfig.includeHiddenInfo
                ? (0, markdown_1.buildHiddenInfoCallout)(hiddenFields, context)
                : "",
            contentConfig.includeChildNotes ? aiChildNotesMarkdown : "",
        ]
            .map((block) => String(block || "").trim())
            .filter(Boolean)
            .join("\n\n");
        const blocks = [
            (0, frontmatter_1.buildFrontmatter)(managedFrontmatter),
            markdown_1.GENERATED_BLOCK_START,
            generatedBlock,
            markdown_1.GENERATED_BLOCK_END,
            markdown_1.USER_BLOCK_START,
            userSections,
            markdown_1.USER_BLOCK_END,
        ];
        return blocks
            .map((block) => String(block || "").trim())
            .filter(Boolean)
            .join("\n\n");
    });
}
