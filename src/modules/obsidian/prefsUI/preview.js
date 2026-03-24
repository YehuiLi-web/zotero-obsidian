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
exports.getPreviewSourceItem = getPreviewSourceItem;
exports.buildPreviewSignature = buildPreviewSignature;
exports.renderPreviewPanel = renderPreviewPanel;
exports.markPreviewStale = markPreviewStale;
exports.renderFileNamePreview = renderFileNamePreview;
exports.renderContentSummary = renderContentSummary;
exports.renderSyncSummary = renderSyncSummary;
exports.switchObsidianPrefsTab = switchObsidianPrefsTab;
exports.generateObsidianPreview = generateObsidianPreview;
const locale_1 = require("../../../utils/locale");
const prefs_1 = require("../../../utils/prefs");
const str_1 = require("../../../utils/str");
const childNotes_1 = require("../childNotes");
const frontmatter_1 = require("../frontmatter");
const markdown_1 = require("../markdown");
const paths_1 = require("../paths");
const shared_1 = require("../shared");
const settings_1 = require("../settings");
const managed_1 = require("../managed");
const state_1 = require("./state");
const uiIds_1 = require("./uiIds");
const helpers_1 = require("./helpers");
const childNotes_2 = require("../childNotes");
function getScopeLabel(scope) {
    switch ((0, settings_1.normalizeObsidianSyncScope)(scope)) {
        case "currentList":
            return (0, locale_1.getString)("obsidian-syncScope-currentList");
        case "library":
            return (0, locale_1.getString)("obsidian-syncScope-library");
        default:
            return (0, locale_1.getString)("obsidian-syncScope-selection");
    }
}
function getUpdateStrategyLabel(strategy) {
    switch ((0, settings_1.normalizeObsidianUpdateStrategy)(strategy)) {
        case "overwrite":
            return (0, helpers_1.uiText)("覆盖全部内容", "Overwrite everything");
        case "skip":
            return (0, helpers_1.uiText)("跳过已有笔记", "Skip existing notes");
        default:
            return (0, helpers_1.uiText)("只更新托管区", "Update managed blocks only");
    }
}
function getEnabledContentLabels() {
    const content = (0, settings_1.getManagedNoteContentConfig)();
    const labels = [];
    if (content.includeMetadata) {
        labels.push((0, helpers_1.uiText)("元数据", "Metadata"));
    }
    if (content.includeAbstract) {
        labels.push("Abstract");
    }
    if (content.includeAnnotations) {
        labels.push((0, helpers_1.uiText)("PDF 批注", "PDF annotations"));
    }
    if (content.includeHiddenInfo) {
        labels.push((0, helpers_1.uiText)("隐藏字段", "Hidden fields"));
    }
    if (content.includeChildNotes) {
        labels.push((0, helpers_1.uiText)("子笔记", "Child notes"));
    }
    labels.push((0, helpers_1.uiText)("手写笔记区", "My notes"));
    return labels;
}
function getEnabledTranslationLabels() {
    const translation = (0, settings_1.getMissingMetadataTranslationConfig)();
    if (!translation.enabled) {
        return [];
    }
    const labels = [];
    if (translation.includeTitle) {
        labels.push((0, helpers_1.uiText)("标题翻译", "title translations"));
    }
    if (translation.includeAbstract) {
        labels.push((0, helpers_1.uiText)("摘要翻译", "abstract translations"));
    }
    return labels;
}
function resolvePreviewTopItem(item) {
    var _a, _b, _c, _d;
    if (!item) {
        return false;
    }
    if (typeof item.isRegularItem === "function" && item.isRegularItem()) {
        return item;
    }
    if (typeof item.isNote === "function" && item.isNote()) {
        return ((_a = item.parentItem) === null || _a === void 0 ? void 0 : _a.isRegularItem()) ? item.parentItem : false;
    }
    if (typeof item.isAttachment === "function" && item.isAttachment()) {
        return ((_b = item.parentItem) === null || _b === void 0 ? void 0 : _b.isRegularItem()) ? item.parentItem : false;
    }
    if (typeof item.isAnnotation === "function" && item.isAnnotation()) {
        return ((_d = (_c = item.parentItem) === null || _c === void 0 ? void 0 : _c.parentItem) === null || _d === void 0 ? void 0 : _d.isRegularItem())
            ? item.parentItem.parentItem
            : false;
    }
    return false;
}
function getPreviewSourceItem() {
    var _a, _b, _c, _d;
    const mainWindow = Zotero.getMainWindow();
    const selectedItems = ((_b = (_a = mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.ZoteroPane) === null || _a === void 0 ? void 0 : _a.getSelectedItems) === null || _b === void 0 ? void 0 : _b.call(_a)) || [];
    for (const item of selectedItems) {
        const topItem = resolvePreviewTopItem(item);
        if (topItem) {
            return topItem;
        }
    }
    try {
        const selectedTabID = (_c = mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.Zotero_Tabs) === null || _c === void 0 ? void 0 : _c.selectedID;
        const reader = selectedTabID && typeof ((_d = Zotero.Reader) === null || _d === void 0 ? void 0 : _d.getByTabID) === "function"
            ? Zotero.Reader.getByTabID(selectedTabID)
            : null;
        const readerItem = (reader === null || reader === void 0 ? void 0 : reader.itemID) ? Zotero.Items.get(reader.itemID) : false;
        return resolvePreviewTopItem(readerItem);
    }
    catch (e) {
        return false;
    }
}
function getPreviewFallbackFileNameContext() {
    return {
        title: "Attention Is All You Need",
        libraryID: "1",
        key: "vaswani2017attention",
        uniqueKey: "4F7C8A21B3",
        noteKey: "preview",
        year: "2017",
        firstCreator: "Vaswani",
        creators: "Vaswani, Shazeer, Parmar",
        citationKey: "vaswani2017attention",
        publication: "NIPS",
        itemType: "journalArticle",
    };
}
function getPreviewNoteItem(topItem, existingNoteItem) {
    if (existingNoteItem && existingNoteItem.isNote()) {
        return existingNoteItem;
    }
    return {
        id: 0,
        key: `preview-${topItem.key}`,
        version: topItem.version,
        libraryID: topItem.libraryID,
    };
}
function getPreviewPathOptions() {
    const { notesDir, assetsDir } = (0, helpers_1.getObsidianResolvedPaths)();
    const noteDir = notesDir || (0, helpers_1.uiText)("notes", "notes");
    const attachmentDir = assetsDir ||
        (0, str_1.jointPath)(PathUtils.parent(noteDir) || noteDir, "assets", "zotero");
    return {
        noteDir,
        attachmentDir,
        attachmentFolder: (0, paths_1.getAttachmentRelativeDir)(noteDir, attachmentDir),
    };
}
function getManagedAnnotationPreviewItems(topItem) {
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
function buildAnnotationPreviewMarkdown(topItem) {
    const blocks = getManagedAnnotationPreviewItems(topItem)
        .map((annotationItem) => {
        const titleParts = [
            (0, shared_1.cleanInline)(annotationItem.annotationPageLabel)
                ? `p.${(0, shared_1.cleanInline)(annotationItem.annotationPageLabel)}`
                : "",
            (0, shared_1.cleanInline)(annotationItem.annotationType),
        ].filter(Boolean);
        const heading = `### ${titleParts.join(" · ") || annotationItem.key}`;
        const sectionBlocks = [heading];
        if (annotationItem.annotationText) {
            sectionBlocks.push((0, shared_1.cleanInline)(annotationItem.annotationText)
                .split(/\r?\n/)
                .filter(Boolean)
                .map((line) => `> ${line}`)
                .join("\n"));
        }
        else if (annotationItem.annotationType === "image") {
            sectionBlocks.push(`![p.${(0, shared_1.cleanInline)(annotationItem.annotationPageLabel) ||
                annotationItem.key}](../assets/zotero/annotation-${annotationItem.key}.png)`);
        }
        if (annotationItem.annotationComment) {
            sectionBlocks.push((0, shared_1.cleanInline)(annotationItem.annotationComment));
        }
        const tagList = annotationItem
            .getTags()
            .map((tag) => (0, shared_1.cleanInline)(tag.tag))
            .filter(Boolean);
        if (tagList.length) {
            sectionBlocks.push(`Tags: ${tagList.map((tag) => `\`${tag}\``).join(", ")}`);
        }
        return sectionBlocks.join("\n\n").trim();
    })
        .filter(Boolean);
    if (!blocks.length) {
        return "";
    }
    return ["## Annotations", ...blocks].join("\n\n");
}
function renderChildNotesPreviewMarkdown(topItem, previewNoteItem, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const bridgedNotes = (0, managed_1.getMatchedChildNotes)(topItem, previewNoteItem);
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
            renderedBlocks.push((0, childNotes_2.ensureChildNoteHeading)(childNote, topItem, cleaned));
        }
        if (!renderedBlocks.length) {
            return "";
        }
        return ["---", ...renderedBlocks].join("\n\n");
    });
}
function getPreviewUserSections(topItem, previewNoteItem, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((previewNoteItem === null || previewNoteItem === void 0 ? void 0 : previewNoteItem.id) && typeof previewNoteItem.isNote === "function") {
            try {
                const existingMarkdown = yield addon.api.convert.note2md(previewNoteItem, options.noteDir, {
                    keepNoteLink: false,
                    withYAMLHeader: false,
                    attachmentDir: options.attachmentDir,
                    attachmentFolder: options.attachmentFolder,
                });
                return (0, markdown_1.extractUserSections)(existingMarkdown);
            }
            catch (e) {
                ztoolkit.log("[obsidian preview existing note]", e);
            }
        }
        try {
            const templateHTML = yield addon.api.template.runItemTemplate((0, settings_1.resolveObsidianItemTemplateName)(), {
                itemIds: [topItem.id],
                dryRun: true,
            });
            const templateMarkdown = yield addon.api.convert.html2md(templateHTML || "");
            return (0, markdown_1.extractUserSections)(templateMarkdown);
        }
        catch (e) {
            ztoolkit.log("[obsidian preview template]", e);
            return (0, markdown_1.extractUserSections)("");
        }
    });
}
function buildPreviewSignature(topItem) {
    const targetItem = topItem || undefined;
    const { notesDir, assetsDir } = (0, helpers_1.getObsidianResolvedPaths)();
    return JSON.stringify({
        itemID: (targetItem === null || targetItem === void 0 ? void 0 : targetItem.id) || 0,
        itemVersion: (targetItem === null || targetItem === void 0 ? void 0 : targetItem.version) || 0,
        fileNameTemplate: (0, paths_1.getManagedFileNamePattern)(),
        itemTemplate: (0, settings_1.resolveObsidianItemTemplateName)(),
        frontmatterFields: (0, settings_1.getManagedFrontmatterFields)(),
        metadataPreset: (0, settings_1.getMetadataPresetLibrary)().activePresetId,
        content: (0, settings_1.getManagedNoteContentConfig)(),
        childNoteTags: (0, settings_1.getStringPrefOrDefault)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNotes_1.DEFAULT_CHILD_NOTE_TAGS.join(", ")),
        notesDir,
        assetsDir,
        updateStrategy: (0, settings_1.normalizeObsidianUpdateStrategy)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || "")),
    });
}
function renderPreviewPanel() {
    const meta = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_PREVIEW_META_ID);
    const file = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_PREVIEW_FILE_ID);
    const frontmatter = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_PREVIEW_FRONTMATTER_ID);
    const body = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_PREVIEW_BODY_ID);
    const trigger = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_PREVIEW_TRIGGER_ID);
    if (!meta || !file || !frontmatter || !body || !trigger) {
        return;
    }
    const preview = state_1.obsidianPrefsState.preview;
    trigger.disabled = preview.status === "loading";
    trigger.textContent =
        preview.status === "loading"
            ? (0, helpers_1.uiText)("正在生成…", "Generating...")
            : (0, helpers_1.uiText)("生成预览", "Generate Preview");
    meta.className = `ob-bridge-preview-meta ob-bridge-preview-meta--${preview.status}`;
    const fallbackMessage = (0, helpers_1.uiText)("请选择一篇文献后生成真实预览。", "Select an item to generate a real preview.");
    meta.textContent = [preview.sourceLabel, preview.message || fallbackMessage]
        .filter(Boolean)
        .join(" · ");
    file.textContent =
        preview.fileName || (0, helpers_1.uiText)("尚未生成文件名预览", "No filename preview yet");
    frontmatter.textContent =
        preview.frontmatter ||
            (0, helpers_1.uiText)("这里会显示 frontmatter 预览。", "Frontmatter preview will appear here.");
    body.textContent =
        preview.body ||
            (0, helpers_1.uiText)("这里会显示 Markdown 正文预览。", "Markdown preview will appear here.");
}
function markPreviewStale(message = (0, helpers_1.uiText)("配置已更新，点击“生成预览”查看最新结果。", "Settings changed. Generate preview to refresh it.")) {
    if (state_1.obsidianPrefsState.preview.status === "loading") {
        return;
    }
    state_1.obsidianPrefsState.preview.status =
        state_1.obsidianPrefsState.preview.fileName ||
            state_1.obsidianPrefsState.preview.frontmatter ||
            state_1.obsidianPrefsState.preview.body
            ? "stale"
            : "empty";
    state_1.obsidianPrefsState.preview.message = message;
    renderPreviewPanel();
}
function renderFileNamePreview() {
    const rule = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_FILE_NAME_RULE_ID);
    const preview = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_FILE_NAME_PREVIEW_ID);
    const context = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_FILE_NAME_CONTEXT_ID);
    if (!preview || !context) {
        return;
    }
    const topItem = getPreviewSourceItem();
    const fileName = topItem
        ? (0, paths_1.buildManagedObsidianFileName)(topItem, getPreviewNoteItem(topItem, (0, managed_1.getManagedObsidianNoteForItem)(topItem)))
        : (0, paths_1.ensureMarkdownExtension)(`${getPreviewFallbackFileNameContext().title} -- ${getPreviewFallbackFileNameContext().uniqueKey}`);
    if (rule) {
        rule.textContent = (0, helpers_1.uiText)("固定命名：标题 -- 稳定短哈希（基于 libraryID + item.key）", "Fixed naming: title -- stable short hash (from libraryID + item.key)");
    }
    preview.textContent = fileName;
    context.textContent = topItem
        ? (0, helpers_1.uiText)(`预览来源：${(0, childNotes_2.getTopItemPreferredTitle)(topItem) || topItem.key}`, `Preview source: ${(0, childNotes_2.getTopItemPreferredTitle)(topItem) || topItem.key}`)
        : (0, helpers_1.uiText)("未选中文献，当前使用示例数据。", "Using sample data until a Zotero item is selected.");
}
function renderContentSummary() {
    const summary = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_CONTENT_SUMMARY_ID);
    if (!summary) {
        return;
    }
    summary.textContent = (0, helpers_1.uiText)(`同步内容：${getEnabledContentLabels().join("、")}`, `Sync content: ${getEnabledContentLabels().join(", ")}`);
}
function renderSyncSummary() {
    const summary = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_SYNC_SUMMARY_ID);
    if (!summary) {
        return;
    }
    const scope = (0, settings_1.normalizeObsidianSyncScope)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_SYNC_SCOPE_PREF) || ""));
    const strategy = (0, settings_1.normalizeObsidianUpdateStrategy)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || ""));
    const { notesDir } = (0, helpers_1.getObsidianResolvedPaths)();
    const behaviors = [];
    const autoSyncEnabled = (0, settings_1.getBooleanPrefOrDefault)("obsidian.autoSync", true);
    if (autoSyncEnabled) {
        behaviors.push((0, helpers_1.uiText)("自动同步", "auto sync"));
    }
    if (autoSyncEnabled && (0, settings_1.getBooleanPrefOrDefault)("obsidian.watchFiles", true)) {
        behaviors.push((0, helpers_1.uiText)("主动监视文件变化", "watch file changes"));
    }
    if ((0, settings_1.getBooleanPrefOrDefault)("obsidian.openAfterSync", true)) {
        behaviors.push((0, helpers_1.uiText)("同步后打开 Obsidian", "open Obsidian after sync"));
    }
    if ((0, settings_1.getBooleanPrefOrDefault)("obsidian.revealAfterSync", false)) {
        behaviors.push((0, helpers_1.uiText)("同步后定位文件", "reveal file after sync"));
    }
    const translationTargets = getEnabledTranslationLabels();
    summary.textContent = (0, helpers_1.uiText)(`范围：${getScopeLabel(scope)} · 更新：${getUpdateStrategyLabel(strategy)} · 目录：${notesDir || (0, helpers_1.uiText)("未设置", "Not set")}${behaviors.length ? ` · 自动：${behaviors.join("、")}` : ""}${translationTargets.length
        ? ` · 翻译补全：${translationTargets.join("、")}`
        : ""}`, `Scope: ${getScopeLabel(scope)} · Mode: ${getUpdateStrategyLabel(strategy)} · Folder: ${notesDir || "Not set"}${behaviors.length ? ` · Auto: ${behaviors.join(", ")}` : ""}${translationTargets.length
        ? ` · Translation autofill: ${translationTargets.join(", ")}`
        : ""}`);
}
function switchObsidianPrefsTab(tab) {
    const doc = (0, helpers_1.getPrefWindowDocument)();
    if (!doc) {
        return;
    }
    state_1.obsidianPrefsState.activeTab = tab;
    doc.querySelectorAll("[data-ob-tab]").forEach((button) => {
        const isActive = button.dataset.obTab === tab;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });
    doc.querySelectorAll("[data-ob-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.obPanel !== tab;
    });
    if (tab === "noteDesign" &&
        ["empty", "stale"].includes(state_1.obsidianPrefsState.preview.status)) {
        void generateObsidianPreview();
    }
}
function generateObsidianPreview() {
    return __awaiter(this, void 0, void 0, function* () {
        const topItem = getPreviewSourceItem();
        const requestId = ++state_1.obsidianPrefsState.previewRequest;
        state_1.obsidianPrefsState.preview.status = "loading";
        state_1.obsidianPrefsState.preview.message = (0, helpers_1.uiText)("正在生成预览…", "Generating preview...");
        state_1.obsidianPrefsState.preview.sourceLabel = topItem
            ? (0, helpers_1.uiText)(`当前文献：${(0, childNotes_2.getTopItemPreferredTitle)(topItem) || topItem.key}`, `Current item: ${(0, childNotes_2.getTopItemPreferredTitle)(topItem) || topItem.key}`)
            : "";
        renderPreviewPanel();
        if (!topItem) {
            state_1.obsidianPrefsState.preview.status = "empty";
            state_1.obsidianPrefsState.preview.signature = buildPreviewSignature(false);
            state_1.obsidianPrefsState.preview.message = (0, helpers_1.uiText)("请在 Zotero 主界面选中一篇文献，再回来生成真实预览。", "Select a Zotero item in the main window, then generate a real preview.");
            state_1.obsidianPrefsState.preview.fileName = "";
            state_1.obsidianPrefsState.preview.frontmatter = "";
            state_1.obsidianPrefsState.preview.body = "";
            renderPreviewPanel();
            return;
        }
        try {
            const existingNote = (0, managed_1.getManagedObsidianNoteForItem)(topItem);
            const previewNoteItem = getPreviewNoteItem(topItem, existingNote);
            const { noteDir, attachmentDir, attachmentFolder } = getPreviewPathOptions();
            const { context, creatorsList, zoteroTagsList, collectionsList } = yield (0, markdown_1.buildItemContext)(topItem);
            const metadataPreset = (0, settings_1.getMetadataPreset)();
            const visibleFields = (0, settings_1.getConfiguredFields)(metadataPreset.visible, context.itemType);
            const hiddenFields = (0, settings_1.getConfiguredFields)(metadataPreset.hidden, context.itemType);
            const contentConfig = (0, settings_1.getManagedNoteContentConfig)();
            const userSections = yield getPreviewUserSections(topItem, previewNoteItem, {
                noteDir,
                attachmentDir,
                attachmentFolder,
            });
            const annotationsMarkdown = contentConfig.includeAnnotations
                ? buildAnnotationPreviewMarkdown(topItem)
                : "";
            const childNotesMarkdown = contentConfig.includeChildNotes
                ? yield renderChildNotesPreviewMarkdown(topItem, previewNoteItem, {
                    noteDir,
                    attachmentDir,
                    attachmentFolder,
                })
                : "";
            const frontmatter = (0, frontmatter_1.buildManagedFrontmatterData)(context, creatorsList, zoteroTagsList, collectionsList, topItem, previewNoteItem, {});
            const body = [
                markdown_1.GENERATED_BLOCK_START,
                [
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
                    childNotesMarkdown,
                ]
                    .map((block) => String(block || "").trim())
                    .filter(Boolean)
                    .join("\n\n"),
                markdown_1.GENERATED_BLOCK_END,
                markdown_1.USER_BLOCK_START,
                userSections,
                markdown_1.USER_BLOCK_END,
            ]
                .map((block) => String(block || "").trim())
                .filter(Boolean)
                .join("\n\n");
            const fileName = (0, paths_1.ensureMarkdownExtension)((0, paths_1.buildManagedObsidianFileName)(topItem, previewNoteItem) ||
                `${(0, paths_1.sanitizeFileNamePart)(context.title || topItem.key) || topItem.key} -- ${(0, paths_1.getManagedObsidianUniqueKey)(topItem) || topItem.key}`);
            if (requestId !== state_1.obsidianPrefsState.previewRequest) {
                return;
            }
            state_1.obsidianPrefsState.preview.status = "ready";
            state_1.obsidianPrefsState.preview.signature = buildPreviewSignature(topItem);
            state_1.obsidianPrefsState.preview.sourceLabel = (0, helpers_1.uiText)(`使用当前文献生成：${(0, childNotes_2.getTopItemPreferredTitle)(topItem) || topItem.key}`, `Generated from current item: ${(0, childNotes_2.getTopItemPreferredTitle)(topItem) || topItem.key}`);
            state_1.obsidianPrefsState.preview.fileName = fileName;
            state_1.obsidianPrefsState.preview.frontmatter = (0, frontmatter_1.buildFrontmatter)(frontmatter);
            state_1.obsidianPrefsState.preview.body = body;
            state_1.obsidianPrefsState.preview.message = existingNote
                ? (0, helpers_1.uiText)("已按当前设置预览现有联动笔记的结果。", "Previewing how the current managed note will look with the current settings.")
                : (0, helpers_1.uiText)("已按当前模板与设置预览新建联动笔记。", "Previewing a new managed note using the current template and settings.");
        }
        catch (error) {
            if (requestId !== state_1.obsidianPrefsState.previewRequest) {
                return;
            }
            state_1.obsidianPrefsState.preview.status = "error";
            state_1.obsidianPrefsState.preview.signature = buildPreviewSignature(topItem);
            state_1.obsidianPrefsState.preview.fileName = "";
            state_1.obsidianPrefsState.preview.frontmatter = "";
            state_1.obsidianPrefsState.preview.body = "";
            state_1.obsidianPrefsState.preview.message =
                (0, shared_1.cleanInline)((error === null || error === void 0 ? void 0 : error.message) || "") ||
                    (0, helpers_1.uiText)("生成预览失败。", "Failed to generate preview.");
        }
        renderPreviewPanel();
    });
}
