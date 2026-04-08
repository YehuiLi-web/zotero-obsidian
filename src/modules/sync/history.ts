import YAML = require("yamljs");
import { config } from "../../../package.json";
import { buildFrontmatter } from "../obsidian/frontmatter";
import { extractManagedObsidianUserMarkdown } from "../obsidian/markdown";
import { formatPath } from "../../utils/str";
import { getPref, setPref } from "../../utils/prefs";
import {
  buildDiffPreviewModel,
  formatDiffPreviewSummary,
  formatDiffPreviewText,
} from "./diffPreview";

const SYNC_HISTORY_IDS_PREF = "syncHistoryIds";
const SYNC_HISTORY_MAX_ENTRIES = 250;
const HISTORY_PREVIEW_LINE_LIMIT = 240;

export {
  initSyncHistory,
  addSyncHistory,
  getSyncHistory,
  clearSyncHistory,
  recordMarkdownSyncHistory,
  recordNoteSyncHistory,
  formatSyncHistoryPreview,
  getSyncHistoryActionLabel,
};

function initSyncHistory() {
  const rawKeys = String(getPref(SYNC_HISTORY_IDS_PREF) || "");
  if (!rawKeys.startsWith("[") || !rawKeys.endsWith("]")) {
    const keys = rawKeys
      .split(",")
      .map((id) => String(id).trim())
      .filter(Boolean);
    setPref(SYNC_HISTORY_IDS_PREF, JSON.stringify(keys));
  }
  addon.data.sync.historyData = new ztoolkit.LargePref(
    `${config.prefsPrefix}.${SYNC_HISTORY_IDS_PREF}`,
    `${config.prefsPrefix}.syncHistory-`,
    "parser",
  );
  const keys = addon.data.sync.historyData?.getKeys().map((key) => String(key));
  setPref(SYNC_HISTORY_IDS_PREF, JSON.stringify(keys || []));
}

function normalizeHistoryText(text: string) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function buildHistoryEntryId() {
  return `${Date.now()}-${Zotero.Utilities.randomString(6)}`;
}

function parseMarkdownFrontmatter(contentRaw: string) {
  const normalized = String(contentRaw || "").replace(/\r\n/g, "\n");
  const result = normalized.match(/^---\n(.*\n)+?---$/gm);
  if (!result?.[0]) {
    return {};
  }
  try {
    return YAML.parse(result[0].replace(/---/g, "")) || {};
  } catch (error) {
    ztoolkit.log(
      "[ObsidianBridge] failed to parse sync history frontmatter",
      error,
    );
    return {};
  }
}

function buildFrontmatterText(meta: Record<string, any> | null | undefined) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return "";
  }
  const normalizedEntries = Object.entries(meta).filter(
    ([key]) => !String(key).startsWith("$"),
  );
  if (!normalizedEntries.length) {
    return "";
  }
  return buildFrontmatter(Object.fromEntries(normalizedEntries));
}

function extractMarkdownHistoryText(
  contentRaw: string,
  noteItem: Zotero.Item,
  managed: boolean,
) {
  if (!contentRaw) {
    return "";
  }
  if (managed) {
    return normalizeHistoryText(
      extractManagedObsidianUserMarkdown(contentRaw) || "",
    );
  }
  const normalized = String(contentRaw || "").replace(/\r\n/g, "\n");
  return normalizeHistoryText(
    normalized.replace(/^---\n[\s\S]*?\n---\n*/m, ""),
  );
}

function buildDiffStats(beforeText: string, afterText: string) {
  const previewModel = buildDiffPreviewModel(beforeText, afterText, {
    contextLines: 0,
  });
  const addedCount =
    previewModel.summary.addedCount + previewModel.summary.modifiedCount;
  const removedCount =
    previewModel.summary.removedCount + previewModel.summary.modifiedCount;
  return {
    addedCount,
    removedCount,
  };
}

