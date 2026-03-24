import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import { clearPref, getPref, setPref } from "../../utils/prefs";
import { fileExists, formatPath, jointPath } from "../../utils/str";
import {
  getAttachmentRelativeDir,
  getDefaultDashboardDir,
  getLastPathSegment,
} from "./paths";
import { cleanInline } from "./shared";

const OBSIDIAN_ITEM_NOTE_TEMPLATE = "[Item] Obsidian Literature Workbench";
const OBSIDIAN_ITEM_NOTE_MAP_PREF = "obsidian.itemNoteMap";
const OBSIDIAN_METADATA_PRESET_PREF = "obsidian.metadataPreset";
const OBSIDIAN_METADATA_PRESET_LIBRARY_PREF = "obsidian.metadataPresetLibrary";
const OBSIDIAN_METADATA_PRESET_ACTIVE_PREF = "obsidian.metadataPresetActive";
const OBSIDIAN_OPEN_AFTER_SYNC_PREF = "obsidian.openAfterSync";
const OBSIDIAN_DASHBOARD_DIR_PREF = "obsidian.dashboardDir";
const OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF = "obsidian.dashboardAutoSetup";
const OBSIDIAN_SETUP_WIZARD_SHOWN_PREF = "obsidian.setupWizardShown";
const OBSIDIAN_ITEM_TEMPLATE_PREF = "obsidian.itemTemplate";
const OBSIDIAN_FILE_NAME_TEMPLATE_PREF = "obsidian.fileNameTemplate";
const OBSIDIAN_SYNC_SCOPE_PREF = "obsidian.syncScope";
const OBSIDIAN_UPDATE_STRATEGY_PREF = "obsidian.updateStrategy";
const OBSIDIAN_FRONTMATTER_FIELDS_PREF = "obsidian.frontmatterFields";
const OBSIDIAN_INCLUDE_METADATA_PREF = "obsidian.includeMetadata";
const OBSIDIAN_INCLUDE_ABSTRACT_PREF = "obsidian.includeAbstract";
const OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF = "obsidian.includeHiddenInfo";
const OBSIDIAN_INCLUDE_ANNOTATIONS_PREF = "obsidian.includeAnnotations";
const OBSIDIAN_INCLUDE_CHILD_NOTES_PREF = "obsidian.includeChildNotes";
const DEFAULT_OBSIDIAN_ITEM_TEMPLATE = OBSIDIAN_ITEM_NOTE_TEMPLATE;
const DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE = "{{title}} -- {{uniqueKey}}";
const OBSIDIAN_CONNECTION_TEST_FILE_NAME = "Obsidian Bridge Test.md";
const OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME = "obsidian-bridge-map.json";
const OBSIDIAN_METADATA_PRESET_FILE_NAME = "obsidian-bridge-presets.json";

const OBSIDIAN_DASHBOARD_DIR_INPUT_ID = `${config.addonRef}-obsidian-dashboardDir`;
const OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID = `${config.addonRef}-obsidian-dashboardAutoSetup`;
const OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID = `${config.addonRef}-obsidian-itemTemplateDisplay`;
const OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID = `${config.addonRef}-obsidian-fileNameTemplate`;
const OBSIDIAN_FRONTMATTER_SUMMARY_ID = `${config.addonRef}-obsidian-frontmatterSummary`;
const OBSIDIAN_FRONTMATTER_FIELD_LIST_ID = `${config.addonRef}-obsidian-frontmatterFieldList`;
const OBSIDIAN_SYNC_SCOPE_SELECT_ID = `${config.addonRef}-obsidian-syncScope`;
const OBSIDIAN_INCLUDE_METADATA_INPUT_ID = `${config.addonRef}-obsidian-includeMetadata`;
const OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID = `${config.addonRef}-obsidian-includeAbstract`;
const OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID = `${config.addonRef}-obsidian-includeHiddenInfo`;
const OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID = `${config.addonRef}-obsidian-includeAnnotations`;
const OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID = `${config.addonRef}-obsidian-includeChildNotes`;
const OBSIDIAN_METADATA_PRESET_SELECT_ID = `${config.addonRef}-obsidian-metadataPresetActive`;
const OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID = `${config.addonRef}-obsidian-metadataPresetName`;
const OBSIDIAN_METADATA_PRESET_SECTION_ID = `${config.addonRef}-obsidian-metadataPresetSection`;
const OBSIDIAN_METADATA_PRESET_SEARCH_ID = `${config.addonRef}-obsidian-metadataPresetSearch`;
const OBSIDIAN_METADATA_PRESET_SUMMARY_ID = `${config.addonRef}-obsidian-metadataPresetSummary`;
const OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID = `${config.addonRef}-obsidian-metadataPresetFieldList`;
const OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetSave`;
const OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetDuplicate`;
const OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetDelete`;
const OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetReset`;
const OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID = `${config.addonRef}-obsidian-metadataPresetResync`;
const DASHBOARD_MANAGED_MARKER_PREFIX = `${config.addonRef}:MANAGED DASHBOARD`;
const DEFAULT_METADATA_PRESET_ID = "default";
const OBSIDIAN_PREFS_RENDER_RETRY_LIMIT = 12;

type ObsidianSyncScope = "selection" | "currentList" | "library";
type ObsidianUpdateStrategy = "managed" | "overwrite" | "skip";
type ManagedFrontmatterPresetId =
  | "recommended"
  | "minimal"
  | "dataview"
  | "custom";
type ManagedFrontmatterOptionKey =
  | "titleTranslation"
  | "itemType"
  | "date"
  | "doi"
  | "citationKey"
  | "publication"
  | "itemLink"
  | "pdfLink"
  | "authors"
  | "collections"
  | "zoteroTags"
  | "rating";
type ManagedFrontmatterOptionGroup = "reference" | "links" | "library";

interface ManagedNoteContentConfig {
  includeMetadata: boolean;
  includeAbstract: boolean;
  includeHiddenInfo: boolean;
  includeAnnotations: boolean;
  includeChildNotes: boolean;
}

