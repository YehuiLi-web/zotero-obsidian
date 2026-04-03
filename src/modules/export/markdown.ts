import { showHintWithLink } from "../../utils/hint";
import { getPref } from "../../utils/prefs";
import { fileExists, formatPath, jointPath } from "../../utils/str";
import { rememberWatchedFileState } from "../sync/watcher";
import { normalizeFrontmatterObject } from "../obsidian/frontmatter";
import {
  rememberManagedResolvedPath,
  resolveManagedSyncTargetPath,
} from "../obsidian/pathResolver";
import {
  GENERATED_BLOCK_START,
  USER_BLOCK_START,
} from "../obsidian/markdown";
import { cleanInline } from "../obsidian/shared";

function getManagedObsidianUpdateStrategy() {
  const value = String(getPref("obsidian.updateStrategy") || "").trim();
  if (value === "overwrite" || value === "skip") {
    return value;
  }
  return "managed";
}

async function shouldUseManagedObsidianExport(
  noteItem: Zotero.Item,
  targetPath: string,
) {
  if (addon.api.obsidian.isManagedNote(noteItem)) {
    return true;
  }
  if (!noteItem?.isNote() || !noteItem.parentID || !(await fileExists(targetPath))) {
    return false;
  }
  const topItem =
    noteItem.parentItem?.isRegularItem()
      ? noteItem.parentItem
      : Zotero.Items.get(noteItem.parentID);
  if (!topItem?.isRegularItem()) {
    return false;
  }
  const mdStatus = await addon.api.sync.getMDStatus(targetPath);
  const normalizedMeta = normalizeFrontmatterObject(mdStatus.meta);
  const topItemKey = cleanInline(String(normalizedMeta.zotero_key || ""));
  if (
    normalizedMeta.bridge_managed &&
    (!topItemKey || topItemKey === topItem.key)
  ) {
    return true;
  }
  return (
    mdStatus.content.includes(GENERATED_BLOCK_START) &&
    mdStatus.content.includes(USER_BLOCK_START)
  );
}

async function maybeRenameManagedSyncFile(
  noteItem: Zotero.Item,
  saveDir: string,
  nextFilename: string,
) {
  if (!addon.api.obsidian.isManagedNote(noteItem)) {
    return nextFilename;
  }
  const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
  const currentFilename = syncStatus.filename || "";
  if (
    !currentFilename ||
    currentFilename === nextFilename ||
    syncStatus.path !== saveDir
  ) {
    return nextFilename;
  }
  const currentPath = jointPath(syncStatus.path, currentFilename);
  const nextPath = jointPath(saveDir, nextFilename);
  if (!(await fileExists(currentPath)) || (await fileExists(nextPath))) {
    return nextFilename;
  }
  await Zotero.File.rename(currentPath, nextFilename, {
    overwrite: false,
    unique: false,
  });
  return nextFilename;
}

