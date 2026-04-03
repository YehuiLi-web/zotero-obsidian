import { config } from "../../../package.json";
import { safeLog } from "../../utils/log";
import { getPref } from "../../utils/prefs";
import { fileExists, formatPath } from "../../utils/str";
import {
  OBSIDIAN_FRONTMATTER_INDEX_FILE_NAME,
  OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME,
  OBSIDIAN_ITEM_NOTE_MAP_PREF,
  OBSIDIAN_MANAGED_NOTE_REGISTRY_FILE_NAME,
  OBSIDIAN_MANAGED_PATH_REGISTRY_FILE_NAME,
} from "./constants";
import type {
  ManagedNoteRegistryEntry,
  ManagedPathMode,
  ManagedPathRegistryEntry,
  RegistryPresenceState,
  RegistryResolutionResult,
} from "./types";

type SerializedManagedNoteRegistry = {
  version: number;
  entries: Record<string, ManagedNoteRegistryEntry>;
};

type LegacyFrontmatterIndexEntry = {
  path: string;
  citekey: string;
  zoteroKey: string;
  noteKey: string;
  libraryID: number;
  mtime: number;
};

const MANAGED_NOTE_REGISTRY_VERSION = 1;

let managedNoteRegistryCache: Record<string, ManagedNoteRegistryEntry> | null =
  null;
let managedNoteRegistryLoading: Promise<void> | null = null;
let managedNoteRegistrySaveTimer: ReturnType<typeof setTimeout> | null = null;

let registryByItemMapKey = new Map<string, string>();
let registryByPath = new Map<string, string>();
let registryByCitekey = new Map<string, Set<string>>();

function getSharedObsidianStorageState() {
  const addonData =
    ((Zotero as any)[config.addonRef] as any)?.data || (addon.data as any);
  if (!addonData.obsidian) {
    addonData.obsidian = {};
  }
  return addonData.obsidian as {
    itemNoteMap?: Record<string, string>;
    managedPathRegistry?: Record<string, ManagedPathRegistryEntry>;
    managedNoteRegistry?: Record<string, ManagedNoteRegistryEntry>;
    metadataPresetLibrary?: import("./types").MetadataPresetLibrary;
  };
}

function getRegistryStorageFilePath(fileName: string) {
  return PathUtils.join(Zotero.DataDirectory.dir, fileName);
}

async function writeRegistryJSONFile(fileName: string, data: unknown) {
  await Zotero.File.putContentsAsync(
    getRegistryStorageFilePath(fileName),
    JSON.stringify(data, null, 2),
  );
}

function getManagedNoteRegistryKey(libraryID: number, noteKey: string) {
  return libraryID && noteKey ? `${libraryID}/${String(noteKey).toLowerCase()}` : "";
}

function getManagedNoteRegistryEntryKey(noteItem: Zotero.Item) {
  return getManagedNoteRegistryKey(noteItem.libraryID, noteItem.key || "");
}

function getItemMapKey(libraryID: number, topItemKey: string) {
  return libraryID && topItemKey ? `${libraryID}/${topItemKey}` : "";
}

function getPathLookupKey(path: string) {
  const normalized = formatPath(path);
  if (!normalized) {
    return "";
  }
  return Zotero.isWin ? normalized.toLowerCase() : normalized;
}

function addRegistryKeyToLookup(map: Map<string, Set<string>>, key: string, id: string) {
  const normalized = key.toLowerCase();
  if (!normalized || !id) {
    return;
  }
  if (!map.has(normalized)) {
    map.set(normalized, new Set());
  }
  map.get(normalized)!.add(id);
}

function getSerializedManagedNoteRegistry(): SerializedManagedNoteRegistry {
  return {
    version: MANAGED_NOTE_REGISTRY_VERSION,
    entries: managedNoteRegistryCache || {},
  };
}

