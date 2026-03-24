// ── Obsidian Item Note Map ──
// Manages the persistent mapping between Zotero items and their Obsidian note keys.

import { clearPref, getPref } from "../../utils/prefs";
import { fileExists } from "../../utils/str";
import { config } from "../../../package.json";
import {
  OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME,
  OBSIDIAN_ITEM_NOTE_MAP_PREF,
} from "./constants";

let _obsidianItemNoteMapCache: Record<string, string> | null = null;
let _obsidianItemNoteMapSaveTimer: ReturnType<typeof setTimeout> | null = null;

function getSharedObsidianStorageState() {
  const addonData =
    ((Zotero as any)[config.addonRef] as any)?.data || (addon.data as any);
  if (!addonData.obsidian) {
    addonData.obsidian = {};
  }
  return addonData.obsidian as {
    itemNoteMap?: Record<string, string>;
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

async function initObsidianItemNoteMap() {
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
      await persistObsidianItemNoteMapFile(_obsidianItemNoteMapCache!);
    } else {
      clearObsidianStoragePrefs([OBSIDIAN_ITEM_NOTE_MAP_PREF]);
    }
  } catch (e) {
    ztoolkit.log(
      `[Obsidian Bridge] failed to persist ${OBSIDIAN_ITEM_NOTE_MAP_FILE_NAME}`,
      e,
    );
  }
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

function resetObsidianItemNoteMapState() {
  if (_obsidianItemNoteMapSaveTimer) {
    clearTimeout(_obsidianItemNoteMapSaveTimer);
    _obsidianItemNoteMapSaveTimer = null;
  }
  _obsidianItemNoteMapCache = null;
  const sharedState = getSharedObsidianStorageState();
  delete sharedState.itemNoteMap;
}

function getItemMapKey(item: Zotero.Item) {
  return `${item.libraryID}/${item.key}`;
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
