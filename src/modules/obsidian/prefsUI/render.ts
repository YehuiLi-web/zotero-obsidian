import { getString } from "../../../utils/locale";
import { getPref } from "../../../utils/prefs";
import {
  DEFAULT_CHILD_NOTE_TAGS,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
  OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_TAGS_PREF,
} from "../childNotes";
import { buildObsidianSettingsShellHTML } from "./layout";
import { buildObsidianPrefsStyleText } from "./style";
import { cleanInline } from "../shared";
import {
  FIXED_MANAGED_FRONTMATTER_KEYS,
  getBooleanPrefOrDefault,
  getManagedFrontmatterFields,
  getManagedFrontmatterOptionLabel,
  getManagedFrontmatterPresetLabel,
  getManagedNoteContentConfig,
  getMissingMetadataTranslationConfig,
  getObsidianItemTemplateLabel,
  getStringPrefOrDefault,
  hasTemplateByName,
  ManagedFrontmatterOptionGroup,
  ManagedFrontmatterOptionKey,
  normalizeObsidianSyncScope,
  normalizeObsidianUpdateStrategy,
  resolveManagedFrontmatterPreset,
  resolveObsidianItemTemplateName,
  setManagedFrontmatterFields,
  MANAGED_FRONTMATTER_OPTIONS,
  MANAGED_FRONTMATTER_PRESETS,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
  OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID,
  OBSIDIAN_FRONTMATTER_FIELD_LIST_ID,
  OBSIDIAN_FRONTMATTER_SUMMARY_ID,
  OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID,
  OBSIDIAN_INCLUDE_ABSTRACT_PREF,
  OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID,
  OBSIDIAN_INCLUDE_ANNOTATIONS_PREF,
  OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID,
  OBSIDIAN_INCLUDE_CHILD_NOTES_PREF,
  OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID,
  OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF,
  OBSIDIAN_INCLUDE_METADATA_INPUT_ID,
  OBSIDIAN_INCLUDE_METADATA_PREF,
  OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID,
  OBSIDIAN_ITEM_TEMPLATE_PREF,
  OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID,
  OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID,
  OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_SEARCH_ID,
  OBSIDIAN_METADATA_PRESET_SECTION_ID,
  OBSIDIAN_METADATA_PRESET_SELECT_ID,
  OBSIDIAN_METADATA_PRESET_SUMMARY_ID,
  OBSIDIAN_SYNC_SCOPE_PREF,
  OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
  OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF,
  OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID,
  OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF,
  OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
  OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF,
  OBSIDIAN_UPDATE_STRATEGY_PREF,
} from "../settings";
import { getManagedFileNamePattern } from "../paths";
import {
  OBSIDIAN_APP_PATH_INPUT_ID,
  OBSIDIAN_ASSETS_DIR_HINT_ID,
  OBSIDIAN_ASSETS_DIR_INPUT_ID,
  OBSIDIAN_AUTO_SYNC_INPUT_ID,
  OBSIDIAN_CONNECTION_STATUS_ID,
  OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  OBSIDIAN_CONNECTION_TEST_RESULT_ID,
  OBSIDIAN_CONTENT_SUMMARY_ID,
  OBSIDIAN_DASHBOARD_DIR_HINT_ID,
  OBSIDIAN_FILE_NAME_CONTEXT_ID,
  OBSIDIAN_FILE_NAME_PREVIEW_ID,
  OBSIDIAN_NOTES_DIR_INPUT_ID,
  OBSIDIAN_NOTES_DIR_HINT_ID,
  OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
  OBSIDIAN_PREVIEW_BODY_ID,
  OBSIDIAN_PREVIEW_FILE_ID,
  OBSIDIAN_PREVIEW_FRONTMATTER_ID,
  OBSIDIAN_PREVIEW_META_ID,
  OBSIDIAN_PREVIEW_TRIGGER_ID,
  OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
  OBSIDIAN_SETTINGS_ROOT_ID,
  OBSIDIAN_SETTINGS_STYLE_ID,
  OBSIDIAN_SYNC_SCOPE_GROUP_NAME,
  OBSIDIAN_SYNC_SUMMARY_ID,
  OBSIDIAN_TOOLTIP_ID,
  OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME,
  OBSIDIAN_VAULT_ROOT_HINT_ID,
  OBSIDIAN_VAULT_ROOT_INPUT_ID,
  OBSIDIAN_WATCH_FILES_INPUT_ID,
} from "./uiIds";
import {
  createPrefHTMLElement,
  escapePrefHTML,
  getObsidianResolvedPaths,
  getObsidianSettingsRoot,
  getPrefElement,
  replacePrefHTML,
  setPrefElementChecked,
  setPrefElementValue,
  setPrefRadioValue,
  uiText,
} from "./helpers";