function toLegacyItemNoteMap(
  entries: Record<string, ManagedNoteRegistryEntry>,
): Record<string, string> {
  return Object.values(entries).reduce<Record<string, string>>((result, entry) => {
    const itemMapKey = getItemMapKey(entry.libraryID, entry.topItemKey);
    if (!itemMapKey || !entry.noteKey) {
      return result;
    }
    result[itemMapKey] = entry.noteKey;
    return result;
  }, {});
}

function toLegacyManagedPathRegistry(
  entries: Record<string, ManagedNoteRegistryEntry>,
): Record<string, ManagedPathRegistryEntry> {
  return Object.values(entries).reduce<Record<string, ManagedPathRegistryEntry>>(
    (result, entry) => {
      const registryKey = getManagedNoteRegistryKey(entry.libraryID, entry.noteKey);
      if (!registryKey) {
        return result;
      }
      result[registryKey] = {
        libraryID: entry.libraryID,
        topItemKey: entry.topItemKey,
        noteKey: entry.noteKey,
        resolvedPath: entry.currentPath,
        scopeRoot: entry.scopeRoot,
        pathMode: entry.pathMode,
        lastResolvedAt: entry.lastResolvedAt,
        lastSeenAt: entry.lastSeenAt,
      };
      return result;
    },
    {},
  );
}

function applySharedRegistryState() {
  const sharedState = getSharedObsidianStorageState();
  const registry = managedNoteRegistryCache || {};
  sharedState.managedNoteRegistry = registry;
  sharedState.itemNoteMap = toLegacyItemNoteMap(registry);
  sharedState.managedPathRegistry = toLegacyManagedPathRegistry(registry);
}

function scheduleManagedNoteRegistrySave() {
  if (managedNoteRegistrySaveTimer) {
    return;
  }
  managedNoteRegistrySaveTimer = setTimeout(async () => {
    managedNoteRegistrySaveTimer = null;
    try {
      await writeRegistryJSONFile(
        OBSIDIAN_MANAGED_NOTE_REGISTRY_FILE_NAME,
        getSerializedManagedNoteRegistry(),
      );
    } catch (error) {
      safeLog("[ObsidianBridge] failed to persist managed note registry", error);
    }
  }, 1000);
}

function normalizeConflictPaths(paths: string[]) {
  const seen = new Set<string>();
  return (paths || [])
    .map((path) => formatPath(path))
    .filter((path) => {
      const lookupKey = getPathLookupKey(path);
      if (!lookupKey || seen.has(lookupKey)) {
        return false;
      }
      seen.add(lookupKey);
      return true;
    });
}

function normalizeRegistryEntry(
  entry: Partial<ManagedNoteRegistryEntry> & {
    libraryID: number;
    noteKey: string;
  },
): ManagedNoteRegistryEntry {
  const normalizedCurrentPath = formatPath(entry.currentPath || "");
  const defaultPathMode = normalizedCurrentPath
    ? "preserve-user-path"
    : "template-managed";
  const presenceState = (entry.presenceState ||
    (normalizedCurrentPath ? "active" : "missing")) as RegistryPresenceState;
  return {
    libraryID: Number(entry.libraryID || 0),
    topItemKey: String(entry.topItemKey || ""),
    noteKey: String(entry.noteKey || ""),
    currentPath: normalizedCurrentPath,
    pathMode: (entry.pathMode || defaultPathMode) as ManagedPathMode,
    presenceState,
    lastSeenAt: Number(entry.lastSeenAt || Date.now()),
    lastFileMtime: Number(entry.lastFileMtime || 0),
    lastResolvedAt: Number(entry.lastResolvedAt || Date.now()),
    lastResolvedSource: (entry.lastResolvedSource || "manual") as
      | "registry"
      | "frontmatter-index"
      | "scope-scan"
      | "template-fallback"
      | "migration"
      | "manual",
    conflictPaths: normalizeConflictPaths(entry.conflictPaths || []),
    lastKnownCitekey: String(entry.lastKnownCitekey || ""),
    scopeRoot: formatPath(entry.scopeRoot || ""),
  };
}