export async function saveMD(
  filename: string,
  noteId: number,
  options: {
    keepNoteLink?: boolean;
    withYAMLHeader?: boolean;
    attachmentDir?: string;
    attachmentFolder?: string;
    recordHistory?: boolean;
    historyReason?: string;
  } = {},
) {
  const noteItem = Zotero.Items.get(noteId);
  const dir = jointPath(...PathUtils.split(formatPath(filename)).slice(0, -1));
  await Zotero.File.createDirectoryIfMissingAsync(dir);
  const attachmentDir =
    options.attachmentDir ||
    jointPath(dir, getPref("syncAttachmentFolder") as string);
  const attachmentFolder =
    options.attachmentFolder || (getPref("syncAttachmentFolder") as string);
  const hasImage = noteItem.getNote().includes("<img");
  if (hasImage) {
    await Zotero.File.createDirectoryIfMissingAsync(attachmentDir);
  }
  const useManagedExport = await shouldUseManagedObsidianExport(
    noteItem,
    filename,
  );
  const skipManagedExistingFile =
    useManagedExport &&
    getManagedObsidianUpdateStrategy() === "skip" &&
    (await fileExists(filename));
  if (skipManagedExistingFile) {
    showHintWithLink(`Note kept unchanged: ${filename}`, "Show in Folder", () => {
      Zotero.File.reveal(filename);
    });
    return;
  }
  const previousContent = (await fileExists(filename))
    ? (((await Zotero.File.getContentsAsync(filename, "utf-8")) as string) || "")
    : "";
  const managedContent = useManagedExport
    ? await addon.api.obsidian.renderMarkdown(noteItem, {
        noteDir: dir,
        attachmentDir,
        attachmentFolder,
        targetPath: filename,
      })
    : "";
  const content =
    managedContent ||
    (await addon.api.convert.note2md(noteItem, dir, {
      ...options,
      attachmentDir,
      attachmentFolder,
    }));
  const managedSourceHash = useManagedExport
    ? await addon.api.obsidian.getManagedSourceHash(noteItem)
    : "";
  await Zotero.File.putContentsAsync(filename, content);
  const fileStat = await IOUtils.stat(filename);
  const exportedMDStatus = addon.api.sync.getMDStatusFromContent(content);
  addon.api.sync.updateSyncStatus(noteItem.id, {
    path: dir,
    filename: PathUtils.split(filename).pop() || "",
    itemID: noteItem.id,
    md5: Zotero.Utilities.Internal.md5(
      exportedMDStatus.content,
      false,
    ),
    noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
    frontmatterMd5: exportedMDStatus.meta
      ? Zotero.Utilities.Internal.md5(
          JSON.stringify(exportedMDStatus.meta),
          false,
        )
      : "",
    managedSourceHash,
    fileLastModified: Number(fileStat.lastModified || Date.now()),
    lastsync: new Date().getTime(),
  });
  if (useManagedExport) {
    await rememberManagedResolvedPath(noteItem, filename, {
      refreshSyncStatus: true,
    });
  }
  rememberWatchedFileState(noteItem.id, Number(fileStat.lastModified || Date.now()));
  if (options.recordHistory !== false) {
    addon.api.sync.recordMarkdownHistory(noteItem, filename, {
      beforeContent: previousContent,
      afterContent: content,
      reason: options.historyReason || "manual-export",
      action: "export",
    });
  }

  showHintWithLink(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filename);
  });
}

