import { config } from "../../../../package.json";
import type { MetadataPresetEditorState } from "../settings";

export const OBSIDIAN_SETTINGS_ROOT_ID = `${config.addonRef}-obsidian-settingsRoot`;
export const OBSIDIAN_SETTINGS_STYLE_ID = `${config.addonRef}-obsidian-settingsStyle`;
export const OBSIDIAN_TOOLTIP_ID = `${config.addonRef}-obsidian-tooltip`;
export const OBSIDIAN_APP_PATH_INPUT_ID = `${config.addonRef}-obsidian-appPath`;
export const OBSIDIAN_VAULT_ROOT_INPUT_ID = `${config.addonRef}-obsidian-vaultRoot`;
export const OBSIDIAN_NOTES_DIR_INPUT_ID = `${config.addonRef}-obsidian-notesDir`;
export const OBSIDIAN_ASSETS_DIR_INPUT_ID = `${config.addonRef}-obsidian-assetsDir`;
export const OBSIDIAN_AUTO_SYNC_INPUT_ID = `${config.addonRef}-obsidian-autoSync`;
export const OBSIDIAN_WATCH_FILES_INPUT_ID = `${config.addonRef}-obsidian-watchFiles`;
export const OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID = `${config.addonRef}-obsidian-revealAfterSync`;
export const OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID = `${config.addonRef}-obsidian-openAfterSync`;
export const OBSIDIAN_CONNECTION_STATUS_ID = `${config.addonRef}-obsidian-connectionStatus`;
export const OBSIDIAN_CONNECTION_TEST_BUTTON_ID = `${config.addonRef}-obsidian-connectionTestButton`;
export const OBSIDIAN_CONNECTION_TEST_RESULT_ID = `${config.addonRef}-obsidian-connectionTestResult`;
export const OBSIDIAN_VAULT_ROOT_HINT_ID = `${config.addonRef}-obsidian-vaultRootHint`;
export const OBSIDIAN_NOTES_DIR_HINT_ID = `${config.addonRef}-obsidian-notesDirHint`;
export const OBSIDIAN_ASSETS_DIR_HINT_ID = `${config.addonRef}-obsidian-assetsDirHint`;
export const OBSIDIAN_DASHBOARD_DIR_HINT_ID = `${config.addonRef}-obsidian-dashboardDirHint`;
export const OBSIDIAN_FILE_NAME_RULE_ID = `${config.addonRef}-obsidian-fileNameRule`;
export const OBSIDIAN_FILE_NAME_PREVIEW_ID = `${config.addonRef}-obsidian-fileNamePreview`;
export const OBSIDIAN_FILE_NAME_CONTEXT_ID = `${config.addonRef}-obsidian-fileNameContext`;
export const OBSIDIAN_PREVIEW_TRIGGER_ID = `${config.addonRef}-obsidian-previewTrigger`;
export const OBSIDIAN_PREVIEW_META_ID = `${config.addonRef}-obsidian-previewMeta`;
export const OBSIDIAN_PREVIEW_FILE_ID = `${config.addonRef}-obsidian-previewFile`;
export const OBSIDIAN_PREVIEW_FRONTMATTER_ID = `${config.addonRef}-obsidian-previewFrontmatter`;
export const OBSIDIAN_PREVIEW_BODY_ID = `${config.addonRef}-obsidian-previewBody`;
export const OBSIDIAN_SYNC_SUMMARY_ID = `${config.addonRef}-obsidian-syncSummary`;
export const OBSIDIAN_CONTENT_SUMMARY_ID = `${config.addonRef}-obsidian-contentSummary`;
export const OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME = `${config.addonRef}-obsidian-updateStrategy`;
export const OBSIDIAN_SYNC_SCOPE_GROUP_NAME = `${config.addonRef}-obsidian-syncScopeChoice`;

export type ObsidianPrefsTab = "connection" | "noteDesign" | "sync" | "advanced";
export type PreviewStatus = "empty" | "loading" | "ready" | "stale" | "error";
export type ConnectionStatus = "idle" | "checking" | "ready" | "warning" | "error";

export interface ObsidianSetupDraft {
  vaultRoot: string;
  notesDir: string;
  assetsDir: string;
  dashboardDir: string;
  dashboardAutoSetup: boolean;
  itemTemplate: string;
}

export const obsidianPrefsState: {
  activeTab: ObsidianPrefsTab;
  preview: {
    status: PreviewStatus;
    signature: string;
    sourceLabel: string;
    fileName: string;
    frontmatter: string;
    body: string;
    message: string;
  };
  connection: {
    status: ConnectionStatus;
    signature: string;
    title: string;
    detail: string;
  };
  connectionTest: {
    status: "idle" | "running" | "success" | "error";
    message: string;
  };
  connectionRequest: number;
  previewRequest: number;
} = {
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

export let metadataPresetEditorState: MetadataPresetEditorState | null = null;
export function setMetadataPresetEditorState(
  state: MetadataPresetEditorState | null,
) {
  metadataPresetEditorState = state;
}

export let obsidianPrefsRenderRetryCount = 0;
export function resetObsidianPrefsRenderRetryCount() {
  obsidianPrefsRenderRetryCount = 0;
}
export function incrementObsidianPrefsRenderRetryCount() {
  obsidianPrefsRenderRetryCount += 1;
  return obsidianPrefsRenderRetryCount;
}

export let obsidianSetupWizardPromise: Promise<boolean> | null = null;
export function setObsidianSetupWizardPromise(
  promise: Promise<boolean> | null,
) {
  obsidianSetupWizardPromise = promise;
}
