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
exports.bindObsidianPrefsEvents = bindObsidianPrefsEvents;
const prefs_1 = require("../../../utils/prefs");
const str_1 = require("../../../utils/str");
const childNotes_1 = require("../childNotes");
const dashboard_1 = require("../dashboard");
const sync_1 = require("../sync");
const shared_1 = require("../shared");
const settings_1 = require("../settings");
const uiIds_1 = require("./uiIds");
const helpers_1 = require("./helpers");
const render_1 = require("./render");
const connection_1 = require("./connection");
const preview_1 = require("./preview");
function bindObsidianPrefsEvents(prefDoc, callbacks) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const root = (0, helpers_1.getObsidianSettingsRoot)(prefDoc);
    if (!root) {
        return;
    }
    if (root.dataset.obPrefsBound === "true") {
        return;
    }
    root.dataset.obPrefsBound = "true";
    const tooltipNode = (0, render_1.ensureObsidianTooltipNode)(prefDoc);
    let activeTooltipTarget = null;
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
    const showTooltip = (target) => {
        if (!tooltipNode) {
            return;
        }
        const tooltipText = (0, render_1.getObsidianTooltipText)(target.dataset.obTooltip || "");
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
        target.setAttribute("aria-describedby", tooltipNode.id);
        (0, render_1.positionObsidianTooltip)(tooltipNode, target, prefDoc);
    };
    root.querySelectorAll("[data-ob-tooltip]").forEach((target) => {
        target.addEventListener("mouseenter", () => {
            showTooltip(target);
        });
        target.addEventListener("mouseleave", hideTooltip);
    });
    (_a = prefDoc.defaultView) === null || _a === void 0 ? void 0 : _a.addEventListener("resize", hideTooltip);
    prefDoc.addEventListener("scroll", hideTooltip, true);
    const bindBooleanPref = (inputId, prefKey, onChange) => {
        const input = (0, helpers_1.getPrefElement)(inputId);
        if (!input) {
            return;
        }
        input.addEventListener("change", () => {
            (0, prefs_1.setPref)(prefKey, input.checked);
            onChange === null || onChange === void 0 ? void 0 : onChange();
        });
    };
    const syncTranslationOptionState = () => {
        var _a;
        const enabled = ((_a = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID)) === null || _a === void 0 ? void 0 : _a.checked) || false;
        [
            settings_1.OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
            settings_1.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
        ].forEach((inputId) => {
            const input = (0, helpers_1.getPrefElement)(inputId);
            if (input) {
                input.disabled = !enabled;
            }
        });
    };
    const bindPathInput = (inputId, prefKey, getDefaultValue, onChange) => {
        const input = (0, helpers_1.getPrefElement)(inputId);
        if (!input) {
            return;
        }
        const persist = () => {
            const normalized = (0, str_1.formatPath)(input.value);
            const defaultValue = getDefaultValue();
            if (!(0, shared_1.cleanInline)(normalized) || normalized === defaultValue) {
                (0, prefs_1.setPref)(prefKey, "");
                input.value = defaultValue;
            }
            else {
                (0, prefs_1.setPref)(prefKey, normalized);
            }
            onChange === null || onChange === void 0 ? void 0 : onChange();
        };
        input.addEventListener("change", persist);
        input.addEventListener("blur", persist);
    };
    root.querySelectorAll("[data-ob-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            (0, preview_1.switchObsidianPrefsTab)(button.dataset.obTab);
        });
    });
    bindPathInput(uiIds_1.OBSIDIAN_APP_PATH_INPUT_ID, "obsidian.appPath", () => "", () => {
        void (0, connection_1.updateConnectionDiagnostics)();
    });
    bindPathInput(uiIds_1.OBSIDIAN_VAULT_ROOT_INPUT_ID, "obsidian.vaultRoot", () => "", () => {
        void (0, connection_1.updateConnectionDiagnostics)();
        (0, preview_1.markPreviewStale)();
    });
    bindPathInput(uiIds_1.OBSIDIAN_NOTES_DIR_INPUT_ID, "obsidian.notesDir", () => (0, helpers_1.getObsidianResolvedPaths)().notesDir, () => {
        void (0, connection_1.updateConnectionDiagnostics)();
        (0, preview_1.renderSyncSummary)();
        (0, preview_1.markPreviewStale)();
    });
    bindPathInput(uiIds_1.OBSIDIAN_ASSETS_DIR_INPUT_ID, "obsidian.assetsDir", () => (0, helpers_1.getObsidianResolvedPaths)().assetsDir, () => {
        void (0, connection_1.updateConnectionDiagnostics)();
        (0, preview_1.markPreviewStale)();
    });
    bindPathInput(settings_1.OBSIDIAN_DASHBOARD_DIR_INPUT_ID, settings_1.OBSIDIAN_DASHBOARD_DIR_PREF, () => (0, helpers_1.getObsidianResolvedPaths)().dashboardDir, () => {
        void (0, connection_1.updateConnectionDiagnostics)();
    });
    root
        .querySelectorAll(`input[name="${uiIds_1.OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"]`)
        .forEach((input) => {
        input.addEventListener("change", () => {
            if (!input.checked) {
                return;
            }
            (0, prefs_1.setPref)(settings_1.OBSIDIAN_SYNC_SCOPE_PREF, (0, settings_1.normalizeObsidianSyncScope)(input.value));
            (0, preview_1.renderSyncSummary)();
        });
    });
    root
        .querySelectorAll(`input[name="${uiIds_1.OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"]`)
        .forEach((input) => {
        input.addEventListener("change", () => {
            if (!input.checked) {
                return;
            }
            (0, prefs_1.setPref)(settings_1.OBSIDIAN_UPDATE_STRATEGY_PREF, (0, settings_1.normalizeObsidianUpdateStrategy)(input.value));
            (0, preview_1.renderSyncSummary)();
            (0, preview_1.markPreviewStale)();
        });
    });
    bindBooleanPref(settings_1.OBSIDIAN_INCLUDE_METADATA_INPUT_ID, settings_1.OBSIDIAN_INCLUDE_METADATA_PREF, () => {
        (0, preview_1.renderContentSummary)();
        (0, preview_1.markPreviewStale)();
    });
    bindBooleanPref(settings_1.OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID, settings_1.OBSIDIAN_INCLUDE_ABSTRACT_PREF, () => {
        (0, preview_1.renderContentSummary)();
        (0, preview_1.markPreviewStale)();
    });
    bindBooleanPref(settings_1.OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID, settings_1.OBSIDIAN_INCLUDE_ANNOTATIONS_PREF, () => {
        (0, preview_1.renderContentSummary)();
        (0, preview_1.markPreviewStale)();
    });
    bindBooleanPref(settings_1.OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID, settings_1.OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF, () => {
        (0, preview_1.renderContentSummary)();
        (0, preview_1.markPreviewStale)();
    });
    bindBooleanPref(settings_1.OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID, settings_1.OBSIDIAN_INCLUDE_CHILD_NOTES_PREF, () => {
        (0, preview_1.renderContentSummary)();
        (0, preview_1.markPreviewStale)();
    });
    bindBooleanPref(settings_1.OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID, settings_1.OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF, () => {
        syncTranslationOptionState();
        (0, preview_1.renderSyncSummary)();
    });
    bindBooleanPref(settings_1.OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID, settings_1.OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF, () => {
        (0, preview_1.renderSyncSummary)();
    });
    bindBooleanPref(settings_1.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID, settings_1.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF, () => {
        (0, preview_1.renderSyncSummary)();
    });
    bindBooleanPref(uiIds_1.OBSIDIAN_AUTO_SYNC_INPUT_ID, "obsidian.autoSync", () => {
        (0, preview_1.renderSyncSummary)();
    });
    bindBooleanPref(uiIds_1.OBSIDIAN_WATCH_FILES_INPUT_ID, "obsidian.watchFiles", () => {
        (0, preview_1.renderSyncSummary)();
    });
    bindBooleanPref(uiIds_1.OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID, "obsidian.openAfterSync", () => {
        (0, preview_1.renderSyncSummary)();
        void (0, connection_1.updateConnectionDiagnostics)();
    });
    bindBooleanPref(uiIds_1.OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID, "obsidian.revealAfterSync", () => {
        (0, preview_1.renderSyncSummary)();
    });
    bindBooleanPref(settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID, settings_1.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF);
    bindBooleanPref(childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID, childNotes_1.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, () => {
        (0, preview_1.markPreviewStale)();
    });
    const childNoteTagsInput = (0, helpers_1.getPrefElement)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID);
    if (childNoteTagsInput) {
        childNoteTagsInput.placeholder = (0, helpers_1.uiText)("例如：ai-summary, ai-reading", "e.g. ai-summary, ai-reading");
        childNoteTagsInput.addEventListener("change", () => {
            (0, prefs_1.setPref)(childNotes_1.OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNoteTagsInput.value.trim());
            (0, preview_1.markPreviewStale)();
        });
    }
    (_b = root
        .querySelector('[data-ob-action="pick-app"]')) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield callbacks.pickObsidianPath("obsidian.appPath", "open", uiIds_1.OBSIDIAN_APP_PATH_INPUT_ID);
        callbacks.refreshObsidianPrefsUI();
    }));
    (_c = root
        .querySelector('[data-ob-action="pick-vault"]')) === null || _c === void 0 ? void 0 : _c.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield callbacks.pickObsidianPath("obsidian.vaultRoot", "folder", uiIds_1.OBSIDIAN_VAULT_ROOT_INPUT_ID);
        callbacks.refreshObsidianPrefsUI();
    }));
    (_d = root
        .querySelector('[data-ob-action="detect-vault"]')) === null || _d === void 0 ? void 0 : _d.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield callbacks.autoDetectObsidianVault({ allowManualFallback: true });
    }));
    (_e = root
        .querySelector('[data-ob-action="run-setup-wizard"]')) === null || _e === void 0 ? void 0 : _e.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield callbacks.runObsidianSetupWizard();
    }));
    (_f = root
        .querySelector('[data-ob-action="pick-notes"]')) === null || _f === void 0 ? void 0 : _f.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield callbacks.pickObsidianPath("obsidian.notesDir", "folder", uiIds_1.OBSIDIAN_NOTES_DIR_INPUT_ID);
        callbacks.refreshObsidianPrefsUI();
    }));
    (_g = root
        .querySelector('[data-ob-action="pick-assets"]')) === null || _g === void 0 ? void 0 : _g.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield callbacks.pickObsidianPath("obsidian.assetsDir", "folder", uiIds_1.OBSIDIAN_ASSETS_DIR_INPUT_ID);
        callbacks.refreshObsidianPrefsUI();
    }));
    (_h = root
        .querySelector('[data-ob-action="pick-dashboard"]')) === null || _h === void 0 ? void 0 : _h.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield callbacks.pickObsidianPath(settings_1.OBSIDIAN_DASHBOARD_DIR_PREF, "folder", settings_1.OBSIDIAN_DASHBOARD_DIR_INPUT_ID);
        callbacks.refreshObsidianPrefsUI();
    }));
    (_j = root
        .querySelector('[data-ob-action="pick-template"]')) === null || _j === void 0 ? void 0 : _j.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield callbacks.pickObsidianItemTemplate();
        (0, preview_1.markPreviewStale)();
    }));
    (_k = root
        .querySelector('[data-ob-action="edit-template"]')) === null || _k === void 0 ? void 0 : _k.addEventListener("click", () => {
        addon.hooks.onShowTemplateEditor();
    });
    (_l = root
        .querySelector('[data-ob-action="sync-now"]')) === null || _l === void 0 ? void 0 : _l.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield (0, sync_1.syncSelectedItemsToObsidian)();
    }));
    (_m = root
        .querySelector('[data-ob-action="open-note-design"]')) === null || _m === void 0 ? void 0 : _m.addEventListener("click", () => {
        (0, preview_1.switchObsidianPrefsTab)("noteDesign");
    });
    (_o = root
        .querySelector('[data-ob-action="setup-dashboard"]')) === null || _o === void 0 ? void 0 : _o.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield (0, dashboard_1.setupObsidianDashboards)();
    }));
    (_p = root
        .querySelector('[data-ob-action="repair-links"]')) === null || _p === void 0 ? void 0 : _p.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield (0, sync_1.repairObsidianManagedLinks)();
    }));
    (_q = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_CONNECTION_TEST_BUTTON_ID)) === null || _q === void 0 ? void 0 : _q.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield (0, connection_1.testObsidianConnection)();
    }));
    (_r = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_PREVIEW_TRIGGER_ID)) === null || _r === void 0 ? void 0 : _r.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        yield (0, preview_1.generateObsidianPreview)();
    }));
    syncTranslationOptionState();
}
