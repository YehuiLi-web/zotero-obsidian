import { fileExists, formatPath } from "../../utils/str";
import { logError } from "../../utils/errorUtils";
import { readManagedFrontmatterIdentity } from "./frontmatterScanner";
import {
  getManagedFrontmatterBridge,
  normalizeFrontmatterObject,
  resolveManagedFrontmatterLibraryID,
} from "./frontmatter";
import { cleanInline, firstValue } from "./shared";
import { OBSIDIAN_FRONTMATTER_INDEX_FILE_NAME } from "./constants";
import {
  findManagedNoteRegistryEntriesByCitekey,
  findManagedNoteRegistryEntryByItem,
  getManagedNoteRegistryEntry,
  markEntryMissing,
  upsertRegistryEntry,
} from "./registry";
import {
  getObsidianStorageFilePath,
  writeObsidianStorageJSONFile,
} from "./itemNoteMap";

type FrontmatterIndexEntry = {
  path: string;
  citekey: string;
  zoteroKey: string;
  noteKey: string;
  libraryID: number;
  mtime: number;
};

type SerializedFrontmatterIndex = {
  version: number;
  entries: Record<string, FrontmatterIndexEntry>;
};

type ResolveFrontmatterOptions = {
  citekey?: string;
  zoteroKey?: string;
  libraryID?: number;
  noteKey?: string;
  notesDir?: string;
};

type FrontmatterResolution = {
  path: string;
  entry: FrontmatterIndexEntry;
};

const FRONTMATTER_INDEX_VERSION = 1;
const MARKDOWN_REGEX = /\.(md|MD|Md|mD)$/;

let frontmatterIndex: Record<string, FrontmatterIndexEntry> = {};
let citekeyLookup = new Map<string, Set<string>>();
let itemLookup = new Map<string, Set<string>>();
let noteLookup = new Map<string, Set<string>>();
let frontmatterIndexLoaded = false;
let frontmatterIndexLoading: Promise<void> | null = null;
let frontmatterIndexSaveTimer: ReturnType<typeof setTimeout> | null = null;

function getSerializedIndex(): SerializedFrontmatterIndex {
  return {
    version: FRONTMATTER_INDEX_VERSION,
    entries: frontmatterIndex,
  };
}

function rebuildLookups() {
  citekeyLookup = new Map();
  itemLookup = new Map();
  noteLookup = new Map();
  for (const entry of Object.values(frontmatterIndex)) {
    addEntryToLookups(entry);
  }
}

function getItemKey(libraryID: number, zoteroKey: string) {
  return libraryID && zoteroKey
    ? `${libraryID}/${zoteroKey.toLowerCase()}`
    : "";
}

function getLookupEntries(map: Map<string, Set<string>>, key: string) {
  const normalized = key.toLowerCase();
  const paths = map.get(normalized);
  if (!paths) {
    return [] as FrontmatterIndexEntry[];
  }
  return Array.from(paths)
    .map((path) => frontmatterIndex[path])
    .filter(Boolean);
}

function addEntryToLookups(entry: FrontmatterIndexEntry) {
  if (!entry) {
    return;
  }
  const path = entry.path;
  if (entry.citekey) {
    const key = entry.citekey.toLowerCase();
    if (!citekeyLookup.has(key)) {
      citekeyLookup.set(key, new Set());
    }
    citekeyLookup.get(key)!.add(path);
  }
  if (entry.libraryID && entry.zoteroKey) {
    const itemKey = getItemKey(entry.libraryID, entry.zoteroKey);
    if (itemKey) {
      if (!itemLookup.has(itemKey)) {
        itemLookup.set(itemKey, new Set());
      }
      itemLookup.get(itemKey)!.add(path);
    }
  }
  if (entry.noteKey) {
    const noteKey = entry.noteKey.toLowerCase();
    if (!noteLookup.has(noteKey)) {
      noteLookup.set(noteKey, new Set());
    }
    noteLookup.get(noteKey)!.add(path);
  }
}

function removeEntryFromLookups(path: string) {
  for (const map of [citekeyLookup, itemLookup, noteLookup]) {
    for (const [key, paths] of map.entries()) {
      if (paths.delete(path) && !paths.size) {
        map.delete(key);
      }
    }
  }
}

