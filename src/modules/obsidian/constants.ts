// ── Obsidian Bridge Constants ──
// Pref keys, UI element IDs, and static data constants.

import { config } from "../../../package.json";
import type {
  ManagedFrontmatterOption,
  ManagedFrontmatterOptionKey,
  ManagedFrontmatterPresetDefinition,
  MetadataFieldMap,
  MetadataPreset,
  MetadataSectionKey,
} from "./types";

// ── Pref keys ──
export const OBSIDIAN_ITEM_NOTE_TEMPLATE = "[Item] Obsidian Literature Workbench";
export const OBSIDIAN_ITEM_NOTE_MAP_PREF = "obsidian.itemNoteMap";
export const OBSIDIAN_METADATA_PRESET_PREF = "obsidian.metadataPreset";
export const OBSIDIAN_METADATA_PRESET_LIBRARY_PREF = "obsidian.metadataPresetLibrary";
export const OBSIDIAN_METADATA_PRESET_ACTIVE_PREF = "obsidian.metadataPresetActive";
export const OBSIDIAN_OPEN_AFTER_SYNC_PREF = "obsidian.openAfterSync";
export const OBSIDIAN_DASHBOARD_DIR_PREF = "obsidian.dashboardDir";
export const OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF = "obsidian.dashboardAutoSetup";
export const OBSIDIAN_SETUP_WIZARD_SHOWN_PREF = "obsidian.setupWizardShown";
export const OBSIDIAN_ITEM_TEMPLATE_PREF = "obsidian.itemTemplate";
export const OBSIDIAN_FILE_NAME_TEMPLATE_PREF = "obsidian.fileNameTemplate";
export const OBSIDIAN_SYNC_SCOPE_PREF = "obsidian.syncScope";
export const OBSIDIAN_UPDATE_STRATEGY_PREF = "obsidian.updateStrategy";
export const OBSIDIAN_FRONTMATTER_FIELDS_PREF = "obsidian.frontmatterFields";
export const OBSIDIAN_INCLUDE_METADATA_PREF = "obsidian.includeMetadata";
export const OBSIDIAN_INCLUDE_ABSTRACT_PREF = "obsidian.includeAbstract";
export const OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF = "obsidian.includeHiddenInfo";
export const OBSIDIAN_INCLUDE_ANNOTATIONS_PREF = "obsidian.includeAnnotations";
export const OBSIDIAN_INCLUDE_CHILD_NOTES_PREF = "obsidian.includeChildNotes";
export const OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF =
  "obsidian.translateMissingMetadata";
export const OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF =
  "obsidian.translateMissingTitle";
export const OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF =
  "obsidian.translateMissingAbstract";

// ── Default values ──
export const DEFAULT_OBSIDIAN_ITEM_TEMPLATE = OBSIDIAN_ITEM_NOTE_TEMPLATE;
export const DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE = "{{title}} -- {{uniqueKey}}";
export const OBSIDIAN_CONNECTION_TEST_FILE_NAME = "Obsidian Bridge Test.md";
export const OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME = "obsidian-bridge-map.json";
export const OBSIDIAN_FRONTMATTER_INDEX_FILE_NAME =
  "obsidian-bridge-map-v2.json";
export const OBSIDIAN_METADATA_PRESET_FILE_NAME = "obsidian-bridge-presets.json";
export const DEFAULT_METADATA_PRESET_ID = "default";
export const OBSIDIAN_PREFS_RENDER_RETRY_LIMIT = 12;
export const DASHBOARD_MANAGED_MARKER_PREFIX = `${config.addonRef}:MANAGED DASHBOARD`;

