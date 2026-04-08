import { getString } from "../../utils/locale";
import { getPref } from "../../utils/prefs";
import { fileExists, formatPath, jointPath } from "../../utils/str";
import {
  getObsidianFileNameTemplate,
  migrateObsidianFileNameTemplatePref,
} from "./fileNameTemplate";
import {
  getAttachmentRelativeDir,
  getDefaultDashboardDir,
  getLastPathSegment,
  normalizeComparablePath,
} from "./paths";
import { cleanInline } from "./shared";
import {
  OBSIDIAN_COLLECTION_FOLDER_MODE_PREF,
  DEFAULT_MANAGED_FRONTMATTER_FIELDS,
  DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
  DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
  MANAGED_FRONTMATTER_OPTION_LABEL_KEYS,
  MANAGED_FRONTMATTER_OPTIONS,
  MANAGED_FRONTMATTER_PRESETS,
  OBSIDIAN_CONNECTION_TEST_FILE_NAME,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  OBSIDIAN_DASHBOARD_DIR_PREF,
  OBSIDIAN_FILE_NAME_TEMPLATE_PREF,
  OBSIDIAN_FRONTMATTER_FIELDS_PREF,
  OBSIDIAN_INCLUDE_ABSTRACT_PREF,
  OBSIDIAN_INCLUDE_ANNOTATIONS_PREF,
  OBSIDIAN_INCLUDE_CHILD_NOTES_PREF,
  OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF,
  OBSIDIAN_INCLUDE_METADATA_PREF,
  OBSIDIAN_ITEM_TEMPLATE_PREF,
  OBSIDIAN_OPEN_AFTER_SYNC_PREF,
  OBSIDIAN_SYNC_SCOPE_PREF,
  OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF,
  OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF,
  OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF,
  OBSIDIAN_UPDATE_STRATEGY_PREF,
} from "./constants";
import type {
  ManagedFrontmatterOptionKey,
  ManagedFrontmatterPresetId,
  ObsidianCollectionFolderMode,
  ManagedNoteContentConfig,
  MissingMetadataTranslationConfig,
  ObsidianDetectedVault,
  ObsidianPathValidation,
  ObsidianPathDefaults,
  ObsidianResolvedPaths,
  ObsidianSettings,
  ObsidianSyncScope,
  ObsidianUpdateStrategy,
} from "./types";

// ── Re-exports from sub-modules ──
export * from "./types";
export * from "./constants";
export {
  getObsidianItemNoteMap,
  setObsidianItemNoteMap,
  getItemMapKey,
} from "./itemNoteMap";
export {
  getMetadataPreset,
  getMetadataPresetLibrary,
  getActiveMetadataPresetProfile,
  persistMetadataPresetLibrary,
  normalizeMetadataPresetLibrary,
  createDefaultMetadataPresetLibrary,
  createMetadataPresetID,
  cloneDefaultMetadataPreset,
  cloneMetadataPreset,
  getMetadataPresetSectionLabel,
  getConfiguredFields,
  getFieldLabel,
  getMetadataFieldCatalog,
  getItemTypeLabel,
  getStandardFieldKeysForItemType,
  normalizeMetadataPreset,
} from "./metadataPreset";

// ── Pref helpers ──

export function getBooleanPrefOrDefault(key: string, defaultValue: boolean) {
  const value = getPref(key);
  return typeof value === "boolean" ? value : defaultValue;
}

export function getStringPrefOrDefault(key: string, defaultValue: string) {
  const value = cleanInline(String(getPref(key) || ""));
  return value || defaultValue;
}

// ── Sync scope / update strategy normalization ──

export function normalizeObsidianSyncScope(value: string): ObsidianSyncScope {
  switch (cleanInline(value)) {
    case "currentList":
    case "library":
      return cleanInline(value) as ObsidianSyncScope;
    default:
      return "selection";
  }
}