function scheduleFrontmatterIndexSave() {
  if (frontmatterIndexSaveTimer) {
    return;
  }
  frontmatterIndexSaveTimer = setTimeout(async () => {
    frontmatterIndexSaveTimer = null;
    try {
      await writeObsidianStorageJSONFile(
        getObsidianStorageFilePath(OBSIDIAN_FRONTMATTER_INDEX_FILE_NAME),
        getSerializedIndex(),
      );
    } catch (error) {
      logError("Persist frontmatter index", error);
    }
  }, 1000);
}

async function loadFrontmatterIndexFile() {
  if (frontmatterIndexLoading) {
    await frontmatterIndexLoading;
    return;
  }
  frontmatterIndexLoading = (async () => {
    try {
      const filePath = getObsidianStorageFilePath(
        OBSIDIAN_FRONTMATTER_INDEX_FILE_NAME,
      );
      if (await fileExists(filePath)) {
        const raw = await Zotero.File.getContentsAsync(filePath);
        const parsed = JSON.parse(String(raw || "{}")) as
          | SerializedFrontmatterIndex
          | undefined;
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.version === FRONTMATTER_INDEX_VERSION &&
          parsed.entries &&
          typeof parsed.entries === "object"
        ) {
          frontmatterIndex = parsed.entries;
        } else if (parsed?.entries) {
          // Legacy format: plain record
          frontmatterIndex = parsed.entries;
        } else {
          frontmatterIndex = (parsed as unknown as Record<
            string,
            FrontmatterIndexEntry
          >) || {};
        }
      } else {
        frontmatterIndex = {};
      }
    } catch (error) {
      logError("Load frontmatter index from disk", error);
      frontmatterIndex = {};
    } finally {
      rebuildLookups();
      frontmatterIndexLoaded = true;
      frontmatterIndexLoading = null;
    }
  })();
  await frontmatterIndexLoading;
}

async function ensureFrontmatterIndex(notesDir?: string) {
  if (!frontmatterIndexLoaded) {
    await loadFrontmatterIndexFile();
  }
  if (Object.keys(frontmatterIndex).length || !notesDir) {
    return;
  }
  await rebuildFrontmatterIndex(notesDir);
}

function buildIndexEntryFromMeta(
  meta: Record<string, any> | null | undefined,
  filePath: string,
  mtime = Date.now(),
): FrontmatterIndexEntry | null {
  const normalizedMeta = normalizeFrontmatterObject(meta);
  const bridge = getManagedFrontmatterBridge(normalizedMeta);
  const citekey = cleanInline(
    String(
      firstValue(
        normalizedMeta.citekey,
        normalizedMeta.citation_key,
        normalizedMeta.citationKey,
      ) || "",
    ),
  );
  const zoteroKey = bridge.zoteroKey;
  const noteKey = bridge.noteKey;
  const libraryID = resolveManagedFrontmatterLibraryID(normalizedMeta, {
    zoteroKey,
    noteKey,
  });
  if (!citekey && (!libraryID || !zoteroKey)) {
    return null;
  }
  return {
    path: formatPath(filePath),
    citekey,
    zoteroKey,
    noteKey,
    libraryID,
    mtime,
  };
}

function setFrontmatterIndexEntry(entry: FrontmatterIndexEntry | null) {
  if (!entry) {
    return;
  }
  const normalizedPath = formatPath(entry.path);
  const previous = frontmatterIndex[normalizedPath];
  if (previous) {
    removeEntryFromLookups(previous.path);
  }
  frontmatterIndex[normalizedPath] = { ...entry, path: normalizedPath };
  addEntryToLookups(frontmatterIndex[normalizedPath]);
  if (entry.libraryID && entry.noteKey) {
    const candidateNote = Zotero.Items.getByLibraryAndKey(
      entry.libraryID,
      entry.noteKey,
    ) as Zotero.Item | false;
    if (!candidateNote || !candidateNote.isNote()) {
      scheduleFrontmatterIndexSave();
      return;
    }
    const existingRegistryEntry = getManagedNoteRegistryEntry({
      libraryID: entry.libraryID,
      noteKey: entry.noteKey,
    });
    upsertRegistryEntry({
      ...existingRegistryEntry,
      libraryID: entry.libraryID,
      topItemKey: entry.zoteroKey || existingRegistryEntry?.topItemKey || "",
      noteKey: entry.noteKey,
      currentPath: normalizedPath,
      lastKnownCitekey: entry.citekey || existingRegistryEntry?.lastKnownCitekey || "",
      lastFileMtime: Number(entry.mtime || 0),
      lastSeenAt: Date.now(),
      presenceState: "active",
      lastResolvedSource: "frontmatter-index",
    });
  }
  scheduleFrontmatterIndexSave();
}

