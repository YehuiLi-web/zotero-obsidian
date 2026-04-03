import { safeLog } from "../../utils/log";
import { getPref } from "../../utils/prefs";
import { fileExists, formatPath, jointPath } from "../../utils/str";
import {
  chooseManagedFrontmatterMatch,
  getManagedFrontmatterMatchRank,
  readManagedFrontmatterIdentity,
  scanManagedMarkdownScope,
  type ManagedFrontmatterFileMatch,
} from "./frontmatterScanner";
import {
  findFrontmatterCandidates,
  refreshFrontmatterIndexEntry,
} from "./frontmatterIndex";
import {
  getManagedNoteRegistryEntry,
  markEntryMissing,
  markEntryTombstoned,
  upsertRegistryEntry,
} from "./registry";
import {
  getManagedObsidianFileName,
  getManagedObsidianFileNameFresh,
} from "./managed";
import { getCitationKeyForItem } from "./paths";
import type {
  ManagedPathMode,
  ManagedPathResolution,
  ObsidianSettings,
  RegistryPresenceState,
} from "./types";

type ResolveManagedPathOptions = {
  settings?: Partial<ObsidianSettings> | null;
  includeTemplateFallback?: boolean;
  refreshSyncStatus?: boolean;
};

function isSameComparablePath(left: string, right: string) {
  const normalizedLeft = formatPath(left);
  const normalizedRight = formatPath(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  return Zotero.isWin
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function getManagedScopeRoot(settings?: Partial<ObsidianSettings> | null) {
  return formatPath(
    settings?.vaultRoot ||
      String(getPref("obsidian.vaultRoot") || "").trim() ||
      settings?.notesDir ||
      String(getPref("obsidian.notesDir") || "").trim() ||
      "",
  );
}

function getManagedNotesDir(settings?: Partial<ObsidianSettings> | null) {
  return formatPath(
    settings?.notesDir || String(getPref("obsidian.notesDir") || "").trim() || "",
  );
}

async function getExpectedManagedTemplatePath(
  noteItem: Zotero.Item,
  settings?: Partial<ObsidianSettings> | null,
) {
  const notesDir = getManagedNotesDir(settings);
  if (!notesDir) {
    return "";
  }
  const filename =
    (await getManagedObsidianFileNameFresh(noteItem)) ||
    getManagedObsidianFileName(noteItem) ||
    addon.api.sync.getSyncStatus(noteItem.id).filename;
  return filename ? jointPath(notesDir, filename) : "";
}

function getManagedPathModeForPath(
  resolvedPath: string,
  templatePath: string,
  currentMode?: ManagedPathMode | null,
) {
  if (currentMode === "preserve-user-path") {
    return currentMode;
  }
  if (templatePath && isSameComparablePath(resolvedPath, templatePath)) {
    return "template-managed" as ManagedPathMode;
  }
  return "preserve-user-path" as ManagedPathMode;
}

async function updateManagedSyncStatusForPath(
  noteItem: Zotero.Item,
  targetPath: string,
) {
  const normalizedTargetPath = formatPath(targetPath);
  if (!normalizedTargetPath || !(await fileExists(normalizedTargetPath))) {
    return;
  }

  const targetDir = formatPath(PathUtils.parent(normalizedTargetPath) || "");
  const targetFilename = PathUtils.filename(normalizedTargetPath);
  if (!targetDir || !targetFilename) {
    return;
  }

  const currentSyncStatus = addon.api.sync.getSyncStatus(noteItem.id);
  const mdStatus = await addon.api.sync.getMDStatus(normalizedTargetPath);
  const managedSourceHash = addon.api.obsidian.isManagedNote(noteItem)
    ? await addon.api.obsidian.getManagedSourceHash(noteItem)
    : currentSyncStatus.managedSourceHash;

  addon.api.sync.updateSyncStatus(noteItem.id, {
    ...currentSyncStatus,
    path: targetDir,
    filename: targetFilename,
    itemID: noteItem.id,
    md5: mdStatus.content
      ? Zotero.Utilities.Internal.md5(mdStatus.content, false)
      : currentSyncStatus.md5,
    noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
    frontmatterMd5: mdStatus.meta
      ? Zotero.Utilities.Internal.md5(JSON.stringify(mdStatus.meta), false)
      : currentSyncStatus.frontmatterMd5,
    managedSourceHash,
    fileLastModified:
      mdStatus.lastmodify?.getTime?.() || currentSyncStatus.fileLastModified,
  });
}

async function rememberManagedResolvedPath(
  noteItem: Zotero.Item,
  targetPath: string,
  options: {
    settings?: Partial<ObsidianSettings> | null;
    pathMode?: ManagedPathMode;
    refreshSyncStatus?: boolean;
  } = {},
) {
  if (!noteItem?.isNote() || !noteItem.parentItem?.isRegularItem()) {
    return;
  }
  const normalizedTargetPath = formatPath(targetPath);
  if (!normalizedTargetPath) {
    return;
  }

  const templatePath = await getExpectedManagedTemplatePath(
    noteItem,
    options.settings,
  );
  const pathMode =
    options.pathMode ||
    getManagedPathModeForPath(normalizedTargetPath, templatePath);

  upsertRegistryEntry({
    libraryID: noteItem.libraryID,
    topItemKey: noteItem.parentItem.key,
    noteKey: noteItem.key,
    currentPath: normalizedTargetPath,
    scopeRoot: getManagedScopeRoot(options.settings),
    pathMode,
    lastResolvedAt: Date.now(),
    lastSeenAt: Date.now(),
    presenceState: "active",
    lastResolvedSource: "registry",
    lastKnownCitekey: getCitationKeyForItem(noteItem.parentItem),
  });

  if (await fileExists(normalizedTargetPath)) {
    await refreshFrontmatterIndexEntry(normalizedTargetPath);
    if (options.refreshSyncStatus !== false) {
      await updateManagedSyncStatusForPath(noteItem, normalizedTargetPath);
    }
  }
}

async function validateManagedCandidatePath(
  targetPath: string,
  noteItem: Zotero.Item,
) {
  const normalizedTargetPath = formatPath(targetPath);
  if (!normalizedTargetPath || !(await fileExists(normalizedTargetPath))) {
    return null;
  }
  const topItem = noteItem.parentItem;
  if (!topItem?.isRegularItem()) {
    return null;
  }
  const candidate = await readManagedFrontmatterIdentity(normalizedTargetPath);
  if (!candidate) {
    return null;
  }
  const rank = getManagedFrontmatterMatchRank(candidate, {
    libraryID: topItem.libraryID,
    noteKey: noteItem.key,
    zoteroKey: topItem.key,
    citekey: getCitationKeyForItem(topItem),
  });
  return rank >= 2 ? candidate : null;
}

function buildManagedPathResolution(
  path: string,
  source: ManagedPathResolution["source"],
  pathMode: ManagedPathMode,
  scopeRoot: string,
  matchedExistingFile: boolean,
  conflicts: string[] = [],
  presenceState: RegistryPresenceState = matchedExistingFile
    ? "active"
    : "missing",
): ManagedPathResolution {
  return {
    path: formatPath(path),
    source,
    pathMode,
    scopeRoot: formatPath(scopeRoot),
    matchedExistingFile,
    conflicts,
    presenceState,
  };
}

async function resolveManagedCandidateFromMatches(
  noteItem: Zotero.Item,
  matches: ManagedFrontmatterFileMatch[],
  options: ResolveManagedPathOptions,
  source: ManagedPathResolution["source"],
) {
  if (!matches.length) {
    return null;
  }
  const registryEntry = getManagedNoteRegistryEntry(noteItem);
  const preferredPath = registryEntry?.currentPath || "";
  const topItem = noteItem.parentItem;
  if (!topItem?.isRegularItem()) {
    return null;
  }
  const selection = chooseManagedFrontmatterMatch(matches, {
    libraryID: topItem.libraryID,
    noteKey: noteItem.key,
    zoteroKey: topItem.key,
    citekey: getCitationKeyForItem(topItem),
    preferredPath,
  });
  if (!selection.match) {
    return null;
  }
  const templatePath = await getExpectedManagedTemplatePath(
    noteItem,
    options.settings,
  );
  const currentMode =
    registryEntry?.pathMode === "preserve-user-path"
      ? "preserve-user-path"
      : null;
  const pathMode = getManagedPathModeForPath(
    selection.match.path,
    templatePath,
    currentMode,
  );
  await rememberManagedResolvedPath(noteItem, selection.match.path, {
    settings: options.settings,
    pathMode,
    refreshSyncStatus: options.refreshSyncStatus,
  });
  return buildManagedPathResolution(
    selection.match.path,
    source,
    pathMode,
    getManagedScopeRoot(options.settings),
    true,
    selection.conflicts.map((candidate) => candidate.path),
    "active",
  );
}

async function resolveManagedNotePath(
  noteItem: Zotero.Item,
  options: ResolveManagedPathOptions = {},
): Promise<ManagedPathResolution> {
  const scopeRoot = getManagedScopeRoot(options.settings);
  const templatePath = await getExpectedManagedTemplatePath(
    noteItem,
    options.settings,
  );
  const defaultResolution = buildManagedPathResolution(
    "",
    "template-fallback",
    "template-managed",
    scopeRoot,
    false,
    [],
    "missing",
  );
  if (!noteItem?.isNote() || !noteItem.parentItem?.isRegularItem()) {
    return defaultResolution;
  }

  const topItem = noteItem.parentItem;
  const citationKey = getCitationKeyForItem(topItem);
  const registryEntry = getManagedNoteRegistryEntry(noteItem);
  const registryCandidate = registryEntry?.currentPath
    ? await validateManagedCandidatePath(registryEntry.currentPath, noteItem)
    : null;
  if (registryCandidate) {
    const pathMode =
      registryEntry?.pathMode ||
      getManagedPathModeForPath(registryCandidate.path, templatePath);
    await rememberManagedResolvedPath(noteItem, registryCandidate.path, {
      settings: options.settings,
      pathMode,
      refreshSyncStatus: options.refreshSyncStatus,
    });
    return buildManagedPathResolution(
      registryCandidate.path,
      "registry",
      pathMode,
      scopeRoot,
      true,
      [],
      "active",
    );
  }

  if (registryEntry?.currentPath) {
    markEntryMissing(noteItem, {
      currentPath: registryEntry.currentPath,
      scopeRoot,
      pathMode:
        registryEntry.pathMode ||
        getManagedPathModeForPath(registryEntry.currentPath, templatePath),
      lastResolvedSource: "registry",
      lastKnownCitekey: citationKey,
    });
  }

  const expectedCandidate = templatePath
    ? await validateManagedCandidatePath(templatePath, noteItem)
    : null;
  if (expectedCandidate) {
    await rememberManagedResolvedPath(noteItem, expectedCandidate.path, {
      settings: options.settings,
      pathMode: "template-managed",
      refreshSyncStatus: options.refreshSyncStatus,
    });
    return buildManagedPathResolution(
      expectedCandidate.path,
      "template-fallback",
      "template-managed",
      scopeRoot,
      true,
      [],
      "active",
    );
  }

  const frontmatterMatches = (
    await Promise.all(
      (
        await findFrontmatterCandidates({
          libraryID: topItem.libraryID,
          noteKey: noteItem.key,
          zoteroKey: topItem.key,
          citekey: citationKey,
          notesDir: getManagedNotesDir(options.settings),
        })
      ).map(async (entry) => validateManagedCandidatePath(entry.path, noteItem)),
    )
  ).filter((candidate): candidate is ManagedFrontmatterFileMatch =>
    Boolean(candidate),
  );
  const indexedResolution = await resolveManagedCandidateFromMatches(
    noteItem,
    frontmatterMatches,
    options,
    "frontmatter-index",
  );
  if (indexedResolution) {
    return indexedResolution;
  }

  if (scopeRoot && (await fileExists(scopeRoot))) {
    const scannedResolution = await scanManagedMarkdownScope(scopeRoot, {
      libraryID: topItem.libraryID,
      noteKey: noteItem.key,
      zoteroKey: topItem.key,
      citekey: citationKey,
      preferredPath: registryEntry?.currentPath || templatePath || "",
    });
    if (scannedResolution.match) {
      const pathMode = getManagedPathModeForPath(
        scannedResolution.match.path,
        templatePath,
        registryEntry?.pathMode === "preserve-user-path"
          ? "preserve-user-path"
          : null,
      );
      await rememberManagedResolvedPath(noteItem, scannedResolution.match.path, {
        settings: options.settings,
        pathMode,
        refreshSyncStatus: options.refreshSyncStatus,
      });
      return buildManagedPathResolution(
        scannedResolution.match.path,
        "scope-scan",
        pathMode,
        scopeRoot,
        true,
        scannedResolution.conflicts.map((candidate) => candidate.path),
        "active",
      );
    }
  }

  const tombstoneFallbackPath = formatPath(
    registryEntry?.currentPath || templatePath || "",
  );
  const tombstonePathMode =
    registryEntry?.pathMode ||
    getManagedPathModeForPath(tombstoneFallbackPath, templatePath);
  if (registryEntry) {
    markEntryTombstoned(noteItem, {
      currentPath: tombstoneFallbackPath,
      scopeRoot,
      pathMode: tombstonePathMode,
      lastResolvedSource: "template-fallback",
      lastKnownCitekey: citationKey,
    });
  } else {
    upsertRegistryEntry({
      libraryID: topItem.libraryID,
      topItemKey: topItem.key,
      noteKey: noteItem.key,
      currentPath: tombstoneFallbackPath,
      scopeRoot,
      pathMode: tombstonePathMode,
      presenceState: "tombstoned",
      lastResolvedAt: Date.now(),
      lastSeenAt: Date.now(),
      lastResolvedSource: "template-fallback",
      lastKnownCitekey: citationKey,
      conflictPaths: [],
    });
  }

  if (options.includeTemplateFallback && tombstoneFallbackPath) {
    return buildManagedPathResolution(
      tombstoneFallbackPath,
      "template-fallback",
      tombstonePathMode,
      scopeRoot,
      await fileExists(tombstoneFallbackPath),
      [],
      "tombstoned",
    );
  }

  return buildManagedPathResolution(
    "",
    "template-fallback",
    tombstonePathMode,
    scopeRoot,
    false,
    [],
    "tombstoned",
  );
}

async function resolveManagedSyncTargetPath(
  noteItem: Zotero.Item,
  settings?: Partial<ObsidianSettings> | null,
  options: {
    refreshSyncStatus?: boolean;
  } = {},
) {
  const resolution = await resolveManagedNotePath(noteItem, {
    settings,
    includeTemplateFallback: true,
    refreshSyncStatus: options.refreshSyncStatus ?? false,
  });
  if (!resolution.path) {
    return resolution;
  }

  if (resolution.presenceState === "tombstoned") {
    return resolution;
  }

  const templatePath = await getExpectedManagedTemplatePath(noteItem, settings);
  if (
    resolution.pathMode !== "template-managed" ||
    !templatePath ||
    isSameComparablePath(resolution.path, templatePath)
  ) {
    return resolution;
  }

  try {
    if (
      resolution.matchedExistingFile &&
      (await fileExists(resolution.path)) &&
      !(await fileExists(templatePath))
    ) {
      const templateDir = formatPath(PathUtils.parent(templatePath) || "");
      if (templateDir) {
        await Zotero.File.createDirectoryIfMissingAsync(templateDir);
      }
      await IOUtils.move(resolution.path, templatePath);
      await rememberManagedResolvedPath(noteItem, templatePath, {
        settings,
        pathMode: "template-managed",
        refreshSyncStatus: options.refreshSyncStatus ?? false,
      });
      return buildManagedPathResolution(
        templatePath,
        "template-fallback",
        "template-managed",
        resolution.scopeRoot,
        true,
        resolution.conflicts,
      );
    }
  } catch (error) {
    safeLog("[ObsidianBridge] failed to realign managed path", error);
  }

  return buildManagedPathResolution(
    templatePath,
    "template-fallback",
    "template-managed",
    resolution.scopeRoot,
    await fileExists(templatePath),
    resolution.conflicts,
  );
}

export {
  getManagedScopeRoot,
  rememberManagedResolvedPath,
  resolveManagedNotePath,
  resolveManagedSyncTargetPath,
};