export function normalizeObsidianUpdateStrategy(
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

export function normalizeObsidianCollectionFolderMode(
  value: string,
): ObsidianCollectionFolderMode {
  switch (cleanInline(value)) {
    case "deepest":
      return "deepest";
    default:
      return "none";
  }
}

// ── Content config ──

export function getManagedNoteContentConfig(): ManagedNoteContentConfig {
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

export function getMissingMetadataTranslationConfig(): MissingMetadataTranslationConfig {
  return {
    enabled: getBooleanPrefOrDefault(
      OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF,
      false,
    ),
    includeTitle: getBooleanPrefOrDefault(
      OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF,
      false,
    ),
    includeAbstract: getBooleanPrefOrDefault(
      OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF,
      false,
    ),
  };
}

// ── Path helpers ──

export function deriveObsidianPathDefaults(
  vaultRoot: string,
): ObsidianPathDefaults {
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
    normalizedVaultRoot
      .split(/[\\\/]/)
      .filter(Boolean)
      .pop() || "";
  return {
    vaultRoot: normalizedVaultRoot,
    vaultName,
    notesDir: normalizedVaultRoot ? joinPath(normalizedVaultRoot, "notes") : "",
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

export function normalizeObsidianPathInput(value: string) {
  return formatPath(cleanInline(value));
}

export function serializeObsidianPathPref(value: string, defaultValue = "") {
  const normalizedValue = normalizeObsidianPathInput(value);
  const normalizedDefault = normalizeObsidianPathInput(defaultValue);
  return normalizedValue && normalizedValue !== normalizedDefault
    ? normalizedValue
    : "";
}

export function resolveObsidianPaths(
  overrides: Partial<
    Pick<
      ObsidianResolvedPaths,
      | "appPath"
      | "vaultRoot"
      | "notesDirPref"
      | "assetsDirPref"
      | "dashboardDirPref"
    >
  > = {},
): ObsidianResolvedPaths {
  const appPath = normalizeObsidianPathInput(
    String(overrides.appPath ?? getPref("obsidian.appPath") ?? ""),
  );
  const vaultRoot = normalizeObsidianPathInput(
    String(overrides.vaultRoot ?? getPref("obsidian.vaultRoot") ?? ""),
  );
  const defaults = deriveObsidianPathDefaults(vaultRoot);
  const notesDirPref = normalizeObsidianPathInput(
    String(overrides.notesDirPref ?? getPref("obsidian.notesDir") ?? ""),
  );
  const assetsDirPref = normalizeObsidianPathInput(
    String(overrides.assetsDirPref ?? getPref("obsidian.assetsDir") ?? ""),
  );
  const dashboardDirPref = normalizeObsidianPathInput(
    String(
      overrides.dashboardDirPref ?? getPref(OBSIDIAN_DASHBOARD_DIR_PREF) ?? "",
    ),
  );
  const notesDir = normalizeObsidianPathInput(notesDirPref || defaults.notesDir);
  const assetsDir = normalizeObsidianPathInput(
    assetsDirPref ||
      defaults.assetsDir ||
      (notesDir
        ? jointPath(PathUtils.parent(notesDir) || notesDir, "assets", "zotero")
        : ""),
  );
  const dashboardDir = normalizeObsidianPathInput(
    dashboardDirPref ||
      defaults.dashboardDir ||
      getDefaultDashboardDir(vaultRoot, notesDir),
  );

  return {
    appPath,
    vaultRoot,
    notesDirPref,
    notesDir,
    assetsDirPref,
    assetsDir,
    dashboardDirPref,
    dashboardDir,
    defaults,
  };
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
      return formatPath(Services.dirsvc.get(key, Ci.nsIFile).path);
    } catch (error) {
      return "";
    }
  };
  const homeDir =
    formatPath(cleanInline(String(PathUtils.homeDir || ""))) ||
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
  const normalizedPath = normalizeObsidianPathInput(path);
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

export async function isObsidianVaultDirectory(path: string) {
  const normalizedPath = normalizeObsidianPathInput(path);
  if (!normalizedPath || !(await pathIsDirectory(normalizedPath))) {
    return false;
  }
  return pathIsDirectory(jointPath(normalizedPath, ".obsidian"));
}

async function getDirectoryChildren(path: string) {
  const normalizedPath = normalizeObsidianPathInput(path);
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

export async function detectObsidianVaults(): Promise<ObsidianDetectedVault[]> {
  const detectedVaults = new Map<string, ObsidianDetectedVault>();
  const addVault = (path: string) => {
    const normalizedPath = normalizeObsidianPathInput(path);
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

export function isObsidianConfigured() {
  return Boolean(
    cleanInline(String(getPref("obsidian.vaultRoot") || "")) ||
      cleanInline(String(getPref("obsidian.notesDir") || "")) ||
      cleanInline(String(getPref("obsidian.assetsDir") || "")),
  );
}

export async function validateObsidianPaths(
  resolvedPaths: ObsidianResolvedPaths,
): Promise<ObsidianPathValidation> {
  const notesDirParent = normalizeObsidianPathInput(
    PathUtils.parent(resolvedPaths.notesDir) || "",
  );
  const [appPathExists, vaultRootExists, vaultRootIsDirectory, notesDirExists] =
    await Promise.all([
      resolvedPaths.appPath ? fileExists(resolvedPaths.appPath) : Promise.resolve(false),
      resolvedPaths.vaultRoot
        ? fileExists(resolvedPaths.vaultRoot)
        : Promise.resolve(false),
      resolvedPaths.vaultRoot
        ? pathIsDirectory(resolvedPaths.vaultRoot)
        : Promise.resolve(false),
      resolvedPaths.notesDir ? fileExists(resolvedPaths.notesDir) : Promise.resolve(false),
    ]);
  const [notesDirParentExists, assetsDirExists, dashboardDirExists] =
    await Promise.all([
      notesDirParent ? fileExists(notesDirParent) : Promise.resolve(false),
      resolvedPaths.assetsDir ? fileExists(resolvedPaths.assetsDir) : Promise.resolve(false),
      resolvedPaths.dashboardDir
        ? fileExists(resolvedPaths.dashboardDir)
        : Promise.resolve(false),
    ]);

  return {
    appPathExists,
    vaultRootExists,
    vaultRootIsDirectory,
    notesDirExists,
    notesDirParentExists,
    assetsDirExists,
    dashboardDirExists,
  };
}

// ── Settings resolution ──

export async function ensureObsidianSettings(): Promise<ObsidianSettings> {
  const resolvedPaths = resolveObsidianPaths();
  const { vaultRoot, notesDir, assetsDir, dashboardDir } = resolvedPaths;
  if (!notesDir) {
    throw new Error(getString("obsidian-sync-missingNotesDir"));
  }

  const pathValidation = await validateObsidianPaths(resolvedPaths);
  if (vaultRoot && !pathValidation.vaultRootExists) {
    throw new Error(getString("obsidian-sync-missingVaultRoot"));
  }

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
    fileNameTemplate: getObsidianFileNameTemplate(),
    syncScope: normalizeObsidianSyncScope(
      String(getPref(OBSIDIAN_SYNC_SCOPE_PREF) || ""),
    ),
    updateStrategy: normalizeObsidianUpdateStrategy(
      String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
    ),
    collectionFolders: {
      mode: normalizeObsidianCollectionFolderMode(
        String(getPref(OBSIDIAN_COLLECTION_FOLDER_MODE_PREF) || ""),
      ),
    },
    content: getManagedNoteContentConfig(),
    translation: getMissingMetadataTranslationConfig(),
  };
}

// ── Connection test ──

export async function writeObsidianConnectionTestFile() {
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

// ── Managed frontmatter fields ──

export function normalizeManagedFrontmatterFields(raw: string) {
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

export function getManagedFrontmatterFields() {
  return normalizeManagedFrontmatterFields(
    String(getPref(OBSIDIAN_FRONTMATTER_FIELDS_PREF) || ""),
  );
}

export function setManagedFrontmatterFields(
  fields: ManagedFrontmatterOptionKey[],
) {
  const normalized = normalizeManagedFrontmatterFields(
    JSON.stringify(fields || []),
  );
  const { setPref } = require("../../utils/prefs");
  setPref(
    OBSIDIAN_FRONTMATTER_FIELDS_PREF,
    JSON.stringify(normalized, null, 2),
  );
  return normalized;
}

export function hasManagedFrontmatterField(key: ManagedFrontmatterOptionKey) {
  return new Set(getManagedFrontmatterFields()).has(key);
}

export function getManagedFrontmatterOption(key: ManagedFrontmatterOptionKey) {
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

export function resolveManagedFrontmatterPreset(
  fields: ManagedFrontmatterOptionKey[],
): ManagedFrontmatterPresetId {
  const matchedPreset = MANAGED_FRONTMATTER_PRESETS.find((preset) =>
    sameManagedFrontmatterFields(fields, preset.fields),
  );
  return matchedPreset?.id || "custom";
}

export function getManagedFrontmatterPresetLabel(
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

export function getManagedFrontmatterOptionLabel(
  key: ManagedFrontmatterOptionKey,
) {
  const localeKey = MANAGED_FRONTMATTER_OPTION_LABEL_KEYS[key];
  return localeKey ? getString(localeKey as any) : key;
}

// ── Template helpers ──

export function hasTemplateByName(templateName: string) {
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

export function getObsidianItemTemplateOptions() {
  const templateNames = addon.api.template
    .getTemplateKeys()
    .map((templateName) => cleanInline(templateName))
    .filter((templateName) => /^\[item\]/i.test(templateName));
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

export function getObsidianItemTemplateLabel(templateName: string) {
  const normalized = cleanInline(templateName);
  const itemTemplateMatch = normalized.match(/^\[item\]\s*(.*)$/i);
  if (itemTemplateMatch) {
    return itemTemplateMatch[1].trim() || normalized;
  }
  return normalized;
}

export function resolveObsidianItemTemplateName() {
  const configuredTemplate = cleanInline(
    String(getPref(OBSIDIAN_ITEM_TEMPLATE_PREF) || ""),
  );
  if (configuredTemplate && hasTemplateByName(configuredTemplate)) {
    return configuredTemplate;
  }
  return DEFAULT_OBSIDIAN_ITEM_TEMPLATE;
}

// ── Storage init / reset ──

export async function initObsidianStorage() {
  const { loadRegistry } = await import("./registry");
  const { initMetadataPresetLibrary } = await import("./metadataPreset");
  const { initObsidianItemNoteMap } = await import("./itemNoteMap");
  migrateObsidianFileNameTemplatePref();
  await loadRegistry();
  await initObsidianItemNoteMap();
  await initMetadataPresetLibrary();
}

export function resetObsidianStorageState() {
  const { resetObsidianItemNoteMapState } = require("./itemNoteMap");
  const { resetManagedNoteRegistryState } = require("./registry");
  const { resetMetadataPresetLibraryState } = require("./metadataPreset");
  resetObsidianItemNoteMapState();
  resetManagedNoteRegistryState();
  resetMetadataPresetLibraryState();
}
