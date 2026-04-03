import { config } from "../../../package.json";
import { getLinkedNotesRecursively, getNoteLink } from "../../utils/link";
import { getString } from "../../utils/locale";
import { jointPath } from "../../utils/str";
import { isWindowAlive } from "../../utils/window";

export interface SyncDataType {
  noteId: number;
  noteName: string;
  lastSync: string;
  filePath: string;
  presence: string;
}

export interface SyncHistoryDataType {
  id: string;
  timestamp: string;
  action: string;
  reason: string;
  filePath: string;
  preview: string;
  entry: SyncHistoryEntry;
}

function managerText(zh: string, en: string) {
  return String(Zotero.locale || "").toLowerCase().startsWith("zh") ? zh : en;
}

function getPresenceLabel(
  noteItem: Zotero.Item,
  presenceState: string,
) {
  if (!addon.api.obsidian.isManagedNote(noteItem)) {
    return managerText("普通", "Regular");
  }
  switch (presenceState) {
    case "tombstoned":
      return managerText("墓碑", "Tombstoned");
    case "missing":
      return managerText("缺失", "Missing");
    default:
      return managerText("活跃", "Active");
  }
}

export async function showSyncManager() {
  if (isWindowAlive(addon.data.sync.manager.window)) {
    addon.data.sync.manager.window?.focus();
    await refresh();
    return;
  }

  const windowArgs = {
    _initPromise: Zotero.Promise.defer(),
  };
  const win = Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/syncManager.xhtml`,
    `${config.addonRef}-syncManager`,
    `chrome,centerscreen,resizable,status,dialog=no`,
    windowArgs,
  )!;
  await windowArgs._initPromise.promise;
  addon.data.sync.manager.window = win;

  await updateData();
  await updateHistoryData();

  addon.data.sync.manager.tableHelper = new ztoolkit.VirtualizedTable(win!)
    .setContainerId("table-container")
    .setProp({
      id: "manager-table",
      columns: [
        {
          dataKey: "noteName",
          label: getString("syncManager-noteName"),
          fixedWidth: false,
        },
        {
          dataKey: "lastSync",
          label: getString("syncManager-lastSync"),
          fixedWidth: false,
        },
        {
          dataKey: "filePath",
          label: getString("syncManager-filePath"),
          fixedWidth: false,
        },
        {
          dataKey: "presence",
          label: managerText("状态", "Status"),
          fixedWidth: false,
        },
      ],
      showHeader: true,
      multiSelect: true,
      staticColumns: false,
      disableFontSizeScaling: true,
    })
    .setProp("getRowCount", () => addon.data.sync.manager.data.length)
    .setProp("getRowData", (index) => {
      const row = addon.data.sync.manager.data[index];
      return {
        noteName: row?.noteName || "no data",
        lastSync: row?.lastSync || "no data",
        filePath: row?.filePath || "no data",
        presence: row?.presence || "no data",
      };
    })
    .setProp("onSelectionChange", () => {
      updateButtons();
      void refreshHistory();
    })
    .setProp("onKeyDown", (event: KeyboardEvent) => {
      if (event.key == "Delete" || (Zotero.isMac && event.key == "Backspace")) {
        void unSyncNotes(getSelectedNoteIds());
        return false;
      }
      return true;
    })
    .setProp("onActivate", () => {
      const noteIds = getSelectedNoteIds();
      noteIds.forEach((noteId) => addon.hooks.onOpenNote(noteId, "builtin"));
      return true;
    })
    .setProp(
      "getRowString",
      (index) => addon.data.sync.manager?.data[index].noteName || "",
    )
    .setProp("onColumnSort", async (columnIndex, ascending) => {
      addon.data.sync.manager.columnIndex = columnIndex;
      addon.data.sync.manager.columnAscending = ascending > 0;
      await refresh();
    })
    .render();

  addon.data.sync.manager.historyTableHelper = new ztoolkit.VirtualizedTable(win!)
    .setContainerId("history-table-container")
    .setProp({
      id: "manager-history-table",
      columns: [
        {
          dataKey: "timestamp",
          label: managerText("时间", "Time"),
          fixedWidth: false,
        },
        {
          dataKey: "action",
          label: managerText("动作", "Action"),
          fixedWidth: false,
        },
        {
          dataKey: "reason",
          label: managerText("来源", "Reason"),
          fixedWidth: false,
        },
      ],
      showHeader: true,
      multiSelect: false,
      staticColumns: false,
      disableFontSizeScaling: true,
    })
    .setProp("getRowCount", () => addon.data.sync.manager.historyData.length)
    .setProp("getRowData", (index) => {
      const row = addon.data.sync.manager.historyData[index];
      return {
        timestamp: row?.timestamp || "no data",
        action: row?.action || "no data",
        reason: row?.reason || "no data",
      };
    })
    .setProp("onSelectionChange", () => {
      updateHistoryPreview();
    })
    .setProp("onActivate", () => {
      const entry = getSelectedHistoryEntry() || addon.data.sync.manager.historyData[0];
      if (entry?.entry?.noteId) {
        addon.hooks.onOpenNote(entry.entry.noteId, "builtin");
      }
      return true;
    })
    .setProp(
      "getRowString",
      (index) => addon.data.sync.manager?.historyData[index].preview || "",
    )
    .render();

  const refreshButton = win.document.querySelector("#refresh") as HTMLButtonElement;
  const syncButton = win.document.querySelector("#sync") as HTMLButtonElement;
  const unSyncButton = win.document.querySelector("#unSync") as HTMLButtonElement;
  const detectButton = win.document.querySelector("#detect") as HTMLButtonElement;
  const clearHistoryButton = win.document.querySelector(
    "#clearHistory",
  ) as HTMLButtonElement;
  const restoreButton = win.document.querySelector(
    "#restoreManaged",
  ) as HTMLButtonElement;
  const rebindButton = win.document.querySelector(
    "#rebindManaged",
  ) as HTMLButtonElement;
  const unlinkButton = win.document.querySelector(
    "#unlinkManaged",
  ) as HTMLButtonElement;

  restoreButton.textContent = managerText("恢复", "Restore");
  rebindButton.textContent = managerText("重绑", "Rebind");
  unlinkButton.textContent = managerText("解绑", "Unlink");

  refreshButton.addEventListener("click", () => {
    void refresh();
  });
  syncButton.addEventListener("click", async () => {
    await addon.hooks.onSyncing(Zotero.Items.get(getSelectedNoteIds()), {
      quiet: false,
      skipActive: false,
      reason: "manual-manager",
    });
    await refresh();
  });
  unSyncButton.addEventListener("click", () => {
    void unSyncNotes(getSelectedNoteIds());
  });
  detectButton.addEventListener("click", () => {
    void detectSyncedNotes();
  });
  clearHistoryButton.addEventListener("click", () => {
    void clearHistoryForSelection();
  });
  restoreButton.addEventListener("click", async () => {
    await addon.api.obsidian.restoreManagedNotes(
      Zotero.Items.get(getSelectedNoteIds()),
    );
    await refresh();
  });
  rebindButton.addEventListener("click", async () => {
    await addon.api.obsidian.rebindManagedNotes(
      Zotero.Items.get(getSelectedNoteIds()),
    );
    await refresh();
  });
  unlinkButton.addEventListener("click", async () => {
    await addon.api.obsidian.unlinkManagedNotes(
      Zotero.Items.get(getSelectedNoteIds()),
    );
    await refresh();
  });

  updateHistoryPreview();
  updateButtons();
}

const sortDataKeys = ["noteName", "lastSync", "filePath", "presence"] as Array<
  keyof SyncDataType
>;

async function updateData() {
  const sortKey = sortDataKeys[addon.data.sync.manager.columnIndex];
  addon.data.sync.manager.data = (await addon.api.sync.getSyncNoteIds())
    .map((noteId) => {
      const syncStatus = addon.api.sync.getSyncStatus(noteId);
      const noteItem = Zotero.Items.get(noteId);
      return {
        noteId,
        noteName: noteItem.getNoteTitle(),
        lastSync: new Date(syncStatus.lastsync).toLocaleString(),
        filePath: jointPath(syncStatus.path, syncStatus.filename),
        presence: getPresenceLabel(
          noteItem,
          addon.api.obsidian.getManagedPresenceState(noteItem),
        ),
      };
    })
    .sort((a, b) => {
      const valueA = String(a?.[sortKey] || "");
      const valueB = String(b?.[sortKey] || "");
      return addon.data.sync.manager.columnAscending
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    });
}

async function updateHistoryData(noteIds: number[] = getSelectedNoteIds()) {
  addon.data.sync.manager.historyData = addon.api.sync
    .getHistory(noteIds, 100)
    .map((entry: SyncHistoryEntry) => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp).toLocaleString(),
      action: addon.api.sync.getHistoryActionLabel(entry),
      reason: entry.reason || "unknown",
      filePath: entry.filePath,
      preview: addon.api.sync.formatHistoryPreview(entry),
      entry,
    }));
}

async function updateTable() {
  return new Promise<void>((resolve) => {
    addon.data.sync.manager.tableHelper?.render(undefined, () => {
      resolve();
    });
  });
}

async function updateHistoryTable() {
  return new Promise<void>((resolve) => {
    addon.data.sync.manager.historyTableHelper?.render(undefined, () => {
      resolve();
    });
  });
}

function updateButtons() {
  const win = addon.data.sync.manager.window;
  if (!win) {
    return;
  }
  const unSyncButton = win.document.querySelector("#unSync") as HTMLButtonElement;
  const clearHistoryButton = win.document.querySelector(
    "#clearHistory",
  ) as HTMLButtonElement;
  const restoreButton = win.document.querySelector(
    "#restoreManaged",
  ) as HTMLButtonElement;
  const rebindButton = win.document.querySelector(
    "#rebindManaged",
  ) as HTMLButtonElement;
  const unlinkButton = win.document.querySelector(
    "#unlinkManaged",
  ) as HTMLButtonElement;
  const hasSelection = Boolean(getSelectedNoteIds().length);
  unSyncButton.disabled = !getSelectedNoteIds().length;
  clearHistoryButton.disabled = !addon.data.sync.manager.historyData.length;
  restoreButton.disabled = !hasSelection;
  rebindButton.disabled = !hasSelection;
  unlinkButton.disabled = !hasSelection;
}

function updateHistoryPreview() {
  const preview = addon.data.sync.manager.window?.document.querySelector(
    "#history-preview",
  ) as HTMLPreElement | null;
  if (!preview) {
    return;
  }
  const entry = getSelectedHistoryEntry() || addon.data.sync.manager.historyData[0];
  preview.textContent =
    entry?.preview ||
    managerText(
      "选择一条同步记录即可查看本次同步的 diff。",
      "Select a history record to inspect the diff.",
    );
}

async function refresh() {
  await updateData();
  await updateTable();
  await refreshHistory();
  updateButtons();
}

async function refreshHistory() {
  await updateHistoryData();
  await updateHistoryTable();
  updateHistoryPreview();
  updateButtons();
}

function getSelectedNoteIds() {
  const ids: number[] = [];
  for (const idx of addon.data.sync.manager.tableHelper?.treeInstance.selection.selected?.keys() ||
    []) {
    ids.push(addon.data.sync.manager.data[idx].noteId);
  }
  return ids;
}

function getSelectedHistoryEntry() {
  const selected = addon.data.sync.manager.historyTableHelper?.treeInstance.selection
    .selected;
  const firstSelected = selected ? Array.from(selected.keys())[0] : undefined;
  return typeof firstSelected === "number"
    ? addon.data.sync.manager.historyData[firstSelected]
    : undefined;
}

async function clearHistoryForSelection() {
  const noteIds = getSelectedNoteIds();
  const confirmed = addon.data.sync.manager.window?.confirm(
    noteIds.length
      ? managerText("清除所选笔记的同步历史？", "Clear sync history for the selected notes?")
      : managerText(
          "当前没有选中笔记。要清除全部同步历史吗？",
          "No notes are selected. Clear all sync history?",
        ),
  );
  if (!confirmed) {
    return;
  }
  addon.api.sync.clearHistory(noteIds);
  await refreshHistory();
}

async function unSyncNotes(itemIds: number[]) {
  if (itemIds.length === 0) {
    return;
  }
  const unSyncLinkedNotes = addon.data.sync.manager.window?.confirm(
    `Un-sync their linked notes?`,
  );
  if (unSyncLinkedNotes) {
    for (const item of Zotero.Items.get(itemIds)) {
      const linkedIds: number[] = getLinkedNotesRecursively(
        getNoteLink(item) || "",
        itemIds,
      );
      itemIds.push(...linkedIds);
    }
  }
  for (const itemId of itemIds) {
    await addon.api.sync.removeSyncNote(itemId);
  }
  await refresh();
}

async function detectSyncedNotes() {
  const dir = await new addon.data.ztoolkit.FilePicker(
    "Select folder to detect",
    "folder",
  ).open();
  if (!dir) return;

  const statusList = await addon.api.sync.findAllSyncedFiles(dir);
  let current = 0;
  for (const status of statusList) {
    if (addon.api.sync.isSyncNote(status.itemID)) {
      current++;
    }
  }
  const total = statusList.length;
  const newCount = total - current;
  if (
    !addon.data.sync.manager.window?.confirm(
      getString("syncManager-detectConfirmInfo", {
        args: {
          total,
          new: newCount,
          current,
          dir,
        },
      }),
    )
  ) {
    return;
  }
  for (const status of statusList) {
    addon.api.sync.updateSyncStatus(status.itemID, status);
  }
  await addon.hooks.onSyncing();
  await refresh();
}
