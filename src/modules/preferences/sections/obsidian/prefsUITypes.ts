// ── Obsidian Prefs UI — Types ──
// Type definitions scoped to the preferences panel.

import type { MetadataPresetEditorState } from "../../../obsidian/settings";

export type { MetadataPresetEditorState };

export type ObsidianPrefsTab = "connection" | "noteDesign" | "sync" | "tools";
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
