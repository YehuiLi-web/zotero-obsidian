import { getString } from "../../../utils/locale";
import { getPref } from "../../../utils/prefs";
import { jointPath } from "../../../utils/str";
import {
  DEFAULT_CHILD_NOTE_TAGS,
  OBSIDIAN_CHILD_NOTE_TAGS_PREF,
} from "../childNotes";
import { buildFrontmatter, buildManagedFrontmatterData } from "../frontmatter";
import {
  buildAbstractCallout,
  buildHiddenInfoCallout,
  buildItemContext,
  buildMetadataCallout,
  buildTagsCallout,
  extractUserSections,
  GENERATED_BLOCK_END,
  GENERATED_BLOCK_START,
  stripFrontmatter,
  USER_BLOCK_END,
  USER_BLOCK_START,
} from "../markdown";
import {
  buildManagedObsidianFileName,
  ensureMarkdownExtension,
  getAttachmentRelativeDir,
  getManagedFileNamePattern,
  getManagedObsidianUniqueKey,
  sanitizeFileNamePart,
} from "../paths";
import { cleanInline } from "../shared";
import {
  getBooleanPrefOrDefault,
  getConfiguredFields,
  getManagedFrontmatterFields,
  getManagedNoteContentConfig,
  getMissingMetadataTranslationConfig,
  getMetadataPreset,
  getMetadataPresetLibrary,
  resolveObsidianItemTemplateName,
  getStringPrefOrDefault,
  normalizeObsidianSyncScope,
  normalizeObsidianUpdateStrategy,
  OBSIDIAN_SYNC_SCOPE_PREF,
  OBSIDIAN_UPDATE_STRATEGY_PREF,
} from "../settings";
import { getManagedObsidianNoteForItem, getMatchedChildNotes } from "../managed";
import { obsidianPrefsState, type ObsidianPrefsTab } from "./state";
import {
  OBSIDIAN_CONTENT_SUMMARY_ID,
  OBSIDIAN_FILE_NAME_CONTEXT_ID,
  OBSIDIAN_FILE_NAME_PREVIEW_ID,
  OBSIDIAN_FILE_NAME_RULE_ID,
  OBSIDIAN_PREVIEW_BODY_ID,
  OBSIDIAN_PREVIEW_FILE_ID,
  OBSIDIAN_PREVIEW_FRONTMATTER_ID,
  OBSIDIAN_PREVIEW_META_ID,
  OBSIDIAN_PREVIEW_TRIGGER_ID,
  OBSIDIAN_SYNC_SUMMARY_ID,
} from "./uiIds";
import {
  getObsidianResolvedPaths,
  getPrefElement,
  getPrefWindowDocument,
  uiText,
} from "./helpers";
import {
  ensureChildNoteHeading,
  getTopItemPreferredTitle,
} from "../childNotes";

function getScopeLabel(scope: string) {
  switch (normalizeObsidianSyncScope(scope)) {
    case "currentList":
      return getString("obsidian-syncScope-currentList");
    case "library":
      return getString("obsidian-syncScope-library");
    default:
      return getString("obsidian-syncScope-selection");
  }
}

function getUpdateStrategyLabel(strategy: string) {
  switch (normalizeObsidianUpdateStrategy(strategy)) {
    case "overwrite":
      return uiText("覆盖全部内容", "Overwrite everything");
    case "skip":
      return uiText("跳过已有笔记", "Skip existing notes");
    default:
      return uiText("只更新托管区", "Update managed blocks only");
  }
}

function getEnabledContentLabels() {
  const content = getManagedNoteContentConfig();
  const labels = [] as string[];
  if (content.includeMetadata) {
    labels.push(uiText("元数据", "Metadata"));
  }
  if (content.includeAbstract) {
    labels.push("Abstract");
  }
  if (content.includeAnnotations) {
    labels.push(uiText("PDF 批注", "PDF annotations"));
  }
  if (content.includeHiddenInfo) {
    labels.push(uiText("隐藏字段", "Hidden fields"));
  }
  if (content.includeChildNotes) {
    labels.push(uiText("子笔记", "Child notes"));
  }
  labels.push(uiText("手写笔记区", "My notes"));
  return labels;
}

