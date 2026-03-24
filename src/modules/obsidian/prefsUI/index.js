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
exports.saveObsidianMetadataPreset = exports.runObsidianSetupWizard = exports.resetObsidianMetadataPreset = exports.maybeAutoRunObsidianSetupWizard = void 0;
exports.pickObsidianItemTemplate = pickObsidianItemTemplate;
exports.pickObsidianPath = pickObsidianPath;
exports.refreshObsidianPrefsUI = refreshObsidianPrefsUI;
const package_json_1 = require("../../../../package.json");
const locale_1 = require("../../../utils/locale");
const prefs_1 = require("../../../utils/prefs");
const str_1 = require("../../../utils/str");
const templatePicker_1 = require("../../../utils/templatePicker");
const childNotes_1 = require("../childNotes");
const shared_1 = require("../shared");
const settings_1 = require("../settings");
const paths_1 = require("../paths");
const wizard_1 = require("./wizard");
Object.defineProperty(exports, "maybeAutoRunObsidianSetupWizard", { enumerable: true, get: function () { return wizard_1.maybeAutoRunObsidianSetupWizard; } });
Object.defineProperty(exports, "runObsidianSetupWizard", { enumerable: true, get: function () { return wizard_1.runObsidianSetupWizard; } });
const preview_1 = require("./preview");
const connection_1 = require("./connection");
const metadataPresetEditor_1 = require("./metadataPresetEditor");
Object.defineProperty(exports, "resetObsidianMetadataPreset", { enumerable: true, get: function () { return metadataPresetEditor_1.resetObsidianMetadataPreset; } });
Object.defineProperty(exports, "saveObsidianMetadataPreset", { enumerable: true, get: function () { return metadataPresetEditor_1.saveObsidianMetadataPreset; } });
const render_1 = require("./render");
const events_1 = require("./events");
const state_1 = require("./state");
const uiIds_1 = require("./uiIds");
const helpers_1 = require("./helpers");
function chooseObsidianItemTemplate() {
    return __awaiter(this, arguments, void 0, function* (currentTemplate = (0, settings_1.resolveObsidianItemTemplateName)()) {
        const templateNames = yield getObsidianItemTemplateCandidates(currentTemplate);
        const selectedTemplates = yield (0, templatePicker_1.openTemplatePicker)({
            templates: templateNames,
            selected: [currentTemplate],
        });
        return (0, shared_1.cleanInline)(selectedTemplates[0] || "");
    });
}
function getUserTemplateNames() {
    return Array.from(new Set(addon.api.template
        .getTemplateKeys()
        .map((templateName) => (0, shared_1.cleanInline)(templateName))
        .filter((templateName) => Boolean(templateName) &&
        !addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(templateName))));
}
function isDryRunTemplateError(rendered) {
    return (0, shared_1.cleanInline)(rendered).startsWith("Template Preview Error:");
}
function getObsidianItemTemplateCandidates() {
    return __awaiter(this, arguments, void 0, function* (currentTemplate = (0, settings_1.resolveObsidianItemTemplateName)()) {
        const templateNames = getUserTemplateNames();
        const previewTopItem = (0, preview_1.getPreviewSourceItem)();
        if (!previewTopItem || !previewTopItem.id) {
            return Array.from(new Set([currentTemplate, ...templateNames].filter(Boolean)));
        }
        const previewTopItemID = previewTopItem.id;
        const runnableTemplates = [];
        for (const templateName of templateNames) {
            try {
                const renderedTemplate = yield addon.api.template.runItemTemplate(templateName, {
                    itemIds: [previewTopItemID],
                    dryRun: true,
                });
                if (!isDryRunTemplateError(renderedTemplate || "")) {
                    runnableTemplates.push(templateName);
                }
            }
            catch (e) {
                ztoolkit.log("[obsidian prefs item template check]", templateName, e);
            }
        }
        const candidates = Array.from(new Set([currentTemplate, ...runnableTemplates].filter(Boolean)));
        return candidates.length
            ? candidates
            : Array.from(new Set([currentTemplate, ...templateNames].filter(Boolean)));
    });
}
function setStaticPrefText(root, selector, text) {
    const element = root.querySelector(selector);
    if (element) {
        element.textContent = text;
    }
}
function setStaticPrefLabelText(root, inputId, text) {
    setStaticPrefText(root, `label[for="${inputId}"] span`, text);
}
function setStaticPrefChoiceText(root, selector, text) {
    var _a;
    const input = root.querySelector(selector);
    const label = (_a = input === null || input === void 0 ? void 0 : input.closest("label")) === null || _a === void 0 ? void 0 : _a.querySelector("span");
    if (label) {
        label.textContent = text;
    }
}
function localizeStaticObsidianPrefsUI(prefDoc) {
    var _a;
    const root = (0, helpers_1.getObsidianSettingsRoot)(prefDoc);
    if (!root) {
        return;
    }
    setStaticPrefText(root, '[data-ob-tooltip="connection-overview"]', (0, helpers_1.uiText)("连接", "Connection"));
    setStaticPrefText(root, `#${uiIds_1.OBSIDIAN_CONNECTION_TEST_BUTTON_ID}`, (0, helpers_1.uiText)("测试写入一个文件", "Write a Test File"));
    setStaticPrefLabelText(root, uiIds_1.OBSIDIAN_APP_PATH_INPUT_ID, (0, locale_1.getString)("obsidian-appPath-label"));
    setStaticPrefLabelText(root, uiIds_1.OBSIDIAN_VAULT_ROOT_INPUT_ID, (0, locale_1.getString)("obsidian-vaultRoot-label"));
    setStaticPrefLabelText(root, uiIds_1.OBSIDIAN_NOTES_DIR_INPUT_ID, (0, locale_1.getString)("obsidian-notesDir-label"));
    setStaticPrefLabelText(root, uiIds_1.OBSIDIAN_ASSETS_DIR_INPUT_ID, (0, locale_1.getString)("obsidian-assetsDir-label"));
    setStaticPrefLabelText(root, settings_1.OBSIDIAN_DASHBOARD_DIR_INPUT_ID, (0, locale_1.getString)("obsidian-dashboardDir-label"));
    setStaticPrefText(root, '[data-ob-action="pick-app"]', (0, locale_1.getString)("obsidian-pickFile", "label"));
    ["pick-vault", "pick-notes", "pick-assets", "pick-dashboard"].forEach((action) => {
        setStaticPrefText(root, `[data-ob-action="${action}"]`, (0, locale_1.getString)("obsidian-pickFolder", "label"));
    });
    setStaticPrefText(root, '[data-ob-action="detect-vault"]', (0, helpers_1.uiText)("自动检测 Vault", "Auto Detect Vault"));
    setStaticPrefText(root, '[data-ob-action="run-setup-wizard"]', (0, helpers_1.uiText)("运行配置向导", "Run Setup Wizard"));
    setStaticPrefText(root, '[data-ob-tooltip="note-structure-overview"]', (0, helpers_1.uiText)("笔记内容", "Note Content"));
    setStaticPrefText(root, '[data-ob-action="pick-template"]', (0, locale_1.getString)("obsidian-itemTemplate-pick", "label"));
    setStaticPrefText(root, '[data-ob-action="edit-template"]', (0, helpers_1.uiText)("编辑模板", "Edit Template"));
    setStaticPrefChoiceText(root, `#${settings_1.OBSIDIAN_INCLUDE_METADATA_INPUT_ID}`, (0, helpers_1.uiText)("元数据", "Metadata"));
    setStaticPrefChoiceText(root, `#${settings_1.OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID}`, (0, helpers_1.uiText)("摘要", "Abstract"));
    setStaticPrefChoiceText(root, `#${settings_1.OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID}`, (0, helpers_1.uiText)("PDF 批注", "PDF Annotations"));
    setStaticPrefChoiceText(root, `#${settings_1.OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID}`, (0, helpers_1.uiText)("隐藏字段", "Hidden Fields"));
    setStaticPrefChoiceText(root, `#${settings_1.OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID}`, (0, helpers_1.uiText)("子笔记", "Child Notes"));
    setStaticPrefText(root, `#${uiIds_1.OBSIDIAN_PREVIEW_TRIGGER_ID}`, (0, helpers_1.uiText)("生成预览", "Generate Preview"));
    const previewFileLabel = (_a = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_PREVIEW_FILE_ID)) === null || _a === void 0 ? void 0 : _a.previousElementSibling;
    if (previewFileLabel) {
        previewFileLabel.textContent = (0, helpers_1.uiText)("文件名", "Filename");
    }
    setStaticPrefText(root, '[data-ob-tooltip="sync-overview"]', (0, helpers_1.uiText)("文件与同步", "File & Sync"));
    setStaticPrefText(root, '[data-ob-tooltip="sync-scope"]', (0, locale_1.getString)("obsidian-syncScope-label"));
    setStaticPrefChoiceText(root, `input[name="${uiIds_1.OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"][value="selection"]`, (0, locale_1.getString)("obsidian-syncScope-selection"));
    setStaticPrefChoiceText(root, `input[name="${uiIds_1.OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"][value="currentList"]`, (0, locale_1.getString)("obsidian-syncScope-currentList"));
    setStaticPrefChoiceText(root, `input[name="${uiIds_1.OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"][value="library"]`, (0, locale_1.getString)("obsidian-syncScope-library"));
    setStaticPrefText(root, '[data-ob-tooltip="update-strategy"]', (0, helpers_1.uiText)("更新策略", "Update Strategy"));
    setStaticPrefChoiceText(root, `input[name="${uiIds_1.OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"][value="managed"]`, (0, helpers_1.uiText)("只更新托管区（推荐）", "Update managed blocks only"));
    setStaticPrefChoiceText(root, `input[name="${uiIds_1.OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"][value="overwrite"]`, (0, helpers_1.uiText)("覆盖全部内容", "Overwrite everything"));
    setStaticPrefChoiceText(root, `input[name="${uiIds_1.OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"][value="skip"]`, (0, helpers_1.uiText)("跳过已有笔记", "Skip existing notes"));
    setStaticPrefChoiceText(root, `#${uiIds_1.OBSIDIAN_AUTO_SYNC_INPUT_ID}`, (0, locale_1.getString)("obsidian-autoSync", "label"));
    setStaticPrefChoiceText(root, `#${uiIds_1.OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID}`, (0, locale_1.getString)("obsidian-openAfterSync", "label"));
    setStaticPrefChoiceText(root, `#${uiIds_1.OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID}`, (0, locale_1.getString)("obsidian-revealAfterSync", "label"));
    setStaticPrefText(root, '[data-ob-action="sync-now"]', (0, locale_1.getString)("obsidian-syncNow", "label"));
    setStaticPrefText(root, '[data-ob-tooltip="advanced-overview"]', (0, helpers_1.uiText)("操作与维护", "Operations"));
    setStaticPrefText(root, '[data-ob-tooltip="frontmatter-fields"]', (0, helpers_1.uiText)("Frontmatter 字段", "Frontmatter Fields"));
    setStaticPrefText(root, '[data-ob-tooltip="metadata-preset"]', (0, locale_1.getString)("obsidian-metadataPreset-title"));
    setStaticPrefText(root, `label[for="${settings_1.OBSIDIAN_METADATA_PRESET_SELECT_ID}"]`, (0, locale_1.getString)("obsidian-metadataPreset-active-label"));
    setStaticPrefText(root, `label[for="${settings_1.OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID}"]`, (0, locale_1.getString)("obsidian-metadataPreset-name-label"));
    setStaticPrefText(root, `label[for="${settings_1.OBSIDIAN_METADATA_PRESET_SECTION_ID}"]`, (0, locale_1.getString)("obsidian-metadataPreset-itemType-label"));
    setStaticPrefText(root, `label[for="${settings_1.OBSIDIAN_METADATA_PRESET_SEARCH_ID}"]`, (0, locale_1.getString)("obsidian-metadataPreset-search-label"));
    setStaticPrefText(root, `#${settings_1.OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID}`, (0, locale_1.getString)("obsidian-metadataPreset-save", "label"));
    setStaticPrefText(root, `#${settings_1.OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID}`, (0, locale_1.getString)("obsidian-metadataPreset-saveAs", "label"));
    setStaticPrefText(root, `#${settings_1.OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID}`, (0, locale_1.getString)("obsidian-metadataPreset-reset", "label"));
    setStaticPrefText(root, `#${settings_1.OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID}`, (0, locale_1.getString)("obsidian-metadataPreset-delete", "label"));
    setStaticPrefText(root, `#${settings_1.OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID}`, (0, locale_1.getString)("obsidian-metadataPreset-resync", "label"));
    setStaticPrefLabelText(root, childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID, (0, locale_1.getString)("obsidian-childNotes-tags-label"));
    setStaticPrefChoiceText(root, `#${childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID}`, (0, locale_1.getString)("obsidian-childNotes-promptSelect", "label"));
    setStaticPrefChoiceText(root, `#${settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID}`, (0, locale_1.getString)("obsidian-dashboardAutoSetup", "label"));
    setStaticPrefText(root, '[data-ob-action="setup-dashboard"]', (0, locale_1.getString)("obsidian-setupDashboards", "label"));
    setStaticPrefText(root, '[data-ob-action="repair-links"]', (0, locale_1.getString)("obsidian-repairManagedLinks", "label"));
}
function pickObsidianItemTemplate() {
    return __awaiter(this, void 0, void 0, function* () {
        const selectedTemplate = yield chooseObsidianItemTemplate((0, settings_1.resolveObsidianItemTemplateName)());
        if (!selectedTemplate) {
            return;
        }
        (0, prefs_1.setPref)(settings_1.OBSIDIAN_ITEM_TEMPLATE_PREF, selectedTemplate);
        refreshObsidianPrefsUI();
    });
}
function pickObsidianPath(prefKey, mode, inputId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const prefWindow = (_a = addon.data.prefs) === null || _a === void 0 ? void 0 : _a.window;
        const currentValue = String((0, prefs_1.getPref)(prefKey) || "");
        const selection = yield new ztoolkit.FilePicker(mode === "open" ? "Select Obsidian App" : "Select Obsidian Folder", mode, undefined, undefined, prefWindow, mode === "open" ? "apps" : "all", currentValue || undefined).open();
        if (!selection) {
            return;
        }
        const value = (0, str_1.formatPath)(selection);
        if (prefKey === "obsidian.vaultRoot" &&
            !(yield (0, helpers_1.confirmObsidianVaultRoot)(value, prefWindow))) {
            return;
        }
        (0, prefs_1.setPref)(prefKey, value);
        (0, helpers_1.setPrefElementValue)(inputId, value);
        if (prefKey === "obsidian.vaultRoot") {
            const defaults = (0, settings_1.deriveObsidianPathDefaults)(value);
            if (!String((0, prefs_1.getPref)("obsidian.vaultName") || "").trim()) {
                const derivedVaultName = defaults.vaultName;
                (0, prefs_1.setPref)("obsidian.vaultName", derivedVaultName);
                (0, helpers_1.setPrefElementValue)(`${package_json_1.config.addonRef}-obsidian-vaultName`, derivedVaultName);
            }
            if (!String((0, prefs_1.getPref)("obsidian.notesDir") || "").trim()) {
                (0, prefs_1.setPref)("obsidian.notesDir", defaults.notesDir);
                (0, helpers_1.setPrefElementValue)(`${package_json_1.config.addonRef}-obsidian-notesDir`, defaults.notesDir);
            }
            if (!String((0, prefs_1.getPref)("obsidian.assetsDir") || "").trim()) {
                (0, prefs_1.setPref)("obsidian.assetsDir", defaults.assetsDir);
                (0, helpers_1.setPrefElementValue)(`${package_json_1.config.addonRef}-obsidian-assetsDir`, defaults.assetsDir);
            }
            if (!String((0, prefs_1.getPref)("obsidian.dashboardDir") || "").trim()) {
                (0, prefs_1.setPref)("obsidian.dashboardDir", defaults.dashboardDir);
                (0, helpers_1.setPrefElementValue)(settings_1.OBSIDIAN_DASHBOARD_DIR_INPUT_ID, defaults.dashboardDir);
            }
        }
    });
}
function refreshObsidianPrefsUI() {
    var _a;
    const prefDoc = (0, helpers_1.getPrefWindowDocument)();
    if (!prefDoc) {
        return;
    }
    const root = (0, helpers_1.getObsidianSettingsRoot)(prefDoc);
    if (!root) {
        if (state_1.obsidianPrefsRenderRetryCount < 8) {
            (0, state_1.incrementObsidianPrefsRenderRetryCount)();
            (_a = prefDoc.defaultView) === null || _a === void 0 ? void 0 : _a.setTimeout(() => {
                refreshObsidianPrefsUI();
            }, 80);
        }
        return;
    }
    try {
        (0, state_1.resetObsidianPrefsRenderRetryCount)();
        const contentDefaults = [
            [settings_1.OBSIDIAN_INCLUDE_METADATA_PREF, true],
            [settings_1.OBSIDIAN_INCLUDE_ABSTRACT_PREF, true],
            [settings_1.OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF, true],
            [settings_1.OBSIDIAN_INCLUDE_ANNOTATIONS_PREF, true],
            [settings_1.OBSIDIAN_INCLUDE_CHILD_NOTES_PREF, true],
        ];
        for (const [prefKey, defaultValue] of contentDefaults) {
            const checked = (0, settings_1.getBooleanPrefOrDefault)(prefKey, defaultValue);
            if (typeof (0, prefs_1.getPref)(prefKey) !== "boolean") {
                (0, prefs_1.setPref)(prefKey, checked);
            }
        }
        const childNoteTags = (0, settings_1.getStringPrefOrDefault)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNotes_1.DEFAULT_CHILD_NOTE_TAGS.join(", "));
        if (!(0, shared_1.cleanInline)(String((0, prefs_1.getPref)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_PREF) || ""))) {
            (0, prefs_1.setPref)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNoteTags);
        }
        if (typeof (0, prefs_1.getPref)(childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF) !== "boolean") {
            (0, prefs_1.setPref)(childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, (0, settings_1.getBooleanPrefOrDefault)(childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, true));
        }
        if (String((0, prefs_1.getPref)(settings_1.OBSIDIAN_FILE_NAME_TEMPLATE_PREF) || "") !==
            (0, paths_1.getManagedFileNamePattern)()) {
            (0, prefs_1.setPref)(settings_1.OBSIDIAN_FILE_NAME_TEMPLATE_PREF, (0, paths_1.getManagedFileNamePattern)());
        }
        if (!(0, shared_1.cleanInline)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_SYNC_SCOPE_PREF) || ""))) {
            (0, prefs_1.setPref)(settings_1.OBSIDIAN_SYNC_SCOPE_PREF, (0, settings_1.normalizeObsidianSyncScope)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_SYNC_SCOPE_PREF) || "")));
        }
        if (!(0, shared_1.cleanInline)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_ITEM_TEMPLATE_PREF) || ""))) {
            (0, prefs_1.setPref)(settings_1.OBSIDIAN_ITEM_TEMPLATE_PREF, (0, settings_1.getStringPrefOrDefault)(settings_1.OBSIDIAN_ITEM_TEMPLATE_PREF, settings_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE));
        }
        if (!(0, shared_1.cleanInline)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_FRONTMATTER_FIELDS_PREF) || ""))) {
            (0, settings_1.setManagedFrontmatterFields)(settings_1.DEFAULT_MANAGED_FRONTMATTER_FIELDS);
        }
        if (!(0, shared_1.cleanInline)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || ""))) {
            (0, prefs_1.setPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF, (0, settings_1.normalizeObsidianUpdateStrategy)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || "")));
        }
        if (typeof (0, prefs_1.getPref)(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF) !== "boolean") {
            (0, prefs_1.setPref)(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, true));
        }
        (0, render_1.ensureObsidianPrefsStyle)(prefDoc);
        localizeStaticObsidianPrefsUI(prefDoc);
        (0, render_1.hydrateStaticObsidianPrefsControls)();
        (0, events_1.bindObsidianPrefsEvents)(prefDoc, {
            autoDetectObsidianVault: wizard_1.autoDetectObsidianVault,
            pickObsidianItemTemplate,
            pickObsidianPath,
            refreshObsidianPrefsUI,
            runObsidianSetupWizard: wizard_1.runObsidianSetupWizard,
        });
        (0, render_1.renderObsidianItemTemplateSelection)();
        (0, render_1.renderObsidianFrontmatterFieldConfigurator)();
        (0, metadataPresetEditor_1.ensureMetadataPresetEditorState)();
        (0, metadataPresetEditor_1.renderMetadataPresetEditor)();
        (0, preview_1.renderFileNamePreview)();
        (0, preview_1.renderContentSummary)();
        (0, preview_1.renderSyncSummary)();
        (0, connection_1.renderConnectionTestResult)();
        const currentPreviewSignature = (0, preview_1.buildPreviewSignature)((0, preview_1.getPreviewSourceItem)());
        if (state_1.obsidianPrefsState.preview.status === "ready" &&
            state_1.obsidianPrefsState.preview.signature !== currentPreviewSignature) {
            (0, preview_1.markPreviewStale)();
        }
        else {
            (0, preview_1.renderPreviewPanel)();
        }
        void (0, connection_1.updateConnectionDiagnostics)();
    }
    catch (error) {
        ztoolkit.log("[obsidian prefs refresh]", error);
        root.textContent =
            (0, shared_1.cleanInline)((error === null || error === void 0 ? void 0 : error.message) || "") ||
                (0, helpers_1.uiText)("Obsidian 设置页初始化失败，请查看插件日志。", "Failed to initialize Obsidian settings. Check plugin logs.");
    }
}
(0, wizard_1.initWizardCallbacks)({
    refreshObsidianPrefsUI,
    renderSyncSummary: preview_1.renderSyncSummary,
    markPreviewStale: preview_1.markPreviewStale,
    chooseObsidianItemTemplate,
});
(0, metadataPresetEditor_1.initMetadataPresetEditorCallbacks)({
    refreshObsidianPrefsUI,
});
