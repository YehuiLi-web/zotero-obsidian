import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";
import {
  getBooleanPrefOrDefault,
  getStringPrefOrDefault,
} from "./settings";
import {
  cleanInline,
  firstValue,
  getFieldSafe,
  parseExtraMap,
} from "./shared";

const OBSIDIAN_CHILD_NOTE_TAGS_PREF = "obsidian.bridgeChildNoteTags";
const OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF =
  "obsidian.bridgeChildNotePromptSelect";
const OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF =
  "obsidian.bridgeChildNoteExcludeMap";
const DEFAULT_CHILD_NOTE_TAGS = [
  "ai-literature-review",
  "ai-reading",
  "ai-summary",
  "ai-notes",
];
const OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID = `${config.addonRef}-obsidian-bridgeChildNoteTags`;
const OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID = `${config.addonRef}-obsidian-bridgeChildNotePromptSelect`;

interface ChildNoteBridgeConfig {
  matchTags: string[];
  promptSelect: boolean;
}

function getDefaultChildNoteTagsText() {
  const fallback = DEFAULT_CHILD_NOTE_TAGS.join(", ");
  const localized = cleanInline(getString("obsidian-childNotes-defaultTags"));
  if (
    !localized ||
    localized === "ObsidianBridge-obsidian-childNotes-defaultTags"
  ) {
    return fallback;
  }
  return localized;
}

function normalizeChildNoteTag(tag: string) {
  return cleanInline(tag).replace(/^#+/, "").toLowerCase();
}

function parseChildNoteTags(raw: string) {
  return String(raw || "")
    .split(/[\r\n,，;；]+/)
    .map((tag) => normalizeChildNoteTag(tag))
    .filter(Boolean);
}

function getChildNoteBridgeConfig(): ChildNoteBridgeConfig {
  return {
    matchTags: parseChildNoteTags(
      getStringPrefOrDefault(
        OBSIDIAN_CHILD_NOTE_TAGS_PREF,
        getDefaultChildNoteTagsText(),
      ),
    ),
    promptSelect: getBooleanPrefOrDefault(
      OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
      true,
    ),
  };
}

function normalizeChildNoteExcludeMap(raw: string) {
  if (!raw) {
    return {} as Record<string, string[]>;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, string[]> = {};
    for (const [itemMapKey, values] of Object.entries(parsed || {})) {
      const noteKeys = Array.isArray(values)
        ? values.map((value) => cleanInline(value)).filter(Boolean)
        : [];
      if (noteKeys.length) {
        normalized[cleanInline(itemMapKey)] = Array.from(new Set(noteKeys));
      }
    }
    return normalized;
  } catch (e) {
    return {} as Record<string, string[]>;
  }
}

function getChildNoteExcludeMap() {
  return normalizeChildNoteExcludeMap(
    String(getPref(OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF) || ""),
  );
}

function setChildNoteExcludeMap(map: Record<string, string[]>) {
  const normalized = normalizeChildNoteExcludeMap(JSON.stringify(map || {}));
  setPref(
    OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF,
    JSON.stringify(normalized, null, 2),
  );
  return normalized;
}

function getTopItemPreferredTitle(topItem: Zotero.Item) {
  const extraMap = parseExtraMap(getFieldSafe(topItem, "extra"));
  return cleanInline(
    firstValue(
      getFieldSafe(topItem, "titleTranslation"),
      extraMap.titleTranslation,
      getFieldSafe(topItem, "title"),
      topItem.key,
    ),
  );
}

function getChildNoteDisplayTitle(noteItem: Zotero.Item, topItem: Zotero.Item) {
  const noteTitle =
    typeof noteItem.getNoteTitle === "function"
      ? cleanInline(noteItem.getNoteTitle())
      : "";
  return noteTitle || getTopItemPreferredTitle(topItem);
}

function ensureChildNoteHeading(
  noteItem: Zotero.Item,
  topItem: Zotero.Item,
  markdown: string,
) {
  if (/^\s*#/.test(markdown)) {
    return markdown;
  }
  const noteTitle = getChildNoteDisplayTitle(noteItem, topItem);
  if (!noteTitle) {
    return markdown;
  }
  return [`## ${noteTitle}`, "", markdown].join("\n");
}

export {
  OBSIDIAN_CHILD_NOTE_TAGS_PREF,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
  OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF,
  DEFAULT_CHILD_NOTE_TAGS,
  getDefaultChildNoteTagsText,
  OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
  ChildNoteBridgeConfig,
  normalizeChildNoteTag,
  parseChildNoteTags,
  getChildNoteBridgeConfig,
  normalizeChildNoteExcludeMap,
  getChildNoteExcludeMap,
  setChildNoteExcludeMap,
  getTopItemPreferredTitle,
  getChildNoteDisplayTitle,
  ensureChildNoteHeading,
};