// ── UI element IDs ──
export const OBSIDIAN_DASHBOARD_DIR_INPUT_ID = `${config.addonRef}-obsidian-dashboardDir`;
export const OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID = `${config.addonRef}-obsidian-dashboardAutoSetup`;
export const OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID = `${config.addonRef}-obsidian-itemTemplateDisplay`;
export const OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID = `${config.addonRef}-obsidian-fileNameTemplate`;
export const OBSIDIAN_FRONTMATTER_SUMMARY_ID = `${config.addonRef}-obsidian-frontmatterSummary`;
export const OBSIDIAN_FRONTMATTER_FIELD_LIST_ID = `${config.addonRef}-obsidian-frontmatterFieldList`;
export const OBSIDIAN_SYNC_SCOPE_SELECT_ID = `${config.addonRef}-obsidian-syncScope`;
export const OBSIDIAN_INCLUDE_METADATA_INPUT_ID = `${config.addonRef}-obsidian-includeMetadata`;
export const OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID = `${config.addonRef}-obsidian-includeAbstract`;
export const OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID = `${config.addonRef}-obsidian-includeHiddenInfo`;
export const OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID = `${config.addonRef}-obsidian-includeAnnotations`;
export const OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID = `${config.addonRef}-obsidian-includeChildNotes`;
export const OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID = `${config.addonRef}-obsidian-translateMissingMetadata`;
export const OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID = `${config.addonRef}-obsidian-translateMissingTitle`;
export const OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID = `${config.addonRef}-obsidian-translateMissingAbstract`;
export const OBSIDIAN_METADATA_PRESET_SELECT_ID = `${config.addonRef}-obsidian-metadataPresetActive`;
export const OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID = `${config.addonRef}-obsidian-metadataPresetName`;
export const OBSIDIAN_METADATA_PRESET_SECTION_ID = `${config.addonRef}-obsidian-metadataPresetSection`;
export const OBSIDIAN_METADATA_PRESET_SEARCH_ID = `${config.addonRef}-obsidian-metadataPresetSearch`;
export const OBSIDIAN_METADATA_PRESET_SUMMARY_ID = `${config.addonRef}-obsidian-metadataPresetSummary`;
export const OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID = `${config.addonRef}-obsidian-metadataPresetFieldList`;
export const OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetSave`;
export const OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetDuplicate`;
export const OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetDelete`;
export const OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetReset`;
export const OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetResync`;

// ── Static data ──
export const MANAGED_FRONTMATTER_OPTIONS: ManagedFrontmatterOption[] = [
  {
    key: "titleTranslation",
    group: "reference",
    label: "中文标题与别名",
    help: "title_translation, aliases",
    frontmatterKeys: ["title_translation", "aliases"],
  },
  {
    key: "itemType",
    group: "reference",
    label: "文献类型（中英）",
    help: "item_type, item_type_zh",
    frontmatterKeys: ["item_type", "item_type_zh"],
  },
  {
    key: "date",
    group: "reference",
    label: "日期与年份",
    help: "date, year",
    frontmatterKeys: ["date", "year"],
  },
  {
    key: "doi",
    group: "reference",
    label: "DOI",
    help: "doi",
    frontmatterKeys: ["doi"],
  },
  {
    key: "citationKey",
    group: "reference",
    label: "Citation Key",
    help: "citation_key",
    frontmatterKeys: ["citation_key"],
  },
  {
    key: "publication",
    group: "reference",
    label: "刊物 / 来源",
    help: "publication",
    frontmatterKeys: ["publication"],
  },
  {
    key: "itemLink",
    group: "links",
    label: "Zotero 条目链接",
    help: "item_link",
    frontmatterKeys: ["item_link"],
  },
  {
    key: "pdfLink",
    group: "links",
    label: "PDF 附件链接",
    help: "pdf_link",
    frontmatterKeys: ["pdf_link"],
  },
  {
    key: "authors",
    group: "library",
    label: "作者列表",
    help: "authors",
    frontmatterKeys: ["authors"],
  },
  {
    key: "collections",
    group: "library",
    label: "所在分类",
    help: "collections",
    frontmatterKeys: ["collections"],
  },
  {
    key: "zoteroTags",
    group: "library",
    label: "Zotero 标签（回写入口）",
    help: "zotero_tags -> 回写 Zotero；tags -> 仅供 Obsidian 展示",
    frontmatterKeys: ["zotero_tags"],
  },
  {
    key: "rating",
    group: "library",
    label: "评分",
    help: "rating",
    frontmatterKeys: ["rating"],
  },
];

export const DEFAULT_MANAGED_FRONTMATTER_FIELDS = MANAGED_FRONTMATTER_OPTIONS.map(
  (option) => option.key,
);

export const RECOMMENDED_MANAGED_FRONTMATTER_FIELDS: ManagedFrontmatterOptionKey[] = [
  "titleTranslation",
  "itemType",
  "date",
  "doi",
  "citationKey",
  "publication",
  "itemLink",
  "pdfLink",
  "authors",
  "collections",
  "zoteroTags",
  "rating",
];

export const FIXED_MANAGED_FRONTMATTER_KEYS = [
  "title",
  "zotero_key",
  "zotero_note_key",
  "citation_key",
  "citekey",
  "tags",
  "status",
  "reading_status",
  "summary_done",
  "project",
  "topic",
  "method",
  "bridge_managed",
  "bridge_schema",
];

export const MANAGED_FRONTMATTER_PRESETS: ManagedFrontmatterPresetDefinition[] = [
  {
    id: "recommended",
    fields: RECOMMENDED_MANAGED_FRONTMATTER_FIELDS,
    titleL10nId: "obsidian-frontmatter-preset-recommended-title",
    descriptionL10nId: "obsidian-frontmatter-preset-recommended-description",
  },
  {
    id: "minimal",
    fields: [],
    titleL10nId: "obsidian-frontmatter-preset-minimal-title",
    descriptionL10nId: "obsidian-frontmatter-preset-minimal-description",
  },
  {
    id: "dataview",
    fields: ["titleTranslation", "itemType", "date", "doi", "publication"],
    titleL10nId: "obsidian-frontmatter-preset-dataview-title",
    descriptionL10nId: "obsidian-frontmatter-preset-dataview-description",
  },
];

export const MANAGED_FRONTMATTER_OPTION_LABEL_KEYS: Record<
  ManagedFrontmatterOptionKey,
  string
> = {
  titleTranslation: "obsidian-frontmatter-option-titleTranslation",
  itemType: "obsidian-frontmatter-option-itemType",
  date: "obsidian-frontmatter-option-date",
  doi: "obsidian-frontmatter-option-doi",
  citationKey: "obsidian-frontmatter-option-citationKey",
  publication: "obsidian-frontmatter-option-publication",
  itemLink: "obsidian-frontmatter-option-itemLink",
  pdfLink: "obsidian-frontmatter-option-pdfLink",
  authors: "obsidian-frontmatter-option-authors",
  collections: "obsidian-frontmatter-option-collections",
  zoteroTags: "obsidian-frontmatter-option-zoteroTags",
  rating: "obsidian-frontmatter-option-rating",
};

export const ITEM_TYPE_LABELS: Record<string, string> = {
  journalArticle: "obsidian-itemType-journalArticle",
  conferencePaper: "obsidian-itemType-conferencePaper",
  thesis: "obsidian-itemType-thesis",
  book: "obsidian-itemType-book",
  bookSection: "obsidian-itemType-bookSection",
  patent: "obsidian-itemType-patent",
};

export const FIELD_LABELS: Record<string, string> = {
  itemTypeZh: "obsidian-fieldLabel-itemType",
  itemType: "obsidian-fieldLabel-itemTypeKey",
  titleTranslation: "obsidian-fieldLabel-titleTranslation",
  abstract: "obsidian-fieldLabel-abstract",
  abstractTranslation: "obsidian-fieldLabel-abstractTranslation",
  creators: "obsidian-fieldLabel-creators",
  collection: "obsidian-fieldLabel-collection",
  itemLink: "obsidian-fieldLabel-itemLink",
  pdfLink: "obsidian-fieldLabel-pdfLink",
  related: "obsidian-fieldLabel-related",
  JCRQ: "obsidian-fieldLabel-JCRQ",
  qnkey: "obsidian-fieldLabel-qnkey",
  tags: "obsidian-fieldLabel-tags",
  dateY: "obsidian-fieldLabel-dateY",
  datetimeAdded: "obsidian-fieldLabel-datetimeAdded",
  datetimeModified: "obsidian-fieldLabel-datetimeModified",
  citationKey: "obsidian-fieldLabel-citationKey",
};

export const METADATA_SECTION_OPTIONS: MetadataSectionKey[] = [
  "default",
  "journalArticle",
  "conferencePaper",
  "thesis",
  "book",
  "bookSection",
  "patent",
];

export const DERIVED_METADATA_FIELD_KEYS = [
  "itemTypeZh",
  "itemType",
  "title",
  "titleTranslation",
  "abstract",
  "abstractNote",
  "abstractTranslation",
  "shortTitle",
  "creators",
  "collection",
  "tags",
  "related",
  "itemLink",
  "pdfLink",
  "qnkey",
  "date",
  "dateY",
  "dateAdded",
  "datetimeAdded",
  "dateModified",
  "datetimeModified",
  "citationKey",
  "JCRQ",
];

export const DEFAULT_METADATA_PRESET: MetadataPreset = {
  visible: {
    default: [
      "itemTypeZh",
      "title",
      "titleTranslation",
      "creators",
      "collection",
      "itemLink",
      "pdfLink",
    ],
    journalArticle: ["publicationTitle", "date", "DOI", "JCRQ"],
    conferencePaper: ["proceedingsTitle", "conferenceName", "date", "DOI"],
    thesis: ["university", "date"],
    book: ["publisher", "date", "ISBN"],
    bookSection: ["bookTitle", "publisher", "date", "ISBN"],
    patent: ["issuingAuthority", "patentNumber", "issueDate"],
  },
  hidden: {
    default: [
      "itemType",
      "shortTitle",
      "libraryCatalog",
      "tags",
      "related",
      "dateAdded",
      "datetimeAdded",
      "dateModified",
      "datetimeModified",
      "citationKey",
      "archiveLocation",
      "callNumber",
      "rights",
      "extra",
      "qnkey",
    ],
    journalArticle: ["journalAbbreviation", "volume", "issue", "pages", "ISSN"],
    conferencePaper: ["conferenceName", "place", "pages"],
    thesis: ["place"],
    book: ["place", "pages"],
    bookSection: ["place", "pages"],
    patent: ["url"],
  },
};
