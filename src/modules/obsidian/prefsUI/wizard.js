"use strict";
// ── Obsidian Setup Wizard ──
// Handles vault auto-detection and the guided setup wizard flow.
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
exports.initWizardCallbacks = initWizardCallbacks;
exports.autoDetectObsidianVault = autoDetectObsidianVault;
exports.runObsidianSetupWizard = runObsidianSetupWizard;
exports.maybeAutoRunObsidianSetupWizard = maybeAutoRunObsidianSetupWizard;
const hint_1 = require("../../../utils/hint");
const prefs_1 = require("../../../utils/prefs");
const constants_1 = require("../constants");
const settings_1 = require("../settings");
const shared_1 = require("../shared");
const paths_1 = require("../paths");
const state_1 = require("./state");
const helpers_1 = require("./helpers");
// forward declared – populated at runtime to avoid circular dep
let _refreshObsidianPrefsUI = null;
let _renderSyncSummary = null;
let _markPreviewStale = null;
let _chooseObsidianItemTemplate = null;
function initWizardCallbacks(cbs) {
    _refreshObsidianPrefsUI = cbs.refreshObsidianPrefsUI;
    _renderSyncSummary = cbs.renderSyncSummary;
    _markPreviewStale = cbs.markPreviewStale;
    _chooseObsidianItemTemplate = cbs.chooseObsidianItemTemplate;
}
function autoDetectObsidianVault() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        const promptWindow = (0, helpers_1.getObsidianPromptWindow)(options.promptWindow);
        const detectedVault = yield (0, helpers_1.chooseDetectedObsidianVault)(promptWindow);
        if (detectedVault) {
            const defaults = (0, settings_1.deriveObsidianPathDefaults)(detectedVault.path);
            (0, helpers_1.applyObsidianSetupDraft)(Object.assign(Object.assign({}, (0, helpers_1.buildCurrentObsidianSetupDraft)()), { vaultRoot: detectedVault.path, notesDir: defaults.notesDir, assetsDir: defaults.assetsDir, dashboardDir: defaults.dashboardDir }), { overwriteExisting: false });
            _refreshObsidianPrefsUI === null || _refreshObsidianPrefsUI === void 0 ? void 0 : _refreshObsidianPrefsUI();
            (0, hint_1.showHint)((0, helpers_1.uiText)(`已检测并设置 Vault：${detectedVault.name}。`, `Detected and set vault: ${detectedVault.name}.`));
            return true;
        }
        if (!options.allowManualFallback) {
            (0, hint_1.showHint)((0, helpers_1.uiText)("没有在常见位置找到 Obsidian vault。", "No Obsidian vault was found in common locations."));
            return false;
        }
        const pickedVaultRoot = yield (0, helpers_1.pickObsidianFolderManually)((0, helpers_1.uiText)("手动选择 Obsidian Vault", "Choose Obsidian Vault"), (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.vaultRoot") || "")), promptWindow);
        if (!pickedVaultRoot) {
            return false;
        }
        if (!(yield (0, helpers_1.confirmObsidianVaultRoot)(pickedVaultRoot, promptWindow))) {
            return false;
        }
        const defaults = (0, settings_1.deriveObsidianPathDefaults)(pickedVaultRoot);
        (0, helpers_1.applyObsidianSetupDraft)(Object.assign(Object.assign({}, (0, helpers_1.buildCurrentObsidianSetupDraft)()), { vaultRoot: pickedVaultRoot, notesDir: defaults.notesDir, assetsDir: defaults.assetsDir, dashboardDir: defaults.dashboardDir }), { overwriteExisting: false });
        _refreshObsidianPrefsUI === null || _refreshObsidianPrefsUI === void 0 ? void 0 : _refreshObsidianPrefsUI();
        (0, hint_1.showHint)((0, helpers_1.uiText)(`已手动设置 Vault：${(0, paths_1.getLastPathSegment)(pickedVaultRoot) || pickedVaultRoot}。`, `Vault set to ${(0, paths_1.getLastPathSegment)(pickedVaultRoot) || pickedVaultRoot}.`));
        return true;
    });
}
function runObsidianSetupWizard() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        if (state_1.obsidianSetupWizardPromise) {
            return state_1.obsidianSetupWizardPromise;
        }
        (0, state_1.setObsidianSetupWizardPromise)((() => __awaiter(this, void 0, void 0, function* () {
            const promptWindow = (0, helpers_1.getObsidianPromptWindow)(options.promptWindow);
            const currentDraft = (0, helpers_1.buildCurrentObsidianSetupDraft)();
            let vaultRoot = currentDraft.vaultRoot;
            const detectedVault = yield (0, helpers_1.chooseDetectedObsidianVault)(promptWindow);
            if (detectedVault) {
                vaultRoot = detectedVault.path;
            }
            else {
                const pickedVaultRoot = yield (0, helpers_1.pickObsidianFolderManually)((0, helpers_1.uiText)("选择 Obsidian Vault", "Choose Obsidian Vault"), currentDraft.vaultRoot, promptWindow);
                if (!pickedVaultRoot) {
                    return false;
                }
                if (!(yield (0, helpers_1.confirmObsidianVaultRoot)(pickedVaultRoot, promptWindow))) {
                    return false;
                }
                vaultRoot = pickedVaultRoot;
            }
            const defaults = (0, settings_1.deriveObsidianPathDefaults)(vaultRoot);
            let notesDir = defaults.notesDir;
            let dashboardDir = defaults.dashboardDir;
            let dashboardAutoSetup = true;
            let selectedTemplate = currentDraft.itemTemplate || constants_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE;
            const notesChoice = (0, helpers_1.promptChoice)({
                title: (0, helpers_1.uiText)("配置文献笔记目录", "Choose Literature Notes Folder"),
                text: (0, helpers_1.uiText)(`推荐把文献笔记放在：\n${defaults.notesDir}\n\n是否使用这个推荐位置？`, `Recommended literature notes folder:\n${defaults.notesDir}\n\nUse this recommended location?`),
                buttons: [
                    (0, helpers_1.uiText)("使用推荐位置", "Use Recommended"),
                    (0, helpers_1.uiText)("自定义目录", "Choose Custom"),
                    (0, helpers_1.uiText)("取消向导", "Cancel Wizard"),
                ],
                window: promptWindow,
            });
            if (notesChoice === 2) {
                return false;
            }
            if (notesChoice === 1) {
                notesDir =
                    (yield (0, helpers_1.pickObsidianFolderManually)((0, helpers_1.uiText)("选择文献笔记目录", "Choose Literature Notes Folder"), defaults.notesDir, promptWindow)) || defaults.notesDir;
            }
            const templateChoice = (0, helpers_1.promptChoice)({
                title: (0, helpers_1.uiText)("配置文献模板", "Choose Literature Template"),
                text: (0, helpers_1.uiText)(`推荐模板：${constants_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE}\n当前模板：${currentDraft.itemTemplate || constants_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE}`, `Recommended template: ${constants_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE}\nCurrent template: ${currentDraft.itemTemplate || constants_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE}`),
                buttons: [
                    (0, helpers_1.uiText)("使用推荐模板", "Use Recommended"),
                    (0, helpers_1.uiText)("选择其他模板", "Choose Another"),
                    (0, helpers_1.uiText)("保留当前", "Keep Current"),
                ],
                window: promptWindow,
            });
            if (templateChoice === 0) {
                selectedTemplate = constants_1.DEFAULT_OBSIDIAN_ITEM_TEMPLATE;
            }
            else if (templateChoice === 1) {
                selectedTemplate =
                    (yield (_chooseObsidianItemTemplate === null || _chooseObsidianItemTemplate === void 0 ? void 0 : _chooseObsidianItemTemplate(selectedTemplate))) ||
                        selectedTemplate;
            }
            const dashboardChoice = (0, helpers_1.promptChoice)({
                title: (0, helpers_1.uiText)("配置 Dashboard", "Choose Dashboard Setup"),
                text: (0, helpers_1.uiText)(`推荐 Dashboard 目录：\n${defaults.dashboardDir}\n\n是否启用并自动生成 Dashboard？`, `Recommended dashboard folder:\n${defaults.dashboardDir}\n\nEnable and auto-generate dashboards?`),
                buttons: [
                    (0, helpers_1.uiText)("启用推荐目录", "Enable Recommended"),
                    (0, helpers_1.uiText)("自定义目录", "Choose Custom"),
                    (0, helpers_1.uiText)("暂不启用", "Skip for Now"),
                ],
                window: promptWindow,
            });
            if (dashboardChoice === 1) {
                dashboardDir =
                    (yield (0, helpers_1.pickObsidianFolderManually)((0, helpers_1.uiText)("选择 Dashboard 目录", "Choose Dashboard Folder"), defaults.dashboardDir, promptWindow)) || defaults.dashboardDir;
                dashboardAutoSetup = true;
            }
            else if (dashboardChoice === 2) {
                dashboardDir = defaults.dashboardDir;
                dashboardAutoSetup = false;
            }
            (0, helpers_1.applyObsidianSetupDraft)({
                vaultRoot,
                notesDir,
                assetsDir: defaults.assetsDir,
                dashboardDir,
                dashboardAutoSetup,
                itemTemplate: selectedTemplate,
            }, { overwriteExisting: true });
            (0, prefs_1.setPref)(constants_1.OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, true);
            _refreshObsidianPrefsUI === null || _refreshObsidianPrefsUI === void 0 ? void 0 : _refreshObsidianPrefsUI();
            _renderSyncSummary === null || _renderSyncSummary === void 0 ? void 0 : _renderSyncSummary();
            _markPreviewStale === null || _markPreviewStale === void 0 ? void 0 : _markPreviewStale();
            try {
                const result = yield (0, settings_1.writeObsidianConnectionTestFile)();
                (0, hint_1.showHint)((0, helpers_1.uiText)(`配置完成，已写入测试文件 ${result.fileName}。`, `Setup completed and wrote test file ${result.fileName}.`));
            }
            catch (error) {
                (0, hint_1.showHint)((0, shared_1.cleanInline)((error === null || error === void 0 ? void 0 : error.message) || "") ||
                    (0, helpers_1.uiText)("配置已保存，但连接测试失败，请检查路径和权限。", "Setup was saved, but the connection test failed. Check the paths and permissions."));
            }
            return true;
        }))().finally(() => {
            (0, state_1.setObsidianSetupWizardPromise)(null);
        }));
        return state_1.obsidianSetupWizardPromise;
    });
}
function maybeAutoRunObsidianSetupWizard(win) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedProfileDir = (0, shared_1.cleanInline)(String(Zotero.profileDir || ""))
            .replace(/\\/g, "/")
            .toLowerCase();
        if (Zotero.automatedTest ||
            normalizedProfileDir.includes("/.scaffold/test/profile")) {
            return false;
        }
        if (win && win !== Zotero.getMainWindow()) {
            return false;
        }
        if ((0, settings_1.isObsidianConfigured)() ||
            (0, settings_1.getBooleanPrefOrDefault)(constants_1.OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, false)) {
            return false;
        }
        (0, prefs_1.setPref)(constants_1.OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, true);
        const index = (0, helpers_1.promptChoice)({
            title: (0, helpers_1.uiText)("首次配置 Obsidian", "Set Up Obsidian"),
            text: (0, helpers_1.uiText)("检测到你还没有配置 Obsidian Vault。是否现在启动快速配置向导？", "It looks like Obsidian has not been configured yet. Start the quick setup wizard now?"),
            buttons: [(0, helpers_1.uiText)("开始配置", "Start Setup"), (0, helpers_1.uiText)("稍后再说", "Later")],
            window: win || null,
        });
        if (index !== 0) {
            return false;
        }
        return runObsidianSetupWizard({
            autoTriggered: true,
            promptWindow: win || null,
        });
    });
}