function getEnabledTranslationLabels() {
  const translation = getMissingMetadataTranslationConfig();
  if (!translation.enabled) {
    return [] as string[];
  }
  const labels = [] as string[];
  if (translation.includeTitle) {
    labels.push(uiText("标题翻译", "title translations"));
  }
  if (translation.includeAbstract) {
    labels.push(uiText("摘要翻译", "abstract translations"));
  }
  return labels;
}

function resolvePreviewTopItem(
  item: Zotero.Item | false | null | undefined,
): Zotero.Item | false {
  if (!item) {
    return false;
  }
  if (typeof item.isRegularItem === "function" && item.isRegularItem()) {
    return item;
  }
  if (typeof item.isNote === "function" && item.isNote()) {
    return item.parentItem?.isRegularItem() ? item.parentItem : false;
  }
  if (typeof item.isAttachment === "function" && item.isAttachment()) {
    return item.parentItem?.isRegularItem() ? item.parentItem : false;
  }
  if (typeof item.isAnnotation === "function" && item.isAnnotation()) {
    return item.parentItem?.parentItem?.isRegularItem()
      ? item.parentItem.parentItem
      : false;
  }
  return false;
}

export function getPreviewSourceItem() {
  const mainWindow = Zotero.getMainWindow();
  const selectedItems =
    mainWindow?.ZoteroPane?.getSelectedItems?.() || ([] as Zotero.Item[]);
  for (const item of selectedItems) {
    const topItem = resolvePreviewTopItem(item);
    if (topItem) {
      return topItem;
    }
  }

  try {
    const selectedTabID = mainWindow?.Zotero_Tabs?.selectedID;
    const reader =
      selectedTabID && typeof Zotero.Reader?.getByTabID === "function"
        ? Zotero.Reader.getByTabID(selectedTabID)
        : null;
    const readerItem = reader?.itemID ? Zotero.Items.get(reader.itemID) : false;
    return resolvePreviewTopItem(readerItem);
  } catch (e) {
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

function getPreviewNoteItem(
  topItem: Zotero.Item,
  existingNoteItem?: Zotero.Item | false | null,
) {
  if (existingNoteItem && existingNoteItem.isNote()) {
    return existingNoteItem;
  }
  return {
    id: 0,
    key: `preview-${topItem.key}`,
    version: topItem.version,
    libraryID: topItem.libraryID,
  } as Zotero.Item;
}

function getPreviewPathOptions() {
  const { notesDir, assetsDir } = getObsidianResolvedPaths();
  const noteDir = notesDir || uiText("notes", "notes");
  const attachmentDir =
    assetsDir ||
    jointPath(PathUtils.parent(noteDir) || noteDir, "assets", "zotero");
  return {
    noteDir,
    attachmentDir,
    attachmentFolder: getAttachmentRelativeDir(noteDir, attachmentDir),
  };
}

function getManagedAnnotationPreviewItems(topItem: Zotero.Item) {
  const attachmentIDs =
    typeof topItem.getAttachments === "function"
      ? topItem.getAttachments()
      : [];
  return attachmentIDs
    .map((itemID) => Zotero.Items.get(itemID))
    .filter((item): item is Zotero.Item =>
      Boolean(
        item?.isAttachment &&
          item.isAttachment() &&
          typeof item.isPDFAttachment === "function" &&
          item.isPDFAttachment(),
      ),
    )
    .flatMap((attachmentItem) =>
      typeof attachmentItem.getAnnotations === "function"
        ? attachmentItem.getAnnotations()
        : [],
    )
    .filter((annotationItem): annotationItem is Zotero.Item =>
      Boolean(annotationItem?.isAnnotation && annotationItem.isAnnotation()),
    );
}

function buildAnnotationPreviewMarkdown(topItem: Zotero.Item) {
  const blocks = getManagedAnnotationPreviewItems(topItem)
    .map((annotationItem) => {
      const titleParts = [
        cleanInline(annotationItem.annotationPageLabel)
          ? `p.${cleanInline(annotationItem.annotationPageLabel)}`
          : "",
        cleanInline(annotationItem.annotationType),
      ].filter(Boolean);
      const heading = `### ${titleParts.join(" · ") || annotationItem.key}`;
      const sectionBlocks: string[] = [heading];
      if (annotationItem.annotationText) {
        sectionBlocks.push(
          cleanInline(annotationItem.annotationText)
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => `> ${line}`)
            .join("\n"),
        );
      } else if (annotationItem.annotationType === "image") {
        sectionBlocks.push(
          `![p.${
            cleanInline(annotationItem.annotationPageLabel) ||
            annotationItem.key
          }](../assets/zotero/annotation-${annotationItem.key}.png)`,
        );
      }
      if (annotationItem.annotationComment) {
        sectionBlocks.push(cleanInline(annotationItem.annotationComment));
      }
      const tagList = annotationItem
        .getTags()
        .map((tag) => cleanInline(tag.tag))
        .filter(Boolean);
      if (tagList.length) {
        sectionBlocks.push(
          `Tags: ${tagList.map((tag) => `\`${tag}\``).join(", ")}`,
        );
      }
      return sectionBlocks.join("\n\n").trim();
    })
    .filter(Boolean);

  if (!blocks.length) {
    return "";
  }

  return ["## Annotations", ...blocks].join("\n\n");
}

async function renderChildNotesPreviewMarkdown(
  topItem: Zotero.Item,
  previewNoteItem: Zotero.Item,
  options: {
    noteDir: string;
    attachmentDir?: string;
    attachmentFolder?: string;
  },
) {
  const bridgedNotes = getMatchedChildNotes(topItem, previewNoteItem);
  if (!bridgedNotes.length) {
    return "";
  }

  const renderedBlocks: string[] = [];
  for (const childNote of bridgedNotes) {
    const rendered = await addon.api.convert.note2md(
      childNote,
      options.noteDir,
      {
        keepNoteLink: false,
        withYAMLHeader: false,
        attachmentDir: options.attachmentDir,
        attachmentFolder: options.attachmentFolder,
      },
    );
    const cleaned = stripFrontmatter(rendered);
    if (!cleaned) {
      continue;
    }
    renderedBlocks.push(ensureChildNoteHeading(childNote, topItem, cleaned));
  }

  if (!renderedBlocks.length) {
    return "";
  }

  return ["---", ...renderedBlocks].join("\n\n");
}

async function getPreviewUserSections(
  topItem: Zotero.Item,
  previewNoteItem: Zotero.Item,
  options: {
    noteDir: string;
    attachmentDir?: string;
    attachmentFolder?: string;
  },
) {
  if (previewNoteItem?.id && typeof previewNoteItem.isNote === "function") {
    try {
      const existingMarkdown = await addon.api.convert.note2md(
        previewNoteItem,
        options.noteDir,
        {
          keepNoteLink: false,
          withYAMLHeader: false,
          attachmentDir: options.attachmentDir,
          attachmentFolder: options.attachmentFolder,
        },
      );
      return extractUserSections(existingMarkdown);
    } catch (e) {
      ztoolkit.log("[obsidian preview existing note]", e);
    }
  }

  try {
    const templateHTML = await addon.api.template.runItemTemplate(
      resolveObsidianItemTemplateName(),
      {
        itemIds: [topItem.id],
        dryRun: true,
      },
    );
    const templateMarkdown = await addon.api.convert.html2md(
      templateHTML || "",
    );
    return extractUserSections(templateMarkdown);
  } catch (e) {
    ztoolkit.log("[obsidian preview template]", e);
    return extractUserSections("");
  }
}

export function buildPreviewSignature(topItem?: Zotero.Item | false) {
  const targetItem = topItem || undefined;
  const { notesDir, assetsDir } = getObsidianResolvedPaths();
  return JSON.stringify({
    itemID: targetItem?.id || 0,
    itemVersion: targetItem?.version || 0,
    fileNameTemplate: getManagedFileNamePattern(),
    itemTemplate: resolveObsidianItemTemplateName(),
    frontmatterFields: getManagedFrontmatterFields(),
    metadataPreset: getMetadataPresetLibrary().activePresetId,
    content: getManagedNoteContentConfig(),
    childNoteTags: getStringPrefOrDefault(
      OBSIDIAN_CHILD_NOTE_TAGS_PREF,
      DEFAULT_CHILD_NOTE_TAGS.join(", "),
    ),
    notesDir,
    assetsDir,
    updateStrategy: normalizeObsidianUpdateStrategy(
      String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
    ),
  });
}

export function renderPreviewPanel() {
  const meta = getPrefElement<HTMLElement>(OBSIDIAN_PREVIEW_META_ID);
  const file = getPrefElement<HTMLElement>(OBSIDIAN_PREVIEW_FILE_ID);
  const frontmatter = getPrefElement<HTMLElement>(
    OBSIDIAN_PREVIEW_FRONTMATTER_ID,
  );
  const body = getPrefElement<HTMLElement>(OBSIDIAN_PREVIEW_BODY_ID);
  const trigger = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_PREVIEW_TRIGGER_ID,
  );
  if (!meta || !file || !frontmatter || !body || !trigger) {
    return;
  }

  const preview = obsidianPrefsState.preview;
  trigger.disabled = preview.status === "loading";
  trigger.textContent =
    preview.status === "loading"
      ? uiText("正在生成…", "Generating...")
      : uiText("生成预览", "Generate Preview");
  meta.className = `ob-bridge-preview-meta ob-bridge-preview-meta--${preview.status}`;

  const fallbackMessage = uiText(
    "请选择一篇文献后生成真实预览。",
    "Select an item to generate a real preview.",
  );
  meta.textContent = [preview.sourceLabel, preview.message || fallbackMessage]
    .filter(Boolean)
    .join(" · ");
  file.textContent =
    preview.fileName || uiText("尚未生成文件名预览", "No filename preview yet");
  frontmatter.textContent =
    preview.frontmatter ||
    uiText(
      "这里会显示 frontmatter 预览。",
      "Frontmatter preview will appear here.",
    );
  body.textContent =
    preview.body ||
    uiText(
      "这里会显示 Markdown 正文预览。",
      "Markdown preview will appear here.",
    );
}

export function markPreviewStale(
  message = uiText(
    "配置已更新，点击“生成预览”查看最新结果。",
    "Settings changed. Generate preview to refresh it.",
  ),
) {
  if (obsidianPrefsState.preview.status === "loading") {
    return;
  }
  obsidianPrefsState.preview.status =
    obsidianPrefsState.preview.fileName ||
    obsidianPrefsState.preview.frontmatter ||
    obsidianPrefsState.preview.body
      ? "stale"
      : "empty";
  obsidianPrefsState.preview.message = message;
  renderPreviewPanel();
}

export function renderFileNamePreview() {
  const rule = getPrefElement<HTMLElement>(OBSIDIAN_FILE_NAME_RULE_ID);
  const preview = getPrefElement<HTMLElement>(OBSIDIAN_FILE_NAME_PREVIEW_ID);
  const context = getPrefElement<HTMLElement>(OBSIDIAN_FILE_NAME_CONTEXT_ID);
  if (!preview || !context) {
    return;
  }

  const topItem = getPreviewSourceItem();
  const fileName = topItem
    ? buildManagedObsidianFileName(
        topItem,
        getPreviewNoteItem(topItem, getManagedObsidianNoteForItem(topItem)),
      )
    : ensureMarkdownExtension(
        `${getPreviewFallbackFileNameContext().title} -- ${
          getPreviewFallbackFileNameContext().uniqueKey
        }`,
      );

  if (rule) {
    rule.textContent = uiText(
      "固定命名：标题 -- 稳定短哈希（基于 libraryID + item.key）",
      "Fixed naming: title -- stable short hash (from libraryID + item.key)",
    );
  }
  preview.textContent = fileName;
  context.textContent = topItem
    ? uiText(
        `预览来源：${getTopItemPreferredTitle(topItem) || topItem.key}`,
        `Preview source: ${getTopItemPreferredTitle(topItem) || topItem.key}`,
      )
    : uiText(
        "未选中文献，当前使用示例数据。",
        "Using sample data until a Zotero item is selected.",
      );
}

export function renderContentSummary() {
  const summary = getPrefElement<HTMLElement>(OBSIDIAN_CONTENT_SUMMARY_ID);
  if (!summary) {
    return;
  }
  summary.textContent = uiText(
    `同步内容：${getEnabledContentLabels().join("、")}`,
    `Sync content: ${getEnabledContentLabels().join(", ")}`,
  );
}

export function renderSyncSummary() {
  const summary = getPrefElement<HTMLElement>(OBSIDIAN_SYNC_SUMMARY_ID);
  if (!summary) {
    return;
  }
  const scope = normalizeObsidianSyncScope(
    String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""),
  );
  const strategy = normalizeObsidianUpdateStrategy(
    String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
  );
  const { notesDir } = getObsidianResolvedPaths();
  const behaviors = [] as string[];
  const autoSyncEnabled = getBooleanPrefOrDefault("obsidian.autoSync", true);
  if (autoSyncEnabled) {
    behaviors.push(uiText("自动同步", "auto sync"));
  }
  if (autoSyncEnabled && getBooleanPrefOrDefault("obsidian.watchFiles", true)) {
    behaviors.push(uiText("主动监视文件变化", "watch file changes"));
  }
  if (getBooleanPrefOrDefault("obsidian.openAfterSync", true)) {
    behaviors.push(uiText("同步后打开 Obsidian", "open Obsidian after sync"));
  }
  if (getBooleanPrefOrDefault("obsidian.revealAfterSync", false)) {
    behaviors.push(uiText("同步后定位文件", "reveal file after sync"));
  }
  const translationTargets = getEnabledTranslationLabels();

  summary.textContent = uiText(
    `范围：${getScopeLabel(scope)} · 更新：${getUpdateStrategyLabel(
      strategy,
    )} · 目录：${notesDir || uiText("未设置", "Not set")}${
      behaviors.length ? ` · 自动：${behaviors.join("、")}` : ""
    }${
      translationTargets.length
        ? ` · 翻译补全：${translationTargets.join("、")}`
        : ""
    }`,
    `Scope: ${getScopeLabel(scope)} · Mode: ${getUpdateStrategyLabel(
      strategy,
    )} · Folder: ${notesDir || "Not set"}${
      behaviors.length ? ` · Auto: ${behaviors.join(", ")}` : ""
    }${
      translationTargets.length
        ? ` · Translation autofill: ${translationTargets.join(", ")}`
        : ""
    }`,
  );
}

export function switchObsidianPrefsTab(tab: ObsidianPrefsTab) {
  const doc = getPrefWindowDocument();
  if (!doc) {
    return;
  }
  obsidianPrefsState.activeTab = tab;
  doc.querySelectorAll<HTMLElement>("[data-ob-tab]").forEach((button) => {
    const isActive = button.dataset.obTab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  doc.querySelectorAll<HTMLElement>("[data-ob-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.obPanel !== tab;
  });
  if (
    tab === "noteDesign" &&
    ["empty", "stale"].includes(obsidianPrefsState.preview.status)
  ) {
    void generateObsidianPreview();
  }
}

export async function generateObsidianPreview() {
  const topItem = getPreviewSourceItem();
  const requestId = ++obsidianPrefsState.previewRequest;
  obsidianPrefsState.preview.status = "loading";
  obsidianPrefsState.preview.message = uiText(
    "正在生成预览…",
    "Generating preview...",
  );
  obsidianPrefsState.preview.sourceLabel = topItem
    ? uiText(
        `当前文献：${getTopItemPreferredTitle(topItem) || topItem.key}`,
        `Current item: ${getTopItemPreferredTitle(topItem) || topItem.key}`,
      )
    : "";
  renderPreviewPanel();

  if (!topItem) {
    obsidianPrefsState.preview.status = "empty";
    obsidianPrefsState.preview.signature = buildPreviewSignature(false);
    obsidianPrefsState.preview.message = uiText(
      "请在 Zotero 主界面选中一篇文献，再回来生成真实预览。",
      "Select a Zotero item in the main window, then generate a real preview.",
    );
    obsidianPrefsState.preview.fileName = "";
    obsidianPrefsState.preview.frontmatter = "";
    obsidianPrefsState.preview.body = "";
    renderPreviewPanel();
    return;
  }

  try {
    const existingNote = getManagedObsidianNoteForItem(topItem);
    const previewNoteItem = getPreviewNoteItem(topItem, existingNote);
    const { noteDir, attachmentDir, attachmentFolder } =
      getPreviewPathOptions();
    const { context, creatorsList, zoteroTagsList, collectionsList } =
      await buildItemContext(topItem);
    const metadataPreset = getMetadataPreset();
    const visibleFields = getConfiguredFields(
      metadataPreset.visible,
      context.itemType,
    );
    const hiddenFields = getConfiguredFields(
      metadataPreset.hidden,
      context.itemType,
    );
    const contentConfig = getManagedNoteContentConfig();
    const userSections = await getPreviewUserSections(
      topItem,
      previewNoteItem,
      {
        noteDir,
        attachmentDir,
        attachmentFolder,
      },
    );
    const annotationsMarkdown = contentConfig.includeAnnotations
      ? buildAnnotationPreviewMarkdown(topItem)
      : "";
    const childNotesMarkdown = contentConfig.includeChildNotes
      ? await renderChildNotesPreviewMarkdown(topItem, previewNoteItem, {
          noteDir,
          attachmentDir,
          attachmentFolder,
        })
      : "";
    const frontmatter = buildManagedFrontmatterData(
      context,
      creatorsList,
      zoteroTagsList,
      collectionsList,
      topItem,
      previewNoteItem,
      {},
    );
    const body = [
      GENERATED_BLOCK_START,
      [
        `# ${context.title}`,
        contentConfig.includeMetadata
          ? buildMetadataCallout(visibleFields, context)
          : "",
        contentConfig.includeMetadata ? buildTagsCallout(zoteroTagsList) : "",
        contentConfig.includeAbstract
          ? buildAbstractCallout(
              getString("obsidian-note-abstract-title"),
              context.abstract,
              "quote",
              getString("obsidian-note-emptyAbstract"),
            )
          : "",
        contentConfig.includeAbstract
          ? buildAbstractCallout(
              getString("obsidian-note-abstractTranslation-title"),
              context.abstractTranslation,
              "note",
              getString("obsidian-note-emptyAbstractTranslation"),
            )
          : "",
        annotationsMarkdown,
        contentConfig.includeHiddenInfo
          ? buildHiddenInfoCallout(hiddenFields, context)
          : "",
        childNotesMarkdown,
      ]
        .map((block) => String(block || "").trim())
        .filter(Boolean)
        .join("\n\n"),
      GENERATED_BLOCK_END,
      USER_BLOCK_START,
      userSections,
      USER_BLOCK_END,
    ]
      .map((block) => String(block || "").trim())
      .filter(Boolean)
      .join("\n\n");
    const fileName = ensureMarkdownExtension(
      buildManagedObsidianFileName(topItem, previewNoteItem) ||
        `${
          sanitizeFileNamePart(context.title || topItem.key) || topItem.key
        } -- ${getManagedObsidianUniqueKey(topItem) || topItem.key}`,
    );

    if (requestId !== obsidianPrefsState.previewRequest) {
      return;
    }

    obsidianPrefsState.preview.status = "ready";
    obsidianPrefsState.preview.signature = buildPreviewSignature(topItem);
    obsidianPrefsState.preview.sourceLabel = uiText(
      `使用当前文献生成：${getTopItemPreferredTitle(topItem) || topItem.key}`,
      `Generated from current item: ${getTopItemPreferredTitle(topItem) || topItem.key}`,
    );
    obsidianPrefsState.preview.fileName = fileName;
    obsidianPrefsState.preview.frontmatter = buildFrontmatter(frontmatter);
    obsidianPrefsState.preview.body = body;
    obsidianPrefsState.preview.message = existingNote
      ? uiText(
          "已按当前设置预览现有联动笔记的结果。",
          "Previewing how the current managed note will look with the current settings.",
        )
      : uiText(
          "已按当前模板与设置预览新建联动笔记。",
          "Previewing a new managed note using the current template and settings.",
        );
  } catch (error) {
    if (requestId !== obsidianPrefsState.previewRequest) {
      return;
    }
    obsidianPrefsState.preview.status = "error";
    obsidianPrefsState.preview.signature = buildPreviewSignature(topItem);
    obsidianPrefsState.preview.fileName = "";
    obsidianPrefsState.preview.frontmatter = "";
    obsidianPrefsState.preview.body = "";
    obsidianPrefsState.preview.message =
      cleanInline((error as Error)?.message || "") ||
      uiText("生成预览失败。", "Failed to generate preview.");
  }

  renderPreviewPanel();
}
