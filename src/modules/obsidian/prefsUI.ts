import { config } from "../../../package.json";
import { showHint } from "../../utils/hint";
import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";
import { fileExists, formatPath, jointPath } from "../../utils/str";
import { openTemplatePicker } from "../../utils/templatePicker";
import {
  repairObsidianManagedLinks,
  resyncAllManagedObsidianNotes,
  syncSelectedItemsToObsidian,
} from "./sync";
import { setupObsidianDashboards } from "./dashboard";
import {
  DEFAULT_MANAGED_FRONTMATTER_FIELDS,
  DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
  deriveObsidianPathDefaults,
  FIXED_MANAGED_FRONTMATTER_KEYS,
  isObsidianConfigured,
  MANAGED_FRONTMATTER_OPTIONS,
  MANAGED_FRONTMATTER_PRESETS,
  METADATA_SECTION_OPTIONS,
  ManagedFrontmatterOptionGroup,
  ManagedFrontmatterOptionKey,
  MetadataPresetProfile,
  MetadataSectionKey,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
  OBSIDIAN_DASHBOARD_DIR_PREF,
  OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID,
  OBSIDIAN_FILE_NAME_TEMPLATE_PREF,
  OBSIDIAN_FRONTMATTER_FIELD_LIST_ID,
  OBSIDIAN_FRONTMATTER_FIELDS_PREF,
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
  OBSIDIAN_SETUP_WIZARD_SHOWN_PREF,
  OBSIDIAN_PREFS_RENDER_RETRY_LIMIT,
  OBSIDIAN_SYNC_SCOPE_PREF,
  OBSIDIAN_SYNC_SCOPE_SELECT_ID,
  OBSIDIAN_UPDATE_STRATEGY_PREF,
  cloneDefaultMetadataPreset,
  cloneMetadataPreset,
  createMetadataPresetID,
  getActiveMetadataPresetProfile,
  getBooleanPrefOrDefault,
  getFieldLabel,
  getConfiguredFields,
  getManagedFrontmatterFields,
  getManagedFrontmatterOptionLabel,
  getManagedFrontmatterPresetLabel,
  getManagedNoteContentConfig,
  getMetadataFieldCatalog,
  getMetadataPreset,
  getMetadataPresetLibrary,
  getMetadataPresetSectionLabel,
  getObsidianItemTemplateLabel,
  getStringPrefOrDefault,
  hasTemplateByName,
  normalizeObsidianSyncScope,
  normalizeObsidianUpdateStrategy,
  persistMetadataPresetLibrary,
  resolveManagedFrontmatterPreset,
  resolveObsidianItemTemplateName,
  setManagedFrontmatterFields,
  writeObsidianConnectionTestFile,
} from "./settings";
import {
  DEFAULT_CHILD_NOTE_TAGS,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
  OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_TAGS_PREF,
  ensureChildNoteHeading,
  getChildNoteDisplayTitle,
  getTopItemPreferredTitle,
} from "./childNotes";
import { buildFrontmatter, buildManagedFrontmatterData } from "./frontmatter";
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
} from "./markdown";
import {
  buildManagedObsidianFileName,
  ensureMarkdownExtension,
  findExistingObsidianNote,
  getAttachmentRelativeDir,
  getManagedFileNamePattern,
  getManagedObsidianUniqueKey,
  getLastPathSegment,
  sanitizeFileNamePart,
} from "./paths";
import { buildObsidianSettingsShellHTML } from "./prefsUI/layout";
import { buildObsidianPrefsStyleText } from "./prefsUI/style";
import { cleanInline } from "./shared";
import { getManagedObsidianNoteForItem, getMatchedChildNotes } from "./managed";

// ── Sub-module imports (extracted state & helpers) ──
import {
  OBSIDIAN_SETTINGS_ROOT_ID,
  OBSIDIAN_SETTINGS_STYLE_ID,
  OBSIDIAN_TOOLTIP_ID,
  OBSIDIAN_APP_PATH_INPUT_ID,
  OBSIDIAN_VAULT_ROOT_INPUT_ID,
  OBSIDIAN_NOTES_DIR_INPUT_ID,
  OBSIDIAN_ASSETS_DIR_INPUT_ID,
  OBSIDIAN_AUTO_SYNC_INPUT_ID,
  OBSIDIAN_WATCH_FILES_INPUT_ID,
  OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
  OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
  OBSIDIAN_CONNECTION_STATUS_ID,
  OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  OBSIDIAN_CONNECTION_TEST_RESULT_ID,
  OBSIDIAN_VAULT_ROOT_HINT_ID,
  OBSIDIAN_NOTES_DIR_HINT_ID,
  OBSIDIAN_ASSETS_DIR_HINT_ID,
  OBSIDIAN_DASHBOARD_DIR_HINT_ID,
  OBSIDIAN_FILE_NAME_RULE_ID,
  OBSIDIAN_FILE_NAME_PREVIEW_ID,
  OBSIDIAN_FILE_NAME_CONTEXT_ID,
  OBSIDIAN_PREVIEW_TRIGGER_ID,
  OBSIDIAN_PREVIEW_META_ID,
  OBSIDIAN_PREVIEW_FILE_ID,
  OBSIDIAN_PREVIEW_FRONTMATTER_ID,
  OBSIDIAN_PREVIEW_BODY_ID,
  OBSIDIAN_SYNC_SUMMARY_ID,
  OBSIDIAN_CONTENT_SUMMARY_ID,
  OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME,
  OBSIDIAN_SYNC_SCOPE_GROUP_NAME,
  obsidianPrefsState,
  metadataPresetEditorState,
  setMetadataPresetEditorState,
  obsidianPrefsRenderRetryCount,
  resetObsidianPrefsRenderRetryCount,
  incrementObsidianPrefsRenderRetryCount,
  obsidianSetupWizardPromise,
  setObsidianSetupWizardPromise,
  type ObsidianPrefsTab,
} from "./prefsUI/state";

import {
  getPrefWindowDocument,
  setPrefElementValue,
  setPrefElementChecked,
  getPrefElement,
  getObsidianPromptWindow,
  promptChoice,
  promptSelectIndex,
  pickObsidianFolderManually,
  confirmObsidianVaultRoot,
  buildCurrentObsidianSetupDraft,
  applyObsidianSetupDraft,
  chooseDetectedObsidianVault,
  createPrefHTMLElement,
  replacePrefHTML,
  setPrefRadioValue,
  uiText,
  escapePrefHTML,
  getObsidianResolvedPaths,
  getObsidianSettingsRoot,
} from "./prefsUI/helpers";

// ── Template selection helpers ──

async function chooseObsidianItemTemplate(
  currentTemplate = resolveObsidianItemTemplateName(),
) {
  const templateNames = await getObsidianItemTemplateCandidates(currentTemplate);
  const selectedTemplates = await openTemplatePicker({
    templates: templateNames,
    selected: [currentTemplate],
  });
  return cleanInline(selectedTemplates[0] || "");
}

function getUserTemplateNames() {
  return Array.from(
    new Set(
      addon.api.template
        .getTemplateKeys()
        .map((templateName) => cleanInline(templateName))
        .filter(
          (templateName) =>
            Boolean(templateName) &&
            !addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(templateName),
        ),
    ),
  );
}

function isDryRunTemplateError(rendered: string) {
  return cleanInline(rendered).startsWith("Template Preview Error:");
}

async function getObsidianItemTemplateCandidates(
  currentTemplate = resolveObsidianItemTemplateName(),
) {
  const templateNames = getUserTemplateNames();
  const previewTopItem = getPreviewSourceItem();

  if (!previewTopItem || !previewTopItem.id) {
    return Array.from(
      new Set([currentTemplate, ...templateNames].filter(Boolean)),
    );
  }
  const previewTopItemID = previewTopItem.id;

  const runnableTemplates: string[] = [];
  for (const templateName of templateNames) {
    try {
      const renderedTemplate = await addon.api.template.runItemTemplate(
        templateName,
        {
          itemIds: [previewTopItemID],
          dryRun: true,
        },
      );
      if (!isDryRunTemplateError(renderedTemplate || "")) {
        runnableTemplates.push(templateName);
      }
    } catch (e) {
      ztoolkit.log("[obsidian prefs item template check]", templateName, e);
    }
  }

  const candidates = Array.from(
    new Set([currentTemplate, ...runnableTemplates].filter(Boolean)),
  );
  return candidates.length
    ? candidates
    : Array.from(new Set([currentTemplate, ...templateNames].filter(Boolean)));
}