function rebuildRegistryIndexes() {
  registryByItemMapKey = new Map();
  registryByPath = new Map();
  registryByCitekey = new Map();

  for (const [registryKey, entry] of Object.entries(managedNoteRegistryCache || {})) {
    const itemMapKey = getItemMapKey(entry.libraryID, entry.topItemKey);
    if (itemMapKey) {
      registryByItemMapKey.set(itemMapKey, registryKey);
    }

    const pathKey = getPathLookupKey(entry.currentPath);
    if (pathKey) {
      registryByPath.set(pathKey, registryKey);
    }

    if (entry.lastKnownCitekey) {
      addRegistryKeyToLookup(registryByCitekey, entry.lastKnownCitekey, registryKey);
    }
  }

  applySharedRegistryState();
}

function getManagedNoteRegistry() {
  const sharedRegistry = getSharedObsidianStorageState().managedNoteRegistry;
  if (sharedRegistry && sharedRegistry !== managedNoteRegistryCache) {
    managedNoteRegistryCache = sharedRegistry;
    rebuildRegistryIndexes();
  }
  if (!managedNoteRegistryCache) {
    managedNoteRegistryCache = {};
    rebuildRegistryIndexes();
  }
  return managedNoteRegistryCache;
}

function setManagedNoteRegistry(registry: Record<string, ManagedNoteRegistryEntry>) {
  managedNoteRegistryCache = registry;
  rebuildRegistryIndexes();
  scheduleManagedNoteRegistrySave();
}

async function readLegacyJSON(fileName: string) {
  const filePath = getRegistryStorageFilePath(fileName);
  if (!(await fileExists(filePath))) {
    return null;
  }
  try {
    const raw = await Zotero.File.getContentsAsync(filePath);
    return JSON.parse(String(raw || "{}")) as Record<string, any>;
  } catch (error) {
    safeLog(`[ObsidianBridge] failed to read legacy file ${fileName}`, error);
    return null;
  }
}

function readLegacyItemNoteMapPref() {
  try {
    return JSON.parse(
      String(getPref(OBSIDIAN_ITEM_NOTE_MAP_PREF) || "{}"),
    ) as Record<string, string>;
  } catch (error) {
    return {};
  }
}

function mergeRegistryPatch(
  registry: Record<string, ManagedNoteRegistryEntry>,
  patch: Partial<ManagedNoteRegistryEntry> & {
    libraryID: number;
    noteKey: string;
  },
) {
  const registryKey = getManagedNoteRegistryKey(patch.libraryID, patch.noteKey);
  if (!registryKey) {
    return;
  }

  const previous = registry[registryKey];
  let currentPath =
    formatPath(patch.currentPath || "") || previous?.currentPath || "";
  let conflictPaths = normalizeConflictPaths([
    ...(previous?.conflictPaths || []),
    ...(patch.conflictPaths || []),
  ]);

  if (
    previous?.currentPath &&
    currentPath &&
    getPathLookupKey(previous.currentPath) !== getPathLookupKey(currentPath)
  ) {
    const previousPathKey = getPathLookupKey(previous.currentPath);
    if (previousPathKey) {
      conflictPaths = normalizeConflictPaths([...conflictPaths, previous.currentPath]);
    }
  }

  registry[registryKey] = normalizeRegistryEntry({
    ...previous,
    ...patch,
    currentPath,
    conflictPaths,
  });
}

