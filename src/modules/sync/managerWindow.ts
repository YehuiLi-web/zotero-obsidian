import { config } from "../../../package.json";
import { getLinkedNotesRecursively, getNoteLink } from "../../utils/link";
import { getString } from "../../utils/locale";
import { jointPath } from "../../utils/str";
import { isWindowAlive } from "../../utils/window";
import { buildDiffPreviewModel, formatDiffPreviewSummary } from "./diffPreview";
import { getSyncComparisonCode, SyncCode } from "./status";

type SyncFilterMode =
  | "all"
  | "changed"
  | "push"
  | "pull"
  | "conflict"
  | "missing"
  | "clean";

type SyncStateId =
  | "clean"
  | "push"
  | "pull"
  | "conflict"
  | "missing"
  | "tombstoned";

type SyncStateDefinition = {
  id: SyncStateId;
  label: string;
  shortLabel: string;
  description: string;
  suggestedAction: string;
  order: number;
  changed: boolean;
};

export interface SyncDataType {
  noteId: number;
  noteName: string;
  lastSync: string;
  lastSyncTs: number;
  filePath: string;
  presence: string;
  syncState: string;
  syncStateId: SyncStateId;
  syncStateShort: string;
  syncStateDescription: string;
  suggestedAction: string;
  syncStateOrder: number;
  changed: boolean;
  searchableText: string;
}

export interface SyncHistoryDataType {
  id: string;
  timestamp: string;
  action: string;
  changes: string;
  reason: string;
  filePath: string;
  preview: string;
  entry: SyncHistoryEntry;
}

function managerText(zh: string, en: string) {
  return String(Zotero.locale || "")
    .toLowerCase()
    .startsWith("zh")
    ? zh
    : en;
}