async function autoDetectObsidianVault(
  options: { promptWindow?: Window | null; allowManualFallback?: boolean } = {},
) {
  const promptWindow = getObsidianPromptWindow(options.promptWindow);
  const detectedVault = await chooseDetectedObsidianVault(promptWindow);
  if (detectedVault) {
    const defaults = deriveObsidianPathDefaults(detectedVault.path);
    applyObsidianSetupDraft(
      {
        ...buildCurrentObsidianSetupDraft(),
        vaultRoot: detectedVault.path,
        notesDir: defaults.notesDir,
        assetsDir: defaults.assetsDir,
        dashboardDir: defaults.dashboardDir,
      },
      { overwriteExisting: false },
    );
    refreshObsidianPrefsUI();
    showHint(
      uiText(
        `已检测并设置 Vault：${detectedVault.name}。`,
        `Detected and set vault: ${detectedVault.name}.`,
      ),
    );
    return true;
  }

  if (!options.allowManualFallback) {
    showHint(
      uiText(
        "没有在常见位置找到 Obsidian vault。",
        "No Obsidian vault was found in common locations.",
      ),
    );
    return false;
  }

  const pickedVaultRoot = await pickObsidianFolderManually(
    uiText("手动选择 Obsidian Vault", "Choose Obsidian Vault"),
    cleanInline(String(getPref("obsidian.vaultRoot") || "")),
    promptWindow,
  );
  if (!pickedVaultRoot) {
    return false;
  }
  if (!(await confirmObsidianVaultRoot(pickedVaultRoot, promptWindow))) {
    return false;
  }

  const defaults = deriveObsidianPathDefaults(pickedVaultRoot);
  applyObsidianSetupDraft(
    {
      ...buildCurrentObsidianSetupDraft(),
      vaultRoot: pickedVaultRoot,
      notesDir: defaults.notesDir,
      assetsDir: defaults.assetsDir,
      dashboardDir: defaults.dashboardDir,
    },
    { overwriteExisting: false },
  );
  refreshObsidianPrefsUI();
  showHint(
    uiText(
      `已手动设置 Vault：${getLastPathSegment(pickedVaultRoot) || pickedVaultRoot}。`,
      `Vault set to ${getLastPathSegment(pickedVaultRoot) || pickedVaultRoot}.`,
    ),
  );
  return true;
}

async function runObsidianSetupWizard(
  options: { autoTriggered?: boolean; promptWindow?: Window | null } = {},
) {
  if (obsidianSetupWizardPromise) {
    return obsidianSetupWizardPromise;
  }

  setObsidianSetupWizardPromise((async () => {
    const promptWindow = getObsidianPromptWindow(options.promptWindow);
    const currentDraft = buildCurrentObsidianSetupDraft();
    let vaultRoot = currentDraft.vaultRoot;

    const detectedVault = await chooseDetectedObsidianVault(promptWindow);
    if (detectedVault) {
      vaultRoot = detectedVault.path;
    } else {
      const pickedVaultRoot = await pickObsidianFolderManually(
        uiText("选择 Obsidian Vault", "Choose Obsidian Vault"),
        currentDraft.vaultRoot,
        promptWindow,
      );
      if (!pickedVaultRoot) {
        return false;
      }
      if (!(await confirmObsidianVaultRoot(pickedVaultRoot, promptWindow))) {
        return false;
      }
      vaultRoot = pickedVaultRoot;
    }

    const defaults = deriveObsidianPathDefaults(vaultRoot);
    let notesDir = defaults.notesDir;
    let dashboardDir = defaults.dashboardDir;
    let dashboardAutoSetup = true;
    let selectedTemplate =
      currentDraft.itemTemplate || DEFAULT_OBSIDIAN_ITEM_TEMPLATE;

    const notesChoice = promptChoice({
      title: uiText("配置文献笔记目录", "Choose Literature Notes Folder"),
      text: uiText(
        `推荐把文献笔记放在：\n${defaults.notesDir}\n\n是否使用这个推荐位置？`,
        `Recommended literature notes folder:\n${defaults.notesDir}\n\nUse this recommended location?`,
      ),
      buttons: [
        uiText("使用推荐位置", "Use Recommended"),
        uiText("自定义目录", "Choose Custom"),
        uiText("取消向导", "Cancel Wizard"),
      ],
      window: promptWindow,
    });
    if (notesChoice === 2) {
      return false;
    }
    if (notesChoice === 1) {
      notesDir =
        (await pickObsidianFolderManually(
          uiText("选择文献笔记目录", "Choose Literature Notes Folder"),
          defaults.notesDir,
          promptWindow,
        )) || defaults.notesDir;
    }

    const templateChoice = promptChoice({
      title: uiText("配置文献模板", "Choose Literature Template"),
      text: uiText(
        `推荐模板：${DEFAULT_OBSIDIAN_ITEM_TEMPLATE}\n当前模板：${currentDraft.itemTemplate || DEFAULT_OBSIDIAN_ITEM_TEMPLATE}`,
        `Recommended template: ${DEFAULT_OBSIDIAN_ITEM_TEMPLATE}\nCurrent template: ${currentDraft.itemTemplate || DEFAULT_OBSIDIAN_ITEM_TEMPLATE}`,
      ),
      buttons: [
        uiText("使用推荐模板", "Use Recommended"),
        uiText("选择其他模板", "Choose Another"),
        uiText("保留当前", "Keep Current"),
      ],
      window: promptWindow,
    });
    if (templateChoice === 0) {
      selectedTemplate = DEFAULT_OBSIDIAN_ITEM_TEMPLATE;
    } else if (templateChoice === 1) {
      selectedTemplate =
        (await chooseObsidianItemTemplate(selectedTemplate)) ||
        selectedTemplate;
    }

    const dashboardChoice = promptChoice({
      title: uiText("配置 Dashboard", "Choose Dashboard Setup"),
      text: uiText(
        `推荐 Dashboard 目录：\n${defaults.dashboardDir}\n\n是否启用并自动生成 Dashboard？`,
        `Recommended dashboard folder:\n${defaults.dashboardDir}\n\nEnable and auto-generate dashboards?`,
      ),
      buttons: [
        uiText("启用推荐目录", "Enable Recommended"),
        uiText("自定义目录", "Choose Custom"),
        uiText("暂不启用", "Skip for Now"),
      ],
      window: promptWindow,
    });
    if (dashboardChoice === 1) {
      dashboardDir =
        (await pickObsidianFolderManually(
          uiText("选择 Dashboard 目录", "Choose Dashboard Folder"),
          defaults.dashboardDir,
          promptWindow,
        )) || defaults.dashboardDir;
      dashboardAutoSetup = true;
    } else if (dashboardChoice === 2) {
      dashboardDir = defaults.dashboardDir;
      dashboardAutoSetup = false;
    }

    applyObsidianSetupDraft(
      {
        vaultRoot,
        notesDir,
        assetsDir: defaults.assetsDir,
        dashboardDir,
        dashboardAutoSetup,
        itemTemplate: selectedTemplate,
      },
      { overwriteExisting: true },
    );
    setPref(OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, true);
    refreshObsidianPrefsUI();
    renderSyncSummary();
    markPreviewStale();

    try {
      const result = await writeObsidianConnectionTestFile();
      showHint(
        uiText(
          `配置完成，已写入测试文件 ${result.fileName}。`,
          `Setup completed and wrote test file ${result.fileName}.`,
        ),
      );
    } catch (error) {
      showHint(
        cleanInline((error as Error)?.message || "") ||
          uiText(
            "配置已保存，但连接测试失败，请检查路径和权限。",
            "Setup was saved, but the connection test failed. Check the paths and permissions.",
          ),
      );
    }

    return true;
  })().finally(() => {
    setObsidianSetupWizardPromise(null);
  }));

  return obsidianSetupWizardPromise;
}