function pruneSyncHistory(maxEntries = SYNC_HISTORY_MAX_ENTRIES) {
  const keys = (addon.data.sync.historyData?.getKeys() || [])
    .map((key) => String(key))
    .sort((left, right) => right.localeCompare(left));
  const overflowKeys = keys.slice(maxEntries);
  overflowKeys.forEach((key) => addon.data.sync.historyData?.deleteKey(key));
  if (overflowKeys.length) {
    const keptKeys = keys.slice(0, maxEntries);
    setPref(SYNC_HISTORY_IDS_PREF, JSON.stringify(keptKeys));
  }
}

function addSyncHistory(
  entry: Omit<
    SyncHistoryEntry,
    "id" | "timestamp" | "addedCount" | "removedCount"
  > & {
    timestamp?: number;
    addedCount?: number;
    removedCount?: number;
  },
) {
  const beforeText = normalizeHistoryText(entry.beforeText || "");
  const afterText = normalizeHistoryText(entry.afterText || "");
  const diffStats = buildDiffStats(beforeText, afterText);
  const id = buildHistoryEntryId();
  const historyEntry: SyncHistoryEntry = {
    ...entry,
    id,
    timestamp: entry.timestamp || Date.now(),
    beforeText,
    afterText,
    beforeFrontmatter: normalizeHistoryText(entry.beforeFrontmatter || ""),
    afterFrontmatter: normalizeHistoryText(entry.afterFrontmatter || ""),
    addedCount: entry.addedCount ?? diffStats.addedCount,
    removedCount: entry.removedCount ?? diffStats.removedCount,
  };
  addon.data.sync.historyData?.setValue(id, historyEntry);
  pruneSyncHistory();
  return historyEntry;
}

function getSyncHistory(noteIds: number[] = [], limit = 50) {
  const noteIdSet = new Set(
    noteIds.map((noteId) => Number(noteId)).filter(Boolean),
  );
  return (addon.data.sync.historyData?.getKeys() || [])
    .map(
      (key) =>
        addon.data.sync.historyData?.getValue(String(key)) as SyncHistoryEntry,
    )
    .filter((entry): entry is SyncHistoryEntry => Boolean(entry?.id))
    .filter((entry) => !noteIdSet.size || noteIdSet.has(entry.noteId))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, limit);
}

function clearSyncHistory(noteIds: number[] = []) {
  const noteIdSet = new Set(
    noteIds.map((noteId) => Number(noteId)).filter(Boolean),
  );
  const keys = (addon.data.sync.historyData?.getKeys() || []).map((key) =>
    String(key),
  );
  for (const key of keys) {
    const entry = addon.data.sync.historyData?.getValue(
      key,
    ) as SyncHistoryEntry;
    if (!entry?.id) {
      addon.data.sync.historyData?.deleteKey(key);
      continue;
    }
    if (!noteIdSet.size || noteIdSet.has(entry.noteId)) {
      addon.data.sync.historyData?.deleteKey(key);
    }
  }
}

function getSyncHistoryActionLabel(entry: SyncHistoryEntry) {
  const isZh = String(Zotero.locale || "")
    .toLowerCase()
    .startsWith("zh");
  switch (entry.action) {
    case "import":
      return entry.target === "note"
        ? isZh
          ? "导入到 Zotero"
          : "Import to Zotero"
        : isZh
          ? "导入"
          : "Import";
    case "merge":
      return isZh ? "已合并" : "Merged";
    default:
      return entry.target === "markdown"
        ? isZh
          ? "导出到 Markdown"
          : "Export to Markdown"
        : isZh
          ? "导出"
          : "Export";
  }
}