interface ObsidianSettings {
  vaultRoot: string;
  notesDir: string;
  assetsDir: string;
  dashboardDir: string;
  autoSync: boolean;
  openAfterSync: boolean;
  revealAfterSync: boolean;
  dashboardAutoSetup: boolean;
  attachmentFolder: string;
  itemTemplate: string;
  fileNameTemplate: string;
  syncScope: ObsidianSyncScope;
  updateStrategy: ObsidianUpdateStrategy;
  content: ManagedNoteContentConfig;
}

interface ObsidianPathDefaults {
  vaultRoot: string;
  vaultName: string;
  notesDir: string;
  assetsDir: string;
  dashboardDir: string;
}

interface ObsidianDetectedVault {
  path: string;
  name: string;
}

interface ManagedRepairCandidate {
  noteItem: Zotero.Item;
  syncStatus: SyncStatus;
  mdStatus: MDStatus;
}

interface ManagedFrontmatterOption {
  key: ManagedFrontmatterOptionKey;
  group: ManagedFrontmatterOptionGroup;
  label: string;
  help: string;
  frontmatterKeys: string[];
}

interface ManagedFrontmatterPresetDefinition {
  id: Exclude<ManagedFrontmatterPresetId, "custom">;
  fields: ManagedFrontmatterOptionKey[];
  titleL10nId: string;
  descriptionL10nId: string;
}

type MetadataFieldMap = Record<string, string[]>;
type MetadataSectionKey = "default" | keyof typeof ITEM_TYPE_LABELS;

interface MetadataPreset {
  visible: MetadataFieldMap;
  hidden: MetadataFieldMap;
}

interface MetadataPresetProfile {
  id: string;
  name: string;
  preset: MetadataPreset;
}

interface MetadataPresetLibrary {
  activePresetId: string;
  presets: MetadataPresetProfile[];
}

interface MetadataPresetEditorState {
  presetId: string;
  presetName: string;
  sectionKey: MetadataSectionKey;
  searchText: string;
  sortSelectedFirst: boolean;
  draftPreset: MetadataPreset;
}

