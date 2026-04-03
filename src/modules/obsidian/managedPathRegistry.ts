import { formatPath } from "../../utils/str";
import {
  getManagedNoteRegistryEntries,
  getManagedNoteRegistryEntry,
  getManagedNoteRegistryKey,
  loadRegistry,
  removeRegistryEntry,
  upsertRegistryEntry,
} from "./registry";
import type { ManagedPathMode, ManagedPathRegistryEntry } from "./types";

function toManagedPathRegistryEntry(
  entry: import("./types").ManagedNoteRegistryEntry,
): ManagedPathRegistryEntry {
  return {
    libraryID: entry.libraryID,
    topItemKey: entry.topItemKey,
    noteKey: entry.noteKey,
    resolvedPath: entry.currentPath,
    scopeRoot: entry.scopeRoot,
    pathMode: entry.pathMode,
    lastResolvedAt: entry.lastResolvedAt,
    lastSeenAt: entry.lastSeenAt,
  };
}

async function initManagedPathRegistry() {
  await loadRegistry();
}

function getManagedPathRegistry() {
  return getManagedNoteRegistryEntries().reduce<Record<string, ManagedPathRegistryEntry>>(
    (result, entry) => {
      const registryKey = getManagedNoteRegistryKey(entry.libraryID, entry.noteKey);
      if (!registryKey) {
        return result;
      }
      result[registryKey] = toManagedPathRegistryEntry(entry);
      return result;
    },
    {},
  );
}

function setManagedPathRegistry(
  registry: Record<string, ManagedPathRegistryEntry>,
) {
  const expectedKeys = new Set<string>();
  for (const entry of Object.values(registry || {})) {
    if (!entry?.libraryID || !entry?.noteKey) {
      continue;
    }
    const registryKey = getManagedNoteRegistryKey(entry.libraryID, entry.noteKey);
    if (!registryKey) {
      continue;
    }
    expectedKeys.add(registryKey);
    upsertRegistryEntry({
      libraryID: entry.libraryID,
      topItemKey: entry.topItemKey,
      noteKey: entry.noteKey,
      currentPath: formatPath(entry.resolvedPath),
      scopeRoot: formatPath(entry.scopeRoot),
      pathMode: entry.pathMode,
      lastResolvedAt: Number(entry.lastResolvedAt || Date.now()),
      lastSeenAt: Number(entry.lastSeenAt || Date.now()),
      presenceState: entry.resolvedPath ? "active" : "missing",
    });
  }

  for (const currentEntry of getManagedNoteRegistryEntries()) {
    const registryKey = getManagedNoteRegistryKey(
      currentEntry.libraryID,
      currentEntry.noteKey,
    );
    if (!registryKey || expectedKeys.has(registryKey)) {
      continue;
    }
    removeRegistryEntry({
      libraryID: currentEntry.libraryID,
      noteKey: currentEntry.noteKey,
    });
  }
}

function getManagedPathRegistryEntry(
  noteItemOrIdentity:
    | Zotero.Item
    | {
        libraryID: number;
        noteKey: string;
      },
) {
  const entry = getManagedNoteRegistryEntry(noteItemOrIdentity);
  return entry ? toManagedPathRegistryEntry(entry) : null;
}

function setManagedPathRegistryEntry(entry: ManagedPathRegistryEntry | null) {
  if (!entry?.libraryID || !entry?.noteKey) {
    return;
  }
  upsertRegistryEntry({
    libraryID: entry.libraryID,
    topItemKey: String(entry.topItemKey || ""),
    noteKey: String(entry.noteKey || ""),
    currentPath: formatPath(entry.resolvedPath),
    scopeRoot: formatPath(entry.scopeRoot),
    pathMode: (entry.pathMode || "preserve-user-path") as ManagedPathMode,
    lastResolvedAt: Number(entry.lastResolvedAt || Date.now()),
    lastSeenAt: Number(entry.lastSeenAt || Date.now()),
    presenceState: entry.resolvedPath ? "active" : "missing",
  });
}

function rememberManagedPathRegistryEntry(
  noteItem: Zotero.Item,
  targetPath: string,
  options: {
    topItemKey?: string;
    scopeRoot?: string;
    pathMode?: ManagedPathMode;
    lastResolvedAt?: number;
    lastSeenAt?: number;
  } = {},
) {
  if (!noteItem?.isNote()) {
    return;
  }
  upsertRegistryEntry({
    libraryID: noteItem.libraryID,
    topItemKey: String(
      options.topItemKey ||
        noteItem.parentItem?.key ||
        (noteItem.parentID ? Zotero.Items.get(noteItem.parentID)?.key : "") ||
        "",
    ),
    noteKey: noteItem.key,
    currentPath: formatPath(targetPath),
    scopeRoot: formatPath(options.scopeRoot || ""),
    pathMode: (options.pathMode || "preserve-user-path") as ManagedPathMode,
    lastResolvedAt: Number(options.lastResolvedAt || Date.now()),
    lastSeenAt: Number(options.lastSeenAt || Date.now()),
    presenceState: targetPath ? "active" : "missing",
  });
}

function deleteManagedPathRegistryEntry(
  noteItemOrIdentity:
    | Zotero.Item
    | {
        libraryID: number;
        noteKey: string;
      },
) {
  removeRegistryEntry(
    "isNote" in noteItemOrIdentity
      ? {
          libraryID: noteItemOrIdentity.libraryID,
          noteKey: noteItemOrIdentity.key || "",
        }
      : noteItemOrIdentity,
  );
}

function resetManagedPathRegistryState() {
  // Registry owns lifecycle now. Keep this as a no-op compatibility shim.
}

export {
  initManagedPathRegistry,
  getManagedNoteRegistryKey as getManagedPathRegistryKey,
  getManagedPathRegistry,
  getManagedPathRegistryEntry,
  setManagedPathRegistryEntry,
  rememberManagedPathRegistryEntry,
  deleteManagedPathRegistryEntry,
  resetManagedPathRegistryState,
  setManagedPathRegistry,
};