function deleteFrontmatterIndexEntry(path: string) {
  const normalizedPath = formatPath(path);
  if (!frontmatterIndex[normalizedPath]) {
    return;
  }
  removeEntryFromLookups(normalizedPath);
  const removedEntry = frontmatterIndex[normalizedPath];
  delete frontmatterIndex[normalizedPath];
  if (removedEntry?.libraryID && removedEntry.noteKey) {
    markEntryMissing({
      libraryID: removedEntry.libraryID,
      noteKey: removedEntry.noteKey,
    });
  }
  scheduleFrontmatterIndexSave();
}

async function rebuildFrontmatterIndex(notesDir: string) {
  const normalizedNotesDir = formatPath(notesDir);
  frontmatterIndex = {};
  citekeyLookup.clear();
  itemLookup.clear();
  noteLookup.clear();
  if (!normalizedNotesDir || !(await fileExists(normalizedNotesDir))) {
    scheduleFrontmatterIndexSave();
    return;
  }

  const scanDirectory = async (dir: string) => {
    await Zotero.File.iterateDirectory(dir, async (entry: OS.File.Entry) => {
      if (entry.isDir) {
        await scanDirectory(entry.path);
        return;
      }
      if (!MARKDOWN_REGEX.test(entry.name)) {
        return;
      }
      const record = await extractEntryFromFile(entry.path);
      if (record) {
        frontmatterIndex[record.path] = record;
        addEntryToLookups(record);
      }
    });
  };

  await scanDirectory(normalizedNotesDir);
  scheduleFrontmatterIndexSave();
}

async function extractEntryFromFile(filePath: string) {
  try {
    const scanned = await readManagedFrontmatterIdentity(filePath);
    if (!scanned?.meta) {
      deleteFrontmatterIndexEntry(filePath);
      return null;
    }
    const record = buildIndexEntryFromMeta(
      scanned.meta,
      filePath,
      scanned.mtime || Date.now(),
    );
    if (record) {
      return record;
    }
    deleteFrontmatterIndexEntry(filePath);
    return null;
  } catch (error) {
    logError("Read frontmatter while indexing", error, filePath);
    return null;
  }
}

async function refreshFrontmatterIndexEntry(
  filePath: string,
  meta?: Record<string, any> | null,
  mtime?: number,
) {
  if (meta) {
    const entry = buildIndexEntryFromMeta(meta, filePath, mtime || Date.now());
    if (entry) {
      setFrontmatterIndexEntry(entry);
      return;
    }
    deleteFrontmatterIndexEntry(filePath);
    return;
  }
  const record = await extractEntryFromFile(filePath);
  if (record) {
    setFrontmatterIndexEntry(record);
  }
}

