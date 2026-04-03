// ── Obsidian Item Note Map ──
// Manages the persistent mapping between Zotero items and their Obsidian note keys.

import { clearPref, getPref } from "../../utils/prefs";
import { config } from "../../../package.json";
import {
  OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME,
  OBSIDIAN_ITEM_NOTE_MAP_PREF,
} from "./constants";
import {
  findManagedNoteRegistryEntryByItem,
  getManagedNoteRegistryEntries,
  loadRegistry,
  removeRegistryEntry,
  upsertRegistryEntry,
} from "./registry";
import type { ManagedNoteRegistryEntry } from "./types";

let _obsidianItemNoteMapCache: Record<string, string> | null = null;

function getSharedObsidianStorageState() {
  const addonData =
    ((Zotero as any)[config.addonRef] as any)?.data || (addon.data as any);
  if (!addonData.obsidian) {
    addonData.obsidian = {};
  }
  return addonData.obsidian as {
    itemNoteMap?: Record<string, string>;
    managedPathRegistry?: Record<
      string,
      import("./types").ManagedPathRegistryEntry
    >;
    managedNoteRegistry?: Record<string, ManagedNoteRegistryEntry>;
    metadataPresetLibrary?: import("./types").MetadataPresetLibrary;
  };
}

function getObsidianStorageFilePath(fileName: string) {
  return PathUtils.join(Zotero.DataDirectory.dir, fileName);
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

function readObsidianItemNoteMapPref() {
  try {
    return JSON.parse(
      String(getPref(OBSIDIAN_ITEM_NOTE_MAP_PREF) || "{}"),
    ) as Record<string, string>;
  } catch (e) {
    return {};
  }
}

function buildItemNoteMapFromRegistryEntries(entries: ManagedNoteRegistryEntry[]) {
  return entries.reduce<Record<string, string>>((result, entry) => {
    const itemMapKey = getItemMapKeyByParts(entry.libraryID, entry.topItemKey);
    if (!itemMapKey || !entry.noteKey) {
      return result;
    }
    result[itemMapKey] = entry.noteKey;
    return result;
  }, {});
}

async function initObsidianItemNoteMap() {
  await loadRegistry();
  _obsidianItemNoteMapCache = buildItemNoteMapFromRegistryEntries(
    getManagedNoteRegistryEntries(),
  );
  getSharedObsidianStorageState().itemNoteMap = _obsidianItemNoteMapCache;
  clearObsidianStoragePrefs([OBSIDIAN_ITEM_NOTE_MAP_PREF]);
}

function getObsidianItemNoteMap() {
  const sharedMap = getSharedObsidianStorageState().itemNoteMap;
  if (sharedMap && sharedMap !== _obsidianItemNoteMapCache) {
    _obsidianItemNoteMapCache = sharedMap;
  }
  if (!_obsidianItemNoteMapCache) {
    _obsidianItemNoteMapCache = buildItemNoteMapFromRegistryEntries(
      getManagedNoteRegistryEntries(),
    );
    if (!_obsidianItemNoteMapCache || !Object.keys(_obsidianItemNoteMapCache).length) {
      _obsidianItemNoteMapCache = readObsidianItemNoteMapPref();
    }
  }
  return _obsidianItemNoteMapCache;
}

function setObsidianItemNoteMap(map: Record<string, string>) {
  _obsidianItemNoteMapCache = map;
  getSharedObsidianStorageState().itemNoteMap = map;
  const existingEntries = getManagedNoteRegistryEntries();
  const existingByItemMapKey = existingEntries.reduce<Record<string, ManagedNoteRegistryEntry>>(
    (result, entry) => {
      const itemMapKey = getItemMapKeyByParts(entry.libraryID, entry.topItemKey);
      if (itemMapKey) {
        result[itemMapKey] = entry;
      }
      return result;
    },
    {},
  );

  for (const [itemMapKey, noteKey] of Object.entries(map || {})) {
    const [libraryIDText, ...topItemKeyParts] = String(itemMapKey).split("/");
    const libraryID = Number(libraryIDText);
    const topItemKey = topItemKeyParts.join("/");
    if (!libraryID || !topItemKey || !noteKey) {
      continue;
    }
    const existingEntry = existingByItemMapKey[itemMapKey];
    upsertRegistryEntry({
      ...existingEntry,
      libraryID,
      topItemKey,
      noteKey,
    });
  }

  for (const [itemMapKey, entry] of Object.entries(existingByItemMapKey)) {
    if (itemMapKey in (map || {})) {
      continue;
    }
    removeRegistryEntry({
      libraryID: entry.libraryID,
      noteKey: entry.noteKey,
    });
  }
}

function resetObsidianItemNoteMapState() {
  _obsidianItemNoteMapCache = null;
  const sharedState = getSharedObsidianStorageState();
  delete sharedState.itemNoteMap;
}

function getItemMapKey(item: Zotero.Item) {
  return `${item.libraryID}/${item.key}`;
}

function getItemMapKeyByParts(libraryID: number, topItemKey: string) {
  return libraryID && topItemKey ? `${libraryID}/${topItemKey}` : "";
}

export {
  getSharedObsidianStorageState,
  getObsidianStorageFilePath,
  writeObsidianStorageJSONFile,
  clearObsidianStoragePrefs,
  initObsidianItemNoteMap,
  getObsidianItemNoteMap,
  setObsidianItemNoteMap,
  resetObsidianItemNoteMapState,
  getItemMapKey,
};
