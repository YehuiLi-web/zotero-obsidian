// ── Obsidian Prefs UI — Runtime State ──
// Mutable runtime state objects for the preferences panel.
// UI element IDs → uiIds.ts  |  Type definitions → prefsUITypes.ts

import type {
  ConnectionStatus,
  MetadataPresetEditorState,
  ObsidianPrefsTab,
  ObsidianSetupDraft,
  PreviewStatus,
} from "./prefsUITypes";

export type {
  ConnectionStatus,
  MetadataPresetEditorState,
  ObsidianPrefsTab,
  ObsidianSetupDraft,
  PreviewStatus,
};

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
