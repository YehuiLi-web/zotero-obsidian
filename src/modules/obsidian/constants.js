"use strict";
// ── Obsidian Bridge Constants ──
// Pref keys, UI element IDs, and static data constants.
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSIDIAN_METADATA_PRESET_SUMMARY_ID = exports.OBSIDIAN_METADATA_PRESET_SEARCH_ID = exports.OBSIDIAN_METADATA_PRESET_SECTION_ID = exports.OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID = exports.OBSIDIAN_METADATA_PRESET_SELECT_ID = exports.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID = exports.OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID = exports.OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID = exports.OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID = exports.OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID = exports.OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID = exports.OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID = exports.OBSIDIAN_INCLUDE_METADATA_INPUT_ID = exports.OBSIDIAN_SYNC_SCOPE_SELECT_ID = exports.OBSIDIAN_FRONTMATTER_FIELD_LIST_ID = exports.OBSIDIAN_FRONTMATTER_SUMMARY_ID = exports.OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID = exports.OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID = exports.OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID = exports.OBSIDIAN_DASHBOARD_DIR_INPUT_ID = exports.DASHBOARD_MANAGED_MARKER_PREFIX = exports.OBSIDIAN_PREFS_RENDER_RETRY_LIMIT = exports.DEFAULT_METADATA_PRESET_ID = exports.OBSIDIAN_METADATA_PRESET_FILE_NAME = exports.OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME = exports.OBSIDIAN_CONNECTION_TEST_FILE_NAME = exports.DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE = exports.DEFAULT_OBSIDIAN_ITEM_TEMPLATE = exports.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF = exports.OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF = exports.OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF = exports.OBSIDIAN_INCLUDE_CHILD_NOTES_PREF = exports.OBSIDIAN_INCLUDE_ANNOTATIONS_PREF = exports.OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF = exports.OBSIDIAN_INCLUDE_ABSTRACT_PREF = exports.OBSIDIAN_INCLUDE_METADATA_PREF = exports.OBSIDIAN_FRONTMATTER_FIELDS_PREF = exports.OBSIDIAN_UPDATE_STRATEGY_PREF = exports.OBSIDIAN_SYNC_SCOPE_PREF = exports.OBSIDIAN_FILE_NAME_TEMPLATE_PREF = exports.OBSIDIAN_ITEM_TEMPLATE_PREF = exports.OBSIDIAN_SETUP_WIZARD_SHOWN_PREF = exports.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF = exports.OBSIDIAN_DASHBOARD_DIR_PREF = exports.OBSIDIAN_OPEN_AFTER_SYNC_PREF = exports.OBSIDIAN_METADATA_PRESET_ACTIVE_PREF = exports.OBSIDIAN_METADATA_PRESET_LIBRARY_PREF = exports.OBSIDIAN_METADATA_PRESET_PREF = exports.OBSIDIAN_ITEM_NOTE_MAP_PREF = exports.OBSIDIAN_ITEM_NOTE_TEMPLATE = void 0;
exports.DEFAULT_METADATA_PRESET = exports.DERIVED_METADATA_FIELD_KEYS = exports.METADATA_SECTION_OPTIONS = exports.FIELD_LABELS = exports.ITEM_TYPE_LABELS = exports.MANAGED_FRONTMATTER_OPTION_LABEL_KEYS = exports.MANAGED_FRONTMATTER_PRESETS = exports.FIXED_MANAGED_FRONTMATTER_KEYS = exports.RECOMMENDED_MANAGED_FRONTMATTER_FIELDS = exports.DEFAULT_MANAGED_FRONTMATTER_FIELDS = exports.MANAGED_FRONTMATTER_OPTIONS = exports.OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID = exports.OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID = exports.OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID = exports.OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID = exports.OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID = exports.OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID = void 0;
const package_json_1 = require("../../../package.json");
// ── Pref keys ──
exports.OBSIDIAN_ITEM_NOTE_TEMPLATE = "[Item] Obsidian Literature Workbench";
exports.OBSIDIAN_ITEM_NOTE_MAP_PREF = "obsidian.itemNoteMap";
exports.OBSIDIAN_METADATA_PRESET_PREF = "obsidian.metadataPreset";
exports.OBSIDIAN_METADATA_PRESET_LIBRARY_PREF = "obsidian.metadataPresetLibrary";
exports.OBSIDIAN_METADATA_PRESET_ACTIVE_PREF = "obsidian.metadataPresetActive";
exports.OBSIDIAN_OPEN_AFTER_SYNC_PREF = "obsidian.openAfterSync";
exports.OBSIDIAN_DASHBOARD_DIR_PREF = "obsidian.dashboardDir";
exports.OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF = "obsidian.dashboardAutoSetup";
exports.OBSIDIAN_SETUP_WIZARD_SHOWN_PREF = "obsidian.setupWizardShown";
exports.OBSIDIAN_ITEM_TEMPLATE_PREF = "obsidian.itemTemplate";
exports.OBSIDIAN_FILE_NAME_TEMPLATE_PREF = "obsidian.fileNameTemplate";
exports.OBSIDIAN_SYNC_SCOPE_PREF = "obsidian.syncScope";
exports.OBSIDIAN_UPDATE_STRATEGY_PREF = "obsidian.updateStrategy";
exports.OBSIDIAN_FRONTMATTER_FIELDS_PREF = "obsidian.frontmatterFields";
exports.OBSIDIAN_INCLUDE_METADATA_PREF = "obsidian.includeMetadata";
exports.OBSIDIAN_INCLUDE_ABSTRACT_PREF = "obsidian.includeAbstract";
exports.OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF = "obsidian.includeHiddenInfo";
exports.OBSIDIAN_INCLUDE_ANNOTATIONS_PREF = "obsidian.includeAnnotations";
exports.OBSIDIAN_INCLUDE_CHILD_NOTES_PREF = "obsidian.includeChildNotes";
exports.OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF = "obsidian.translateMissingMetadata";
exports.OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF = "obsidian.translateMissingTitle";
exports.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF = "obsidian.translateMissingAbstract";
// ── Default values ──
exports.DEFAULT_OBSIDIAN_ITEM_TEMPLATE = exports.OBSIDIAN_ITEM_NOTE_TEMPLATE;
exports.DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE = "{{title}} -- {{uniqueKey}}";
exports.OBSIDIAN_CONNECTION_TEST_FILE_NAME = "Obsidian Bridge Test.md";
exports.OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME = "obsidian-bridge-map.json";
exports.OBSIDIAN_METADATA_PRESET_FILE_NAME = "obsidian-bridge-presets.json";
exports.DEFAULT_METADATA_PRESET_ID = "default";
exports.OBSIDIAN_PREFS_RENDER_RETRY_LIMIT = 12;
exports.DASHBOARD_MANAGED_MARKER_PREFIX = `${package_json_1.config.addonRef}:MANAGED DASHBOARD`;
// ── UI element IDs ──
exports.OBSIDIAN_DASHBOARD_DIR_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-dashboardDir`;
exports.OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-dashboardAutoSetup`;
exports.OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID = `${package_json_1.config.addonRef}-obsidian-itemTemplateDisplay`;
exports.OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-fileNameTemplate`;
exports.OBSIDIAN_FRONTMATTER_SUMMARY_ID = `${package_json_1.config.addonRef}-obsidian-frontmatterSummary`;
exports.OBSIDIAN_FRONTMATTER_FIELD_LIST_ID = `${package_json_1.config.addonRef}-obsidian-frontmatterFieldList`;
exports.OBSIDIAN_SYNC_SCOPE_SELECT_ID = `${package_json_1.config.addonRef}-obsidian-syncScope`;
exports.OBSIDIAN_INCLUDE_METADATA_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-includeMetadata`;
exports.OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-includeAbstract`;
exports.OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-includeHiddenInfo`;
exports.OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-includeAnnotations`;
exports.OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-includeChildNotes`;
exports.OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-translateMissingMetadata`;
exports.OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-translateMissingTitle`;
exports.OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-translateMissingAbstract`;
exports.OBSIDIAN_METADATA_PRESET_SELECT_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetActive`;
exports.OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetName`;
exports.OBSIDIAN_METADATA_PRESET_SECTION_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetSection`;
exports.OBSIDIAN_METADATA_PRESET_SEARCH_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetSearch`;
exports.OBSIDIAN_METADATA_PRESET_SUMMARY_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetSummary`;
exports.OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetFieldList`;
exports.OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetSave`;
exports.OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetDuplicate`;
exports.OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetDelete`;
exports.OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetReset`;
exports.OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID = `${package_json_1.config.addonRef}-obsidian-metadataPresetResync`;
// ── Static data ──
exports.MANAGED_FRONTMATTER_OPTIONS = [
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
        label: "Zotero 标签",
        help: "zotero_tags",
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
exports.DEFAULT_MANAGED_FRONTMATTER_FIELDS = exports.MANAGED_FRONTMATTER_OPTIONS.map((option) => option.key);
exports.RECOMMENDED_MANAGED_FRONTMATTER_FIELDS = [
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
exports.FIXED_MANAGED_FRONTMATTER_KEYS = [
    "title",
    "zotero_key",
    "zotero_note_key",
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
exports.MANAGED_FRONTMATTER_PRESETS = [
    {
        id: "recommended",
        fields: exports.RECOMMENDED_MANAGED_FRONTMATTER_FIELDS,
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
exports.MANAGED_FRONTMATTER_OPTION_LABEL_KEYS = {
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
exports.ITEM_TYPE_LABELS = {
    journalArticle: "obsidian-itemType-journalArticle",
    conferencePaper: "obsidian-itemType-conferencePaper",
    thesis: "obsidian-itemType-thesis",
    book: "obsidian-itemType-book",
    bookSection: "obsidian-itemType-bookSection",
    patent: "obsidian-itemType-patent",
};
exports.FIELD_LABELS = {
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
exports.METADATA_SECTION_OPTIONS = [
    "default",
    "journalArticle",
    "conferencePaper",
    "thesis",
    "book",
    "bookSection",
    "patent",
];
exports.DERIVED_METADATA_FIELD_KEYS = [
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
exports.DEFAULT_METADATA_PRESET = {
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
