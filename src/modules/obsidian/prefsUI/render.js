"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderObsidianItemTemplateSelection = renderObsidianItemTemplateSelection;
exports.getObsidianTooltipText = getObsidianTooltipText;
exports.ensureObsidianTooltipNode = ensureObsidianTooltipNode;
exports.positionObsidianTooltip = positionObsidianTooltip;
exports.renderObsidianFrontmatterFieldConfigurator = renderObsidianFrontmatterFieldConfigurator;
exports.ensureObsidianPrefsStyle = ensureObsidianPrefsStyle;
exports.getObsidianSettingsShellMarkup = getObsidianSettingsShellMarkup;
exports.renderObsidianSettingsShell = renderObsidianSettingsShell;
exports.hydrateStaticObsidianPrefsControls = hydrateStaticObsidianPrefsControls;
const locale_1 = require("../../../utils/locale");
const prefs_1 = require("../../../utils/prefs");
const childNotes_1 = require("../childNotes");
const layout_1 = require("./layout");
const style_1 = require("./style");
const shared_1 = require("../shared");
const settings_1 = require("../settings");
const paths_1 = require("../paths");
const uiIds_1 = require("./uiIds");
const helpers_1 = require("./helpers");
function renderObsidianItemTemplateSelection() {
    const templateDisplay = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID);
    if (!templateDisplay) {
        return;
    }
    const configuredTemplate = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_ITEM_TEMPLATE_PREF) || ""));
    const effectiveTemplate = (0, settings_1.resolveObsidianItemTemplateName)();
    const label = (0, settings_1.getObsidianItemTemplateLabel)(effectiveTemplate);
    templateDisplay.value =
        label +
            (configuredTemplate &&
                configuredTemplate !== effectiveTemplate &&
                !(0, settings_1.hasTemplateByName)(configuredTemplate)
                ? " (missing)"
                : "");
    templateDisplay.title = effectiveTemplate;
}
const OBSIDIAN_TOOLTIP_TEXT = {
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
function getObsidianTooltipText(key) {
    const tooltip = OBSIDIAN_TOOLTIP_TEXT[(0, shared_1.cleanInline)(key)];
    return tooltip ? (0, helpers_1.uiText)(tooltip.zh, tooltip.en) : "";
}
function ensureObsidianTooltipNode(doc) {
    var _a;
    let tooltip = doc.getElementById(uiIds_1.OBSIDIAN_TOOLTIP_ID);
    if (tooltip) {
        return tooltip;
    }
    tooltip = (0, helpers_1.createPrefHTMLElement)(doc, "div");
    tooltip.id = uiIds_1.OBSIDIAN_TOOLTIP_ID;
    tooltip.className = "ob-prefs-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.dataset.show = "false";
    (_a = doc.documentElement) === null || _a === void 0 ? void 0 : _a.appendChild(tooltip);
    return tooltip;
}
function positionObsidianTooltip(tooltip, target, doc) {
    const view = doc.defaultView;
    if (!view) {
        return;
    }
    const gap = 10;
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
    left = Math.max(gap, Math.min(left, view.innerWidth - tooltipRect.width - gap));
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
function renderObsidianFrontmatterFieldConfigurator() {
    const summary = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_FRONTMATTER_SUMMARY_ID);
    const container = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_FRONTMATTER_FIELD_LIST_ID);
    if (!summary || !container) {
        return;
    }
    const selectedFields = (0, settings_1.getManagedFrontmatterFields)();
    const selectedKeys = new Set(selectedFields);
    const activePreset = (0, settings_1.resolveManagedFrontmatterPreset)(selectedFields);
    summary.textContent = (0, locale_1.getString)("obsidian-frontmatter-summary", {
        args: {
            preset: (0, settings_1.getManagedFrontmatterPresetLabel)(activePreset),
            count: selectedKeys.size,
            fixed: settings_1.FIXED_MANAGED_FRONTMATTER_KEYS.join(", "),
        },
    });
    const doc = container.ownerDocument;
    container.replaceChildren();
    const presetSection = (0, helpers_1.createPrefHTMLElement)(doc, "div");
    presetSection.setAttribute("style", "display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:0 0 16px 0;align-items:stretch;");
    for (const preset of settings_1.MANAGED_FRONTMATTER_PRESETS) {
        const isActive = activePreset === preset.id;
        const card = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        card.setAttribute("style", [
            "display:flex",
            "flex-direction:column",
            "justify-content:space-between",
            "gap:10px",
            "padding:14px 16px",
            "border-radius:12px",
            `border:1px solid ${isActive ? "var(--accent-blue)" : "var(--material-border)"}`,
            `background:${isActive ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)"}`,
            "box-sizing:border-box",
            "min-height:132px",
        ].join(";"));
        const content = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        content.setAttribute("style", "display:flex;flex-direction:column;gap:8px;align-items:flex-start;");
        const header = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        header.setAttribute("style", "display:flex;align-items:center;gap:8px;flex-wrap:wrap;");
        const title = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        title.textContent = (0, locale_1.getString)(preset.titleL10nId);
        title.setAttribute("style", "font-weight:700;line-height:1.4;");
        header.appendChild(title);
        if (isActive) {
            const badge = (0, helpers_1.createPrefHTMLElement)(doc, "span");
            badge.textContent = (0, locale_1.getString)("obsidian-frontmatter-preset-active");
            badge.setAttribute("style", "font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:rgba(59,130,246,0.18);color:var(--accent-blue);");
            header.appendChild(badge);
        }
        content.appendChild(header);
        const description = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        description.textContent = (0, locale_1.getString)(preset.descriptionL10nId);
        description.setAttribute("style", "font-size:13px;line-height:1.6;color:var(--text-color-deemphasized);");
        content.appendChild(description);
        card.appendChild(content);
        const button = (0, helpers_1.createPrefHTMLElement)(doc, "button");
        button.type = "button";
        button.textContent = isActive
            ? (0, locale_1.getString)("obsidian-frontmatter-preset-active")
            : (0, locale_1.getString)("obsidian-frontmatter-preset-apply");
        button.disabled = isActive;
        button.setAttribute("style", "align-self:flex-start;padding:6px 12px;border-radius:8px;font-weight:600;");
        button.addEventListener("click", () => {
            (0, settings_1.setManagedFrontmatterFields)(preset.fields);
            renderObsidianFrontmatterFieldConfigurator();
        });
        card.appendChild(button);
        presetSection.appendChild(card);
    }
    container.appendChild(presetSection);
    const groupOrder = [
        "reference",
        "links",
        "library",
    ];
    for (const groupKey of groupOrder) {
        const groupOptions = settings_1.MANAGED_FRONTMATTER_OPTIONS.filter((option) => option.group === groupKey);
        const group = (0, helpers_1.createPrefHTMLElement)(doc, "section");
        group.setAttribute("style", "margin-bottom:16px;");
        const header = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        header.textContent = (0, locale_1.getString)(`obsidian-frontmatter-group-${groupKey}`);
        header.setAttribute("style", "font-weight:700;margin:0 0 10px 0;color:var(--text-color);");
        group.appendChild(header);
        const list = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        list.setAttribute("style", "display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;align-items:start;");
        for (const option of groupOptions) {
            const row = (0, helpers_1.createPrefHTMLElement)(doc, "label");
            row.setAttribute("style", "display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:10px;border:1px solid var(--material-border);background:rgba(255,255,255,0.02);cursor:pointer;box-sizing:border-box;min-height:78px;");
            const checkbox = (0, helpers_1.createPrefHTMLElement)(doc, "input");
            checkbox.type = "checkbox";
            checkbox.checked = selectedKeys.has(option.key);
            checkbox.style.marginTop = "2px";
            checkbox.addEventListener("change", () => {
                const nextSelection = new Set((0, settings_1.getManagedFrontmatterFields)());
                if (checkbox.checked) {
                    nextSelection.add(option.key);
                }
                else {
                    nextSelection.delete(option.key);
                }
                (0, settings_1.setManagedFrontmatterFields)(Array.from(nextSelection));
                renderObsidianFrontmatterFieldConfigurator();
            });
            row.appendChild(checkbox);
            const content = (0, helpers_1.createPrefHTMLElement)(doc, "div");
            content.setAttribute("style", "display:flex;flex-direction:column;gap:4px;min-width:0;flex:1;align-items:flex-start;");
            const optionTitle = (0, helpers_1.createPrefHTMLElement)(doc, "div");
            optionTitle.textContent = (0, settings_1.getManagedFrontmatterOptionLabel)(option.key);
            optionTitle.setAttribute("style", "font-weight:600;line-height:1.45;");
            content.appendChild(optionTitle);
            const help = (0, helpers_1.createPrefHTMLElement)(doc, "code");
            help.textContent = option.help;
            help.setAttribute("style", "font-size:12px;color:var(--text-color-deemphasized);line-height:1.4;word-break:break-word;background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:6px;");
            content.appendChild(help);
            row.appendChild(content);
            list.appendChild(row);
        }
        group.appendChild(list);
        container.appendChild(group);
    }
}
function ensureObsidianPrefsStyle(prefDoc) {
    if (prefDoc.querySelector(`#${uiIds_1.OBSIDIAN_SETTINGS_STYLE_ID}`)) {
        return;
    }
    const style = (0, helpers_1.createPrefHTMLElement)(prefDoc, "style");
    style.id = uiIds_1.OBSIDIAN_SETTINGS_STYLE_ID;
    style.textContent = (0, style_1.buildObsidianPrefsStyleText)(uiIds_1.OBSIDIAN_SETTINGS_ROOT_ID, uiIds_1.OBSIDIAN_TOOLTIP_ID);
    const root = (0, helpers_1.getObsidianSettingsRoot)(prefDoc);
    const parent = (root === null || root === void 0 ? void 0 : root.parentElement) || prefDoc.documentElement;
    if (root && parent) {
        parent.insertBefore(style, root);
    }
    else {
        prefDoc.documentElement.appendChild(style);
    }
}
function getObsidianSettingsShellMarkup(prefDoc) {
    const { appPath, vaultRoot, notesDir, assetsDir, dashboardDir } = (0, helpers_1.getObsidianResolvedPaths)();
    return (0, layout_1.buildObsidianSettingsShellHTML)({
        escapeHTML: (value) => (0, helpers_1.escapePrefHTML)(prefDoc, value),
        getString: locale_1.getString,
        uiText: helpers_1.uiText,
        resolvedPaths: { appPath, vaultRoot, notesDir, assetsDir, dashboardDir },
        contentConfig: (0, settings_1.getManagedNoteContentConfig)(),
        translationConfig: (0, settings_1.getMissingMetadataTranslationConfig)(),
        fileNameTemplate: (0, paths_1.getManagedFileNamePattern)(),
        syncScope: (0, settings_1.normalizeObsidianSyncScope)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_SYNC_SCOPE_PREF) || "")),
        updateStrategy: (0, settings_1.normalizeObsidianUpdateStrategy)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || "")),
        autoSync: (0, settings_1.getBooleanPrefOrDefault)("obsidian.autoSync", true),
        watchFiles: (0, settings_1.getBooleanPrefOrDefault)("obsidian.watchFiles", true),
        openAfterSync: (0, settings_1.getBooleanPrefOrDefault)("obsidian.openAfterSync", true),
        revealAfterSync: (0, settings_1.getBooleanPrefOrDefault)("obsidian.revealAfterSync", false),
        childNoteTags: (0, settings_1.getStringPrefOrDefault)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNotes_1.DEFAULT_CHILD_NOTE_TAGS.join(", ")),
        childNotePrompt: (0, settings_1.getBooleanPrefOrDefault)(childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, true),
        dashboardAutoSetup: (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, true),
        ids: {
            connectionStatusId: uiIds_1.OBSIDIAN_CONNECTION_STATUS_ID,
            appPathInputId: uiIds_1.OBSIDIAN_APP_PATH_INPUT_ID,
            vaultRootInputId: uiIds_1.OBSIDIAN_VAULT_ROOT_INPUT_ID,
            notesDirInputId: uiIds_1.OBSIDIAN_NOTES_DIR_INPUT_ID,
            assetsDirInputId: uiIds_1.OBSIDIAN_ASSETS_DIR_INPUT_ID,
            connectionTestButtonId: uiIds_1.OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
            connectionTestResultId: uiIds_1.OBSIDIAN_CONNECTION_TEST_RESULT_ID,
            vaultRootHintId: uiIds_1.OBSIDIAN_VAULT_ROOT_HINT_ID,
            notesDirHintId: uiIds_1.OBSIDIAN_NOTES_DIR_HINT_ID,
            assetsDirHintId: uiIds_1.OBSIDIAN_ASSETS_DIR_HINT_ID,
            dashboardDirHintId: uiIds_1.OBSIDIAN_DASHBOARD_DIR_HINT_ID,
            dashboardDirInputId: settings_1.OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
            fileNameTemplateInputId: settings_1.OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID,
            fileNamePreviewId: uiIds_1.OBSIDIAN_FILE_NAME_PREVIEW_ID,
            fileNameContextId: uiIds_1.OBSIDIAN_FILE_NAME_CONTEXT_ID,
            previewTriggerId: uiIds_1.OBSIDIAN_PREVIEW_TRIGGER_ID,
            previewMetaId: uiIds_1.OBSIDIAN_PREVIEW_META_ID,
            previewFileId: uiIds_1.OBSIDIAN_PREVIEW_FILE_ID,
            previewFrontmatterId: uiIds_1.OBSIDIAN_PREVIEW_FRONTMATTER_ID,
            previewBodyId: uiIds_1.OBSIDIAN_PREVIEW_BODY_ID,
            syncSummaryId: uiIds_1.OBSIDIAN_SYNC_SUMMARY_ID,
            contentSummaryId: uiIds_1.OBSIDIAN_CONTENT_SUMMARY_ID,
            autoSyncInputId: uiIds_1.OBSIDIAN_AUTO_SYNC_INPUT_ID,
            watchFilesInputId: uiIds_1.OBSIDIAN_WATCH_FILES_INPUT_ID,
            revealAfterSyncInputId: uiIds_1.OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
            openAfterSyncInputId: uiIds_1.OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
            includeMetadataInputId: settings_1.OBSIDIAN_INCLUDE_METADATA_INPUT_ID,
            includeAbstractInputId: settings_1.OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID,
            includeAnnotationsInputId: settings_1.OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID,
            includeHiddenInfoInputId: settings_1.OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID,
            includeChildNotesInputId: settings_1.OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID,
            translateMissingMetadataInputId: settings_1.OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID,
            translateMissingTitleInputId: settings_1.OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
            translateMissingAbstractInputId: settings_1.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
            itemTemplateDisplayId: settings_1.OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID,
            frontmatterSummaryId: settings_1.OBSIDIAN_FRONTMATTER_SUMMARY_ID,
            frontmatterFieldListId: settings_1.OBSIDIAN_FRONTMATTER_FIELD_LIST_ID,
            metadataPresetSelectId: settings_1.OBSIDIAN_METADATA_PRESET_SELECT_ID,
            metadataPresetNameInputId: settings_1.OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID,
            metadataPresetSectionId: settings_1.OBSIDIAN_METADATA_PRESET_SECTION_ID,
            metadataPresetSearchId: settings_1.OBSIDIAN_METADATA_PRESET_SEARCH_ID,
            metadataPresetSummaryId: settings_1.OBSIDIAN_METADATA_PRESET_SUMMARY_ID,
            metadataPresetFieldListId: settings_1.OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID,
            metadataPresetSaveButtonId: settings_1.OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID,
            metadataPresetDuplicateButtonId: settings_1.OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID,
            metadataPresetDeleteButtonId: settings_1.OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID,
            metadataPresetResetButtonId: settings_1.OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID,
            metadataPresetResyncButtonId: settings_1.OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID,
            childNotePromptSelectInputId: childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
            childNoteTagsInputId: childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
            dashboardAutoSetupInputId: settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
        },
        groupNames: {
            updateStrategy: uiIds_1.OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME,
            syncScope: uiIds_1.OBSIDIAN_SYNC_SCOPE_GROUP_NAME,
        },
    });
}
function renderObsidianSettingsShell(prefDoc) {
    const root = (0, helpers_1.getObsidianSettingsRoot)(prefDoc);
    if (!root) {
        return false;
    }
    try {
        delete root.dataset.obPrefsBound;
        (0, helpers_1.replacePrefHTML)(root, getObsidianSettingsShellMarkup(prefDoc));
    }
    catch (error) {
        ztoolkit.log("[obsidian prefs render]", error);
        root.textContent =
            (0, shared_1.cleanInline)((error === null || error === void 0 ? void 0 : error.message) || "") ||
                (0, helpers_1.uiText)("Obsidian 设置页渲染失败，请查看插件日志。", "Failed to render Obsidian settings. Check plugin logs.");
        return false;
    }
    return true;
}
function hydrateStaticObsidianPrefsControls() {
    const { appPath, vaultRoot, notesDir, assetsDir, dashboardDir } = (0, helpers_1.getObsidianResolvedPaths)();
    (0, helpers_1.setPrefElementValue)(uiIds_1.OBSIDIAN_APP_PATH_INPUT_ID, appPath);
    (0, helpers_1.setPrefElementValue)(uiIds_1.OBSIDIAN_VAULT_ROOT_INPUT_ID, vaultRoot);
    (0, helpers_1.setPrefElementValue)(uiIds_1.OBSIDIAN_NOTES_DIR_INPUT_ID, notesDir);
    (0, helpers_1.setPrefElementValue)(uiIds_1.OBSIDIAN_ASSETS_DIR_INPUT_ID, assetsDir);
    (0, helpers_1.setPrefElementValue)(settings_1.OBSIDIAN_DASHBOARD_DIR_INPUT_ID, dashboardDir);
    (0, helpers_1.setPrefElementValue)(settings_1.OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID, (0, paths_1.getManagedFileNamePattern)());
    (0, helpers_1.setPrefElementChecked)(settings_1.OBSIDIAN_INCLUDE_METADATA_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_INCLUDE_METADATA_PREF, true));
    (0, helpers_1.setPrefElementChecked)(settings_1.OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_INCLUDE_ABSTRACT_PREF, true));
    (0, helpers_1.setPrefElementChecked)(settings_1.OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_INCLUDE_ANNOTATIONS_PREF, true));
    (0, helpers_1.setPrefElementChecked)(settings_1.OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF, true));
    (0, helpers_1.setPrefElementChecked)(settings_1.OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_INCLUDE_CHILD_NOTES_PREF, true));
    (0, helpers_1.setPrefElementChecked)(uiIds_1.OBSIDIAN_AUTO_SYNC_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)("obsidian.autoSync", true));
    (0, helpers_1.setPrefElementChecked)(uiIds_1.OBSIDIAN_WATCH_FILES_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)("obsidian.watchFiles", true));
    (0, helpers_1.setPrefElementChecked)(uiIds_1.OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)("obsidian.openAfterSync", true));
    (0, helpers_1.setPrefElementChecked)(uiIds_1.OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)("obsidian.revealAfterSync", false));
    (0, helpers_1.setPrefElementChecked)(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, true));
    (0, helpers_1.setPrefElementChecked)(childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID, (0, settings_1.getBooleanPrefOrDefault)(childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, true));
    (0, helpers_1.setPrefElementValue)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID, (0, settings_1.getStringPrefOrDefault)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNotes_1.DEFAULT_CHILD_NOTE_TAGS.join(", ")));
    (0, helpers_1.setPrefRadioValue)(uiIds_1.OBSIDIAN_SYNC_SCOPE_GROUP_NAME, (0, settings_1.normalizeObsidianSyncScope)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_SYNC_SCOPE_PREF) || "")));
    (0, helpers_1.setPrefRadioValue)(uiIds_1.OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME, (0, settings_1.normalizeObsidianUpdateStrategy)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF) || "")));
}