export function renderObsidianItemTemplateSelection() {
  const templateDisplay = getPrefElement<HTMLInputElement>(
    OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID,
  );
  if (!templateDisplay) {
    return;
  }
  const configuredTemplate = cleanInline(
    String(getPref(OBSIDIAN_ITEM_TEMPLATE_PREF) || ""),
  );
  const effectiveTemplate = resolveObsidianItemTemplateName();
  const label = getObsidianItemTemplateLabel(effectiveTemplate);
  templateDisplay.value =
    label +
    (configuredTemplate &&
    configuredTemplate !== effectiveTemplate &&
    !hasTemplateByName(configuredTemplate)
      ? " (missing)"
      : "");
  templateDisplay.title = effectiveTemplate;
}

const OBSIDIAN_TOOLTIP_TEXT: Record<string, { zh: string; en: string }> = {
  "connection-overview": {
    zh: "确认 Zotero 能写入 Obsidian 工作区，并在这里检查路径和权限。",
    en: "Confirm Zotero can write into the Obsidian workspace and check paths and permissions here.",
  },
  "app-path": {
    zh: "可选。不填也能同步；只有“同步后打开 Obsidian”更依赖这里。",
    en: "Optional. Sync still works without it; it mainly affects opening Obsidian after sync.",
  },
  "vault-root": {
    zh: "建议设置。选中后会自动推导文献笔记目录和资源目录。",
    en: "Recommended. Once set, the notes and assets folders can be inferred automatically.",
  },
  "notes-dir": {
    zh: "默认使用 Vault/notes，也可以单独指定。",
    en: "Defaults to Vault/notes, but you can override it.",
  },
  "assets-dir": {
    zh: "默认使用 Vault/assets/zotero；首次同步时会自动创建缺失目录。",
    en: "Defaults to Vault/assets/zotero. Missing folders are created on first sync.",
  },
  "note-structure-overview": {
    zh: "这里决定模板、自动生成内容、子笔记规则和 Frontmatter 字段。",
    en: "This section controls templates, generated content, child-note rules, and frontmatter fields.",
  },
  "file-name-template": {
    zh: "可用变量：{{title}} {{year}} {{firstCreator}} {{citationKey}} {{publication}} {{itemType}}",
    en: "Available tokens: {{title}} {{year}} {{firstCreator}} {{citationKey}} {{publication}} {{itemType}}",
  },
  "item-template": {
    zh: "这里只显示 [Item] 模板。它决定正文结构，不决定 frontmatter 字段。",
    en: "Only [Item] templates are shown here. They control body structure, not frontmatter fields.",
  },
  "sync-overview": {
    zh: "设置文件命名、同步范围、更新方式，以及同步后的自动动作。",
    en: "Configure file naming, sync scope, update mode, and post-sync actions.",
  },
  "sync-scope": {
    zh: "点击“立即同步”时，会按这里选择的范围执行。",
    en: "Sync Now runs against the scope selected here.",
  },
  "update-strategy": {
    zh: "只更新托管区会保留手写内容；覆盖全部会整体重写；跳过已有只处理新笔记。",
    en: "Managed-only preserves your own notes, overwrite rewrites the whole note, and skip-existing only processes new notes.",
  },
  "advanced-overview": {
    zh: "立即同步、统计面板初始化和联动映射修复。",
    en: "Sync now, dashboard setup, and link repair tools.",
  },
  "frontmatter-fields": {
    zh: "控制写入 Obsidian frontmatter 的字段；联动识别所需字段会始终保留。",
    en: "Controls which fields are written into Obsidian frontmatter. Required bridge fields are always kept.",
  },
  "metadata-preset": {
    zh: "一次只能启用一个配置；保存或切换后会按当前配置重同步已联动笔记。",
    en: "Only one preset can be active at a time. Saving or switching resyncs linked notes with the active preset.",
  },
  "child-note-tags": {
    zh: "只嫁接命中这些标签的子笔记；支持逗号或分号分隔。",
    en: "Only child notes matching these tags are bridged. Commas and semicolons are supported.",
  },
  "dashboard-dir": {
    zh: "这里会生成 Research Dashboard、Topic Dashboard 和 Reading Pipeline.base。",
    en: "This folder is used for Research Dashboard, Topic Dashboard, and Reading Pipeline.base.",
  },
};

