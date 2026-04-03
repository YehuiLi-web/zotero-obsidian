import {
  bugs,
  config,
  homepage,
  repository,
  version,
} from "../../../../../package.json";

declare const __BUILD_TIME__: string;

export const WORKFLOW_PREF_KEYS = {
  exportNotesTakeover: "exportNotes.takeover",
  outlineExpandLevel: "workspace.outline.expandLevel",
  keepOutlineLinks: "workspace.outline.keepLinks",
  noteLinkPreviewType: "editor.noteLinkPreviewType",
  useMagicKey: "editor.useMagicKey",
  useMagicKeyShortcut: "editor.useMagicKeyShortcut",
  useMarkdownPaste: "editor.useMarkdownPaste",
  pinTableLeft: "editor.pinTableLeft",
  pinTableTop: "editor.pinTableTop",
  syncPeriodSeconds: "syncPeriodSeconds",
  syncAttachmentFolder: "syncAttachmentFolder",
  annotationTagSync: "annotationNote.enableTagSync",
} as const;

export const WORKFLOW_DEFAULTS = {
  exportNotesTakeover: true,
  outlineExpandLevel: 2,
  keepOutlineLinks: true,
  noteLinkPreviewType: "hover",
  useMagicKey: true,
  useMagicKeyShortcut: true,
  useMarkdownPaste: true,
  pinTableLeft: true,
  pinTableTop: true,
  syncPeriodSeconds: 30,
  syncAttachmentFolder: "attachments",
  annotationTagSync: true,
} as const;

export const WORKFLOW_NOTE_LINK_PREVIEW_VALUES = [
  "hover",
  "ctrl",
  "disable",
] as const;

export type WorkflowNoteLinkPreviewType =
  (typeof WORKFLOW_NOTE_LINK_PREVIEW_VALUES)[number];

const REPOSITORY_URL = String(homepage || bugs?.url || repository?.url || "")
  .replace(/^git\+/, "")
  .replace(/\.git$/, "")
  .replace(/#.*$/, "");

export const WORKFLOW_ABOUT_LINKS = [
  {
    href: REPOSITORY_URL,
    label: "Homepage - GitHub",
  },
  {
    href: String(bugs?.url || `${REPOSITORY_URL}/issues`),
    label: "Bug Report, Feature Request",
  },
  {
    href: `${REPOSITORY_URL}/discussions/categories/q-a`,
    label: "Q&A",
  },
].filter((link) => Boolean(link.href));

export const WORKFLOW_PLUGIN_NAME = String(config.addonName);
export const WORKFLOW_PLUGIN_VERSION = String(version);
export const WORKFLOW_BUILD_TIME =
  typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "development";

export function getWorkflowBooleanPref(
  value: unknown,
  defaultValue: boolean,
): boolean {
  return typeof value === "boolean" ? value : defaultValue;
}

export function getWorkflowStringPref(
  value: unknown,
  defaultValue = "",
): string {
  return typeof value === "string" ? value : defaultValue;
}

export function clampWorkflowOutlineExpandLevel(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return WORKFLOW_DEFAULTS.outlineExpandLevel;
  }
  return Math.max(1, Math.min(6, Math.round(numeric)));
}

export function normalizeWorkflowNoteLinkPreviewType(
  value: unknown,
): WorkflowNoteLinkPreviewType {
  const normalized = String(value || "").trim();
  return WORKFLOW_NOTE_LINK_PREVIEW_VALUES.includes(
    normalized as WorkflowNoteLinkPreviewType,
  )
    ? (normalized as WorkflowNoteLinkPreviewType)
    : WORKFLOW_DEFAULTS.noteLinkPreviewType;
}

export function clampWorkflowSyncPeriodSeconds(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return WORKFLOW_DEFAULTS.syncPeriodSeconds;
  }
  return Math.max(-1, Math.min(3600, Math.round(numeric)));
}
