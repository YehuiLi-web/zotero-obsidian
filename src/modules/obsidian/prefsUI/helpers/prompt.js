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
exports.getObsidianPromptWindow = getObsidianPromptWindow;
exports.promptChoice = promptChoice;
exports.promptSelectIndex = promptSelectIndex;
exports.pickObsidianFolderManually = pickObsidianFolderManually;
exports.confirmObsidianVaultRoot = confirmObsidianVaultRoot;
exports.buildCurrentObsidianSetupDraft = buildCurrentObsidianSetupDraft;
exports.setPathPrefWithDefault = setPathPrefWithDefault;
exports.applyObsidianSetupDraft = applyObsidianSetupDraft;
exports.chooseDetectedObsidianVault = chooseDetectedObsidianVault;
const prefs_1 = require("../../../../utils/prefs");
const str_1 = require("../../../../utils/str");
const settings_1 = require("../../settings");
const shared_1 = require("../../shared");
const dom_1 = require("./dom");
function getObsidianPromptWindow(preferredWindow) {
    var _a;
    return preferredWindow || ((_a = addon.data.prefs) === null || _a === void 0 ? void 0 : _a.window) || Zotero.getMainWindow();
}
function getPromptDefaultFlag(index = 0) {
    const prompt = Services.prompt;
    switch (index) {
        case 1:
            return prompt.BUTTON_POS_1_DEFAULT || 0;
        case 2:
            return prompt.BUTTON_POS_2_DEFAULT || 0;
        default:
            return prompt.BUTTON_POS_0_DEFAULT || 0;
    }
}
function promptChoice(options) {
    const prompt = Services.prompt;
    const buttonFlags = options.buttons.reduce((flags, _label, index) => {
        const posKey = `BUTTON_POS_${index}`;
        return (flags + (prompt[posKey] || 0) * (prompt.BUTTON_TITLE_IS_STRING || 0));
    }, 0) + getPromptDefaultFlag(options.defaultButton || 0);
    return prompt.confirmEx(getObsidianPromptWindow(options.window), options.title, options.text, buttonFlags, options.buttons[0] || null, options.buttons[1] || null, options.buttons[2] || null, null, {});
}
function promptSelectIndex(options) {
    const prompt = Services.prompt;
    if (!options.labels.length) {
        return null;
    }
    if (options.labels.length === 1) {
        return 0;
    }
    if (typeof prompt.select !== "function") {
        return 0;
    }
    const selected = { value: options.defaultIndex || 0 };
    const accepted = prompt.select(getObsidianPromptWindow(options.window), options.title, options.text, options.labels.length, options.labels, selected);
    return accepted ? selected.value : null;
}
function pickObsidianFolderManually(title_1) {
    return __awaiter(this, arguments, void 0, function* (title, currentValue = "", promptWindow) {
        const selection = yield new ztoolkit.FilePicker(title, "folder", undefined, undefined, getObsidianPromptWindow(promptWindow), "all", currentValue || undefined).open();
        return selection ? (0, str_1.formatPath)(selection) : "";
    });
}
function confirmObsidianVaultRoot(vaultRoot, promptWindow) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!vaultRoot || (yield (0, settings_1.isObsidianVaultDirectory)(vaultRoot))) {
            return true;
        }
        const index = promptChoice({
            title: (0, dom_1.uiText)("Vault 检测提示", "Vault Check"),
            text: (0, dom_1.uiText)("所选目录中没有检测到 .obsidian 文件夹，看起来不像一个标准 Obsidian vault。仍然继续吗？", "The selected folder does not contain a .obsidian folder, so it does not look like a standard Obsidian vault. Continue anyway?"),
            buttons: [(0, dom_1.uiText)("仍然继续", "Continue"), (0, dom_1.uiText)("取消", "Cancel")],
            defaultButton: 1,
            window: promptWindow,
        });
        return index === 0;
    });
}
function buildCurrentObsidianSetupDraft() {
    const vaultRoot = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.vaultRoot") || ""));
    const defaults = (0, settings_1.deriveObsidianPathDefaults)(vaultRoot);
    return {
        vaultRoot,
        notesDir: (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.notesDir") || "")) ||
            defaults.notesDir,
        assetsDir: (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.assetsDir") || "")) ||
            defaults.assetsDir,
        dashboardDir: (0, shared_1.cleanInline)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_DASHBOARD_DIR_PREF) || "")) ||
            defaults.dashboardDir,
        dashboardAutoSetup: (0, settings_1.getBooleanPrefOrDefault)(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, true),
        itemTemplate: (0, settings_1.resolveObsidianItemTemplateName)(),
    };
}
function setPathPrefWithDefault(prefKey, value, defaultValue) {
    const normalizedValue = (0, str_1.formatPath)((0, shared_1.cleanInline)(value));
    const normalizedDefault = (0, str_1.formatPath)((0, shared_1.cleanInline)(defaultValue));
    (0, prefs_1.setPref)(prefKey, normalizedValue && normalizedValue !== normalizedDefault
        ? normalizedValue
        : "");
}
function applyObsidianSetupDraft(draft, options = {}) {
    var _a;
    const overwriteExisting = (_a = options.overwriteExisting) !== null && _a !== void 0 ? _a : true;
    const defaults = (0, settings_1.deriveObsidianPathDefaults)(draft.vaultRoot);
    const currentNotesPref = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.notesDir") || ""));
    const currentAssetsPref = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.assetsDir") || ""));
    const currentDashboardPref = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_DASHBOARD_DIR_PREF) || ""));
    const nextNotesDir = (0, str_1.formatPath)((0, shared_1.cleanInline)(draft.notesDir)) ||
        (overwriteExisting || !currentNotesPref
            ? defaults.notesDir
            : currentNotesPref);
    const nextAssetsDir = (0, str_1.formatPath)((0, shared_1.cleanInline)(draft.assetsDir)) ||
        (overwriteExisting || !currentAssetsPref
            ? defaults.assetsDir
            : currentAssetsPref);
    const nextDashboardDir = (0, str_1.formatPath)((0, shared_1.cleanInline)(draft.dashboardDir)) ||
        (overwriteExisting || !currentDashboardPref
            ? defaults.dashboardDir
            : currentDashboardPref);
    (0, prefs_1.setPref)("obsidian.vaultRoot", defaults.vaultRoot);
    (0, prefs_1.setPref)("obsidian.vaultName", defaults.vaultName);
    setPathPrefWithDefault("obsidian.notesDir", nextNotesDir, defaults.notesDir);
    setPathPrefWithDefault("obsidian.assetsDir", nextAssetsDir, defaults.assetsDir);
    setPathPrefWithDefault(settings_1.OBSIDIAN_DASHBOARD_DIR_PREF, nextDashboardDir, defaults.dashboardDir);
    (0, prefs_1.setPref)(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF, Boolean(draft.dashboardAutoSetup));
    (0, prefs_1.setPref)(settings_1.OBSIDIAN_ITEM_TEMPLATE_PREF, (0, shared_1.cleanInline)(draft.itemTemplate) || settings_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE);
}
function chooseDetectedObsidianVault(promptWindow) {
    return __awaiter(this, void 0, void 0, function* () {
        const detectedVaults = yield (0, settings_1.detectObsidianVaults)();
        if (!detectedVaults.length) {
            return null;
        }
        const selectedIndex = promptSelectIndex({
            title: (0, dom_1.uiText)("选择 Obsidian Vault", "Choose an Obsidian Vault"),
            text: (0, dom_1.uiText)("已在常见位置扫描到以下 vault，请选择要连接的工作区。", "The following vaults were found in common locations. Choose the workspace to connect."),
            labels: detectedVaults.map((vault) => `${vault.name} - ${vault.path}`),
            window: promptWindow,
        });
        if (selectedIndex == null) {
            return null;
        }
        return detectedVaults[selectedIndex] || null;
    });
}