async function migrateLegacyRegistry() {
  const registry: Record<string, ManagedNoteRegistryEntry> = {};

  const legacyItemMapFile =
    (await readLegacyJSON(OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME)) || {};
  const legacyItemMap = Object.keys(legacyItemMapFile).length
    ? (legacyItemMapFile as Record<string, string>)
    : readLegacyItemNoteMapPref();

  for (const [itemMapKey, noteKey] of Object.entries(legacyItemMap)) {
    const [libraryIDText, ...topItemKeyParts] = String(itemMapKey).split("/");
    const libraryID = Number(libraryIDText);
    const topItemKey = topItemKeyParts.join("/");
    if (!libraryID || !topItemKey || !noteKey) {
      continue;
    }
    mergeRegistryPatch(registry, {
      libraryID,
      topItemKey,
      noteKey,
      presenceState: "missing",
      lastResolvedSource: "migration",
    });
  }

  const legacyPathRegistryRaw =
    (await readLegacyJSON(OBSIDIAN_MANAGED_PATH_REGISTRY_FILE_NAME)) || {};
  const legacyPathRegistry =
    legacyPathRegistryRaw &&
    typeof legacyPathRegistryRaw === "object" &&
    "entries" in legacyPathRegistryRaw
      ? ((legacyPathRegistryRaw.entries as Record<string, ManagedPathRegistryEntry>) ||
          {})
      : (legacyPathRegistryRaw as Record<string, ManagedPathRegistryEntry>);

  for (const pathEntry of Object.values(legacyPathRegistry || {})) {
    if (!pathEntry?.libraryID || !pathEntry?.noteKey) {
      continue;
    }
    const resolvedPath = formatPath(pathEntry.resolvedPath || "");
    const exists = resolvedPath ? await fileExists(resolvedPath) : false;
    mergeRegistryPatch(registry, {
      libraryID: pathEntry.libraryID,
      topItemKey: pathEntry.topItemKey,
      noteKey: pathEntry.noteKey,
      currentPath: resolvedPath,
      pathMode: pathEntry.pathMode,
      scopeRoot: pathEntry.scopeRoot,
      lastResolvedAt: Number(pathEntry.lastResolvedAt || Date.now()),
      lastSeenAt: Number(pathEntry.lastSeenAt || Date.now()),
      presenceState: exists ? "active" : "missing",
      lastResolvedSource: "migration",
    });
  }

  const legacyFrontmatterIndexRaw =
    (await readLegacyJSON(OBSIDIAN_FRONTMATTER_INDEX_FILE_NAME)) || {};
  const legacyFrontmatterIndex =
    legacyFrontmatterIndexRaw &&
    typeof legacyFrontmatterIndexRaw === "object" &&
    "entries" in legacyFrontmatterIndexRaw
      ? ((legacyFrontmatterIndexRaw.entries as Record<string, LegacyFrontmatterIndexEntry>) ||
          {})
      : (legacyFrontmatterIndexRaw as Record<string, LegacyFrontmatterIndexEntry>);

  for (const indexEntry of Object.values(legacyFrontmatterIndex || {})) {
    if (!indexEntry?.libraryID || !indexEntry?.noteKey) {
      continue;
    }
    const candidateNote = Zotero.Items.getByLibraryAndKey(
      indexEntry.libraryID,
      indexEntry.noteKey,
    ) as Zotero.Item | false;
    if (!candidateNote || !candidateNote.isNote()) {
      continue;
    }
    const entryPath = formatPath(indexEntry.path || "");
    const exists = entryPath ? await fileExists(entryPath) : false;
    mergeRegistryPatch(registry, {
      libraryID: indexEntry.libraryID,
      topItemKey: String(indexEntry.zoteroKey || ""),
      noteKey: String(indexEntry.noteKey || ""),
      currentPath: entryPath,
      lastFileMtime: Number(indexEntry.mtime || 0),
      lastKnownCitekey: String(indexEntry.citekey || ""),
      presenceState: exists ? "active" : "missing",
      lastResolvedSource: "migration",
    });
  }

  return registry;
}