const MANAGED_FRONTMATTER_OPTIONS: ManagedFrontmatterOption[] = [
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

const MANAGED_FRONTMATTER_OPTION_LABEL_KEYS: Record<
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

const DEFAULT_MANAGED_FRONTMATTER_FIELDS = MANAGED_FRONTMATTER_OPTIONS.map(
  (option) => option.key,
);
const RECOMMENDED_MANAGED_FRONTMATTER_FIELDS: ManagedFrontmatterOptionKey[] = [
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
const FIXED_MANAGED_FRONTMATTER_KEYS = [
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
const MANAGED_FRONTMATTER_PRESETS: ManagedFrontmatterPresetDefinition[] = [
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

const ITEM_TYPE_LABELS: Record<string, string> = {
  journalArticle: "obsidian-itemType-journalArticle",
  conferencePaper: "obsidian-itemType-conferencePaper",
  thesis: "obsidian-itemType-thesis",
  book: "obsidian-itemType-book",
  bookSection: "obsidian-itemType-bookSection",
  patent: "obsidian-itemType-patent",
};

const FIELD_LABELS: Record<string, string> = {
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

const METADATA_SECTION_OPTIONS: MetadataSectionKey[] = [
  "default",
  "journalArticle",
  "conferencePaper",
  "thesis",
  "book",
  "bookSection",
  "patent",
];

const DERIVED_METADATA_FIELD_KEYS = [
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

const DEFAULT_METADATA_PRESET: MetadataPreset = {
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

function cloneDefaultMetadataPreset() {
  return JSON.parse(JSON.stringify(DEFAULT_METADATA_PRESET)) as MetadataPreset;
}

function cloneMetadataPreset(preset: MetadataPreset) {
  return JSON.parse(
    JSON.stringify(preset || cloneDefaultMetadataPreset()),
  ) as MetadataPreset;
}

function getMetadataPresetSectionLabel(sectionKey: MetadataSectionKey) {
  return sectionKey === "default"
    ? getString("obsidian-metadataPreset-defaultSection")
    : getItemTypeLabel(sectionKey);
}

function getBooleanPrefOrDefault(key: string, defaultValue: boolean) {
  const value = getPref(key);
  return typeof value === "boolean" ? value : defaultValue;
}

function getStringPrefOrDefault(key: string, defaultValue: string) {
  const value = cleanInline(String(getPref(key) || ""));
  return value || defaultValue;
}

function normalizeObsidianSyncScope(value: string): ObsidianSyncScope {
  switch (cleanInline(value)) {
    case "currentList":
    case "library":
      return cleanInline(value) as ObsidianSyncScope;
    default:
      return "selection";
  }
}

function normalizeObsidianUpdateStrategy(
  value: string,
): ObsidianUpdateStrategy {
  switch (cleanInline(value)) {
    case "overwrite":
    case "skip":
      return cleanInline(value) as ObsidianUpdateStrategy;
    default:
      return "managed";
  }
}

function getManagedNoteContentConfig(): ManagedNoteContentConfig {
  return {
    includeMetadata: getBooleanPrefOrDefault(
      OBSIDIAN_INCLUDE_METADATA_PREF,
      true,
    ),
    includeAbstract: getBooleanPrefOrDefault(
      OBSIDIAN_INCLUDE_ABSTRACT_PREF,
      true,
    ),
    includeHiddenInfo: getBooleanPrefOrDefault(
      OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF,
      true,
    ),
    includeAnnotations: getBooleanPrefOrDefault(
      OBSIDIAN_INCLUDE_ANNOTATIONS_PREF,
      true,
    ),
    includeChildNotes: getBooleanPrefOrDefault(
      OBSIDIAN_INCLUDE_CHILD_NOTES_PREF,
      true,
    ),
  };
}

function deriveObsidianPathDefaults(vaultRoot: string): ObsidianPathDefaults {
  const rawVaultRoot = cleanInline(vaultRoot);
  const preferPosixStyle =
    rawVaultRoot.startsWith("/") && !rawVaultRoot.includes("\\");
  const normalizedVaultRoot = preferPosixStyle
    ? rawVaultRoot.replace(/\/+/g, "/").replace(/\/$/, "")
    : formatPath(rawVaultRoot);
  const joinPath = (...segments: string[]) => {
    if (!preferPosixStyle) {
      return jointPath(...segments);
    }
    return segments
      .filter(Boolean)
      .map((segment, index) => {
        if (index === 0) {
          return segment.replace(/\/+$/, "");
        }
        return segment.replace(/^\/+|\/+$/g, "");
      })
      .join("/");
  };
  const vaultName =
    normalizedVaultRoot.split(/[\\/]/).filter(Boolean).pop() || "";
  return {
    vaultRoot: normalizedVaultRoot,
    vaultName,
    notesDir: normalizedVaultRoot
      ? joinPath(normalizedVaultRoot, "notes")
      : "",
    assetsDir: normalizedVaultRoot
      ? joinPath(normalizedVaultRoot, "assets", "zotero")
      : "",
    dashboardDir: normalizedVaultRoot
      ? preferPosixStyle
        ? joinPath(normalizedVaultRoot, "dashboards", "zotero")
        : getDefaultDashboardDir(normalizedVaultRoot)
      : "",
  };
}

function normalizeComparablePath(path: string) {
  const normalized = formatPath(cleanInline(path));
  return Zotero.isWin ? normalized.toLowerCase() : normalized;
}

function getObsidianVaultSearchRoots() {
  const roots = new Map<string, string>();
  const addRoot = (path: string) => {
    const normalized = formatPath(cleanInline(path));
    if (!normalized) {
      return;
    }
    roots.set(normalizeComparablePath(normalized), normalized);
  };
  const getDirsvcPath = (key: string) => {
    try {
      // @ts-ignore nsIFile is provided by the Zotero runtime
      return formatPath((Services.dirsvc as any).get(key, Ci.nsIFile).path);
    } catch (error) {
      return "";
    }
  };
  const homeDir =
    formatPath(cleanInline(String((PathUtils as any).homeDir || ""))) ||
    getDirsvcPath("Home");
  const documentsDir =
    getDirsvcPath("Docs") || (homeDir ? jointPath(homeDir, "Documents") : "");
  const desktopDir =
    getDirsvcPath("Desk") || (homeDir ? jointPath(homeDir, "Desktop") : "");
  const oneDriveDir = homeDir ? jointPath(homeDir, "OneDrive") : "";
  const configuredVaultRoot = cleanInline(
    String(getPref("obsidian.vaultRoot") || ""),
  );

  addRoot(homeDir);
  addRoot(documentsDir);
  addRoot(desktopDir);
  addRoot(oneDriveDir);
  addRoot(oneDriveDir ? jointPath(oneDriveDir, "Documents") : "");
  addRoot(oneDriveDir ? jointPath(oneDriveDir, "Desktop") : "");
  addRoot(homeDir ? jointPath(homeDir, "Obsidian") : "");
  addRoot(homeDir ? jointPath(homeDir, "Vaults") : "");
  addRoot(homeDir ? jointPath(homeDir, "ObsidianVault") : "");
  addRoot(documentsDir ? jointPath(documentsDir, "Obsidian") : "");
  addRoot(documentsDir ? jointPath(documentsDir, "Vaults") : "");
  addRoot(documentsDir ? jointPath(documentsDir, "ObsidianVault") : "");
  addRoot(configuredVaultRoot);

  return Array.from(roots.values());
}

async function pathIsDirectory(path: string) {
  const normalizedPath = formatPath(cleanInline(path));
  if (!normalizedPath) {
    return false;
  }
  try {
    const info = await IOUtils.stat(normalizedPath);
    return info.type === "directory";
  } catch (error) {
    return false;
  }
}

async function isObsidianVaultDirectory(path: string) {
  const normalizedPath = formatPath(cleanInline(path));
  if (!normalizedPath || !(await pathIsDirectory(normalizedPath))) {
    return false;
  }
  return pathIsDirectory(jointPath(normalizedPath, ".obsidian"));
}

async function getDirectoryChildren(path: string) {
  const normalizedPath = formatPath(cleanInline(path));
  if (!normalizedPath || !(await pathIsDirectory(normalizedPath))) {
    return [];
  }
  try {
    return (await IOUtils.getChildren(normalizedPath)).map((childPath) =>
      formatPath(childPath),
    );
  } catch (error) {
    return [];
  }
}

async function detectObsidianVaults(): Promise<ObsidianDetectedVault[]> {
  const detectedVaults = new Map<string, ObsidianDetectedVault>();
  const addVault = (path: string) => {
    const normalizedPath = formatPath(cleanInline(path));
    if (!normalizedPath) {
      return;
    }
    detectedVaults.set(normalizeComparablePath(normalizedPath), {
      path: normalizedPath,
      name: getLastPathSegment(normalizedPath) || normalizedPath,
    });
  };

  for (const rootPath of getObsidianVaultSearchRoots()) {
    if (await isObsidianVaultDirectory(rootPath)) {
      addVault(rootPath);
    }
    const childPaths = await getDirectoryChildren(rootPath);
    for (const childPath of childPaths) {
      if (await isObsidianVaultDirectory(childPath)) {
        addVault(childPath);
      }
    }
  }

  return Array.from(detectedVaults.values()).sort((left, right) => {
    const nameCompare = left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
    return nameCompare || left.path.localeCompare(right.path);
  });
}

function isObsidianConfigured() {
  return Boolean(
    cleanInline(String(getPref("obsidian.vaultRoot") || "")) ||
      cleanInline(String(getPref("obsidian.notesDir") || "")) ||
      cleanInline(String(getPref("obsidian.assetsDir") || "")),
  );
}

async function ensureObsidianSettings(): Promise<ObsidianSettings> {
  const vaultRoot = String(getPref("obsidian.vaultRoot") || "").trim();
  const notesDirPref = String(getPref("obsidian.notesDir") || "").trim();
  const assetsDirPref = String(getPref("obsidian.assetsDir") || "").trim();
  const dashboardDirPref = String(
    getPref(OBSIDIAN_DASHBOARD_DIR_PREF) || "",
  ).trim();
  const defaults = deriveObsidianPathDefaults(vaultRoot);
  const notesDir = formatPath(notesDirPref || defaults.notesDir);
  if (!notesDir) {
    throw new Error(getString("obsidian-sync-missingNotesDir"));
  }

  if (vaultRoot && !(await fileExists(vaultRoot))) {
    throw new Error(getString("obsidian-sync-missingVaultRoot"));
  }

  const assetsDir = formatPath(
    assetsDirPref ||
      defaults.assetsDir ||
      jointPath(PathUtils.parent(notesDir) || notesDir, "assets", "zotero"),
  );
  const dashboardDir = formatPath(
    dashboardDirPref ||
      defaults.dashboardDir ||
      getDefaultDashboardDir(vaultRoot, notesDir),
  );
  const notesDirParent = PathUtils.parent(notesDir);
  if (notesDirParent) {
    await Zotero.File.createDirectoryIfMissingAsync(notesDirParent);
  }
  await Zotero.File.createDirectoryIfMissingAsync(notesDir);
  await Zotero.File.createDirectoryIfMissingAsync(assetsDir);
  if (dashboardDir) {
    await Zotero.File.createDirectoryIfMissingAsync(dashboardDir);
  }

  return {
    vaultRoot: formatPath(vaultRoot),
    notesDir,
    assetsDir,
    dashboardDir,
    autoSync: Boolean(getPref("obsidian.autoSync")),
    openAfterSync: Boolean(getPref(OBSIDIAN_OPEN_AFTER_SYNC_PREF)),
    revealAfterSync: Boolean(getPref("obsidian.revealAfterSync")),
    dashboardAutoSetup: getBooleanPrefOrDefault(
      OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
      true,
    ),
    attachmentFolder: getAttachmentRelativeDir(notesDir, assetsDir),
    itemTemplate: resolveObsidianItemTemplateName(),
    fileNameTemplate: getStringPrefOrDefault(
      OBSIDIAN_FILE_NAME_TEMPLATE_PREF,
      DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
    ),
    syncScope: normalizeObsidianSyncScope(
      String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""),
    ),
    updateStrategy: normalizeObsidianUpdateStrategy(
      String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
    ),
    content: getManagedNoteContentConfig(),
  };
}

async function writeObsidianConnectionTestFile() {
  const settings = await ensureObsidianSettings();
  const targetPath = jointPath(
    settings.notesDir,
    OBSIDIAN_CONNECTION_TEST_FILE_NAME,
  );
  const content = [
    "# Obsidian Bridge Test",
    "",
    `Created: ${new Date().toISOString()}`,
    "",
    "If you can see this file, the plugin can write into your Obsidian folder.",
  ].join("\n");

  await Zotero.File.putContentsAsync(targetPath, content);
  if (!(await fileExists(targetPath))) {
    throw new Error("The test file could not be found after writing.");
  }

  return {
    path: targetPath,
    fileName: PathUtils.filename(targetPath),
    directory: settings.notesDir,
  };
}

function normalizeManagedFrontmatterFields(raw: string) {
  if (!raw) {
    return [...DEFAULT_MANAGED_FRONTMATTER_FIELDS];
  }
  try {
    const parsed = JSON.parse(raw);
    const allowedKeys = new Set<ManagedFrontmatterOptionKey>(
      MANAGED_FRONTMATTER_OPTIONS.map((option) => option.key),
    );
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_MANAGED_FRONTMATTER_FIELDS];
    }
    const normalized = parsed
      .map((value) => cleanInline(value))
      .filter((value): value is ManagedFrontmatterOptionKey =>
        allowedKeys.has(value as ManagedFrontmatterOptionKey),
      );
    return Array.from(new Set(normalized));
  } catch (e) {
    return [...DEFAULT_MANAGED_FRONTMATTER_FIELDS];
  }
}

function getManagedFrontmatterFields() {
  return normalizeManagedFrontmatterFields(
    String(getPref(OBSIDIAN_FRONTMATTER_FIELDS_PREF) || ""),
  );
}

function setManagedFrontmatterFields(fields: ManagedFrontmatterOptionKey[]) {
  const normalized = normalizeManagedFrontmatterFields(
    JSON.stringify(fields || []),
  );
  setPref(
    OBSIDIAN_FRONTMATTER_FIELDS_PREF,
    JSON.stringify(normalized, null, 2),
  );
  return normalized;
}

function hasManagedFrontmatterField(key: ManagedFrontmatterOptionKey) {
  return new Set(getManagedFrontmatterFields()).has(key);
}

function getManagedFrontmatterOption(key: ManagedFrontmatterOptionKey) {
  return MANAGED_FRONTMATTER_OPTIONS.find((option) => option.key === key);
}

function sameManagedFrontmatterFields(
  left: ManagedFrontmatterOptionKey[],
  right: ManagedFrontmatterOptionKey[],
) {
  if (left.length !== right.length) {
    return false;
  }
  const leftSet = new Set(left);
  for (const value of right) {
    if (!leftSet.has(value)) {
      return false;
    }
  }
  return true;
}

function resolveManagedFrontmatterPreset(
  fields: ManagedFrontmatterOptionKey[],
): ManagedFrontmatterPresetId {
  const matchedPreset = MANAGED_FRONTMATTER_PRESETS.find((preset) =>
    sameManagedFrontmatterFields(fields, preset.fields),
  );
  return matchedPreset?.id || "custom";
}

function getManagedFrontmatterPresetLabel(
  presetId: ManagedFrontmatterPresetId,
) {
  switch (presetId) {
    case "recommended":
      return getString("obsidian-frontmatter-preset-recommended-title");
    case "minimal":
      return getString("obsidian-frontmatter-preset-minimal-title");
    case "dataview":
      return getString("obsidian-frontmatter-preset-dataview-title");
    default:
      return getString("obsidian-frontmatter-preset-custom-title");
  }
}

function getManagedFrontmatterOptionLabel(key: ManagedFrontmatterOptionKey) {
  const localeKey = MANAGED_FRONTMATTER_OPTION_LABEL_KEYS[key];
  return localeKey ? getString(localeKey as any) : key;
}

function hasTemplateByName(templateName: string) {
  const normalizedName = cleanInline(templateName);
  if (!normalizedName) {
    return false;
  }
  return Boolean(
    addon.api.template.getTemplateText(normalizedName) ||
      addon.api.template.DEFAULT_TEMPLATES.find(
        (template) => template.name === normalizedName,
      ),
  );
}

function getObsidianItemTemplateOptions() {
  const templateNames = addon.api.template
    .getTemplateKeys()
    .map((templateName) => cleanInline(templateName))
    .filter((templateName) => templateName.startsWith("[Item]"));
  return Array.from(
    new Set(
      [
        cleanInline(String(getPref(OBSIDIAN_ITEM_TEMPLATE_PREF) || "")),
        DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
        ...templateNames,
      ].filter(Boolean),
    ),
  );
}

function getObsidianItemTemplateLabel(templateName: string) {
  const normalized = cleanInline(templateName);
  if (normalized.toLowerCase().startsWith("[item]")) {
    return normalized.slice(6).trim() || normalized;
  }
  return normalized;
}

function resolveObsidianItemTemplateName() {
  const configuredTemplate = cleanInline(
    String(getPref(OBSIDIAN_ITEM_TEMPLATE_PREF) || ""),
  );
  if (configuredTemplate && hasTemplateByName(configuredTemplate)) {
    return configuredTemplate;
  }
  return DEFAULT_OBSIDIAN_ITEM_TEMPLATE;
}

function normalizeMetadataPreset(raw: string): MetadataPreset {
  if (!raw) {
    return cloneDefaultMetadataPreset();
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error("Metadata preset must be valid JSON.");
  }
  const normalized = cloneDefaultMetadataPreset();
  for (const sectionKey of ["visible", "hidden"] as const) {
    if (!parsed?.[sectionKey] || typeof parsed[sectionKey] !== "object") {
      continue;
    }
    const normalizedSection = normalized[sectionKey] as MetadataFieldMap;
    for (const typeKey of Object.keys(parsed[sectionKey])) {
      const values = parsed[sectionKey][typeKey];
      if (Array.isArray(values)) {
        normalizedSection[typeKey] = values
          .map((value) => String(value).trim())
          .filter(Boolean);
      }
    }
  }
  return normalized;
}

function getDefaultMetadataPresetName() {
  return getString("obsidian-metadataPreset-defaultName");
}

function getMigratedMetadataPresetName() {
  return getString("obsidian-metadataPreset-migratedName");
}

function getUntitledMetadataPresetName() {
  return getString("obsidian-metadataPreset-untitledName");
}

function createDefaultMetadataPresetLibrary(): MetadataPresetLibrary {
  return {
    activePresetId: DEFAULT_METADATA_PRESET_ID,
    presets: [
      {
        id: DEFAULT_METADATA_PRESET_ID,
        name: getDefaultMetadataPresetName(),
        preset: cloneDefaultMetadataPreset(),
      },
    ],
  };
}

function getActiveMetadataPresetProfile(library: MetadataPresetLibrary) {
  return (
    library.presets.find((profile) => profile.id === library.activePresetId) ||
    library.presets[0]
  );
}

let _obsidianItemNoteMapCache: Record<string, string> | null = null;
let _obsidianItemNoteMapSaveTimer: ReturnType<typeof setTimeout> | null = null;

let _metadataPresetLibraryCache: MetadataPresetLibrary | null = null;
let _metadataPresetLibrarySaveTimer: ReturnType<typeof setTimeout> | null =
  null;

function getSharedObsidianStorageState() {
  const addonData =
    ((Zotero as any)[config.addonRef] as any)?.data || (addon.data as any);
  if (!addonData.obsidian) {
    addonData.obsidian = {};
  }
  return addonData.obsidian as {
    itemNoteMap?: Record<string, string>;
    metadataPresetLibrary?: MetadataPresetLibrary;
  };
}

function readObsidianItemNoteMapPref() {
  try {
    return JSON.parse(
      String(getPref(OBSIDIAN_ITEM_NOTE_MAP_PREF) || "{}"),
    ) as Record<string, string>;
  } catch (e) {
    return {};
  }
}

function getObsidianStorageFilePath(fileName: string) {
  return jointPath(Zotero.DataDirectory.dir, fileName);
}

async function writeObsidianStorageJSONFile(filePath: string, data: unknown) {
  await Zotero.File.putContentsAsync(filePath, JSON.stringify(data, null, 2));
}

function clearObsidianStoragePrefs(prefKeys: string[]) {
  for (const prefKey of prefKeys) {
    try {
      clearPref(prefKey);
    } catch (e) {
      ztoolkit.log(`[Obsidian Bridge] failed to clear pref ${prefKey}`, e);
    }
  }
}

async function persistObsidianItemNoteMapFile(
  map: Record<string, string>,
  clearLegacyPref = true,
) {
  getSharedObsidianStorageState().itemNoteMap = map;
  const mapFile = getObsidianStorageFilePath(OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME);
  await writeObsidianStorageJSONFile(mapFile, map);
  if (clearLegacyPref) {
    clearObsidianStoragePrefs([OBSIDIAN_ITEM_NOTE_MAP_PREF]);
  }
}

async function persistMetadataPresetLibraryFile(
  library: MetadataPresetLibrary,
  clearLegacyPrefs = true,
) {
  getSharedObsidianStorageState().metadataPresetLibrary = library;
  const presetFile = getObsidianStorageFilePath(
    OBSIDIAN_METADATA_PRESET_FILE_NAME,
  );
  await writeObsidianStorageJSONFile(presetFile, library);
  if (clearLegacyPrefs) {
    clearObsidianStoragePrefs([
      OBSIDIAN_METADATA_PRESET_PREF,
      OBSIDIAN_METADATA_PRESET_LIBRARY_PREF,
      OBSIDIAN_METADATA_PRESET_ACTIVE_PREF,
    ]);
  }
}

async function initObsidianStorage() {
  const mapFile = getObsidianStorageFilePath(OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME);
  let mapLoadedFromFile = false;
  const legacyMap = readObsidianItemNoteMapPref();
  const hasLegacyItemNoteMapPref = Object.keys(legacyMap).length > 0;
  if (await fileExists(mapFile)) {
    try {
      const raw = await Zotero.File.getContentsAsync(mapFile);
      _obsidianItemNoteMapCache = JSON.parse(raw as string);
      mapLoadedFromFile = true;
    } catch (e) {
      ztoolkit.log(
        `[Obsidian Bridge] failed to load ${OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME}`,
        e,
      );
    }
  }
  if (!_obsidianItemNoteMapCache) {
    _obsidianItemNoteMapCache = legacyMap;
  }
  getSharedObsidianStorageState().itemNoteMap = _obsidianItemNoteMapCache || {};
  try {
    if (mapLoadedFromFile) {
      clearObsidianStoragePrefs([OBSIDIAN_ITEM_NOTE_MAP_PREF]);
    } else if (hasLegacyItemNoteMapPref) {
      await persistObsidianItemNoteMapFile(_obsidianItemNoteMapCache);
    } else {
      clearObsidianStoragePrefs([OBSIDIAN_ITEM_NOTE_MAP_PREF]);
    }
  } catch (e) {
    ztoolkit.log(
      `[Obsidian Bridge] failed to persist ${OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME}`,
      e,
    );
  }

  const presetFile = getObsidianStorageFilePath(
    OBSIDIAN_METADATA_PRESET_FILE_NAME,
  );
  let presetLoadedFromFile = false;
  if (await fileExists(presetFile)) {
    try {
      const raw = await Zotero.File.getContentsAsync(presetFile);
      _metadataPresetLibraryCache = normalizeMetadataPresetLibrary(
        raw as string,
      );
      presetLoadedFromFile = true;
    } catch (e) {
      ztoolkit.log(
        `[Obsidian Bridge] failed to load ${OBSIDIAN_METADATA_PRESET_FILE_NAME}`,
        e,
      );
    }
  }
  const activePresetPref = cleanInline(
    String(getPref(OBSIDIAN_METADATA_PRESET_ACTIVE_PREF) || ""),
  );
  const libraryRaw = String(
    getPref(OBSIDIAN_METADATA_PRESET_LIBRARY_PREF) || "",
  ).trim();
  const legacyRaw = String(getPref(OBSIDIAN_METADATA_PRESET_PREF) || "").trim();
  const hasLegacyMetadataPresetPrefs = Boolean(
    libraryRaw || legacyRaw || activePresetPref,
  );
  if (!_metadataPresetLibraryCache) {
    if (libraryRaw) {
      _metadataPresetLibraryCache = normalizeMetadataPresetLibrary(
        libraryRaw,
        activePresetPref,
      );
    } else {
      const library = createDefaultMetadataPresetLibrary();
      if (legacyRaw) {
        const legacyPreset = normalizeMetadataPreset(legacyRaw);
        if (
          JSON.stringify(legacyPreset) !==
          JSON.stringify(DEFAULT_METADATA_PRESET)
        ) {
          library.presets.push({
            id: "migrated",
            name: getMigratedMetadataPresetName(),
            preset: legacyPreset,
          });
          library.activePresetId = "migrated";
        }
      }
      _metadataPresetLibraryCache = library;
    }
  }
  if (!_metadataPresetLibraryCache) {
    _metadataPresetLibraryCache = createDefaultMetadataPresetLibrary();
  }
  getSharedObsidianStorageState().metadataPresetLibrary =
    _metadataPresetLibraryCache;
  try {
    if (presetLoadedFromFile) {
      clearObsidianStoragePrefs([
        OBSIDIAN_METADATA_PRESET_PREF,
        OBSIDIAN_METADATA_PRESET_LIBRARY_PREF,
        OBSIDIAN_METADATA_PRESET_ACTIVE_PREF,
      ]);
    } else if (hasLegacyMetadataPresetPrefs) {
      await persistMetadataPresetLibraryFile(_metadataPresetLibraryCache);
    }
  } catch (e) {
    ztoolkit.log(
      `[Obsidian Bridge] failed to persist ${OBSIDIAN_METADATA_PRESET_FILE_NAME}`,
      e,
    );
  }
}

function persistMetadataPresetLibrary(library: MetadataPresetLibrary) {
  const activeProfile = getActiveMetadataPresetProfile(library);
  const normalizedLibrary: MetadataPresetLibrary = {
    activePresetId: activeProfile.id,
    presets: library.presets.map((profile) => ({
      id: profile.id,
      name: cleanInline(profile.name) || getUntitledMetadataPresetName(),
      preset: cloneMetadataPreset(profile.preset),
    })),
  };

  _metadataPresetLibraryCache = normalizedLibrary;
  getSharedObsidianStorageState().metadataPresetLibrary = normalizedLibrary;

  if (_metadataPresetLibrarySaveTimer) {
    clearTimeout(_metadataPresetLibrarySaveTimer);
  }
  _metadataPresetLibrarySaveTimer = setTimeout(async () => {
    try {
      _metadataPresetLibrarySaveTimer = null;
      await persistMetadataPresetLibraryFile(
        _metadataPresetLibraryCache || createDefaultMetadataPresetLibrary(),
      );
    } catch (e) {
      ztoolkit.log("[Obsidian Bridge] async save failed", e);
    }
  }, 1000);

  return normalizedLibrary;
}

function normalizeMetadataPresetLibrary(
  raw: string,
  activePresetPref = "",
): MetadataPresetLibrary {
  const fallback = createDefaultMetadataPresetLibrary();
  if (!raw) {
    return fallback;
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return fallback;
  }

  const profiles = Array.isArray(parsed?.presets) ? parsed.presets : [];
  const normalizedProfiles: MetadataPresetProfile[] = [];
  const usedIDs = new Set<string>();
  for (const profile of profiles) {
    const id = cleanInline(profile?.id || "");
    if (!id || usedIDs.has(id)) {
      continue;
    }
    usedIDs.add(id);
    normalizedProfiles.push({
      id,
      name: cleanInline(profile?.name || "") || getUntitledMetadataPresetName(),
      preset: normalizeMetadataPreset(JSON.stringify(profile?.preset || {})),
    });
  }
  if (!normalizedProfiles.length) {
    return fallback;
  }

  const activePresetId =
    cleanInline(activePresetPref) || cleanInline(parsed?.activePresetId || "");

  return {
    activePresetId:
      normalizedProfiles.find((profile) => profile.id === activePresetId)?.id ||
      normalizedProfiles[0].id,
    presets: normalizedProfiles,
  };
}

function getMetadataPresetLibrary() {
  const sharedLibrary = getSharedObsidianStorageState().metadataPresetLibrary;
  if (sharedLibrary && sharedLibrary !== _metadataPresetLibraryCache) {
    _metadataPresetLibraryCache = sharedLibrary;
  }
  if (_metadataPresetLibraryCache) {
    return cloneMetadataPresetLibrary(_metadataPresetLibraryCache);
  }
  return createDefaultMetadataPresetLibrary();
}

function cloneMetadataPresetLibrary(library: MetadataPresetLibrary) {
  return JSON.parse(JSON.stringify(library)) as MetadataPresetLibrary;
}

function createMetadataPresetID(name: string) {
  const base =
    cleanInline(name)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "") || "preset";
  return `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function getConfiguredFields(section: MetadataFieldMap, itemType: string) {
  const result = [...(section.default || []), ...(section[itemType] || [])];
  return Array.from(new Set(result));
}

function getItemTypeLabel(itemType: string) {
  const localeKey = ITEM_TYPE_LABELS[itemType];
  if (localeKey) {
    return getString(localeKey as any);
  }
  try {
    const itemTypeID = Zotero.ItemTypes.getID(itemType);
    const localized =
      itemTypeID &&
      typeof (Zotero.ItemTypes as any).getLocalizedString === "function"
        ? cleanInline((Zotero.ItemTypes as any).getLocalizedString(itemTypeID))
        : "";
    if (localized) {
      return localized;
    }
  } catch (e) {
    // fall through
  }
  return cleanInline(itemType);
}

function getStandardFieldKeysForItemType(itemType: string) {
  const itemTypeKeys =
    itemType === "default" ? Object.keys(ITEM_TYPE_LABELS) : [itemType];
  const fieldKeys = new Set<string>();
  for (const itemTypeKey of itemTypeKeys) {
    try {
      const itemTypeID = Zotero.ItemTypes.getID(itemTypeKey);
      if (!itemTypeID) {
        continue;
      }
      const fieldIDs = Zotero.ItemFields.getItemTypeFields(
        itemTypeID,
      ) as number[];
      for (const fieldID of fieldIDs || []) {
        const fieldKey = cleanInline(Zotero.ItemFields.getName(fieldID));
        if (fieldKey) {
          fieldKeys.add(fieldKey);
        }
      }
    } catch (e) {
      continue;
    }
  }
  return Array.from(fieldKeys);
}

function getFieldLabel(fieldKey: string) {
  if (FIELD_LABELS[fieldKey]) {
    return getString(FIELD_LABELS[fieldKey] as any);
  }
  try {
    const fieldID = Zotero.ItemFields.getID(fieldKey);
    if (fieldID) {
      const localized = cleanInline(
        Zotero.ItemFields.getLocalizedString(fieldID),
      );
      if (localized) {
        return localized;
      }
    }
  } catch (e) {
    // fall through
  }
  return fieldKey;
}

function getMetadataFieldCatalog(
  sectionKey: MetadataSectionKey,
  preset: MetadataPreset,
) {
  const fieldKeys = new Set<string>([
    ...getStandardFieldKeysForItemType(sectionKey),
    ...DERIVED_METADATA_FIELD_KEYS,
    ...(preset.visible.default || []),
    ...(preset.hidden.default || []),
    ...(preset.visible[sectionKey] || []),
    ...(preset.hidden[sectionKey] || []),
  ]);
  return Array.from(fieldKeys).sort((left, right) => {
    const leftLabel = `${getFieldLabel(left)} ${left}`.toLowerCase();
    const rightLabel = `${getFieldLabel(right)} ${right}`.toLowerCase();
    return leftLabel.localeCompare(rightLabel, undefined, {
      sensitivity: "base",
    });
  });
}

function getMetadataPreset() {
  return cloneMetadataPreset(
    getActiveMetadataPresetProfile(getMetadataPresetLibrary()).preset,
  );
}

function getObsidianItemNoteMap() {
  const sharedMap = getSharedObsidianStorageState().itemNoteMap;
  if (sharedMap && sharedMap !== _obsidianItemNoteMapCache) {
    _obsidianItemNoteMapCache = sharedMap;
  }
  if (!_obsidianItemNoteMapCache) {
    _obsidianItemNoteMapCache = readObsidianItemNoteMapPref();
  }
  return _obsidianItemNoteMapCache;
}

function setObsidianItemNoteMap(map: Record<string, string>) {
  _obsidianItemNoteMapCache = map;
  getSharedObsidianStorageState().itemNoteMap = map;
  if (_obsidianItemNoteMapSaveTimer) {
    clearTimeout(_obsidianItemNoteMapSaveTimer);
  }
  _obsidianItemNoteMapSaveTimer = setTimeout(async () => {
    try {
      _obsidianItemNoteMapSaveTimer = null;
      await persistObsidianItemNoteMapFile(_obsidianItemNoteMapCache || {});
    } catch (e) {
      ztoolkit.log("[Obsidian Bridge] async map save failed", e);
    }
  }, 1000);
}

function resetObsidianStorageState() {
  if (_obsidianItemNoteMapSaveTimer) {
    clearTimeout(_obsidianItemNoteMapSaveTimer);
    _obsidianItemNoteMapSaveTimer = null;
  }
  if (_metadataPresetLibrarySaveTimer) {
    clearTimeout(_metadataPresetLibrarySaveTimer);
    _metadataPresetLibrarySaveTimer = null;
  }
  _obsidianItemNoteMapCache = null;
  _metadataPresetLibraryCache = null;
  const sharedState = getSharedObsidianStorageState();
  delete sharedState.itemNoteMap;
  delete sharedState.metadataPresetLibrary;
}

function getItemMapKey(item: Zotero.Item) {
  return `${item.libraryID}/${item.key}`;
}

export {
  OBSIDIAN_ITEM_NOTE_TEMPLATE,
  OBSIDIAN_ITEM_NOTE_MAP_PREF,
  OBSIDIAN_METADATA_PRESET_PREF,
  OBSIDIAN_METADATA_PRESET_LIBRARY_PREF,
  OBSIDIAN_METADATA_PRESET_ACTIVE_PREF,
  OBSIDIAN_OPEN_AFTER_SYNC_PREF,
  OBSIDIAN_DASHBOARD_DIR_PREF,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  OBSIDIAN_SETUP_WIZARD_SHOWN_PREF,
  OBSIDIAN_ITEM_TEMPLATE_PREF,
  OBSIDIAN_FILE_NAME_TEMPLATE_PREF,
  OBSIDIAN_SYNC_SCOPE_PREF,
  OBSIDIAN_UPDATE_STRATEGY_PREF,
  OBSIDIAN_FRONTMATTER_FIELDS_PREF,
  OBSIDIAN_INCLUDE_METADATA_PREF,
  OBSIDIAN_INCLUDE_ABSTRACT_PREF,
  OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF,
  OBSIDIAN_INCLUDE_ANNOTATIONS_PREF,
  OBSIDIAN_INCLUDE_CHILD_NOTES_PREF,
  DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
  DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
  OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
  OBSIDIAN_ITEM_TEMPLATE_DISPLAY_ID,
  OBSIDIAN_FILE_NAME_TEMPLATE_INPUT_ID,
  OBSIDIAN_SYNC_SCOPE_SELECT_ID,
  OBSIDIAN_FRONTMATTER_SUMMARY_ID,
  OBSIDIAN_FRONTMATTER_FIELD_LIST_ID,
  OBSIDIAN_INCLUDE_METADATA_INPUT_ID,
  OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID,
  OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID,
  OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID,
  OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID,
  OBSIDIAN_METADATA_PRESET_SELECT_ID,
  OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID,
  OBSIDIAN_METADATA_PRESET_SECTION_ID,
  OBSIDIAN_METADATA_PRESET_SEARCH_ID,
  OBSIDIAN_METADATA_PRESET_SUMMARY_ID,
  OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID,
  OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID,
  DASHBOARD_MANAGED_MARKER_PREFIX,
  DEFAULT_METADATA_PRESET_ID,
  OBSIDIAN_PREFS_RENDER_RETRY_LIMIT,
  ObsidianSyncScope,
  ObsidianUpdateStrategy,
  ManagedNoteContentConfig,
  ObsidianSettings,
  ManagedRepairCandidate,
  ObsidianPathDefaults,
  ObsidianDetectedVault,
  ManagedFrontmatterPresetId,
  ManagedFrontmatterOptionKey,
  ManagedFrontmatterOptionGroup,
  ManagedFrontmatterOption,
  ManagedFrontmatterPresetDefinition,
  MetadataFieldMap,
  MetadataSectionKey,
  MetadataPreset,
  MetadataPresetProfile,
  MetadataPresetLibrary,
  MetadataPresetEditorState,
  ITEM_TYPE_LABELS,
  FIELD_LABELS,
  METADATA_SECTION_OPTIONS,
  DERIVED_METADATA_FIELD_KEYS,
  DEFAULT_METADATA_PRESET,
  MANAGED_FRONTMATTER_OPTIONS,
  DEFAULT_MANAGED_FRONTMATTER_FIELDS,
  RECOMMENDED_MANAGED_FRONTMATTER_FIELDS,
  FIXED_MANAGED_FRONTMATTER_KEYS,
  MANAGED_FRONTMATTER_PRESETS,
  cloneDefaultMetadataPreset,
  cloneMetadataPreset,
  getMetadataPresetSectionLabel,
  getBooleanPrefOrDefault,
  getStringPrefOrDefault,
  normalizeObsidianSyncScope,
  normalizeObsidianUpdateStrategy,
  getManagedNoteContentConfig,
  deriveObsidianPathDefaults,
  detectObsidianVaults,
  isObsidianVaultDirectory,
  isObsidianConfigured,
  ensureObsidianSettings,
  writeObsidianConnectionTestFile,
  normalizeManagedFrontmatterFields,
  getManagedFrontmatterFields,
  setManagedFrontmatterFields,
  hasManagedFrontmatterField,
  getManagedFrontmatterOption,
  sameManagedFrontmatterFields,
  resolveManagedFrontmatterPreset,
  getManagedFrontmatterPresetLabel,
  getManagedFrontmatterOptionLabel,
  hasTemplateByName,
  getObsidianItemTemplateOptions,
  getObsidianItemTemplateLabel,
  resolveObsidianItemTemplateName,
  normalizeMetadataPreset,
  createDefaultMetadataPresetLibrary,
  getActiveMetadataPresetProfile,
  persistMetadataPresetLibrary,
  normalizeMetadataPresetLibrary,
  getMetadataPresetLibrary,
  createMetadataPresetID,
  getConfiguredFields,
  getItemTypeLabel,
  getStandardFieldKeysForItemType,
  getFieldLabel,
  getMetadataFieldCatalog,
  getMetadataPreset,
  getObsidianItemNoteMap,
  setObsidianItemNoteMap,
  getItemMapKey,
  initObsidianStorage,
  resetObsidianStorageState,
};
