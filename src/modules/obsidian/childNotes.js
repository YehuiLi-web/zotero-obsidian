"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID = exports.OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID = exports.DEFAULT_CHILD_NOTE_TAGS = exports.OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF = exports.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF = exports.OBSIDIAN_CHILD_NOTE_TAGS_PREF = void 0;
exports.normalizeChildNoteTag = normalizeChildNoteTag;
exports.parseChildNoteTags = parseChildNoteTags;
exports.getChildNoteBridgeConfig = getChildNoteBridgeConfig;
exports.normalizeChildNoteExcludeMap = normalizeChildNoteExcludeMap;
exports.getChildNoteExcludeMap = getChildNoteExcludeMap;
exports.setChildNoteExcludeMap = setChildNoteExcludeMap;
exports.getTopItemPreferredTitle = getTopItemPreferredTitle;
exports.getChildNoteDisplayTitle = getChildNoteDisplayTitle;
exports.ensureChildNoteHeading = ensureChildNoteHeading;
const package_json_1 = require("../../../package.json");
const prefs_1 = require("../../utils/prefs");
const settings_1 = require("./settings");
const shared_1 = require("./shared");
const OBSIDIAN_CHILD_NOTE_TAGS_PREF = "obsidian.bridgeChildNoteTags";
exports.OBSIDIAN_CHILD_NOTE_TAGS_PREF = OBSIDIAN_CHILD_NOTE_TAGS_PREF;
const OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF = "obsidian.bridgeChildNotePromptSelect";
exports.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF = OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF;
const OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF = "obsidian.bridgeChildNoteExcludeMap";
exports.OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF = OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF;
const DEFAULT_CHILD_NOTE_TAGS = [
    "ai-literature-review",
    "ai-reading",
    "ai-summary",
    "ai-notes",
];
exports.DEFAULT_CHILD_NOTE_TAGS = DEFAULT_CHILD_NOTE_TAGS;
const OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-bridgeChildNoteTags`;
exports.OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID = OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID;
const OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-bridgeChildNotePromptSelect`;
exports.OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID = OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID;
function normalizeChildNoteTag(tag) {
    return (0, shared_1.cleanInline)(tag).replace(/^#+/, "").toLowerCase();
}
function parseChildNoteTags(raw) {
    return String(raw || "")
        .split(/[\r\n,，;；]+/)
        .map((tag) => normalizeChildNoteTag(tag))
        .filter(Boolean);
}
function getChildNoteBridgeConfig() {
    return {
        matchTags: parseChildNoteTags((0, settings_1.getStringPrefOrDefault)(OBSIDIAN_CHILD_NOTE_TAGS_PREF, DEFAULT_CHILD_NOTE_TAGS.join(", "))),
        promptSelect: (0, settings_1.getBooleanPrefOrDefault)(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, true),
    };
}
function normalizeChildNoteExcludeMap(raw) {
    if (!raw) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw);
        const normalized = {};
        for (const [itemMapKey, values] of Object.entries(parsed || {})) {
            const noteKeys = Array.isArray(values)
                ? values.map((value) => (0, shared_1.cleanInline)(value)).filter(Boolean)
                : [];
            if (noteKeys.length) {
                normalized[(0, shared_1.cleanInline)(itemMapKey)] = Array.from(new Set(noteKeys));
            }
        }
        return normalized;
    }
    catch (e) {
        return {};
    }
}
function getChildNoteExcludeMap() {
    return normalizeChildNoteExcludeMap(String((0, prefs_1.getPref)(OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF) || ""));
}
function setChildNoteExcludeMap(map) {
    const normalized = normalizeChildNoteExcludeMap(JSON.stringify(map || {}));
    (0, prefs_1.setPref)(OBSIDIAN_CHILD_NOTE_EXCLUDE_MAP_PREF, JSON.stringify(normalized, null, 2));
    return normalized;
}
function getTopItemPreferredTitle(topItem) {
    const extraMap = (0, shared_1.parseExtraMap)((0, shared_1.getFieldSafe)(topItem, "extra"));
    return (0, shared_1.cleanInline)((0, shared_1.firstValue)((0, shared_1.getFieldSafe)(topItem, "titleTranslation"), extraMap.titleTranslation, (0, shared_1.getFieldSafe)(topItem, "title"), topItem.key));
}
function getChildNoteDisplayTitle(noteItem, topItem) {
    const noteTitle = typeof noteItem.getNoteTitle === "function"
        ? (0, shared_1.cleanInline)(noteItem.getNoteTitle())
        : "";
    return noteTitle || getTopItemPreferredTitle(topItem);
}
function ensureChildNoteHeading(noteItem, topItem, markdown) {
    if (/^\s*#/.test(markdown)) {
        return markdown;
    }
    const noteTitle = getChildNoteDisplayTitle(noteItem, topItem);
    if (!noteTitle) {
        return markdown;
    }
    return [`## ${noteTitle}`, "", markdown].join("\n");
}