export async function syncMDBatch(
  saveDir: string,
  noteIds: number[],
  metaList?: Record<string, any>[],
  options: {
    attachmentDir?: string;
    attachmentFolder?: string;
    recordHistory?: boolean;
    historyReason?: string;
    historyAction?: SyncHistoryEntry["action"];
    targetFiles?: string[];
  } = {},
) {
  const noteItems = Zotero.Items.get(noteIds);
  const normalizedSaveDir = formatPath(saveDir);
  const ensuredDirs = new Set<string>();
  const ensureDir = async (dir: string) => {
    const normalized = formatPath(dir);
    if (!normalized || ensuredDirs.has(normalized)) {
      return;
    }
    ensuredDirs.add(normalized);
    await Zotero.File.createDirectoryIfMissingAsync(normalized);
  };
  await ensureDir(normalizedSaveDir);
  const attachmentDir =
    options.attachmentDir ||
    jointPath(normalizedSaveDir, getPref("syncAttachmentFolder") as string);
  const attachmentFolder =
    options.attachmentFolder || (getPref("syncAttachmentFolder") as string);
  const configuredNotesDir = String(getPref("obsidian.notesDir") || "").trim();
  const configuredVaultRoot = String(getPref("obsidian.vaultRoot") || "").trim();
  const hasImage = noteItems.some((noteItem) =>
    noteItem.getNote().includes("<img"),
  );
  if (hasImage && attachmentDir) {
    await ensureDir(attachmentDir);
  }
  let i = 0;
  const updateStrategy = getManagedObsidianUpdateStrategy();
  for (const noteItem of noteItems) {
    const explicitTargetRaw = options.targetFiles?.[i];
    const explicitTargetPath = formatPath(explicitTargetRaw || "");
    let filePath: string;
    let filename: string;
    let targetDir = normalizedSaveDir;
    const isManagedNote = addon.api.obsidian.isManagedNote(noteItem);
    let managedResolverSettings:
      | {
          notesDir: string;
          vaultRoot: string;
        }
      | undefined;
    let managedResolution:
      | Awaited<ReturnType<typeof resolveManagedSyncTargetPath>>
      | undefined;
    if (explicitTargetPath) {
      filePath = explicitTargetPath;
      filename = PathUtils.filename(filePath);
      const explicitDir = formatPath(PathUtils.parent(filePath) || "");
      targetDir = explicitDir || normalizedSaveDir;
      await ensureDir(targetDir);
    } else if (isManagedNote) {
      managedResolverSettings = {
        notesDir: normalizedSaveDir || configuredNotesDir,
        vaultRoot: configuredVaultRoot,
      };
      managedResolution = await resolveManagedSyncTargetPath(
        noteItem,
        managedResolverSettings,
      );
      filePath = formatPath(managedResolution.path || "");
      filename = PathUtils.filename(filePath);
      targetDir = formatPath(PathUtils.parent(filePath) || normalizedSaveDir);
      if (targetDir) {
        await ensureDir(targetDir);
      }
    } else {
      let derivedName = await addon.api.sync.getMDFileName(
        noteItem.id,
        normalizedSaveDir,
      );
      derivedName = await maybeRenameManagedSyncFile(
        noteItem,
        normalizedSaveDir,
        derivedName,
      );
      filename = derivedName;
      targetDir = normalizedSaveDir;
      await ensureDir(targetDir);
      filePath = jointPath(targetDir, filename);
    }
    if (!filePath) {
      i += 1;
      continue;
    }
    const useManagedExport =
      isManagedNote ||
      (await shouldUseManagedObsidianExport(noteItem, filePath));
    if (
      useManagedExport &&
      updateStrategy === "skip" &&
      (await fileExists(filePath))
    ) {
      i += 1;
      continue;
    }
    const previousContent = (await fileExists(filePath))
      ? (((await Zotero.File.getContentsAsync(filePath, "utf-8")) as string) || "")
      : "";
    const managedContent = useManagedExport
      ? await addon.api.obsidian.renderMarkdown(noteItem, {
          noteDir: targetDir,
          attachmentDir,
          attachmentFolder,
          targetPath: filePath,
          cachedYAMLHeader: metaList?.[i],
        })
      : "";
    const content =
      managedContent ||
      (await addon.api.convert.note2md(noteItem, targetDir, {
        keepNoteLink: false,
        withYAMLHeader: true,
        cachedYAMLHeader: metaList?.[i],
        attachmentDir,
        attachmentFolder,
      }));
    const managedSourceHash = useManagedExport
      ? await addon.api.obsidian.getManagedSourceHash(noteItem)
      : "";
    await Zotero.File.putContentsAsync(filePath, content);
    const fileStat = await IOUtils.stat(filePath);
    const batchMDStatus = addon.api.sync.getMDStatusFromContent(content);
    addon.api.sync.updateSyncStatus(noteItem.id, {
      path: targetDir,
      filename,
      itemID: noteItem.id,
      md5: Zotero.Utilities.Internal.md5(
        batchMDStatus.content,
        false,
      ),
      noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
      frontmatterMd5: batchMDStatus.meta
        ? Zotero.Utilities.Internal.md5(
            JSON.stringify(batchMDStatus.meta),
            false,
          )
        : "",
      managedSourceHash,
      fileLastModified: Number(fileStat.lastModified || Date.now()),
      lastsync: new Date().getTime(),
    });
    if (useManagedExport) {
      await rememberManagedResolvedPath(noteItem, filePath, {
        settings: managedResolverSettings,
        pathMode: managedResolution?.pathMode,
        refreshSyncStatus: true,
      });
    }
    rememberWatchedFileState(noteItem.id, Number(fileStat.lastModified || Date.now()));
    if (options.recordHistory !== false) {
      addon.api.sync.recordMarkdownHistory(noteItem, filePath, {
        beforeContent: previousContent,
        afterContent: content,
        reason: options.historyReason || "sync-batch",
        action: options.historyAction || "export",
      });
    }
    i += 1;
  }
}