async function loadRegistry() {
  if (managedNoteRegistryLoading) {
    await managedNoteRegistryLoading;
    return;
  }
  managedNoteRegistryLoading = (async () => {
    try {
      const filePath = getRegistryStorageFilePath(
        OBSIDIAN_MANAGED_NOTE_REGISTRY_FILE_NAME,
      );
      if (await fileExists(filePath)) {
        const raw = await Zotero.File.getContentsAsync(filePath);
        const parsed = JSON.parse(String(raw || "{}")) as
          | SerializedManagedNoteRegistry
          | Record<string, ManagedNoteRegistryEntry>;
        if (
          parsed &&
          typeof parsed === "object" &&
          "version" in parsed &&
          "entries" in parsed &&
          parsed.version === MANAGED_NOTE_REGISTRY_VERSION
        ) {
          managedNoteRegistryCache = Object.entries(parsed.entries || {}).reduce<
            Record<string, ManagedNoteRegistryEntry>
          >((result, [registryKey, entry]) => {
            result[registryKey] = normalizeRegistryEntry(entry);
            return result;
          }, {});
        } else {
          managedNoteRegistryCache = Object.entries(
            parsed as Record<string, ManagedNoteRegistryEntry>,
          ).reduce<Record<string, ManagedNoteRegistryEntry>>(
            (result, [registryKey, entry]) => {
              result[registryKey] = normalizeRegistryEntry(entry);
              return result;
            },
            {},
          );
        }
      } else {
        managedNoteRegistryCache = await migrateLegacyRegistry();
        scheduleManagedNoteRegistrySave();
      }
    } catch (error) {
      safeLog("[ObsidianBridge] failed to load managed note registry", error);
      managedNoteRegistryCache = {};
    } finally {
      if (!managedNoteRegistryCache) {
        managedNoteRegistryCache = {};
      }
      rebuildRegistryIndexes();
      managedNoteRegistryLoading = null;
    }
  })();
  await managedNoteRegistryLoading;
}

function getManagedNoteRegistryEntry(
  noteItemOrIdentity:
    | Zotero.Item
    | {
        libraryID: number;
        noteKey: string;
      },
) {
  const registryKey =
    "isNote" in noteItemOrIdentity
      ? getManagedNoteRegistryEntryKey(noteItemOrIdentity)
      : getManagedNoteRegistryKey(
          noteItemOrIdentity.libraryID,
          noteItemOrIdentity.noteKey,
        );
  return registryKey ? getManagedNoteRegistry()[registryKey] || null : null;
}

function findManagedNoteRegistryEntryByItem(
  topItemOrIdentity:
    | Zotero.Item
    | {
        libraryID: number;
        topItemKey: string;
      },
) {
  const itemMapKey =
    "isRegularItem" in topItemOrIdentity
      ? getItemMapKey(topItemOrIdentity.libraryID, topItemOrIdentity.key || "")
      : getItemMapKey(
          topItemOrIdentity.libraryID,
          topItemOrIdentity.topItemKey,
        );
  const registryKey = itemMapKey ? registryByItemMapKey.get(itemMapKey) : "";
  return registryKey ? getManagedNoteRegistry()[registryKey] || null : null;
}

function findManagedNoteRegistryEntryByPath(filePath: string) {
  const registryKey = registryByPath.get(getPathLookupKey(filePath));
  return registryKey ? getManagedNoteRegistry()[registryKey] || null : null;
}

function findManagedNoteRegistryEntriesByCitekey(citekey: string) {
  const registryKeys = registryByCitekey.get(String(citekey || "").toLowerCase());
  if (!registryKeys) {
    return [] as ManagedNoteRegistryEntry[];
  }
  return Array.from(registryKeys)
    .map((registryKey) => getManagedNoteRegistry()[registryKey])
    .filter(Boolean);
}

function upsertRegistryEntry(
  entry: Partial<ManagedNoteRegistryEntry> & {
    libraryID: number;
    noteKey: string;
  },
) {
  const registryKey = getManagedNoteRegistryKey(entry.libraryID, entry.noteKey);
  if (!registryKey) {
    return null;
  }
  const currentRegistry = getManagedNoteRegistry();
  setManagedNoteRegistry({
    ...currentRegistry,
    [registryKey]: normalizeRegistryEntry({
      ...currentRegistry[registryKey],
      ...entry,
    }),
  });
  return getManagedNoteRegistry()[registryKey] || null;
}