async function maybeAutoRunObsidianSetupWizard(
  win?: _ZoteroTypes.MainWindow | null,
) {
  const normalizedProfileDir = cleanInline(
    String((Zotero as any).profileDir || ""),
  )
    .replace(/\\/g, "/")
    .toLowerCase();
  if (
    (Zotero as any).automatedTest ||
    normalizedProfileDir.includes("/.scaffold/test/profile")
  ) {
    return false;
  }
  if (win && win !== Zotero.getMainWindow()) {
    return false;
  }
  if (
    isObsidianConfigured() ||
    getBooleanPrefOrDefault(OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, false)
  ) {
    return false;
  }

  setPref(OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, true);
  const index = promptChoice({
    title: uiText("首次配置 Obsidian", "Set Up Obsidian"),
    text: uiText(
      "检测到你还没有配置 Obsidian Vault。是否现在启动快速配置向导？",
      "It looks like Obsidian has not been configured yet. Start the quick setup wizard now?",
    ),
    buttons: [uiText("开始配置", "Start Setup"), uiText("稍后再说", "Later")],
    window: win || null,
  });
  if (index !== 0) {
    return false;
  }

  return runObsidianSetupWizard({
    autoTriggered: true,
    promptWindow: win || null,
  });
}

function setStaticPrefText(root: Element, selector: string, text: string) {
  const element = root.querySelector<HTMLElement>(selector);
  if (element) {
    element.textContent = text;
  }
}

function setStaticPrefLabelText(root: Element, inputId: string, text: string) {
  setStaticPrefText(root, `label[for="${inputId}"] span`, text);
}

function setStaticPrefChoiceText(
  root: Element,
  selector: string,
  text: string,
) {
  const input = root.querySelector<HTMLElement>(selector);
  const label = input?.closest("label")?.querySelector<HTMLElement>("span");
  if (label) {
    label.textContent = text;
  }
}

