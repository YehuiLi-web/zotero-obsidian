"use strict";
// ── Obsidian Prefs UI — Runtime State ──
// Mutable runtime state objects for the preferences panel.
// UI element IDs → uiIds.ts  |  Type definitions → prefsUITypes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.obsidianSetupWizardPromise = exports.obsidianPrefsRenderRetryCount = exports.metadataPresetEditorState = exports.obsidianPrefsState = void 0;
exports.setMetadataPresetEditorState = setMetadataPresetEditorState;
exports.resetObsidianPrefsRenderRetryCount = resetObsidianPrefsRenderRetryCount;
exports.incrementObsidianPrefsRenderRetryCount = incrementObsidianPrefsRenderRetryCount;
exports.setObsidianSetupWizardPromise = setObsidianSetupWizardPromise;
exports.obsidianPrefsState = {
    activeTab: "connection",
    preview: {
        status: "empty",
        signature: "",
        sourceLabel: "",
        fileName: "",
        frontmatter: "",
        body: "",
        message: "",
    },
    connection: {
        status: "idle",
        signature: "",
        title: "",
        detail: "",
    },
    connectionTest: {
        status: "idle",
        message: "",
    },
    connectionRequest: 0,
    previewRequest: 0,
};
exports.metadataPresetEditorState = null;
function setMetadataPresetEditorState(state) {
    exports.metadataPresetEditorState = state;
}
exports.obsidianPrefsRenderRetryCount = 0;
function resetObsidianPrefsRenderRetryCount() {
    exports.obsidianPrefsRenderRetryCount = 0;
}
function incrementObsidianPrefsRenderRetryCount() {
    exports.obsidianPrefsRenderRetryCount += 1;
    return exports.obsidianPrefsRenderRetryCount;
}
exports.obsidianSetupWizardPromise = null;
function setObsidianSetupWizardPromise(promise) {
    exports.obsidianSetupWizardPromise = promise;
}
