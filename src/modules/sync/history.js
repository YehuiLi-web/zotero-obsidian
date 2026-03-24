"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSyncHistory = initSyncHistory;
exports.addSyncHistory = addSyncHistory;
exports.getSyncHistory = getSyncHistory;
exports.clearSyncHistory = clearSyncHistory;
exports.recordMarkdownSyncHistory = recordMarkdownSyncHistory;
exports.recordNoteSyncHistory = recordNoteSyncHistory;
exports.formatSyncHistoryPreview = formatSyncHistoryPreview;
exports.getSyncHistoryActionLabel = getSyncHistoryActionLabel;
const YAML = require("yamljs");
const diff_1 = require("diff");
const package_json_1 = require("../../../package.json");
const frontmatter_1 = require("../obsidian/frontmatter");
const markdown_1 = require("../obsidian/markdown");
const str_1 = require("../../utils/str");
const prefs_1 = require("../../utils/prefs");
const SYNC_HISTORY_IDS_PREF = "syncHistoryIds";
const SYNC_HISTORY_MAX_ENTRIES = 250;
const HISTORY_PREVIEW_LINE_LIMIT = 240;
function initSyncHistory() {
    var _a;
    const rawKeys = String((0, prefs_1.getPref)(SYNC_HISTORY_IDS_PREF) || "");
    if (!rawKeys.startsWith("[") || !rawKeys.endsWith("]")) {
        const keys = rawKeys
            .split(",")
            .map((id) => String(id).trim())
            .filter(Boolean);
        (0, prefs_1.setPref)(SYNC_HISTORY_IDS_PREF, JSON.stringify(keys));
    }
    addon.data.sync.historyData = new ztoolkit.LargePref(`${package_json_1.config.prefsPrefix}.${SYNC_HISTORY_IDS_PREF}`, `${package_json_1.config.prefsPrefix}.syncHistory-`, "parser");
    const keys = (_a = addon.data.sync.historyData) === null || _a === void 0 ? void 0 : _a.getKeys().map((key) => String(key));
    (0, prefs_1.setPref)(SYNC_HISTORY_IDS_PREF, JSON.stringify(keys || []));
}
function normalizeHistoryText(text) {
    return String(text || "").replace(/\r\n/g, "\n").trim();
}
function buildHistoryEntryId() {
    return `${Date.now()}-${Zotero.Utilities.randomString(6)}`;
}
function parseMarkdownFrontmatter(contentRaw) {
    const normalized = String(contentRaw || "").replace(/\r\n/g, "\n");
    const result = normalized.match(/^---\n(.*\n)+?---$/gm);
    if (!(result === null || result === void 0 ? void 0 : result[0])) {
        return {};
    }
    try {
        return YAML.parse(result[0].replace(/---/g, "")) || {};
    }
    catch (error) {
        ztoolkit.log("[ObsidianBridge] failed to parse sync history frontmatter", error);
        return {};
    }
}
function buildFrontmatterText(meta) {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
        return "";
    }
    const normalizedEntries = Object.entries(meta).filter(([key]) => !String(key).startsWith("$"));
    if (!normalizedEntries.length) {
        return "";
    }
    return (0, frontmatter_1.buildFrontmatter)(Object.fromEntries(normalizedEntries));
}
function extractMarkdownHistoryText(contentRaw, noteItem, managed) {
    if (!contentRaw) {
        return "";
    }
    if (managed) {
        return normalizeHistoryText((0, markdown_1.extractManagedObsidianUserMarkdown)(contentRaw) || "");
    }
    const normalized = String(contentRaw || "").replace(/\r\n/g, "\n");
    return normalizeHistoryText(normalized.replace(/^---\n[\s\S]*?\n---\n*/m, ""));
}
function buildDiffStats(beforeText, afterText) {
    let addedCount = 0;
    let removedCount = 0;
    for (const change of (0, diff_1.diffLines)(beforeText || "", afterText || "")) {
        if (!change.added && !change.removed) {
            continue;
        }
        const lineCount = change.count ||
            change.value.split("\n").filter((line, index, array) => {
                return line.length > 0 || index < array.length - 1;
            }).length;
        if (change.added) {
            addedCount += lineCount;
        }
        if (change.removed) {
            removedCount += lineCount;
        }
    }
    return {
        addedCount,
        removedCount,
    };
}
function pruneSyncHistory(maxEntries = SYNC_HISTORY_MAX_ENTRIES) {
    var _a;
    const keys = (((_a = addon.data.sync.historyData) === null || _a === void 0 ? void 0 : _a.getKeys()) || [])
        .map((key) => String(key))
        .sort((left, right) => right.localeCompare(left));
    const overflowKeys = keys.slice(maxEntries);
    overflowKeys.forEach((key) => { var _a; return (_a = addon.data.sync.historyData) === null || _a === void 0 ? void 0 : _a.deleteKey(key); });
    if (overflowKeys.length) {
        const keptKeys = keys.slice(0, maxEntries);
        (0, prefs_1.setPref)(SYNC_HISTORY_IDS_PREF, JSON.stringify(keptKeys));
    }
}
function addSyncHistory(entry) {
    var _a, _b, _c;
    const beforeText = normalizeHistoryText(entry.beforeText || "");
    const afterText = normalizeHistoryText(entry.afterText || "");
    const diffStats = buildDiffStats(beforeText, afterText);
    const id = buildHistoryEntryId();
    const historyEntry = Object.assign(Object.assign({}, entry), { id, timestamp: entry.timestamp || Date.now(), beforeText,
        afterText, beforeFrontmatter: normalizeHistoryText(entry.beforeFrontmatter || ""), afterFrontmatter: normalizeHistoryText(entry.afterFrontmatter || ""), addedCount: (_a = entry.addedCount) !== null && _a !== void 0 ? _a : diffStats.addedCount, removedCount: (_b = entry.removedCount) !== null && _b !== void 0 ? _b : diffStats.removedCount });
    (_c = addon.data.sync.historyData) === null || _c === void 0 ? void 0 : _c.setValue(id, historyEntry);
    pruneSyncHistory();
    return historyEntry;
}
function getSyncHistory(noteIds = [], limit = 50) {
    var _a;
    const noteIdSet = new Set(noteIds.map((noteId) => Number(noteId)).filter(Boolean));
    return (((_a = addon.data.sync.historyData) === null || _a === void 0 ? void 0 : _a.getKeys()) || [])
        .map((key) => { var _a; return (_a = addon.data.sync.historyData) === null || _a === void 0 ? void 0 : _a.getValue(String(key)); })
        .filter((entry) => Boolean(entry === null || entry === void 0 ? void 0 : entry.id))
        .filter((entry) => !noteIdSet.size || noteIdSet.has(entry.noteId))
        .sort((left, right) => right.timestamp - left.timestamp)
        .slice(0, limit);
}
function clearSyncHistory(noteIds = []) {
    var _a, _b, _c, _d;
    const noteIdSet = new Set(noteIds.map((noteId) => Number(noteId)).filter(Boolean));
    const keys = (((_a = addon.data.sync.historyData) === null || _a === void 0 ? void 0 : _a.getKeys()) || []).map((key) => String(key));
    for (const key of keys) {
        const entry = (_b = addon.data.sync.historyData) === null || _b === void 0 ? void 0 : _b.getValue(key);
        if (!(entry === null || entry === void 0 ? void 0 : entry.id)) {
            (_c = addon.data.sync.historyData) === null || _c === void 0 ? void 0 : _c.deleteKey(key);
            continue;
        }
        if (!noteIdSet.size || noteIdSet.has(entry.noteId)) {
            (_d = addon.data.sync.historyData) === null || _d === void 0 ? void 0 : _d.deleteKey(key);
        }
    }
}
function getSyncHistoryActionLabel(entry) {
    const isZh = String(Zotero.locale || "").toLowerCase().startsWith("zh");
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
function formatDiffBlock(title, beforeText, afterText) {
    if (!beforeText && !afterText) {
        return "";
    }
    const lines = [`## ${title}`];
    const changes = (0, diff_1.diffLines)(beforeText || "", afterText || "");
    let emittedLines = 0;
    for (const change of changes) {
        const prefix = change.added ? "+" : change.removed ? "-" : " ";
        const changeLines = String(change.value || "").replace(/\r\n/g, "\n").split("\n");
        for (const line of changeLines) {
            if (!line && emittedLines >= HISTORY_PREVIEW_LINE_LIMIT) {
                continue;
            }
            lines.push(`${prefix}${line}`);
            emittedLines += 1;
            if (emittedLines >= HISTORY_PREVIEW_LINE_LIMIT) {
                lines.push("... truncated ...");
                return lines.join("\n").trim();
            }
        }
    }
    return lines.join("\n").trim();
}
function formatSyncHistoryPreview(entry) {
    const isZh = String(Zotero.locale || "").toLowerCase().startsWith("zh");
    const blocks = [
        `${entry.noteName} (${entry.noteId})`,
        `${isZh ? "时间" : "Time"}: ${new Date(entry.timestamp).toLocaleString()}`,
        `${isZh ? "动作" : "Action"}: ${getSyncHistoryActionLabel(entry)}`,
        `${isZh ? "来源" : "Reason"}: ${entry.reason || "unknown"}`,
        `${isZh ? "目标" : "Target"}: ${entry.target}`,
        `${isZh ? "文件" : "File"}: ${(0, str_1.formatPath)(entry.filePath) || "N/A"}`,
        `${isZh ? "行数" : "Lines"}: +${entry.addedCount} / -${entry.removedCount}`,
    ];
    const frontmatterBlock = formatDiffBlock(isZh ? "Frontmatter" : "Frontmatter", entry.beforeFrontmatter || "", entry.afterFrontmatter || "");
    const bodyBlock = formatDiffBlock(isZh ? "正文内容" : "Content", entry.beforeText, entry.afterText);
    return [blocks.join("\n"), frontmatterBlock, bodyBlock]
        .filter(Boolean)
        .join("\n\n")
        .trim();
}
function recordMarkdownSyncHistory(noteItem, filePath, options) {
    const managed = addon.api.obsidian.isManagedNote(noteItem);
    const beforeMeta = parseMarkdownFrontmatter(options.beforeContent || "");
    const afterMeta = parseMarkdownFrontmatter(options.afterContent || "");
    return addSyncHistory({
        noteId: noteItem.id,
        noteName: noteItem.getNoteTitle(),
        filePath: (0, str_1.formatPath)(filePath),
        reason: options.reason || "manual-export",
        action: options.action || "export",
        target: "markdown",
        managed,
        beforeText: extractMarkdownHistoryText(options.beforeContent || "", noteItem, managed),
        afterText: extractMarkdownHistoryText(options.afterContent, noteItem, managed),
        beforeFrontmatter: buildFrontmatterText(beforeMeta),
        afterFrontmatter: buildFrontmatterText(afterMeta),
    });
}
function recordNoteSyncHistory(noteItem, filePath, options) {
    return addSyncHistory({
        noteId: noteItem.id,
        noteName: noteItem.getNoteTitle(),
        filePath: (0, str_1.formatPath)(filePath),
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