function removeRegistryEntry(
  noteItemOrIdentity:
    | Zotero.Item
    | {
        libraryID: number;
        noteKey: string;
      },
) {
  const registryKey =
    "isNote" in noteItemOrIdentity
      ? getManagedNoteRegistryEntryKey(noteItemOrIdentity)
      : getManagedNoteRegistryKey(
          noteItemOrIdentity.libraryID,
          noteItemOrIdentity.noteKey,
        );
  if (!registryKey) {
    return;
  }
  const nextRegistry = { ...getManagedNoteRegistry() };
  if (!(registryKey in nextRegistry)) {
    return;
  }
  delete nextRegistry[registryKey];
  setManagedNoteRegistry(nextRegistry);
}

function markEntryMissing(
  noteItemOrIdentity:
    | Zotero.Item
    | {
        libraryID: number;
        noteKey: string;
      },
  options: Partial<ManagedNoteRegistryEntry> = {},
) {
  const currentEntry = getManagedNoteRegistryEntry(noteItemOrIdentity);
  if (!currentEntry) {
    return null;
  }
  return upsertRegistryEntry({
    ...currentEntry,
    ...options,
    libraryID: currentEntry.libraryID,
    noteKey: currentEntry.noteKey,
    presenceState: "missing",
    lastSeenAt: Date.now(),
  });
}

function markEntryTombstoned(
  noteItemOrIdentity:
    | Zotero.Item
    | {
        libraryID: number;
        noteKey: string;
      },
  options: Partial<ManagedNoteRegistryEntry> = {},
) {
  const currentEntry = getManagedNoteRegistryEntry(noteItemOrIdentity);
  if (!currentEntry) {
    return null;
  }
  return upsertRegistryEntry({
    ...currentEntry,
    ...options,
    libraryID: currentEntry.libraryID,
    noteKey: currentEntry.noteKey,
    presenceState: "tombstoned",
    lastSeenAt: Date.now(),
  });
}

function resolveRegistryEntry(
  noteItemOrIdentity:
    | Zotero.Item
    | {
        libraryID: number;
        noteKey: string;
      },
): RegistryResolutionResult {
  const entry = getManagedNoteRegistryEntry(noteItemOrIdentity);
  if (!entry) {
    return {
      entry: null,
      matchedExistingFile: false,
      path: "",
      presenceState: "missing",
    };
  }
  return {
    entry,
    matchedExistingFile: entry.presenceState === "active" && Boolean(entry.currentPath),
    path: entry.currentPath,
    presenceState: entry.presenceState,
  };
}

function getManagedNoteRegistryEntries() {
  return Object.values(getManagedNoteRegistry());
}

function getActiveManagedNoteRegistryEntries() {
  return getManagedNoteRegistryEntries().filter(
    (entry) => entry.presenceState === "active" && Boolean(entry.currentPath),
  );
}

function resetManagedNoteRegistryState() {
  if (managedNoteRegistrySaveTimer) {
    clearTimeout(managedNoteRegistrySaveTimer);
    managedNoteRegistrySaveTimer = null;
  }
  managedNoteRegistryCache = null;
  managedNoteRegistryLoading = null;
  registryByItemMapKey = new Map();
  registryByPath = new Map();
  registryByCitekey = new Map();
  const sharedState = getSharedObsidianStorageState();
  delete sharedState.managedNoteRegistry;
}

export {
  loadRegistry,
  rebuildRegistryIndexes,
  getManagedNoteRegistryKey,
  getManagedNoteRegistry,
  getManagedNoteRegistryEntry,
  findManagedNoteRegistryEntryByItem,
  findManagedNoteRegistryEntryByPath,
  findManagedNoteRegistryEntriesByCitekey,
  upsertRegistryEntry,
  removeRegistryEntry,
  markEntryMissing,
  markEntryTombstoned,
  resolveRegistryEntry,
  getManagedNoteRegistryEntries,
  getActiveManagedNoteRegistryEntries,
  resetManagedNoteRegistryState,
};