function formatSyncHistoryPreview(entry: SyncHistoryEntry) {
  const isZh = String(Zotero.locale || "")
    .toLowerCase()
    .startsWith("zh");
  const frontmatterPreviewModel = buildDiffPreviewModel(
    entry.beforeFrontmatter || "",
    entry.afterFrontmatter || "",
  );
  const contentPreviewModel = buildDiffPreviewModel(
    entry.beforeText,
    entry.afterText,
  );
  const blocks = [
    `${entry.noteName} (${entry.noteId})`,
    `${isZh ? "时间" : "Time"}: ${new Date(entry.timestamp).toLocaleString()}`,
    `${isZh ? "动作" : "Action"}: ${getSyncHistoryActionLabel(entry)}`,
    `${isZh ? "来源" : "Reason"}: ${entry.reason || "unknown"}`,
    `${isZh ? "目标" : "Target"}: ${entry.target}`,
    `${isZh ? "文件" : "File"}: ${formatPath(entry.filePath) || "N/A"}`,
    `${isZh ? "行数" : "Lines"}: +${entry.addedCount} / -${entry.removedCount}`,
    `${isZh ? "摘要" : "Summary"}: ${formatDiffPreviewSummary(
      {
        addedCount:
          frontmatterPreviewModel.summary.addedCount +
          contentPreviewModel.summary.addedCount,
        removedCount:
          frontmatterPreviewModel.summary.removedCount +
          contentPreviewModel.summary.removedCount,
        modifiedCount:
          frontmatterPreviewModel.summary.modifiedCount +
          contentPreviewModel.summary.modifiedCount,
        changedCount:
          frontmatterPreviewModel.summary.changedCount +
          contentPreviewModel.summary.changedCount,
        hunkCount:
          frontmatterPreviewModel.summary.hunkCount +
          contentPreviewModel.summary.hunkCount,
      },
      {
        isZh,
        includeHunkCount: true,
      },
    )}`,
  ];
  const frontmatterBlock = formatDiffPreviewText(
    isZh ? "Frontmatter" : "Frontmatter",
    entry.beforeFrontmatter || "",
    entry.afterFrontmatter || "",
    {
      isZh,
      contextLines: 1,
      maxOutputLines: 80,
      maxHunks: 3,
    },
  );
  const bodyBlock = formatDiffPreviewText(
    isZh ? "正文内容" : "Content",
    entry.beforeText,
    entry.afterText,
    {
      isZh,
      contextLines: 2,
      maxOutputLines: HISTORY_PREVIEW_LINE_LIMIT,
      maxHunks: 6,
    },
  );
  return [blocks.join("\n"), frontmatterBlock, bodyBlock]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function recordMarkdownSyncHistory(
  noteItem: Zotero.Item,
  filePath: string,
  options: {
    beforeContent?: string;
    afterContent: string;
    reason?: string;
    action?: SyncHistoryEntry["action"];
  },
) {
  const managed = addon.api.obsidian.isManagedNote(noteItem);
  const beforeMeta = parseMarkdownFrontmatter(options.beforeContent || "");
  const afterMeta = parseMarkdownFrontmatter(options.afterContent || "");
  return addSyncHistory({
    noteId: noteItem.id,
    noteName: noteItem.getNoteTitle(),
    filePath: formatPath(filePath),
    reason: options.reason || "manual-export",
    action: options.action || "export",
    target: "markdown",
    managed,
    beforeText: extractMarkdownHistoryText(
      options.beforeContent || "",
      noteItem,
      managed,
    ),
    afterText: extractMarkdownHistoryText(
      options.afterContent,
      noteItem,
      managed,
    ),
    beforeFrontmatter: buildFrontmatterText(beforeMeta),
    afterFrontmatter: buildFrontmatterText(afterMeta),
  });
}

function recordNoteSyncHistory(
  noteItem: Zotero.Item,
  filePath: string,
  options: {
    beforeText: string;
    afterText: string;
    reason?: string;
    action?: SyncHistoryEntry["action"];
    beforeFrontmatter?: Record<string, any> | null;
    afterFrontmatter?: Record<string, any> | null;
  },
) {
  return addSyncHistory({
    noteId: noteItem.id,
    noteName: noteItem.getNoteTitle(),
    filePath: formatPath(filePath),
    reason: options.reason || "manual-import",
    action: options.action || "import",
    target: "note",
    managed: addon.api.obsidian.isManagedNote(noteItem),
    beforeText: options.beforeText,
    afterText: options.afterText,
    beforeFrontmatter: buildFrontmatterText(options.beforeFrontmatter || {}),
    afterFrontmatter: buildFrontmatterText(options.afterFrontmatter || {}),
  });
}