function collectFrontmatterCandidates(options: ResolveFrontmatterOptions) {
  const candidates: FrontmatterIndexEntry[] = [];
  const seenPaths = new Set<string>();
  const addCandidates = (entries: FrontmatterIndexEntry[]) => {
    for (const entry of entries.filter(Boolean)) {
      const normalizedPath = formatPath(entry.path);
      if (!normalizedPath || seenPaths.has(normalizedPath)) {
        continue;
      }
      seenPaths.add(normalizedPath);
      candidates.push(entry);
    }
  };

  if (options.noteKey && options.libraryID) {
    const registryEntry = getManagedNoteRegistryEntry({
      libraryID: options.libraryID,
      noteKey: options.noteKey,
    });
    if (registryEntry?.currentPath) {
      addCandidates([
        {
          path: registryEntry.currentPath,
          citekey: registryEntry.lastKnownCitekey || options.citekey || "",
          zoteroKey: registryEntry.topItemKey || options.zoteroKey || "",
          noteKey: registryEntry.noteKey,
          libraryID: registryEntry.libraryID,
          mtime: registryEntry.lastFileMtime || registryEntry.lastSeenAt || Date.now(),
        },
      ]);
    }
  }

  if (options.libraryID && options.zoteroKey) {
    const registryEntry = findManagedNoteRegistryEntryByItem({
      libraryID: options.libraryID,
      topItemKey: options.zoteroKey,
    });
    if (registryEntry?.currentPath) {
      addCandidates([
        {
          path: registryEntry.currentPath,
          citekey: registryEntry.lastKnownCitekey || options.citekey || "",
          zoteroKey: registryEntry.topItemKey,
          noteKey: registryEntry.noteKey,
          libraryID: registryEntry.libraryID,
          mtime: registryEntry.lastFileMtime || registryEntry.lastSeenAt || Date.now(),
        },
      ]);
    }
  }

  if (options.citekey) {
    addCandidates(
      findManagedNoteRegistryEntriesByCitekey(options.citekey).map((entry) => ({
        path: entry.currentPath,
        citekey: entry.lastKnownCitekey || options.citekey || "",
        zoteroKey: entry.topItemKey,
        noteKey: entry.noteKey,
        libraryID: entry.libraryID,
        mtime: entry.lastFileMtime || entry.lastSeenAt || Date.now(),
      })),
    );
  }

  if (options.noteKey) {
    addCandidates(
      getLookupEntries(noteLookup, options.noteKey).filter(Boolean),
    );
  }

  if (
    options.libraryID &&
    options.zoteroKey
  ) {
    const itemKey = getItemKey(options.libraryID, options.zoteroKey);
    if (itemKey) {
      addCandidates(getLookupEntries(itemLookup, itemKey));
    }
  }

  if (options.citekey) {
    addCandidates(
      getLookupEntries(citekeyLookup, options.citekey).filter(Boolean),
    );
  }

  return candidates;
}

async function getFrontmatterCandidatesFromCurrentIndex(
  options: ResolveFrontmatterOptions,
): Promise<{
  candidates: FrontmatterIndexEntry[];
  hadMissingCandidates: boolean;
}> {
  const resolvedCandidates: FrontmatterIndexEntry[] = [];
  let hadMissingCandidates = false;
  for (const entry of collectFrontmatterCandidates(options)) {
    if (await fileExists(entry.path)) {
      resolvedCandidates.push(entry);
      continue;
    }
    hadMissingCandidates = true;
    deleteFrontmatterIndexEntry(entry.path);
  }

  return {
    candidates: resolvedCandidates,
    hadMissingCandidates,
  };
}

async function findFrontmatterCandidates(
  options: ResolveFrontmatterOptions,
): Promise<FrontmatterIndexEntry[]> {
  await ensureFrontmatterIndex(options.notesDir);
  let result = await getFrontmatterCandidatesFromCurrentIndex(options);
  if (result.candidates.length) {
    return result.candidates;
  }

  if (result.hadMissingCandidates && options.notesDir) {
    await rebuildFrontmatterIndex(options.notesDir);
    result = await getFrontmatterCandidatesFromCurrentIndex(options);
    if (result.candidates.length) {
      return result.candidates;
    }
  }

  return [];
}

async function resolveNoteByFrontmatter(
  options: ResolveFrontmatterOptions,
): Promise<FrontmatterResolution | null> {
  const candidates = await findFrontmatterCandidates(options);
  if (candidates[0]) {
    return {
      path: candidates[0].path,
      entry: candidates[0],
    };
  }
  return null;
}

export {
  ensureFrontmatterIndex,
  rebuildFrontmatterIndex,
  findFrontmatterCandidates,
  refreshFrontmatterIndexEntry,
  resolveNoteByFrontmatter,
  FrontmatterIndexEntry,
  FrontmatterResolution,
};