function getPresenceLabel(noteItem: Zotero.Item, presenceState: string) {
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

function getSyncStateDefinition(options: {
  isManagedNote: boolean;
  presenceState: string;
  comparisonCode: SyncCode;
  syncStatus: SyncStatus;
  mdStatus: MDStatus;
}): SyncStateDefinition {
  const { isManagedNote, presenceState, comparisonCode, syncStatus, mdStatus } =
    options;
  const hasTrackedFile = Boolean(syncStatus.path && syncStatus.filename);
  const missingTrackedFile = hasTrackedFile && !mdStatus.meta;

  if (isManagedNote && presenceState === "tombstoned") {
    return {
      id: "tombstoned",
      label: managerText("墓碑", "Tombstoned"),
      shortLabel: "T",
      description: managerText(
        "这是一条托管笔记的墓碑记录，需要恢复后才能继续同步。",
        "This managed note is tombstoned and must be restored before syncing.",
      ),
      suggestedAction: managerText(
        "恢复托管文件后再同步",
        "Restore the managed file first",
      ),
      order: 5,
      changed: true,
    };
  }

  if ((isManagedNote && presenceState === "missing") || missingTrackedFile) {
    return {
      id: "missing",
      label: managerText("文件缺失", "Missing"),
      shortLabel: "D",
      description: managerText(
        "同步记录仍在，但 Markdown 文件当前不存在或已脱离绑定。",
        "The sync record still exists, but the Markdown file is missing or detached.",
      ),
      suggestedAction: managerText(
        "可尝试恢复、重绑，或重新推送生成文件",
        "Try restore, rebind, or push again to recreate the file",
      ),
      order: 4,
      changed: true,
    };
  }

  switch (comparisonCode) {
    case SyncCode.NeedDiff:
      return {
        id: "conflict",
        label: managerText("冲突", "Conflicted"),
        shortLabel: "UU",
        description: managerText(
          "Zotero 与 Markdown 两侧都有修改，需要手动合并。",
          "Both Zotero and Markdown changed; manual merge is required.",
        ),
        suggestedAction: managerText(
          "打开冲突解决器检查并合并差异",
          "Open the resolver to inspect and merge the changes",
        ),
        order: 3,
        changed: true,
      };
    case SyncCode.NoteAhead:
      return {
        id: "push",
        label: managerText("待推送", "To Push"),
        shortLabel: "\u2191",
        description: managerText(
          "Zotero 内容比 Markdown 更新，工作区有待导出的改动。",
          "Zotero is ahead of Markdown; the workspace has local changes to export.",
        ),
        suggestedAction: managerText(
          "执行同步，把 Zotero 改动推送到 Markdown",
          "Run sync to push Zotero changes to Markdown",
        ),
        order: 2,
        changed: true,
      };
    case SyncCode.MDAhead:
      return {
        id: "pull",
        label: managerText("待拉取", "To Pull"),
        shortLabel: "\u2193",
        description: managerText(
          "Markdown 内容比 Zotero 更新，工作区有待导入的改动。",
          "Markdown is ahead of Zotero; the workspace has incoming changes to import.",
        ),
        suggestedAction: managerText(
          "执行同步，把 Markdown 改动拉回 Zotero",
          "Run sync to pull Markdown changes back into Zotero",
        ),
        order: 1,
        changed: true,
      };
    default:
      return {
        id: "clean",
        label: managerText("干净", "Clean"),
        shortLabel: "\u2713",
        description: managerText(
          "Zotero 与 Markdown 当前处于同步状态。",
          "Zotero and Markdown are currently in sync.",
        ),
        suggestedAction: managerText("无需额外操作", "No action needed"),
        order: 0,
        changed: false,
      };
  }
}

function getFilterOptions(): Array<{ value: SyncFilterMode; label: string }> {
  return [
    { value: "all", label: managerText("全部状态", "All states") },
    { value: "changed", label: managerText("仅变更", "Changed only") },
    { value: "push", label: managerText("待推送", "To Push") },
    { value: "pull", label: managerText("待拉取", "To Pull") },
    { value: "conflict", label: managerText("冲突", "Conflicted") },
    { value: "missing", label: managerText("异常", "Issues") },
    { value: "clean", label: managerText("干净", "Clean") },
  ];
}

function normalizeSearch(text: string) {
  return String(text || "")
    .trim()
    .toLowerCase();
}

function matchesFilter(row: SyncDataType, filterMode: SyncFilterMode) {
  switch (filterMode) {
    case "changed":
      return row.changed;
    case "push":
      return row.syncStateId === "push";
    case "pull":
      return row.syncStateId === "pull";
    case "conflict":
      return row.syncStateId === "conflict";
    case "missing":
      return row.syncStateId === "missing" || row.syncStateId === "tombstoned";
    case "clean":
      return row.syncStateId === "clean";
    default:
      return true;
  }
}

function getSortValue(row: SyncDataType, sortKey: keyof SyncDataType) {
  switch (sortKey) {
    case "lastSync":
      return row.lastSyncTs;
    case "syncState":
      return row.syncStateOrder;
    default:
      return String(row?.[sortKey] || "");
  }
}

function rebuildVisibleData() {
  const filterText = normalizeSearch(addon.data.sync.manager.filterText);
  const filterMode = addon.data.sync.manager.filterMode;
  const sortKey = sortDataKeys[addon.data.sync.manager.columnIndex];

  addon.data.sync.manager.data = addon.data.sync.manager.allData
    .filter((row) => matchesFilter(row, filterMode))
    .filter((row) => !filterText || row.searchableText.includes(filterText))
    .sort((a, b) => {
      const valueA = getSortValue(a, sortKey);
      const valueB = getSortValue(b, sortKey);
      const ascending = addon.data.sync.manager.columnAscending;
      if (typeof valueA === "number" && typeof valueB === "number") {
        return ascending ? valueA - valueB : valueB - valueA;
      }
      return ascending
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
}

function setStaticText(selector: string, text: string) {
  const element =
    addon.data.sync.manager.window?.document.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
}

function buildMetaItem(label: string, value: string) {
  const document = addon.data.sync.manager.window?.document;
  if (!document) {
    return null;
  }
  const container = document.createElement("div");
  container.className = "workspace-status-meta-item";

  const labelElement = document.createElement("span");
  labelElement.className = "workspace-status-meta-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.className = "workspace-status-meta-value";
  valueElement.textContent = value;

  container.append(labelElement, valueElement);
  return container;
}

function updateSummary() {
  const rows = addon.data.sync.manager.allData;
  setStaticText("#summary-total-value", String(rows.length));
  setStaticText(
    "#summary-clean-value",
    String(rows.filter((row) => row.syncStateId === "clean").length),
  );
  setStaticText(
    "#summary-push-value",
    String(rows.filter((row) => row.syncStateId === "push").length),
  );
  setStaticText(
    "#summary-pull-value",
    String(rows.filter((row) => row.syncStateId === "pull").length),
  );
  setStaticText(
    "#summary-conflict-value",
    String(rows.filter((row) => row.syncStateId === "conflict").length),
  );
  setStaticText(
    "#summary-issue-value",
    String(
      rows.filter(
        (row) =>
          row.syncStateId === "missing" || row.syncStateId === "tombstoned",
      ).length,
    ),
  );
}

function updateWorkspaceStateCard(options: {
  stateId: SyncStateId;
  badge: string;
  note: string;
  description: string;
  metaItems: Array<{ label: string; value: string }>;
}) {
  const win = addon.data.sync.manager.window;
  if (!win) {
    return;
  }

  const card = win.document.querySelector(
    "#workspace-status-card",
  ) as HTMLElement | null;
  const badge = win.document.querySelector(
    "#workspace-status-badge",
  ) as HTMLElement | null;
  const note = win.document.querySelector(
    "#workspace-status-note",
  ) as HTMLElement | null;
  const desc = win.document.querySelector(
    "#workspace-status-desc",
  ) as HTMLElement | null;
  const meta = win.document.querySelector(
    "#workspace-status-meta",
  ) as HTMLElement | null;

  if (!card || !badge || !note || !desc || !meta) {
    return;
  }

  const metaNodes = options.metaItems.reduce<Node[]>((nodes, item) => {
    const node = buildMetaItem(item.label, item.value);
    if (node) {
      nodes.push(node);
    }
    return nodes;
  }, []);

  card.dataset.state = options.stateId;
  badge.textContent = options.badge;
  note.textContent = options.note;
  desc.textContent = options.description;
  meta.replaceChildren(...metaNodes);
}

function updateWorkspaceState() {
  const selectedRows = getSelectedRows();

  if (selectedRows.length > 1) {
    updateWorkspaceStateCard({
      stateId: selectedRows.some((row) => row.syncStateId === "conflict")
        ? "conflict"
        : selectedRows.some(
              (row) =>
                row.syncStateId === "missing" ||
                row.syncStateId === "tombstoned",
            )
          ? "missing"
          : selectedRows.some((row) => row.syncStateId === "push")
            ? "push"
            : selectedRows.some((row) => row.syncStateId === "pull")
              ? "pull"
              : "clean",
      badge: managerText("批量", "Batch"),
      note: managerText(
        `已选择 ${selectedRows.length} 条笔记`,
        `${selectedRows.length} notes selected`,
      ),
      description: managerText(
        "当前视图按选中集合汇总工作区状态，便于像 git status 一样批量处理。",
        "This view summarizes the selected working tree so you can handle it like git status.",
      ),
      metaItems: [
        {
          label: managerText("待推送", "To Push"),
          value: String(
            selectedRows.filter((row) => row.syncStateId === "push").length,
          ),
        },
        {
          label: managerText("待拉取", "To Pull"),
          value: String(
            selectedRows.filter((row) => row.syncStateId === "pull").length,
          ),
        },
        {
          label: managerText("冲突", "Conflicts"),
          value: String(
            selectedRows.filter((row) => row.syncStateId === "conflict").length,
          ),
        },
        {
          label: managerText("异常", "Issues"),
          value: String(
            selectedRows.filter(
              (row) =>
                row.syncStateId === "missing" ||
                row.syncStateId === "tombstoned",
            ).length,
          ),
        },
      ],
    });
    return;
  }

  const row = selectedRows[0];
  if (!row) {
    updateWorkspaceStateCard({
      stateId: "clean",
      badge: managerText("提示", "Tip"),
      note: managerText(
        "选择左侧笔记查看工作区状态",
        "Select a note to inspect its working tree",
      ),
      description: managerText(
        "这里会显示当前选中笔记的同步状态、建议操作和跟踪信息。",
        "This area shows the current sync state, suggested action, and tracking details for the selected note.",
      ),
      metaItems: [
        {
          label: managerText("当前筛选结果", "Visible rows"),
          value: String(addon.data.sync.manager.data.length),
        },
        {
          label: managerText("筛选模式", "Filter"),
          value:
            getFilterOptions().find(
              (option) => option.value === addon.data.sync.manager.filterMode,
            )?.label || "",
        },
      ],
    });
    return;
  }

  updateWorkspaceStateCard({
    stateId: row.syncStateId,
    badge: row.syncStateShort,
    note: row.noteName,
    description: `${row.syncStateDescription}\n${managerText(
      "建议操作：",
      "Suggested action: ",
    )}${row.suggestedAction}`,
    metaItems: [
      {
        label: managerText("最近同步", "Last sync"),
        value: row.lastSync,
      },
      {
        label: managerText("跟踪状态", "Tracking"),
        value: row.presence,
      },
      {
        label: managerText("同步文件", "Tracked file"),
        value: row.filePath || managerText("未绑定文件", "No tracked file"),
      },
      {
        label: managerText("历史记录", "History"),
        value: String(addon.api.sync.getHistory([row.noteId], 250).length),
      },
    ],
  });
}

function initializeStaticContent(win: Window) {
  const syncSearch = win.document.querySelector(
    "#sync-search",
  ) as HTMLInputElement;
  const syncFilter = win.document.querySelector(
    "#sync-filter",
  ) as HTMLSelectElement;
  const restoreButton = win.document.querySelector(
    "#restoreManaged",
  ) as HTMLButtonElement;
  const rebindButton = win.document.querySelector(
    "#rebindManaged",
  ) as HTMLButtonElement;
  const unlinkButton = win.document.querySelector(
    "#unlinkManaged",
  ) as HTMLButtonElement;
  const resolveDiffButton = win.document.querySelector(
    "#resolveDiff",
  ) as HTMLButtonElement;
  const unSyncButton = win.document.querySelector(
    "#unSync",
  ) as HTMLButtonElement;

  setStaticText("#summary-total-label", managerText("已跟踪", "Tracked"));
  setStaticText("#summary-clean-label", managerText("已同步", "Clean"));
  setStaticText("#summary-push-label", managerText("待推送", "To Push"));
  setStaticText("#summary-pull-label", managerText("待拉取", "To Pull"));
  setStaticText("#summary-conflict-label", managerText("冲突", "Conflicts"));
  setStaticText("#summary-issue-label", managerText("异常", "Issues"));
  setStaticText(
    "#workspace-state-title",
    managerText("工作区状态", "Working Tree"),
  );

  syncSearch.placeholder = managerText(
    "搜索笔记标题或 Markdown 路径...",
    "Search note title or Markdown path...",
  );
  syncSearch.value = addon.data.sync.manager.filterText;
  syncFilter.replaceChildren(
    ...getFilterOptions().map((option) => {
      const element = win.document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      return element;
    }),
  );
  syncFilter.value = addon.data.sync.manager.filterMode;

  restoreButton.textContent = managerText("恢复", "Restore");
  rebindButton.textContent = managerText("重绑", "Rebind");
  unlinkButton.textContent = managerText("解绑", "Unlink");
  resolveDiffButton.textContent = managerText("解决冲突", "Resolve");
  unSyncButton.textContent = managerText("取消跟踪", "Untrack");
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

  initializeStaticContent(win);
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
          dataKey: "syncState",
          label: managerText("状态", "State"),
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
          label: managerText("跟踪", "Tracking"),
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
        syncState: row ? `${row.syncStateShort} ${row.syncState}` : "no data",
        lastSync: row?.lastSync || "no data",
        filePath: row?.filePath || "no data",
        presence: row?.presence || "no data",
      };
    })
    .setProp("onSelectionChange", () => {
      updateButtons();
      updateWorkspaceState();
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
      (index) =>
        `${addon.data.sync.manager?.data[index].noteName || ""} ${
          addon.data.sync.manager?.data[index].filePath || ""
        }`,
    )
    .setProp("onColumnSort", async (columnIndex, ascending) => {
      addon.data.sync.manager.columnIndex = columnIndex;
      addon.data.sync.manager.columnAscending = ascending > 0;
      rebuildVisibleData();
      await updateTable();
      updateWorkspaceState();
    })
    .render();

  addon.data.sync.manager.historyTableHelper = new ztoolkit.VirtualizedTable(
    win!,
  )
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
          dataKey: "changes",
          label: managerText("变更", "Changes"),
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
        changes: row?.changes || "no data",
        reason: row?.reason || "no data",
      };
    })
    .setProp("onSelectionChange", () => {
      updateHistoryPreview();
    })
    .setProp("onActivate", () => {
      const entry =
        getSelectedHistoryEntry() || addon.data.sync.manager.historyData[0];
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

  const refreshButton = win.document.querySelector(
    "#refresh",
  ) as HTMLButtonElement;
  const syncButton = win.document.querySelector("#sync") as HTMLButtonElement;
  const resolveDiffButton = win.document.querySelector(
    "#resolveDiff",
  ) as HTMLButtonElement;
  const unSyncButton = win.document.querySelector(
    "#unSync",
  ) as HTMLButtonElement;
  const detectButton = win.document.querySelector(
    "#detect",
  ) as HTMLButtonElement;
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
  const syncSearch = win.document.querySelector(
    "#sync-search",
  ) as HTMLInputElement;
  const syncFilter = win.document.querySelector(
    "#sync-filter",
  ) as HTMLSelectElement;

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
  resolveDiffButton.addEventListener("click", () => {
    void openSelectedDiff();
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
  syncSearch.addEventListener("input", () => {
    addon.data.sync.manager.filterText = syncSearch.value;
    void applyFilters();
  });
  syncFilter.addEventListener("change", () => {
    addon.data.sync.manager.filterMode = syncFilter.value as SyncFilterMode;
    void applyFilters();
  });

  updateSummary();
  updateWorkspaceState();
  updateHistoryPreview();
  updateButtons();
}

const sortDataKeys = [
  "noteName",
  "syncState",
  "lastSync",
  "filePath",
  "presence",
] as Array<keyof SyncDataType>;

async function updateData() {
  const noteIds = await addon.api.sync.getSyncNoteIds();
  const rows = await Promise.all(
    noteIds.map(async (noteId) => {
      const noteItem = Zotero.Items.get(noteId);
      if (!noteItem?.isNote()) {
        return null;
      }

      const syncStatus = addon.api.sync.getSyncStatus(noteId);
      const lastSyncTs = Number(syncStatus.lastsync || 0);
      const mdStatus = await addon.api.sync.getMDStatus(noteId);
      const isManagedNote = addon.api.obsidian.isManagedNote(noteItem);
      const presenceState =
        addon.api.obsidian.getManagedPresenceState(noteItem);
      const syncState = getSyncStateDefinition({
        isManagedNote,
        presenceState,
        comparisonCode: await getSyncComparisonCode(noteItem, mdStatus),
        syncStatus,
        mdStatus,
      });
      const filePath = jointPath(syncStatus.path, syncStatus.filename);

      return {
        noteId,
        noteName: noteItem.getNoteTitle(),
        lastSync: lastSyncTs
          ? new Date(lastSyncTs).toLocaleString()
          : managerText("从未同步", "Never"),
        lastSyncTs,
        filePath: filePath || managerText("未绑定文件", "No tracked file"),
        presence: getPresenceLabel(noteItem, presenceState),
        syncState: syncState.label,
        syncStateId: syncState.id,
        syncStateShort: syncState.shortLabel,
        syncStateDescription: syncState.description,
        suggestedAction: syncState.suggestedAction,
        syncStateOrder: syncState.order,
        changed: syncState.changed,
        searchableText: normalizeSearch(
          [
            noteItem.getNoteTitle(),
            filePath,
            syncState.label,
            syncState.description,
            syncState.suggestedAction,
          ].join(" "),
        ),
      } satisfies SyncDataType;
    }),
  );

  addon.data.sync.manager.allData = rows.filter((row): row is SyncDataType =>
    Boolean(row),
  );
  rebuildVisibleData();
  updateSummary();
}

async function updateHistoryData(noteIds: number[] = getSelectedNoteIds()) {
  addon.data.sync.manager.historyData = addon.api.sync
    .getHistory(noteIds, 100)
    .map((entry: SyncHistoryEntry) => {
      const frontmatterSummary = buildDiffPreviewModel(
        entry.beforeFrontmatter || "",
        entry.afterFrontmatter || "",
        {
          contextLines: 0,
        },
      ).summary;
      const contentSummary = buildDiffPreviewModel(
        entry.beforeText,
        entry.afterText,
        {
          contextLines: 0,
        },
      ).summary;
      return {
        id: entry.id,
        timestamp: new Date(entry.timestamp).toLocaleString(),
        action: addon.api.sync.getHistoryActionLabel(entry),
        changes: formatDiffPreviewSummary(
          {
            addedCount:
              frontmatterSummary.addedCount + contentSummary.addedCount,
            removedCount:
              frontmatterSummary.removedCount + contentSummary.removedCount,
            modifiedCount:
              frontmatterSummary.modifiedCount + contentSummary.modifiedCount,
            changedCount:
              frontmatterSummary.changedCount + contentSummary.changedCount,
            hunkCount: frontmatterSummary.hunkCount + contentSummary.hunkCount,
          },
          {
            isZh: String(Zotero.locale || "")
              .toLowerCase()
              .startsWith("zh"),
            includeHunkCount: false,
          },
        ),
        reason: entry.reason || "unknown",
        filePath: entry.filePath,
        preview: addon.api.sync.formatHistoryPreview(entry),
        entry,
      };
    });
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
  const syncButton = win.document.querySelector("#sync") as HTMLButtonElement;
  const resolveDiffButton = win.document.querySelector(
    "#resolveDiff",
  ) as HTMLButtonElement;
  const unSyncButton = win.document.querySelector(
    "#unSync",
  ) as HTMLButtonElement;
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
  const selectedRows = getSelectedRows();
  const hasSelection = Boolean(selectedRows.length);
  syncButton.disabled = !hasSelection;
  resolveDiffButton.disabled = !(
    selectedRows.length === 1 && selectedRows[0].syncStateId === "conflict"
  );
  unSyncButton.disabled = !hasSelection;
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
  const entry =
    getSelectedHistoryEntry() || addon.data.sync.manager.historyData[0];
  preview.textContent =
    entry?.preview ||
    managerText(
      "选择一条同步记录即可查看像 commit diff 一样的历史预览。",
      "Select a history record to inspect its commit-like diff preview.",
    );
}

async function refresh() {
  await updateData();
  await updateTable();
  await refreshHistory();
  updateWorkspaceState();
  updateButtons();
}

async function refreshHistory() {
  await updateHistoryData();
  await updateHistoryTable();
  updateHistoryPreview();
  updateWorkspaceState();
  updateButtons();
}

async function applyFilters() {
  rebuildVisibleData();
  updateSummary();
  await updateTable();
  await refreshHistory();
}

function getSelectedNoteIds() {
  const ids: number[] = [];
  for (const idx of addon.data.sync.manager.tableHelper?.treeInstance.selection.selected?.keys() ||
    []) {
    ids.push(addon.data.sync.manager.data[idx].noteId);
  }
  return ids;
}

function getSelectedRows() {
  return getSelectedNoteIds()
    .map((noteId) =>
      addon.data.sync.manager.data.find((row) => row.noteId === noteId),
    )
    .filter((row): row is SyncDataType => Boolean(row));
}

function getSelectedHistoryEntry() {
  const selected =
    addon.data.sync.manager.historyTableHelper?.treeInstance.selection.selected;
  const firstSelected = selected ? Array.from(selected.keys())[0] : undefined;
  return typeof firstSelected === "number"
    ? addon.data.sync.manager.historyData[firstSelected]
    : undefined;
}

async function clearHistoryForSelection() {
  const noteIds = getSelectedNoteIds();
  const confirmed = addon.data.sync.manager.window?.confirm(
    noteIds.length
      ? managerText(
          "清除所选笔记的同步历史？",
          "Clear sync history for the selected notes?",
        )
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

async function openSelectedDiff() {
  const [row] = getSelectedRows();
  if (!row || row.syncStateId !== "conflict") {
    return;
  }
  await addon.hooks.onShowSyncDiff(row.noteId, row.filePath);
  await refresh();
}

async function unSyncNotes(itemIds: number[]) {
  if (itemIds.length === 0) {
    return;
  }
  const unSyncLinkedNotes = addon.data.sync.manager.window?.confirm(
    managerText(
      "同时取消跟踪其链接笔记？",
      "Untrack their linked notes as well?",
    ),
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
