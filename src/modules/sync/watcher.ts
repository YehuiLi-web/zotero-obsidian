import { getPref } from "../../utils/prefs";
import { formatPath, jointPath } from "../../utils/str";

const WATCH_SCAN_INTERVAL_MS = 2000;
const WATCH_DEBOUNCE_MS = 1200;

export {
  startSyncFileWatcher,
  stopSyncFileWatcher,
  rememberWatchedFileState,
};

function isWatcherEnabled() {
  return Boolean(getPref("obsidian.autoSync")) && Boolean(getPref("obsidian.watchFiles"));
}

function rememberWatchedFileState(noteId: number, lastModified = Date.now()) {
  addon.data.sync.watcher.knownModifiedTimes[noteId] = Math.max(
    Number(lastModified || 0),
    0,
  );
  delete addon.data.sync.watcher.pendingChanges[noteId];
  addon.data.sync.watcher.processing = addon.data.sync.watcher.processing.filter(
    (processingNoteId) => processingNoteId !== noteId,
  );
}

function startSyncFileWatcher() {
  if (addon.data.sync.watcher.timer) {
    return;
  }
  addon.data.sync.watcher.timer = ztoolkit.getGlobal("setInterval")(() => {
    void scanWatchedFiles();
  }, WATCH_SCAN_INTERVAL_MS);
}

function stopSyncFileWatcher() {
  if (addon.data.sync.watcher.timer) {
    ztoolkit.getGlobal("clearInterval")(addon.data.sync.watcher.timer);
  }
  addon.data.sync.watcher.timer = undefined;
  addon.data.sync.watcher.knownModifiedTimes = {};
  addon.data.sync.watcher.pendingChanges = {};
  addon.data.sync.watcher.processing = [];
}

function pruneWatcherState(activeNoteIds: number[]) {
  const activeSet = new Set(activeNoteIds);
  for (const noteIdText of Object.keys(addon.data.sync.watcher.knownModifiedTimes)) {
    const noteId = Number(noteIdText);
    if (!activeSet.has(noteId)) {
      delete addon.data.sync.watcher.knownModifiedTimes[noteId];
    }
  }
  for (const noteIdText of Object.keys(addon.data.sync.watcher.pendingChanges)) {
    const noteId = Number(noteIdText);
    if (!activeSet.has(noteId)) {
      delete addon.data.sync.watcher.pendingChanges[noteId];
    }
  }
  addon.data.sync.watcher.processing = addon.data.sync.watcher.processing.filter(
    (noteId) => activeSet.has(noteId),
  );
}

async function scanWatchedFiles() {
  if (!addon.data.alive) {
    stopSyncFileWatcher();
    return;
  }
  if (!isWatcherEnabled() || addon.data.sync.lock) {
    return;
  }

  const noteIds = await addon.api.sync.getSyncNoteIds();
  pruneWatcherState(noteIds);
  const now = Date.now();

  for (const noteId of noteIds) {
    const syncStatus = addon.api.sync.getSyncStatus(noteId);
    if (!syncStatus.path || !syncStatus.filename) {
      continue;
    }
    const filePath = formatPath(jointPath(syncStatus.path, syncStatus.filename));
    try {
      const stat = await IOUtils.stat(filePath);
      const currentModified = Number(stat.lastModified || 0);
      const knownModified = Math.max(
        Number(syncStatus.fileLastModified || 0),
        Number(addon.data.sync.watcher.knownModifiedTimes[noteId] || 0),
      );
      if (!knownModified) {
        addon.data.sync.watcher.knownModifiedTimes[noteId] = currentModified;
        continue;
      }
      if (currentModified <= knownModified + 5) {
        continue;
      }
      if (!addon.data.sync.watcher.pendingChanges[noteId]) {
        addon.data.sync.watcher.pendingChanges[noteId] = now;
      }
      addon.data.sync.watcher.knownModifiedTimes[noteId] = currentModified;
    } catch (error) {
      continue;
    }
  }

  const pendingNoteIds = Object.entries(addon.data.sync.watcher.pendingChanges)
    .filter(([noteIdText, queuedAt]) => {
      const noteId = Number(noteIdText);
      return (
        now - Number(queuedAt) >= WATCH_DEBOUNCE_MS &&
        !addon.data.sync.watcher.processing.includes(noteId)
      );
    })
    .map(([noteIdText]) => Number(noteIdText))
    .filter(Boolean);

  if (!pendingNoteIds.length) {
    return;
  }

  const noteItems = Zotero.Items.get(pendingNoteIds).filter((item): item is Zotero.Item =>
    Boolean(item?.isNote && item.isNote()),
  );
  if (!noteItems.length) {
    pendingNoteIds.forEach((noteId) => {
      delete addon.data.sync.watcher.pendingChanges[noteId];
    });
    return;
  }

  addon.data.sync.watcher.processing.push(...pendingNoteIds);
  pendingNoteIds.forEach((noteId) => {
    delete addon.data.sync.watcher.pendingChanges[noteId];
  });

  try {
    await addon.hooks.onSyncing(noteItems, {
      quiet: true,
      skipActive: false,
      reason: "file-watch",
    });
  } finally {
    addon.data.sync.watcher.processing = addon.data.sync.watcher.processing.filter(
      (noteId) => !pendingNoteIds.includes(noteId),
    );
  }
}
