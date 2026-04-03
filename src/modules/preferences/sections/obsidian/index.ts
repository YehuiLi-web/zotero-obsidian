import { config } from "../../../../../package.json";
import { getString } from "../../../../utils/locale";
import { getPref, setPref } from "../../../../utils/prefs";
import { formatPath } from "../../../../utils/str";
import { openTemplatePicker } from "../../../../utils/templatePicker";
import { migrateObsidianFileNameTemplatePref } from "../../../obsidian/fileNameTemplate";
import {
  DEFAULT_CHILD_NOTE_TAGS,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
  OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_TAGS_PREF,
} from "../../../obsidian/childNotes";
import { cleanInline } from "../../../obsidian/shared";
import {
  DEFAULT_MANAGED_FRONTMATTER_FIELDS,
  DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
  deriveObsidianPathDefaults,
  getBooleanPrefOrDefault,
  getStringPrefOrDefault,
  normalizeObsidianSyncScope,
  normalizeObsidianUpdateStrategy,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
  OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
  OBSIDIAN_FILE_NAME_TEMPLATE_PREF,
  OBSIDIAN_FRONTMATTER_FIELDS_PREF,
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
  OBSIDIAN_ITEM_TEMPLATE_PREF,
  OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID,
  OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_SEARCH_ID,
  OBSIDIAN_METADATA_PRESET_SECTION_ID,
  OBSIDIAN_METADATA_PRESET_SELECT_ID,
  OBSIDIAN_SYNC_SCOPE_PREF,
  OBSIDIAN_UPDATE_STRATEGY_PREF,
  resolveObsidianItemTemplateName,
  setManagedFrontmatterFields,
} from "../../../obsidian/settings";
import { getManagedFileNamePattern } from "../../../obsidian/paths";
import {
  autoDetectObsidianVault,
  initWizardCallbacks,
  maybeAutoRunObsidianSetupWizard,
  runObsidianSetupWizard,
} from "./wizard";
import {
  buildPreviewSignature,
  generateObsidianPreview,
  getPreviewSourceItem,
  markPreviewStale,
  renderContentSummary,
  renderFileNamePreview,
  renderPreviewPanel,
  renderSyncSummary,
} from "./preview";
import {
  renderConnectionTestResult,
  updateConnectionDiagnostics,
} from "./connection";
import {
  ensureMetadataPresetEditorState,
  initMetadataPresetEditorCallbacks,
  renderMetadataPresetEditor,
  resetObsidianMetadataPreset,
  saveObsidianMetadataPreset,
} from "./metadataPresetEditor";
import {
  ensureObsidianPrefsStyle,
  hydrateStaticObsidianPrefsControls,
  renderObsidianFrontmatterFieldConfigurator,
  renderObsidianItemTemplateSelection,
  renderObsidianSettingsShell,
} from "./render";
import { bindObsidianPrefsEvents } from "./events";
import {
  incrementObsidianPrefsRenderRetryCount,
  obsidianPrefsRenderRetryCount,
  obsidianPrefsState,
  resetObsidianPrefsRenderRetryCount,
} from "./state";
import {
  OBSIDIAN_APP_PATH_INPUT_ID,
  OBSIDIAN_ASSETS_DIR_INPUT_ID,
  OBSIDIAN_AUTO_SYNC_INPUT_ID,
  OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  OBSIDIAN_NOTES_DIR_INPUT_ID,
  OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
  OBSIDIAN_PREVIEW_FILE_ID,
  OBSIDIAN_PREVIEW_TRIGGER_ID,
  OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
  OBSIDIAN_SYNC_SCOPE_GROUP_NAME,
  OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME,
  OBSIDIAN_VAULT_ROOT_INPUT_ID,
  OBSIDIAN_WATCH_FILES_INPUT_ID,
} from "./uiIds";
import {
  confirmObsidianVaultRoot,
  getPrefElement,
  getPrefWindowDocument,
  getObsidianSettingsRoot,
  setPrefElementValue,
  uiText,
} from "./helpers";