function localizeStaticObsidianPrefsUI(prefDoc: Document) {
  const root = getObsidianSettingsRoot(prefDoc);
  if (!root) {
    return;
  }

  setStaticPrefText(
    root,
    '[data-ob-tooltip="connection-overview"]',
    uiText("连接", "Connection"),
  );
  setStaticPrefText(
    root,
    `#${OBSIDIAN_CONNECTION_TEST_BUTTON_ID}`,
    uiText("测试写入一个文件", "Write a Test File"),
  );
  setStaticPrefLabelText(
    root,
    OBSIDIAN_APP_PATH_INPUT_ID,
    getString("obsidian-appPath-label"),
  );
  setStaticPrefLabelText(
    root,
    OBSIDIAN_VAULT_ROOT_INPUT_ID,
    getString("obsidian-vaultRoot-label"),
  );
  setStaticPrefLabelText(
    root,
    OBSIDIAN_NOTES_DIR_INPUT_ID,
    getString("obsidian-notesDir-label"),
  );
  setStaticPrefLabelText(
    root,
    OBSIDIAN_ASSETS_DIR_INPUT_ID,
    getString("obsidian-assetsDir-label"),
  );
  setStaticPrefLabelText(
    root,
    OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
    getString("obsidian-dashboardDir-label"),
  );
  setStaticPrefText(
    root,
    '[data-ob-action="pick-app"]',
    getString("obsidian-pickFile", "label"),
  );
  ["pick-vault", "pick-notes", "pick-assets", "pick-dashboard"].forEach(
    (action) => {
      setStaticPrefText(
        root,
        `[data-ob-action="${action}"]`,
        getString("obsidian-pickFolder", "label"),
      );
    },
  );
  setStaticPrefText(
    root,
    '[data-ob-action="detect-vault"]',
    uiText("自动检测 Vault", "Auto Detect Vault"),
  );
  setStaticPrefText(
    root,
    '[data-ob-action="run-setup-wizard"]',
    uiText("运行配置向导", "Run Setup Wizard"),
  );

  setStaticPrefText(
    root,
    '[data-ob-tooltip="note-structure-overview"]',
    uiText("笔记内容", "Note Content"),
  );
  setStaticPrefText(
    root,
    '[data-ob-action="pick-template"]',
    getString("obsidian-itemTemplate-pick", "label"),
  );
  setStaticPrefText(
    root,
    '[data-ob-action="edit-template"]',
    uiText("编辑模板", "Edit Template"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_INCLUDE_METADATA_INPUT_ID}`,
    uiText("元数据", "Metadata"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID}`,
    uiText("摘要", "Abstract"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID}`,
    uiText("PDF 批注", "PDF Annotations"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID}`,
    uiText("隐藏字段", "Hidden Fields"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID}`,
    uiText("子笔记", "Child Notes"),
  );
  setStaticPrefText(
    root,
    `#${OBSIDIAN_PREVIEW_TRIGGER_ID}`,
    uiText("生成预览", "Generate Preview"),
  );
  const previewFileLabel = getPrefElement<HTMLElement>(
    OBSIDIAN_PREVIEW_FILE_ID,
  )?.previousElementSibling;
  if (previewFileLabel) {
    previewFileLabel.textContent = uiText("文件名", "Filename");
  }

  setStaticPrefText(
    root,
    '[data-ob-tooltip="sync-overview"]',
    uiText("文件与同步", "File & Sync"),
  );
  setStaticPrefText(
    root,
    '[data-ob-tooltip="sync-scope"]',
    getString("obsidian-syncScope-label"),
  );
  setStaticPrefChoiceText(
    root,
    `input[name="${OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"][value="selection"]`,
    getString("obsidian-syncScope-selection"),
  );
  setStaticPrefChoiceText(
    root,
    `input[name="${OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"][value="currentList"]`,
    getString("obsidian-syncScope-currentList"),
  );
  setStaticPrefChoiceText(
    root,
    `input[name="${OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"][value="library"]`,
    getString("obsidian-syncScope-library"),
  );
  setStaticPrefText(
    root,
    '[data-ob-tooltip="update-strategy"]',
    uiText("更新策略", "Update Strategy"),
  );
  setStaticPrefChoiceText(
    root,
    `input[name="${OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"][value="managed"]`,
    uiText("只更新托管区（推荐）", "Update managed blocks only"),
  );
  setStaticPrefChoiceText(
    root,
    `input[name="${OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"][value="overwrite"]`,
    uiText("覆盖全部内容", "Overwrite everything"),
  );
  setStaticPrefChoiceText(
    root,
    `input[name="${OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"][value="skip"]`,
    uiText("跳过已有笔记", "Skip existing notes"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_AUTO_SYNC_INPUT_ID}`,
    getString("obsidian-autoSync", "label"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID}`,
    getString("obsidian-openAfterSync", "label"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID}`,
    getString("obsidian-revealAfterSync", "label"),
  );
  setStaticPrefText(
    root,
    '[data-ob-action="sync-now"]',
    getString("obsidian-syncNow", "label"),
  );

  setStaticPrefText(
    root,
    '[data-ob-tooltip="advanced-overview"]',
    uiText("操作与维护", "Operations"),
  );
  setStaticPrefText(
    root,
    '[data-ob-tooltip="frontmatter-fields"]',
    uiText("Frontmatter 字段", "Frontmatter Fields"),
  );
  setStaticPrefText(
    root,
    '[data-ob-tooltip="metadata-preset"]',
    getString("obsidian-metadataPreset-title"),
  );
  setStaticPrefText(
    root,
    `label[for="${OBSIDIAN_METADATA_PRESET_SELECT_ID}"]`,
    getString("obsidian-metadataPreset-active-label"),
  );
  setStaticPrefText(
    root,
    `label[for="${OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID}"]`,
    getString("obsidian-metadataPreset-name-label"),
  );
  setStaticPrefText(
    root,
    `label[for="${OBSIDIAN_METADATA_PRESET_SECTION_ID}"]`,
    getString("obsidian-metadataPreset-itemType-label"),
  );
  setStaticPrefText(
    root,
    `label[for="${OBSIDIAN_METADATA_PRESET_SEARCH_ID}"]`,
    getString("obsidian-metadataPreset-search-label"),
  );
  setStaticPrefText(
    root,
    `#${OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID}`,
    getString("obsidian-metadataPreset-save", "label"),
  );
  setStaticPrefText(
    root,
    `#${OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID}`,
    getString("obsidian-metadataPreset-saveAs", "label"),
  );
  setStaticPrefText(
    root,
    `#${OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID}`,
    getString("obsidian-metadataPreset-reset", "label"),
  );
  setStaticPrefText(
    root,
    `#${OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID}`,
    getString("obsidian-metadataPreset-delete", "label"),
  );
  setStaticPrefText(
    root,
    `#${OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID}`,
    getString("obsidian-metadataPreset-resync", "label"),
  );
  setStaticPrefLabelText(
    root,
    OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
    getString("obsidian-childNotes-tags-label"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID}`,
    getString("obsidian-childNotes-promptSelect", "label"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID}`,
    getString("obsidian-dashboardAutoSetup", "label"),
  );
  setStaticPrefText(
    root,
    '[data-ob-action="setup-dashboard"]',
    getString("obsidian-setupDashboards", "label"),
  );
  setStaticPrefText(
    root,
    '[data-ob-action="repair-links"]',
    getString("obsidian-repairManagedLinks", "label"),
  );
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

function getObsidianTooltipText(key: string) {
  const tooltip = OBSIDIAN_TOOLTIP_TEXT[cleanInline(key)];
  return tooltip ? uiText(tooltip.zh, tooltip.en) : "";
}

function hydrateTooltipTargets() {
  const doc = getPrefWindowDocument();
  if (!doc) {
    return;
  }
  const root = getObsidianSettingsRoot(doc);
  if (!root) {
    return;
  }
  root.querySelectorAll<HTMLElement>("[data-ob-tooltip]").forEach((element) => {
    const tooltip = getObsidianTooltipText(element.dataset.obTooltip || "");
    element.classList.add("ob-prefs-tooltipTarget");
    if (!tooltip) {
      element.removeAttribute("aria-label");
      return;
    }
    element.setAttribute("aria-label", tooltip);
  });
}

function ensureObsidianTooltipNode(doc: Document) {
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

function positionObsidianTooltip(
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

function getPreviewSourceItem() {
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
        sectionBlocks.push(`![p.${cleanInline(annotationItem.annotationPageLabel) || annotationItem.key}](../assets/zotero/annotation-${annotationItem.key}.png)`);
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

function buildPreviewSignature(topItem?: Zotero.Item | false) {
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

function renderConnectionTestResult() {
  const result = getPrefElement<HTMLElement>(
    OBSIDIAN_CONNECTION_TEST_RESULT_ID,
  );
  const button = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  );
  if (!result || !button) {
    return;
  }

  button.disabled = obsidianPrefsState.connectionTest.status === "running";
  const hasMessage = Boolean(
    cleanInline(obsidianPrefsState.connectionTest.message),
  );
  result.hidden = !hasMessage;
  result.className = `ob-bridge-feedback ob-bridge-feedback--${obsidianPrefsState.connectionTest.status}`;
  result.textContent = obsidianPrefsState.connectionTest.message;
}

function renderPreviewPanel() {
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
  if (preview.status === "loading") {
    trigger.textContent = uiText("正在生成…", "Generating...");
  } else {
    trigger.textContent = uiText("生成预览", "Generate Preview");
  }
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

function markPreviewStale(
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

function renderFileNamePreview() {
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

function renderContentSummary() {
  const summary = getPrefElement<HTMLElement>(OBSIDIAN_CONTENT_SUMMARY_ID);
  if (!summary) {
    return;
  }
  summary.textContent = uiText(
    `同步内容：${getEnabledContentLabels().join("、")}`,
    `Sync content: ${getEnabledContentLabels().join(", ")}`,
  );
}

function renderSyncSummary() {
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

  summary.textContent = uiText(
    `范围：${getScopeLabel(scope)} · 更新：${getUpdateStrategyLabel(
      strategy,
    )} · 目录：${notesDir || uiText("未设置", "Not set")}${
      behaviors.length ? ` · 自动：${behaviors.join("、")}` : ""
    }`,
    `Scope: ${getScopeLabel(scope)} · Mode: ${getUpdateStrategyLabel(
      strategy,
    )} · Folder: ${notesDir || "Not set"}${
      behaviors.length ? ` · Auto: ${behaviors.join(", ")}` : ""
    }`,
  );
}

function switchObsidianPrefsTab(tab: ObsidianPrefsTab) {
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

function renderConnectionStatus() {
  const status = getPrefElement<HTMLElement>(OBSIDIAN_CONNECTION_STATUS_ID);
  if (!status) {
    return;
  }
  status.className = "ob-bridge-status";
  status.replaceChildren();
  const doc = status.ownerDocument;
  const pill = createPrefHTMLElement(doc, "span");
  pill.className = `ob-bridge-status__pill ob-bridge-status__pill--${obsidianPrefsState.connection.status}`;
  pill.textContent =
    obsidianPrefsState.connection.title ||
    uiText("等待检查", "Waiting for check");
  status.appendChild(pill);
  if (obsidianPrefsState.connection.detail) {
    const detail = createPrefHTMLElement(doc, "span");
    detail.className = "ob-bridge-status__detail";
    detail.textContent = obsidianPrefsState.connection.detail;
    status.appendChild(detail);
  }
}

async function updateConnectionDiagnostics() {
  const requestId = ++obsidianPrefsState.connectionRequest;
  const { appPath, vaultRoot, notesDir } = getObsidianResolvedPaths();

  obsidianPrefsState.connection.status = "checking";
  obsidianPrefsState.connection.title = uiText(
    "正在检查连接…",
    "Checking connection...",
  );
  obsidianPrefsState.connection.detail = "";
  renderConnectionStatus();

  const [appExists, vaultExists] = await Promise.all([
    fileExists(appPath),
    fileExists(vaultRoot),
  ]);

  if (requestId !== obsidianPrefsState.connectionRequest) {
    return;
  }

  if (!notesDir) {
    obsidianPrefsState.connection.status = "error";
    obsidianPrefsState.connection.title = uiText("未就绪", "Not ready");
    obsidianPrefsState.connection.detail = uiText(
      "先设置 Vault 根目录或文献笔记目录。",
      "Set a vault root or notes folder first.",
    );
  } else if (vaultRoot && !vaultExists) {
    obsidianPrefsState.connection.status = "error";
    obsidianPrefsState.connection.title = uiText(
      "Vault 不可用",
      "Vault unavailable",
    );
    obsidianPrefsState.connection.detail = uiText(
      "当前 Vault 路径不存在。",
      "The configured vault path does not exist.",
    );
  } else if (appPath && !appExists) {
    obsidianPrefsState.connection.status = "warning";
    obsidianPrefsState.connection.title = uiText(
      "可写入，但应用路径异常",
      "Writable, but app path looks wrong",
    );
    obsidianPrefsState.connection.detail = uiText(
      "目录可用，但当前 Obsidian 应用路径不存在。",
      "Folders are ready, but the configured Obsidian app path does not exist.",
    );
  } else if (!vaultRoot) {
    obsidianPrefsState.connection.status = "warning";
    obsidianPrefsState.connection.title = uiText(
      "基础连接可用",
      "Basic connection ready",
    );
    obsidianPrefsState.connection.detail = uiText(
      "已可写入；补充 Vault 后可自动推导目录。",
      "Writable now. Adding the vault improves default path inference.",
    );
  } else {
    obsidianPrefsState.connection.status = "ready";
    obsidianPrefsState.connection.title = uiText("已连接", "Connected");
    obsidianPrefsState.connection.detail = "";
  }

  renderConnectionStatus();
}

async function testObsidianConnection() {
  obsidianPrefsState.connectionTest.status = "running";
  obsidianPrefsState.connectionTest.message = uiText(
    "测试写入中…",
    "Testing write access...",
  );
  renderConnectionTestResult();

  try {
    const result = await writeObsidianConnectionTestFile();
    obsidianPrefsState.connectionTest.status = "success";
    obsidianPrefsState.connectionTest.message = uiText(
      `已写入 ${result.fileName}。`,
      `Wrote ${result.fileName}.`,
    );
  } catch (error) {
    obsidianPrefsState.connectionTest.status = "error";
    obsidianPrefsState.connectionTest.message =
      cleanInline((error as Error)?.message || "") ||
      uiText(
        "测试失败，请检查路径和权限。",
        "Connection test failed. Check the path and permissions.",
      );
  }

  renderConnectionTestResult();
  await updateConnectionDiagnostics();
}

async function generateObsidianPreview() {
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
    const visibleFields = getConfiguredFields(
      getMetadataPreset().visible,
      context.itemType,
    );
    const hiddenFields = getConfiguredFields(
      getMetadataPreset().hidden,
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

async function pickObsidianItemTemplate() {
  const selectedTemplate = await chooseObsidianItemTemplate(
    resolveObsidianItemTemplateName(),
  );
  if (!selectedTemplate) {
    return;
  }
  setPref(OBSIDIAN_ITEM_TEMPLATE_PREF, selectedTemplate);
  refreshObsidianPrefsUI();
}

function renderObsidianItemTemplateSelection() {
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

function renderObsidianFrontmatterFieldConfigurator() {
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
        [
          "display:flex",
          "align-items:flex-start",
          "gap:10px",
          "padding:12px 14px",
          "border-radius:10px",
          "border:1px solid var(--material-border)",
          "background:rgba(255,255,255,0.02)",
          "cursor:pointer",
          "box-sizing:border-box",
          "min-height:78px",
        ].join(";"),
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

      const title = createPrefHTMLElement(doc, "div");
      title.textContent = getManagedFrontmatterOptionLabel(option.key);
      title.setAttribute("style", "font-weight:600;line-height:1.45;");
      content.appendChild(title);

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

function renderObsidianSyncScopeSelect() {
  const scopeSelect = getPrefElement<XULMenuListElement>(
    OBSIDIAN_SYNC_SCOPE_SELECT_ID,
  );
  if (!scopeSelect) {
    return;
  }

  const currentScope = normalizeObsidianSyncScope(
    String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""),
  );
  scopeSelect.value = currentScope;
  (scopeSelect as any).oncommand = () => {
    setPref(
      OBSIDIAN_SYNC_SCOPE_PREF,
      normalizeObsidianSyncScope(scopeSelect.value),
    );
  };
}

function ensureMetadataPresetEditorState() {
  const library = getMetadataPresetLibrary();
  const activeProfile = getActiveMetadataPresetProfile(library);
  if (
    !metadataPresetEditorState ||
    !library.presets.some(
      (profile) => profile.id === metadataPresetEditorState?.presetId,
    )
  ) {
    setMetadataPresetEditorState({
      presetId: activeProfile.id,
      presetName: activeProfile.name,
      sectionKey: "default",
      searchText: "",
      sortSelectedFirst: false,
      draftPreset: cloneMetadataPreset(activeProfile.preset),
    });
  }
  return metadataPresetEditorState!;
}

function getMetadataPresetFieldState(
  sectionKey: MetadataSectionKey,
  fieldKey: string,
) {
  const state = ensureMetadataPresetEditorState();
  return {
    visible: (state.draftPreset.visible[sectionKey] || []).includes(fieldKey),
    hidden: (state.draftPreset.hidden[sectionKey] || []).includes(fieldKey),
  };
}

function setDraftMetadataField(
  sectionKey: MetadataSectionKey,
  fieldKey: string,
  target: "visible" | "hidden",
  enabled: boolean,
) {
  const state = ensureMetadataPresetEditorState();
  const values = new Set(state.draftPreset[target][sectionKey] || []);
  if (enabled) {
    values.add(fieldKey);
  } else {
    values.delete(fieldKey);
  }
  state.draftPreset[target][sectionKey] = Array.from(values);
}

function renderMetadataPresetFieldList() {
  const state = ensureMetadataPresetEditorState();
  const container = getPrefElement<HTMLDivElement>(
    OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID,
  );
  const summary = getPrefElement<HTMLElement>(
    OBSIDIAN_METADATA_PRESET_SUMMARY_ID,
  );
  if (!container || !summary) {
    return;
  }

  const searchText = cleanInline(state.searchText).toLowerCase();
  const allFieldKeys = getMetadataFieldCatalog(
    state.sectionKey,
    state.draftPreset,
  );
  const fieldEntries = allFieldKeys
    .filter((fieldKey) => {
      if (!searchText) {
        return true;
      }
      return `${getFieldLabel(fieldKey)} ${fieldKey}`
        .toLowerCase()
        .includes(searchText);
    })
    .map((fieldKey, index) => {
      const fieldState = getMetadataPresetFieldState(
        state.sectionKey,
        fieldKey,
      );
      return {
        fieldKey,
        index,
        fieldState,
        selected: fieldState.visible || fieldState.hidden,
      };
    });
  if (state.sortSelectedFirst) {
    fieldEntries.sort((a, b) => {
      if (a.selected !== b.selected) {
        return a.selected ? -1 : 1;
      }
      return a.index - b.index;
    });
  }
  const fieldKeys = fieldEntries.map((entry) => entry.fieldKey);
  const visibleCount = (state.draftPreset.visible[state.sectionKey] || [])
    .length;
  const hiddenCount = (state.draftPreset.hidden[state.sectionKey] || []).length;
  const isExpanded = container.dataset.expanded !== "false";

  summary.textContent = uiText(
    `当前配置：${state.presetName || getString("obsidian-metadataPreset-untitledName")}；当前栏目：${getMetadataPresetSectionLabel(
      state.sectionKey,
    )}；字段 ${fieldKeys.length} / ${allFieldKeys.length}；Metadata ${visibleCount}；隐藏 ${hiddenCount}。`,
    `Preset: ${state.presetName || getString("obsidian-metadataPreset-untitledName")}; Section: ${getMetadataPresetSectionLabel(
      state.sectionKey,
    )}; Fields ${fieldKeys.length} / ${allFieldKeys.length}; Metadata ${visibleCount}; Hidden ${hiddenCount}.`,
  );

  container.replaceChildren();
  const doc = container.ownerDocument;
  const details = createPrefHTMLElement(doc, "details");
  details.className = "ob-bridge-metadataPicker";
  details.open = isExpanded;
  details.addEventListener("toggle", () => {
    container.dataset.expanded = details.open ? "true" : "false";
  });

  const pickerSummary = createPrefHTMLElement(doc, "summary");
  pickerSummary.className = "ob-bridge-metadataPicker__summary";
  const pickerTitle = createPrefHTMLElement(doc, "span");
  pickerTitle.className = "ob-bridge-metadataPicker__title";
  pickerTitle.textContent = uiText("字段选择器", "Field Picker");
  const pickerMeta = createPrefHTMLElement(doc, "span");
  pickerMeta.className = "ob-bridge-metadataPicker__meta";
  pickerMeta.textContent = uiText(
    `${getMetadataPresetSectionLabel(state.sectionKey)} · ${fieldKeys.length} / ${allFieldKeys.length} 项${
      state.sortSelectedFirst ? " · 已选优先" : ""
    }`,
    `${getMetadataPresetSectionLabel(state.sectionKey)} · ${fieldKeys.length} / ${allFieldKeys.length} items${
      state.sortSelectedFirst ? " · Selected first" : ""
    }`,
  );
  pickerSummary.title = uiText(
    "右键可切换已选字段优先排序",
    "Right-click to toggle selected-first sorting",
  );
  pickerSummary.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const nextState = ensureMetadataPresetEditorState();
    nextState.sortSelectedFirst = !nextState.sortSelectedFirst;
    renderMetadataPresetFieldList();
    showHint(
      nextState.sortSelectedFirst
        ? "已切换为已选优先排序。"
        : "已恢复默认字段顺序。",
    );
  });
  pickerSummary.appendChild(pickerTitle);
  pickerSummary.appendChild(pickerMeta);
  details.appendChild(pickerSummary);

  const panel = createPrefHTMLElement(doc, "div");
  panel.className = "ob-bridge-metadataPicker__panel";

  const header = createPrefHTMLElement(doc, "div");
  header.className = "ob-bridge-metadataPicker__head";
  for (const title of [
    uiText("字段", "Field"),
    uiText("元数据", "Meta"),
    uiText("隐藏", "Hidden"),
  ]) {
    const cell = createPrefHTMLElement(doc, "div");
    cell.textContent = title;
    header.appendChild(cell);
  }
  panel.appendChild(header);

  const list = createPrefHTMLElement(doc, "div");
  list.className = "ob-bridge-metadataPicker__list";

  for (const entry of fieldEntries) {
    const { fieldKey, fieldState } = entry;
    const row = createPrefHTMLElement(doc, "div");
    row.className = "ob-bridge-metadataField";
    if (fieldState.visible || fieldState.hidden) {
      row.dataset.active = "true";
    }
    row.title = `${getFieldLabel(fieldKey)} (${fieldKey})`;

    const infoCell = createPrefHTMLElement(doc, "div");
    infoCell.className = "ob-bridge-metadataField__info";

    const labelCell = createPrefHTMLElement(doc, "div");
    labelCell.className = "ob-bridge-metadataField__label";
    labelCell.textContent = getFieldLabel(fieldKey);
    labelCell.title = getFieldLabel(fieldKey);
    infoCell.appendChild(labelCell);

    const keyCell = createPrefHTMLElement(doc, "code");
    keyCell.className = "ob-bridge-metadataField__key";
    keyCell.textContent = fieldKey;
    keyCell.title = fieldKey;
    infoCell.appendChild(keyCell);

    row.appendChild(infoCell);

    for (const target of ["visible", "hidden"] as const) {
      const checkboxCell = createPrefHTMLElement(doc, "div");
      checkboxCell.className = "ob-bridge-metadataField__toggle";
      const checkbox = createPrefHTMLElement(doc, "input");
      checkbox.type = "checkbox";
      checkbox.checked = fieldState[target];
      checkbox.addEventListener("change", () => {
        setDraftMetadataField(
          state.sectionKey,
          fieldKey,
          target,
          checkbox.checked,
        );
        renderMetadataPresetFieldList();
      });
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);
    }

    list.appendChild(row);
  }

  if (!fieldKeys.length) {
    const empty = createPrefHTMLElement(doc, "div");
    empty.className = "ob-bridge-metadataPicker__empty";
    empty.textContent = uiText("没有匹配到字段。", "No matching fields.");
    list.appendChild(empty);
  }

  panel.appendChild(list);
  details.appendChild(panel);
  container.appendChild(details);
}

function renderMetadataPresetEditor() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  const presetSelect = getPrefElement<HTMLSelectElement>(
    OBSIDIAN_METADATA_PRESET_SELECT_ID,
  );
  const nameInput = getPrefElement<HTMLInputElement>(
    OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID,
  );
  const sectionSelect = getPrefElement<HTMLSelectElement>(
    OBSIDIAN_METADATA_PRESET_SECTION_ID,
  );
  const searchInput = getPrefElement<HTMLInputElement>(
    OBSIDIAN_METADATA_PRESET_SEARCH_ID,
  );
  const saveButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID,
  );
  const duplicateButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID,
  );
  const deleteButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID,
  );
  const resetButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID,
  );
  const resyncButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID,
  );
  if (
    !presetSelect ||
    !nameInput ||
    !sectionSelect ||
    !searchInput ||
    !saveButton ||
    !duplicateButton ||
    !deleteButton ||
    !resetButton ||
    !resyncButton
  ) {
    return;
  }

  presetSelect.replaceChildren();
  for (const profile of library.presets) {
    const option = createPrefHTMLElement(presetSelect.ownerDocument, "option");
    option.value = profile.id;
    option.textContent = profile.name;
    presetSelect.appendChild(option);
  }
  presetSelect.value = state.presetId;
  presetSelect.onchange = async () => {
    const nextPresetId = cleanInline(presetSelect.value);
    const nextProfile = library.presets.find(
      (profile) => profile.id === nextPresetId,
    );
    if (!nextProfile) {
      return;
    }
    library.activePresetId = nextProfile.id;
    persistMetadataPresetLibrary(library);
    setMetadataPresetEditorState({
      ...ensureMetadataPresetEditorState(),
      presetId: nextProfile.id,
      presetName: nextProfile.name,
      draftPreset: cloneMetadataPreset(nextProfile.preset),
    });
    renderMetadataPresetEditor();
    await resyncAllManagedObsidianNotes(
      getString("obsidian-metadataPreset-switch-finished", {
        args: {
          name: nextProfile.name,
        },
      }),
    );
  };

  nameInput.value = state.presetName;
  nameInput.placeholder = uiText("例如：简单配置", "Example: Simple Preset");
  nameInput.oninput = () => {
    ensureMetadataPresetEditorState().presetName = nameInput.value;
  };

  sectionSelect.replaceChildren();
  for (const sectionKey of METADATA_SECTION_OPTIONS) {
    const option = createPrefHTMLElement(sectionSelect.ownerDocument, "option");
    option.value = sectionKey;
    option.textContent = getMetadataPresetSectionLabel(sectionKey);
    sectionSelect.appendChild(option);
  }
  sectionSelect.value = state.sectionKey;
  sectionSelect.onchange = () => {
    ensureMetadataPresetEditorState().sectionKey =
      sectionSelect.value as MetadataSectionKey;
    renderMetadataPresetFieldList();
  };

  searchInput.value = state.searchText;
  searchInput.placeholder = uiText(
    "按字段名或 Key 过滤",
    "Filter by label or key",
  );
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  searchInput.oninput = () => {
    ensureMetadataPresetEditorState().searchText = searchInput.value;
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(() => {
      renderMetadataPresetFieldList();
    }, 150);
  };

  saveButton.onclick = async () => saveObsidianMetadataPreset();
  duplicateButton.onclick = async () => duplicateObsidianMetadataPreset();
  deleteButton.onclick = async () => deleteObsidianMetadataPreset();
  resetButton.onclick = async () => resetObsidianMetadataPreset();
  resyncButton.onclick = async () => resyncAllManagedObsidianNotes();
  deleteButton.disabled = library.presets.length <= 1;

  renderMetadataPresetFieldList();
}

function ensureObsidianPrefsStyle(prefDoc: Document) {
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

function getObsidianSettingsShellMarkup(prefDoc: Document) {
  const { appPath, vaultRoot, notesDir, assetsDir, dashboardDir } =
    getObsidianResolvedPaths();
  return buildObsidianSettingsShellHTML({
    escapeHTML: (value: string) => escapePrefHTML(prefDoc, value),
    getString,
    uiText,
    resolvedPaths: {
      appPath,
      vaultRoot,
      notesDir,
      assetsDir,
      dashboardDir,
    },
    contentConfig: getManagedNoteContentConfig(),
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

function renderObsidianSettingsShell(prefDoc: Document) {
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

function bindObsidianPrefsEvents(prefDoc: Document) {
  const root = getObsidianSettingsRoot(prefDoc);
  if (!root) {
    return;
  }
  if (root.dataset.obPrefsBound === "true") {
    return;
  }
  root.dataset.obPrefsBound = "true";

  const tooltipNode = ensureObsidianTooltipNode(prefDoc);
  let activeTooltipTarget: HTMLElement | null = null;

  const hideTooltip = () => {
    if (!tooltipNode) {
      return;
    }
    tooltipNode.dataset.show = "false";
    tooltipNode.setAttribute("aria-hidden", "true");
    if (activeTooltipTarget) {
      activeTooltipTarget.removeAttribute("aria-describedby");
    }
    activeTooltipTarget = null;
  };

  const showTooltip = (target: HTMLElement) => {
    if (!tooltipNode) {
      return;
    }
    const tooltipText = getObsidianTooltipText(target.dataset.obTooltip || "");
    if (!tooltipText) {
      hideTooltip();
      return;
    }
    tooltipNode.textContent = tooltipText;
    tooltipNode.dataset.show = "true";
    tooltipNode.setAttribute("aria-hidden", "false");
    if (activeTooltipTarget && activeTooltipTarget !== target) {
      activeTooltipTarget.removeAttribute("aria-describedby");
    }
    activeTooltipTarget = target;
    target.setAttribute("aria-describedby", OBSIDIAN_TOOLTIP_ID);
    positionObsidianTooltip(tooltipNode, target, prefDoc);
  };

  root.querySelectorAll<HTMLElement>("[data-ob-tooltip]").forEach((target) => {
    target.addEventListener("mouseenter", () => {
      showTooltip(target);
    });
    target.addEventListener("mouseleave", hideTooltip);
  });
  prefDoc.defaultView?.addEventListener("resize", hideTooltip);
  prefDoc.addEventListener("scroll", hideTooltip, true);

  const bindBooleanPref = (
    inputId: string,
    prefKey: string,
    onChange?: () => void,
  ) => {
    const input = getPrefElement<HTMLInputElement>(inputId);
    if (!input) {
      return;
    }
    input.addEventListener("change", () => {
      setPref(prefKey, input.checked);
      onChange?.();
    });
  };

  const bindPathInput = (
    inputId: string,
    prefKey: string,
    getDefaultValue: () => string,
    onChange?: () => void,
  ) => {
    const input = getPrefElement<HTMLInputElement>(inputId);
    if (!input) {
      return;
    }
    const persist = () => {
      const normalized = formatPath(input.value);
      const defaultValue = getDefaultValue();
      if (!cleanInline(normalized) || normalized === defaultValue) {
        setPref(prefKey, "");
        input.value = defaultValue;
      } else {
        setPref(prefKey, normalized);
      }
      onChange?.();
    };
    input.addEventListener("change", persist);
    input.addEventListener("blur", persist);
  };

  root.querySelectorAll<HTMLElement>("[data-ob-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      switchObsidianPrefsTab(button.dataset.obTab as ObsidianPrefsTab);
    });
  });

  bindPathInput(
    OBSIDIAN_APP_PATH_INPUT_ID,
    "obsidian.appPath",
    () => "",
    () => {
      void updateConnectionDiagnostics();
    },
  );
  bindPathInput(
    OBSIDIAN_VAULT_ROOT_INPUT_ID,
    "obsidian.vaultRoot",
    () => "",
    () => {
      void updateConnectionDiagnostics();
      markPreviewStale();
    },
  );
  bindPathInput(
    OBSIDIAN_NOTES_DIR_INPUT_ID,
    "obsidian.notesDir",
    () => getObsidianResolvedPaths().notesDir,
    () => {
      void updateConnectionDiagnostics();
      renderSyncSummary();
      markPreviewStale();
    },
  );
  bindPathInput(
    OBSIDIAN_ASSETS_DIR_INPUT_ID,
    "obsidian.assetsDir",
    () => getObsidianResolvedPaths().assetsDir,
    () => {
      void updateConnectionDiagnostics();
      markPreviewStale();
    },
  );
  bindPathInput(
    OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
    OBSIDIAN_DASHBOARD_DIR_PREF,
    () => getObsidianResolvedPaths().dashboardDir,
    () => {
      void updateConnectionDiagnostics();
    },
  );

  root
    .querySelectorAll<HTMLInputElement>(
      `input[name="${OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"]`,
    )
    .forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        setPref(
          OBSIDIAN_SYNC_SCOPE_PREF,
          normalizeObsidianSyncScope(input.value),
        );
        renderSyncSummary();
      });
    });

  root
    .querySelectorAll<HTMLInputElement>(
      `input[name="${OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"]`,
    )
    .forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        setPref(
          OBSIDIAN_UPDATE_STRATEGY_PREF,
          normalizeObsidianUpdateStrategy(input.value),
        );
        renderSyncSummary();
        markPreviewStale();
      });
    });

  bindBooleanPref(
    OBSIDIAN_INCLUDE_METADATA_INPUT_ID,
    OBSIDIAN_INCLUDE_METADATA_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID,
    OBSIDIAN_INCLUDE_ABSTRACT_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID,
    OBSIDIAN_INCLUDE_ANNOTATIONS_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID,
    OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID,
    OBSIDIAN_INCLUDE_CHILD_NOTES_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(OBSIDIAN_AUTO_SYNC_INPUT_ID, "obsidian.autoSync", () => {
    renderSyncSummary();
  });
  bindBooleanPref(OBSIDIAN_WATCH_FILES_INPUT_ID, "obsidian.watchFiles", () => {
    renderSyncSummary();
  });
  bindBooleanPref(
    OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
    "obsidian.openAfterSync",
    () => {
      renderSyncSummary();
      void updateConnectionDiagnostics();
    },
  );
  bindBooleanPref(
    OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
    "obsidian.revealAfterSync",
    () => {
      renderSyncSummary();
    },
  );
  bindBooleanPref(
    OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
    OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  );
  bindBooleanPref(
    OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
    OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
    () => {
      markPreviewStale();
    },
  );

  const childNoteTagsInput = getPrefElement<HTMLInputElement>(
    OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
  );
  if (childNoteTagsInput) {
    childNoteTagsInput.placeholder = uiText(
      "例如：ai-summary, ai-reading",
      "e.g. ai-summary, ai-reading",
    );
    childNoteTagsInput.addEventListener("change", () => {
      setPref(OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNoteTagsInput.value.trim());
      markPreviewStale();
    });
  }

  root
    .querySelector<HTMLElement>('[data-ob-action="pick-app"]')
    ?.addEventListener("click", async () => {
      await pickObsidianPath(
        "obsidian.appPath",
        "open",
        OBSIDIAN_APP_PATH_INPUT_ID,
      );
      refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-vault"]')
    ?.addEventListener("click", async () => {
      await pickObsidianPath(
        "obsidian.vaultRoot",
        "folder",
        OBSIDIAN_VAULT_ROOT_INPUT_ID,
      );
      refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="detect-vault"]')
    ?.addEventListener("click", async () => {
      await autoDetectObsidianVault({ allowManualFallback: true });
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="run-setup-wizard"]')
    ?.addEventListener("click", async () => {
      await runObsidianSetupWizard();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-notes"]')
    ?.addEventListener("click", async () => {
      await pickObsidianPath(
        "obsidian.notesDir",
        "folder",
        OBSIDIAN_NOTES_DIR_INPUT_ID,
      );
      refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-assets"]')
    ?.addEventListener("click", async () => {
      await pickObsidianPath(
        "obsidian.assetsDir",
        "folder",
        OBSIDIAN_ASSETS_DIR_INPUT_ID,
      );
      refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-dashboard"]')
    ?.addEventListener("click", async () => {
      await pickObsidianPath(
        OBSIDIAN_DASHBOARD_DIR_PREF,
        "folder",
        OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
      );
      refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-template"]')
    ?.addEventListener("click", async () => {
      await pickObsidianItemTemplate();
      markPreviewStale();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="edit-template"]')
    ?.addEventListener("click", () => {
      addon.hooks.onShowTemplateEditor();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="sync-now"]')
    ?.addEventListener("click", async () => {
      await syncSelectedItemsToObsidian();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="open-note-design"]')
    ?.addEventListener("click", () => {
      switchObsidianPrefsTab("noteDesign");
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="setup-dashboard"]')
    ?.addEventListener("click", async () => {
      await setupObsidianDashboards();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="repair-links"]')
    ?.addEventListener("click", async () => {
      await repairObsidianManagedLinks();
    });

  getPrefElement<HTMLButtonElement>(
    OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  )?.addEventListener("click", async () => {
    await testObsidianConnection();
  });
  getPrefElement<HTMLButtonElement>(
    OBSIDIAN_PREVIEW_TRIGGER_ID,
  )?.addEventListener("click", async () => {
    await generateObsidianPreview();
  });
}

function hydrateStaticObsidianPrefsControls() {
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

function refreshObsidianPrefsUI() {
  const prefDoc = getPrefWindowDocument();
  if (!prefDoc) {
    return;
  }
  const root = getObsidianSettingsRoot(prefDoc);
  if (!root) {
    if (obsidianPrefsRenderRetryCount < OBSIDIAN_PREFS_RENDER_RETRY_LIMIT) {
      incrementObsidianPrefsRenderRetryCount();
      prefDoc.defaultView?.setTimeout(() => {
        refreshObsidianPrefsUI();
      }, 80);
    }
    return;
  }
  try {
    resetObsidianPrefsRenderRetryCount();

    const contentDefaults = [
      [OBSIDIAN_INCLUDE_METADATA_PREF, true] as const,
      [OBSIDIAN_INCLUDE_ABSTRACT_PREF, true] as const,
      [OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF, true] as const,
      [OBSIDIAN_INCLUDE_ANNOTATIONS_PREF, true] as const,
      [OBSIDIAN_INCLUDE_CHILD_NOTES_PREF, true] as const,
    ];
    for (const [prefKey, defaultValue] of contentDefaults) {
      const checked = getBooleanPrefOrDefault(prefKey, defaultValue);
      if (typeof getPref(prefKey) !== "boolean") {
        setPref(prefKey, checked);
      }
    }

    const childNoteTags = getStringPrefOrDefault(
      OBSIDIAN_CHILD_NOTE_TAGS_PREF,
      DEFAULT_CHILD_NOTE_TAGS.join(", "),
    );
    if (!cleanInline(String(getPref(OBSIDIAN_CHILD_NOTE_TAGS_PREF) || ""))) {
      setPref(OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNoteTags);
    }

    const promptSelect = getBooleanPrefOrDefault(
      OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
      true,
    );
    if (typeof getPref(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF) !== "boolean") {
      setPref(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, promptSelect);
    }

    if (
      String(getPref(OBSIDIAN_FILE_NAME_TEMPLATE_PREF) || "") !==
      getManagedFileNamePattern()
    ) {
      setPref(OBSIDIAN_FILE_NAME_TEMPLATE_PREF, getManagedFileNamePattern());
    }

    const syncScope = normalizeObsidianSyncScope(
      String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""),
    );
    if (!cleanInline(String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""))) {
      setPref(OBSIDIAN_SYNC_SCOPE_PREF, syncScope);
    }

    const itemTemplate = getStringPrefOrDefault(
      OBSIDIAN_ITEM_TEMPLATE_PREF,
      DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
    );
    if (!cleanInline(String(getPref(OBSIDIAN_ITEM_TEMPLATE_PREF) || ""))) {
      setPref(OBSIDIAN_ITEM_TEMPLATE_PREF, itemTemplate);
    }

    if (!cleanInline(String(getPref(OBSIDIAN_FRONTMATTER_FIELDS_PREF) || ""))) {
      setManagedFrontmatterFields(DEFAULT_MANAGED_FRONTMATTER_FIELDS);
    }

    const updateStrategy = normalizeObsidianUpdateStrategy(
      String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
    );
    if (!cleanInline(String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""))) {
      setPref(OBSIDIAN_UPDATE_STRATEGY_PREF, updateStrategy);
    }

    const dashboardAutoSetup = getBooleanPrefOrDefault(
      OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
      true,
    );
    if (typeof getPref(OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF) !== "boolean") {
      setPref(OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, dashboardAutoSetup);
    }

    ensureObsidianPrefsStyle(prefDoc);
    localizeStaticObsidianPrefsUI(prefDoc);
    hydrateStaticObsidianPrefsControls();
    hydrateTooltipTargets();
    bindObsidianPrefsEvents(prefDoc);

    renderObsidianItemTemplateSelection();
    renderObsidianFrontmatterFieldConfigurator();
    ensureMetadataPresetEditorState();
    renderMetadataPresetEditor();
    renderFileNamePreview();
    renderContentSummary();
    renderSyncSummary();
    renderConnectionTestResult();

    const currentPreviewSignature = buildPreviewSignature(
      getPreviewSourceItem(),
    );
    if (
      obsidianPrefsState.preview.status === "ready" &&
      obsidianPrefsState.preview.signature !== currentPreviewSignature
    ) {
      markPreviewStale();
    } else {
      renderPreviewPanel();
    }

    void updateConnectionDiagnostics();
  } catch (error) {
    ztoolkit.log("[obsidian prefs refresh]", error);
    root.textContent =
      cleanInline((error as Error)?.message || "") ||
      uiText(
        "Obsidian 设置页初始化失败，请查看插件日志。",
        "Failed to initialize Obsidian settings. Check plugin logs.",
      );
  }
}

async function saveObsidianMetadataPreset() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  const profile = library.presets.find((item) => item.id === state.presetId);
  if (!profile) {
    throw new Error("Metadata preset does not exist.");
  }
  profile.name = cleanInline(state.presetName) || profile.name;
  profile.preset = cloneMetadataPreset(state.draftPreset);
  persistMetadataPresetLibrary(library);
  setMetadataPresetEditorState({
    ...state,
    presetName: profile.name,
    draftPreset: cloneMetadataPreset(profile.preset),
  });
  refreshObsidianPrefsUI();
  await resyncAllManagedObsidianNotes(
    getString("obsidian-metadataPreset-save-finished", {
      args: {
        name: profile.name,
      },
    }),
  );
}

async function duplicateObsidianMetadataPreset() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  const presetName =
    cleanInline(state.presetName) ||
    getString("obsidian-metadataPreset-newName");
  const newProfile: MetadataPresetProfile = {
    id: createMetadataPresetID(presetName),
    name: presetName,
    preset: cloneMetadataPreset(state.draftPreset),
  };
  library.presets.push(newProfile);
  library.activePresetId = newProfile.id;
  persistMetadataPresetLibrary(library);
  setMetadataPresetEditorState({
    ...state,
    presetId: newProfile.id,
    presetName: newProfile.name,
    draftPreset: cloneMetadataPreset(newProfile.preset),
  });
  refreshObsidianPrefsUI();
  await resyncAllManagedObsidianNotes(
    getString("obsidian-metadataPreset-saveAs-finished", {
      args: {
        name: newProfile.name,
      },
    }),
  );
}

async function deleteObsidianMetadataPreset() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  if (library.presets.length <= 1) {
    showHint(getString("obsidian-metadataPreset-delete-lastBlocked"));
    return;
  }
  const confirmIndex = promptChoice({
    title: uiText("删除预设", "Delete Preset"),
    text: uiText(
      `确定要删除预设「${state.presetName}」吗？删除后将切换到下一个可用预设。`,
      `Delete preset "${state.presetName}"? The next available preset will become active.`,
    ),
    buttons: [uiText("删除", "Delete"), uiText("取消", "Cancel")],
    defaultButton: 1,
  });
  if (confirmIndex !== 0) {
    return;
  }
  library.presets = library.presets.filter(
    (profile) => profile.id !== state.presetId,
  );
  library.activePresetId = library.presets[0].id;
  persistMetadataPresetLibrary(library);
  const nextProfile = getActiveMetadataPresetProfile(library);
  setMetadataPresetEditorState({
    ...state,
    presetId: nextProfile.id,
    presetName: nextProfile.name,
    draftPreset: cloneMetadataPreset(nextProfile.preset),
  });
  refreshObsidianPrefsUI();
  await resyncAllManagedObsidianNotes(
    getString("obsidian-metadataPreset-delete-finished", {
      args: {
        name: nextProfile.name,
      },
    }),
  );
}

async function resetObsidianMetadataPreset() {
  const state = ensureMetadataPresetEditorState();
  state.draftPreset = cloneDefaultMetadataPreset();
  if (!cleanInline(state.presetName)) {
    state.presetName = getString("obsidian-metadataPreset-defaultName");
  }
  refreshObsidianPrefsUI();
  showHint(getString("obsidian-metadataPreset-reset-finished"));
}

async function pickObsidianPath(
  prefKey: string,
  mode: "open" | "folder",
  inputId: string,
) {
  const prefWindow = addon.data.prefs?.window;
  const currentValue = String(getPref(prefKey) || "");
  const selection = await new ztoolkit.FilePicker(
    mode === "open" ? "Select Obsidian App" : "Select Obsidian Folder",
    mode,
    undefined,
    undefined,
    prefWindow,
    mode === "open" ? "apps" : "all",
    currentValue || undefined,
  ).open();
  if (!selection) {
    return;
  }

  const value = formatPath(selection);
  if (
    prefKey === "obsidian.vaultRoot" &&
    !(await confirmObsidianVaultRoot(value, prefWindow))
  ) {
    return;
  }
  setPref(prefKey, value);
  setPrefElementValue(inputId, value);

  if (prefKey === "obsidian.vaultRoot") {
    const defaults = deriveObsidianPathDefaults(value);
    if (!String(getPref("obsidian.vaultName") || "").trim()) {
      const derivedVaultName = defaults.vaultName;
      setPref("obsidian.vaultName", derivedVaultName);
      setPrefElementValue(
        `${config.addonRef}-obsidian-vaultName`,
        derivedVaultName,
      );
    }
    if (!String(getPref("obsidian.notesDir") || "").trim()) {
      const derivedNotesDir = defaults.notesDir;
      setPref("obsidian.notesDir", derivedNotesDir);
      setPrefElementValue(
        `${config.addonRef}-obsidian-notesDir`,
        derivedNotesDir,
      );
    }
    if (!String(getPref("obsidian.assetsDir") || "").trim()) {
      const derivedAssetsDir = defaults.assetsDir;
      setPref("obsidian.assetsDir", derivedAssetsDir);
      setPrefElementValue(
        `${config.addonRef}-obsidian-assetsDir`,
        derivedAssetsDir,
      );
    }
    if (!String(getPref(OBSIDIAN_DASHBOARD_DIR_PREF) || "").trim()) {
      const derivedDashboardDir = defaults.dashboardDir;
      setPref(OBSIDIAN_DASHBOARD_DIR_PREF, derivedDashboardDir);
      setPrefElementValue(OBSIDIAN_DASHBOARD_DIR_INPUT_ID, derivedDashboardDir);
    }
  }
}

export {
  maybeAutoRunObsidianSetupWizard,
  pickObsidianItemTemplate,
  pickObsidianPath,
  refreshObsidianPrefsUI,
  saveObsidianMetadataPreset,
  resetObsidianMetadataPreset,
  runObsidianSetupWizard,
};
