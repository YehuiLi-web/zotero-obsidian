// ── Obsidian Bridge Type Definitions ──
// All shared interfaces and type aliases for the obsidian module.

export type ObsidianSyncScope = "selection" | "currentList" | "library";
export type ObsidianUpdateStrategy = "managed" | "overwrite" | "skip";
export type ManagedFrontmatterPresetId =
  | "recommended"
  | "minimal"
  | "dataview"
  | "custom";
export type ManagedFrontmatterOptionKey =
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
export type ManagedFrontmatterOptionGroup = "reference" | "links" | "library";

export interface ManagedNoteContentConfig {
  includeMetadata: boolean;
  includeAbstract: boolean;
  includeHiddenInfo: boolean;
  includeAnnotations: boolean;
  includeChildNotes: boolean;
}

export interface MissingMetadataTranslationConfig {
  enabled: boolean;
  includeTitle: boolean;
  includeAbstract: boolean;
}

export interface ObsidianSettings {
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
  translation: MissingMetadataTranslationConfig;
}

export interface ObsidianPathDefaults {
  vaultRoot: string;
  vaultName: string;
  notesDir: string;
  assetsDir: string;
  dashboardDir: string;
}

export interface ObsidianDetectedVault {
  path: string;
  name: string;
}

export interface ManagedRepairCandidate {
  noteItem: Zotero.Item;
  syncStatus: SyncStatus;
  mdStatus: MDStatus;
}

export interface ManagedFrontmatterOption {
  key: ManagedFrontmatterOptionKey;
  group: ManagedFrontmatterOptionGroup;
  label: string;
  help: string;
  frontmatterKeys: string[];
}

export interface ManagedFrontmatterPresetDefinition {
  id: Exclude<ManagedFrontmatterPresetId, "custom">;
  fields: ManagedFrontmatterOptionKey[];
  titleL10nId: string;
  descriptionL10nId: string;
}

export type MetadataFieldMap = Record<string, string[]>;
export type MetadataSectionKey = "default" | "journalArticle" | "conferencePaper" | "thesis" | "book" | "bookSection" | "patent";

export interface MetadataPreset {
  visible: MetadataFieldMap;
  hidden: MetadataFieldMap;
}

export interface MetadataPresetProfile {
  id: string;
  name: string;
  preset: MetadataPreset;
}

export interface MetadataPresetLibrary {
  activePresetId: string;
  presets: MetadataPresetProfile[];
}

export interface MetadataPresetEditorState {
  presetId: string;
  presetName: string;
  sectionKey: MetadataSectionKey;
  searchText: string;
  sortSelectedFirst: boolean;
  draftPreset: MetadataPreset;
}
