import { getPref, setPref } from "../../utils/prefs";
import {
  DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
  OBSIDIAN_FILE_NAME_TEMPLATE_PREF,
} from "./constants";
import { cleanInline } from "./shared";

export const LEGACY_OBSIDIAN_FILE_NAME_TEMPLATE = "{{title}} - {{year}}";

export const MANAGED_FILE_NAME_TEMPLATE_TOKENS = [
  "title",
  "uniqueKey",
  "year",
  "firstCreator",
  "creators",
  "citationKey",
  "publication",
  "itemType",
  "noteKey",
  "key",
  "libraryID",
] as const;

export function normalizeObsidianFileNameTemplate(value: string) {
  const normalized = cleanInline(value);
  if (!normalized) {
    return DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE;
  }
  return normalized === LEGACY_OBSIDIAN_FILE_NAME_TEMPLATE
    ? DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE
    : normalized;
}

export function getObsidianFileNameTemplate() {
  return normalizeObsidianFileNameTemplate(
    String(getPref(OBSIDIAN_FILE_NAME_TEMPLATE_PREF) || ""),
  );
}

export function migrateObsidianFileNameTemplatePref() {
  const rawValue = cleanInline(
    String(getPref(OBSIDIAN_FILE_NAME_TEMPLATE_PREF) || ""),
  );
  const normalized = normalizeObsidianFileNameTemplate(rawValue);
  if (!rawValue || rawValue === LEGACY_OBSIDIAN_FILE_NAME_TEMPLATE) {
    setPref(OBSIDIAN_FILE_NAME_TEMPLATE_PREF, normalized);
  }
  return normalized;
}