export function getObsidianTooltipText(key: string) {
  const tooltip = OBSIDIAN_TOOLTIP_TEXT[cleanInline(key)];
  return tooltip ? uiText(tooltip.zh, tooltip.en) : "";
}

export function ensureObsidianTooltipNode(doc: Document) {
  let tooltip = doc.getElementById(
    OBSIDIAN_TOOLTIP_ID,
  ) as HTMLDivElement | null;
  if (tooltip) {
    return tooltip;
  }
  tooltip = createPrefHTMLElement(doc, "div");
  tooltip.id = OBSIDIAN_TOOLTIP_ID;
  tooltip.className = "ob-prefs-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.setAttribute("aria-hidden", "true");
  tooltip.dataset.show = "false";
  doc.documentElement?.appendChild(tooltip);
  return tooltip;
}

export function positionObsidianTooltip(
  tooltip: HTMLDivElement,
  target: HTMLElement,
  doc: Document,
) {
  const view = doc.defaultView;
  if (!view) {
    return;
  }
  const gap = 10;
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
  left = Math.max(
    gap,
    Math.min(left, view.innerWidth - tooltipRect.width - gap),
  );

  let top = targetRect.bottom + gap;
  if (top + tooltipRect.height > view.innerHeight - gap) {
    top = targetRect.top - tooltipRect.height - gap;
  }
  if (top < gap) {
    top = gap;
  }

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

export function renderObsidianFrontmatterFieldConfigurator() {
  const summary = getPrefElement<HTMLElement>(OBSIDIAN_FRONTMATTER_SUMMARY_ID);
  const container = getPrefElement<HTMLDivElement>(
    OBSIDIAN_FRONTMATTER_FIELD_LIST_ID,
  );
  if (!summary || !container) {
    return;
  }

  const selectedFields = getManagedFrontmatterFields();
  const selectedKeys = new Set(selectedFields);
  const activePreset = resolveManagedFrontmatterPreset(selectedFields);
  summary.textContent = getString("obsidian-frontmatter-summary", {
    args: {
      preset: getManagedFrontmatterPresetLabel(activePreset),
      count: selectedKeys.size,
      fixed: FIXED_MANAGED_FRONTMATTER_KEYS.join(", "),
    },
  });

  const doc = container.ownerDocument;
  container.replaceChildren();

  const presetSection = createPrefHTMLElement(doc, "div");
  presetSection.setAttribute(
    "style",
    "display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:0 0 16px 0;align-items:stretch;",
  );

  for (const preset of MANAGED_FRONTMATTER_PRESETS) {
    const isActive = activePreset === preset.id;
    const card = createPrefHTMLElement(doc, "div");
    card.setAttribute(
      "style",
      [
        "display:flex",
        "flex-direction:column",
        "justify-content:space-between",
        "gap:10px",
        "padding:14px 16px",
        "border-radius:12px",
        `border:1px solid ${
          isActive ? "var(--accent-blue)" : "var(--material-border)"
        }`,
        `background:${
          isActive ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)"
        }`,
        "box-sizing:border-box",
        "min-height:132px",
      ].join(";"),
    );

    const content = createPrefHTMLElement(doc, "div");
    content.setAttribute(
      "style",
      "display:flex;flex-direction:column;gap:8px;align-items:flex-start;",
    );
    const header = createPrefHTMLElement(doc, "div");
    header.setAttribute(
      "style",
      "display:flex;align-items:center;gap:8px;flex-wrap:wrap;",
    );
    const title = createPrefHTMLElement(doc, "div");
    title.textContent = getString(preset.titleL10nId);
    title.setAttribute("style", "font-weight:700;line-height:1.4;");
    header.appendChild(title);
    if (isActive) {
      const badge = createPrefHTMLElement(doc, "span");
      badge.textContent = getString("obsidian-frontmatter-preset-active");
      badge.setAttribute(
        "style",
        "font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:rgba(59,130,246,0.18);color:var(--accent-blue);",
      );
      header.appendChild(badge);
    }
    content.appendChild(header);
    const description = createPrefHTMLElement(doc, "div");
    description.textContent = getString(preset.descriptionL10nId);
    description.setAttribute(
      "style",
      "font-size:13px;line-height:1.6;color:var(--text-color-deemphasized);",
    );
    content.appendChild(description);
    card.appendChild(content);

    const button = createPrefHTMLElement(doc, "button");
    button.type = "button";
    button.textContent = isActive
      ? getString("obsidian-frontmatter-preset-active")
      : getString("obsidian-frontmatter-preset-apply");
    button.disabled = isActive;
    button.setAttribute(
      "style",
      "align-self:flex-start;padding:6px 12px;border-radius:8px;font-weight:600;",
    );
    button.addEventListener("click", () => {
      setManagedFrontmatterFields(preset.fields);
      renderObsidianFrontmatterFieldConfigurator();
    });
    card.appendChild(button);
    presetSection.appendChild(card);
  }

  container.appendChild(presetSection);

  const groupOrder: ManagedFrontmatterOptionGroup[] = [
    "reference",
    "links",
    "library",
  ];
  for (const groupKey of groupOrder) {
    const groupOptions = MANAGED_FRONTMATTER_OPTIONS.filter(
      (option) => option.group === groupKey,
    );
    const group = createPrefHTMLElement(doc, "section");
    group.setAttribute("style", "margin-bottom:16px;");
    const header = createPrefHTMLElement(doc, "div");
    header.textContent = getString(`obsidian-frontmatter-group-${groupKey}`);
    header.setAttribute(
      "style",
      "font-weight:700;margin:0 0 10px 0;color:var(--text-color);",
    );
    group.appendChild(header);

    const list = createPrefHTMLElement(doc, "div");
    list.setAttribute(
      "style",
      "display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;align-items:start;",
    );
    for (const option of groupOptions) {
      const row = createPrefHTMLElement(doc, "label");
      row.setAttribute(
        "style",
        "display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:10px;border:1px solid var(--material-border);background:rgba(255,255,255,0.02);cursor:pointer;box-sizing:border-box;min-height:78px;",
      );
      const checkbox = createPrefHTMLElement(doc, "input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedKeys.has(option.key);
      checkbox.style.marginTop = "2px";
      checkbox.addEventListener("change", () => {
        const nextSelection = new Set(getManagedFrontmatterFields());
        if (checkbox.checked) {
          nextSelection.add(option.key);
        } else {
          nextSelection.delete(option.key);
        }
        setManagedFrontmatterFields(
          Array.from(nextSelection) as ManagedFrontmatterOptionKey[],
        );
        renderObsidianFrontmatterFieldConfigurator();
      });
      row.appendChild(checkbox);

      const content = createPrefHTMLElement(doc, "div");
      content.setAttribute(
        "style",
        "display:flex;flex-direction:column;gap:4px;min-width:0;flex:1;align-items:flex-start;",
      );
      const optionTitle = createPrefHTMLElement(doc, "div");
      optionTitle.textContent = getManagedFrontmatterOptionLabel(option.key);
      optionTitle.setAttribute("style", "font-weight:600;line-height:1.45;");
      content.appendChild(optionTitle);
      const help = createPrefHTMLElement(doc, "code");
      help.textContent = option.help;
      help.setAttribute(
        "style",
        "font-size:12px;color:var(--text-color-deemphasized);line-height:1.4;word-break:break-word;background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:6px;",
      );
      content.appendChild(help);
      row.appendChild(content);
      list.appendChild(row);
    }
    group.appendChild(list);
    container.appendChild(group);
  }
}

export function ensureObsidianPrefsStyle(prefDoc: Document) {
  if (prefDoc.querySelector(`#${OBSIDIAN_SETTINGS_STYLE_ID}`)) {
    return;
  }
  const style = createPrefHTMLElement(prefDoc, "style");
  style.id = OBSIDIAN_SETTINGS_STYLE_ID;
  style.textContent = buildObsidianPrefsStyleText(
    OBSIDIAN_SETTINGS_ROOT_ID,
    OBSIDIAN_TOOLTIP_ID,
  );
  const root = getObsidianSettingsRoot(prefDoc);
  const parent = root?.parentElement || prefDoc.documentElement;
  if (root && parent) {
    parent.insertBefore(style, root);
  } else {
    prefDoc.documentElement.appendChild(style);
  }
}

export function getObsidianSettingsShellMarkup(prefDoc: Document) {
  const { appPath, vaultRoot, notesDir, assetsDir, dashboardDir } =
    getObsidianResolvedPaths();
  return buildObsidianSettingsShellHTML({
    escapeHTML: (value: string) => escapePrefHTML(prefDoc, value),
    getString,
    uiText,
    resolvedPaths: { appPath, vaultRoot, notesDir, assetsDir, dashboardDir },
    contentConfig: getManagedNoteContentConfig(),
    translationConfig: getMissingMetadataTranslationConfig(),
    fileNameTemplate: getManagedFileNamePattern(),
    syncScope: normalizeObsidianSyncScope(
      String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""),
    ),
    updateStrategy: normalizeObsidianUpdateStrategy(
      String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
    ),
    autoSync: getBooleanPrefOrDefault("obsidian.autoSync", true),
    watchFiles: getBooleanPrefOrDefault("obsidian.watchFiles", true),
    openAfterSync: getBooleanPrefOrDefault("obsidian.openAfterSync", true),
    revealAfterSync: getBooleanPrefOrDefault("obsidian.revealAfterSync", false),
    childNoteTags: getStringPrefOrDefault(
      OBSIDIAN_CHILD_NOTE_TAGS_PREF,
      DEFAULT_CHILD_NOTE_TAGS.join(", "),
    ),
    childNotePrompt: getBooleanPrefOrDefault(
      OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
      true,
    ),
    dashboardAutoSetup: getBooleanPrefOrDefault(
      OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
      true,
    ),
    ids: {
      connectionStatusId: OBSIDIAN_CONNECTION_STATUS_ID,
      appPathInputId: OBSIDIAN_APP_PATH_INPUT_ID,
      vaultRootInputId: OBSIDIAN_VAULT_ROOT_INPUT_ID,
      notesDirInputId: OBSIDIAN_NOTES_DIR_INPUT_ID,
      assetsDirInputId: OBSIDIAN_ASSETS_DIR_INPUT_ID,
      connectionTestButtonId: OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
      connectionTestResultId: OBSIDIAN_CONNECTION_TEST_RESULT_ID,
      vaultRootHintId: OBSIDIAN_VAULT_ROOT_HINT_ID,
      notesDirHintId: OBSIDIAN_NOTES_DIR_HINT_ID,
      assetsDirHintId: OBSIDIAN_ASSETS_DIR_HINT_ID,
      dashboardDirHintId: OBSIDIAN_DASHBOARD_DIR_HINT_ID,
      dashboardDirInputId: OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
      fileNameTemplateInputId: OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID,
      fileNamePreviewId: OBSIDIAN_FILE_NAME_PREVIEW_ID,
      fileNameContextId: OBSIDIAN_FILE_NAME_CONTEXT_ID,
      previewTriggerId: OBSIDIAN_PREVIEW_TRIGGER_ID,
      previewMetaId: OBSIDIAN_PREVIEW_META_ID,
      previewFileId: OBSIDIAN_PREVIEW_FILE_ID,
      previewFrontmatterId: OBSIDIAN_PREVIEW_FRONTMATTER_ID,
      previewBodyId: OBSIDIAN_PREVIEW_BODY_ID,
      syncSummaryId: OBSIDIAN_SYNC_SUMMARY_ID,
      contentSummaryId: OBSIDIAN_CONTENT_SUMMARY_ID,
      autoSyncInputId: OBSIDIAN_AUTO_SYNC_INPUT_ID,
      watchFilesInputId: OBSIDIAN_WATCH_FILES_INPUT_ID,
      revealAfterSyncInputId: OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
      openAfterSyncInputId: OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
      includeMetadataInputId: OBSIDIAN_INCLUDE_METADATA_INPUT_ID,
      includeAbstractInputId: OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID,
      includeAnnotationsInputId: OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID,
      includeHiddenInfoInputId: OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID,
      includeChildNotesInputId: OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID,
      translateMissingMetadataInputId:
        OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID,
      translateMissingTitleInputId: OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
      translateMissingAbstractInputId:
        OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
      itemTemplateDisplayId: OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID,
      frontmatterSummaryId: OBSIDIAN_FRONTMATTER_SUMMARY_ID,
      frontmatterFieldListId: OBSIDIAN_FRONTMATTER_FIELD_LIST_ID,
      metadataPresetSelectId: OBSIDIAN_METADATA_PRESET_SELECT_ID,
      metadataPresetNameInputId: OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID,
      metadataPresetSectionId: OBSIDIAN_METADATA_PRESET_SECTION_ID,
      metadataPresetSearchId: OBSIDIAN_METADATA_PRESET_SEARCH_ID,
      metadataPresetSummaryId: OBSIDIAN_METADATA_PRESET_SUMMARY_ID,
      metadataPresetFieldListId: OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID,
      metadataPresetSaveButtonId: OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID,
      metadataPresetDuplicateButtonId:
        OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID,
      metadataPresetDeleteButtonId: OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID,
      metadataPresetResetButtonId: OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID,
      metadataPresetResyncButtonId: OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID,
      childNotePromptSelectInputId: OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
      childNoteTagsInputId: OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
      dashboardAutoSetupInputId: OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
    },
    groupNames: {
      updateStrategy: OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME,
      syncScope: OBSIDIAN_SYNC_SCOPE_GROUP_NAME,
    },
  });
}

export function renderObsidianSettingsShell(prefDoc: Document) {
  const root = getObsidianSettingsRoot(prefDoc);
  if (!root) {
    return false;
  }
  try {
    delete (root as HTMLElement).dataset.obPrefsBound;
    replacePrefHTML(root, getObsidianSettingsShellMarkup(prefDoc));
  } catch (error) {
    ztoolkit.log("[obsidian prefs render]", error);
    root.textContent =
      cleanInline((error as Error)?.message || "") ||
      uiText(
        "Obsidian 设置页渲染失败，请查看插件日志。",
        "Failed to render Obsidian settings. Check plugin logs.",
      );
    return false;
  }
  return true;
}

export function hydrateStaticObsidianPrefsControls() {
  const { appPath, vaultRoot, notesDir, assetsDir, dashboardDir } =
    getObsidianResolvedPaths();
  setPrefElementValue(OBSIDIAN_APP_PATH_INPUT_ID, appPath);
  setPrefElementValue(OBSIDIAN_VAULT_ROOT_INPUT_ID, vaultRoot);
  setPrefElementValue(OBSIDIAN_NOTES_DIR_INPUT_ID, notesDir);
  setPrefElementValue(OBSIDIAN_ASSETS_DIR_INPUT_ID, assetsDir);
  setPrefElementValue(OBSIDIAN_DASHBOARD_DIR_INPUT_ID, dashboardDir);
  setPrefElementValue(
    OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID,
    getManagedFileNamePattern(),
  );
  setPrefElementChecked(
    OBSIDIAN_INCLUDE_METADATA_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_INCLUDE_METADATA_PREF, true),
  );
  setPrefElementChecked(
    OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_INCLUDE_ABSTRACT_PREF, true),
  );
  setPrefElementChecked(
    OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_INCLUDE_ANNOTATIONS_PREF, true),
  );
  setPrefElementChecked(
    OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF, true),
  );
  setPrefElementChecked(
    OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_INCLUDE_CHILD_NOTES_PREF, true),
  );
  const translationEnabled = getBooleanPrefOrDefault(
    OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF,
    false,
  );
  setPrefElementChecked(
    OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID,
    translationEnabled,
  );
  setPrefElementChecked(
    OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF, false),
  );
  setPrefElementChecked(
    OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF, false),
  );
  const titleInput = getPrefElement<HTMLInputElement>(
    OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
  );
  const abstractInput = getPrefElement<HTMLInputElement>(
    OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
  );
  if (titleInput) titleInput.disabled = !translationEnabled;
  if (abstractInput) abstractInput.disabled = !translationEnabled;
  setPrefElementChecked(
    OBSIDIAN_AUTO_SYNC_INPUT_ID,
    getBooleanPrefOrDefault("obsidian.autoSync", true),
  );
  setPrefElementChecked(
    OBSIDIAN_WATCH_FILES_INPUT_ID,
    getBooleanPrefOrDefault("obsidian.watchFiles", true),
  );
  setPrefElementChecked(
    OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
    getBooleanPrefOrDefault("obsidian.openAfterSync", true),
  );
  setPrefElementChecked(
    OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
    getBooleanPrefOrDefault("obsidian.revealAfterSync", false),
  );
  setPrefElementChecked(
    OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, true),
  );
  setPrefElementChecked(
    OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
    getBooleanPrefOrDefault(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, true),
  );
  setPrefElementValue(
    OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
    getStringPrefOrDefault(
      OBSIDIAN_CHILD_NOTE_TAGS_PREF,
      DEFAULT_CHILD_NOTE_TAGS.join(", "),
    ),
  );
  setPrefRadioValue(
    OBSIDIAN_SYNC_SCOPE_GROUP_NAME,
    normalizeObsidianSyncScope(String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || "")),
  );
  setPrefRadioValue(
    OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME,
    normalizeObsidianUpdateStrategy(
      String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
    ),
  );
}