async function chooseObsidianItemTemplate(
  currentTemplate = resolveObsidianItemTemplateName(),
) {
  const templateNames =
    await getObsidianItemTemplateCandidates(currentTemplate);
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
    uiText("弹窗预览", "Preview Popup"),
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
    uiText("同步后在 Ob 打开", "Open in Obsidian"),
  );
  setStaticPrefChoiceText(
    root,
    `#${OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID}`,
    uiText("同步后在文件夹显示", "Reveal in folder"),
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
      setPref("obsidian.notesDir", defaults.notesDir);
      setPrefElementValue(
        `${config.addonRef}-obsidian-notesDir`,
        defaults.notesDir,
      );
    }
    if (!String(getPref("obsidian.assetsDir") || "").trim()) {
      setPref("obsidian.assetsDir", defaults.assetsDir);
      setPrefElementValue(
        `${config.addonRef}-obsidian-assetsDir`,
        defaults.assetsDir,
      );
    }
    if (!String(getPref("obsidian.dashboardDir") || "").trim()) {
      setPref("obsidian.dashboardDir", defaults.dashboardDir);
      setPrefElementValue(
        OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
        defaults.dashboardDir,
      );
    }
  }
}

function refreshObsidianPrefsUI() {
  const prefDoc = getPrefWindowDocument();
  if (!prefDoc) {
    return;
  }
  const root = getObsidianSettingsRoot(prefDoc);
  if (!root) {
    if (obsidianPrefsRenderRetryCount < 8) {
      incrementObsidianPrefsRenderRetryCount();
      prefDoc.defaultView?.setTimeout(() => {
        refreshObsidianPrefsUI();
      }, 80);
    }
    return;
  }
  try {
    resetObsidianPrefsRenderRetryCount();
    migrateObsidianFileNameTemplatePref();

    // Build the HTML shell (replaces loading placeholder with full pane structure).
    // Must happen before localization or hydration, which expect the elements to exist.
    if (!renderObsidianSettingsShell(prefDoc)) {
      return;
    }

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
    if (typeof getPref(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF) !== "boolean") {
      setPref(
        OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
        getBooleanPrefOrDefault(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, true),
      );
    }
    if (!cleanInline(String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""))) {
      setPref(
        OBSIDIAN_SYNC_SCOPE_PREF,
        normalizeObsidianSyncScope(
          String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""),
        ),
      );
    }
    if (!cleanInline(String(getPref(OBSIDIAN_ITEM_TEMPLATE_PREF) || ""))) {
      setPref(
        OBSIDIAN_ITEM_TEMPLATE_PREF,
        getStringPrefOrDefault(
          OBSIDIAN_ITEM_TEMPLATE_PREF,
          DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
        ),
      );
    }
    if (!cleanInline(String(getPref(OBSIDIAN_FRONTMATTER_FIELDS_PREF) || ""))) {
      setManagedFrontmatterFields(DEFAULT_MANAGED_FRONTMATTER_FIELDS);
    }
    if (!cleanInline(String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""))) {
      setPref(
        OBSIDIAN_UPDATE_STRATEGY_PREF,
        normalizeObsidianUpdateStrategy(
          String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
        ),
      );
    }
    if (typeof getPref(OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF) !== "boolean") {
      setPref(
        OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
        getBooleanPrefOrDefault(OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, true),
      );
    }

    ensureObsidianPrefsStyle(prefDoc);
    localizeStaticObsidianPrefsUI(prefDoc);
    hydrateStaticObsidianPrefsControls();
    bindObsidianPrefsEvents(prefDoc, {
      autoDetectObsidianVault,
      pickObsidianItemTemplate,
      pickObsidianPath,
      refreshObsidianPrefsUI,
      runObsidianSetupWizard,
    });

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
    if (!root.dataset.obSetupPromptRequested) {
      root.dataset.obSetupPromptRequested = "true";
      prefDoc.defaultView?.setTimeout(() => {
        void maybeAutoRunObsidianSetupWizard(
          prefDoc.defaultView as unknown as _ZoteroTypes.MainWindow,
        );
      }, 0);
    }
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

initWizardCallbacks({
  refreshObsidianPrefsUI,
  renderSyncSummary,
  markPreviewStale,
  chooseObsidianItemTemplate,
});

initMetadataPresetEditorCallbacks({
  refreshObsidianPrefsUI,
});

export {
  maybeAutoRunObsidianSetupWizard,
  pickObsidianItemTemplate,
  pickObsidianPath,
  refreshObsidianPrefsUI,
  resetObsidianMetadataPreset,
  runObsidianSetupWizard,
  saveObsidianMetadataPreset,
};
