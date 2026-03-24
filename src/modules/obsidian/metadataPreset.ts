// ── Obsidian Metadata Preset Management ──
// Handles MetadataPreset CRUD, persistence, normalization, and catalog queries.

import { getString } from "../../utils/locale";
import { clearPref, getPref } from "../../utils/prefs";
import { fileExists } from "../../utils/str";
import { cleanInline } from "./shared";
import {
  DEFAULT_METADATA_PRESET,
  DEFAULT_METADATA_PRESET_ID,
  DERIVED_METADATA_FIELD_KEYS,
  FIELD_LABELS,
  ITEM_TYPE_LABELS,
  OBSIDIAN_METADATA_PRESET_ACTIVE_PREF,
  OBSIDIAN_METADATA_PRESET_FILE_NAME,
  OBSIDIAN_METADATA_PRESET_LIBRARY_PREF,
  OBSIDIAN_METADATA_PRESET_PREF,
} from "./constants";
import {
  MetadataFieldMap,
  MetadataPreset,
  MetadataPresetLibrary,
  MetadataPresetProfile,
  MetadataSectionKey,
} from "./types";
import {
  getSharedObsidianStorageState,
  getObsidianStorageFilePath,
  writeObsidianStorageJSONFile,
  clearObsidianStoragePrefs,
} from "./itemNoteMap";

let _metadataPresetLibraryCache: MetadataPresetLibrary | null = null;
let _metadataPresetLibrarySaveTimer: ReturnType<typeof setTimeout> | null = null;

// ── Clone helpers ──

export function cloneDefaultMetadataPreset() {
  return JSON.parse(JSON.stringify(DEFAULT_METADATA_PRESET)) as MetadataPreset;
}

export function cloneMetadataPreset(preset: MetadataPreset) {
  return JSON.parse(
    JSON.stringify(preset || cloneDefaultMetadataPreset()),
  ) as MetadataPreset;
}

function cloneMetadataPresetLibrary(library: MetadataPresetLibrary) {
  return JSON.parse(JSON.stringify(library)) as MetadataPresetLibrary;
}

// ── Preset name helpers (i18n) ──

function getDefaultMetadataPresetName() {
  return getString("obsidian-metadataPreset-defaultName");
}

function getMigratedMetadataPresetName() {
  return getString("obsidian-metadataPreset-migratedName");
}

function getUntitledMetadataPresetName() {
  return getString("obsidian-metadataPreset-untitledName");
}

export function getMetadataPresetSectionLabel(sectionKey: MetadataSectionKey) {
  return sectionKey === "default"
    ? getString("obsidian-metadataPreset-defaultSection")
    : getItemTypeLabel(sectionKey);
}

// ── Item type / field label helpers ──

export function getItemTypeLabel(itemType: string) {
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

export function getStandardFieldKeysForItemType(itemType: string) {
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

export function getFieldLabel(fieldKey: string) {
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

export function getMetadataFieldCatalog(
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

export function getConfiguredFields(section: MetadataFieldMap, itemType: string) {
  const result = [...(section.default || []), ...(section[itemType] || [])];
  return Array.from(new Set(result));
}

// ── Preset normalization ──

export function normalizeMetadataPreset(raw: string): MetadataPreset {
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

export function normalizeMetadataPresetLibrary(
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

// ── Library CRUD ──

export function createDefaultMetadataPresetLibrary(): MetadataPresetLibrary {
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

export function getActiveMetadataPresetProfile(library: MetadataPresetLibrary) {
  return (
    library.presets.find((profile) => profile.id === library.activePresetId) ||
    library.presets[0]
  );
}

export function createMetadataPresetID(name: string) {
  const base =
    cleanInline(name)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "") || "preset";
  return `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function getMetadataPreset() {
  return cloneMetadataPreset(
    getActiveMetadataPresetProfile(getMetadataPresetLibrary()).preset,
  );
}

// ── Persistence ──

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

export function persistMetadataPresetLibrary(library: MetadataPresetLibrary) {
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

export function getMetadataPresetLibrary() {
  const sharedLibrary = getSharedObsidianStorageState().metadataPresetLibrary;
  if (sharedLibrary && sharedLibrary !== _metadataPresetLibraryCache) {
    _metadataPresetLibraryCache = sharedLibrary;
  }
  if (_metadataPresetLibraryCache) {
    return cloneMetadataPresetLibrary(_metadataPresetLibraryCache);
  }
  return createDefaultMetadataPresetLibrary();
}

export function resetMetadataPresetLibraryState() {
  if (_metadataPresetLibrarySaveTimer) {
    clearTimeout(_metadataPresetLibrarySaveTimer);
    _metadataPresetLibrarySaveTimer = null;
  }
  _metadataPresetLibraryCache = null;
  const sharedState = getSharedObsidianStorageState();
  delete sharedState.metadataPresetLibrary;
}

// ── Initialization ──

export async function initMetadataPresetLibrary() {
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
