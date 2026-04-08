import { diffLines } from "diff";

export type DiffPreviewLineKind =
  | "context"
  | "added"
  | "removed"
  | "modified-old"
  | "modified-new";

export interface DiffPreviewLine {
  kind: DiffPreviewLineKind;
  text: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffPreviewHunk {
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  lines: DiffPreviewLine[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

export interface DiffPreviewSummary {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  changedCount: number;
  hunkCount: number;
}

export interface DiffPreviewModel {
  hunks: DiffPreviewHunk[];
  summary: DiffPreviewSummary;
}

function normalizeDiffText(text: string) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function splitPreviewLines(text: string) {
  const normalized = normalizeDiffText(text);
  if (!normalized) {
    return [] as string[];
  }
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function formatPreviewText(text: string) {
  return text.length ? text : "<empty>";
}

function isChangedLine(line: DiffPreviewLine) {
  return line.kind !== "context";
}

function summarizeLines(lines: DiffPreviewLine[]): DiffPreviewSummary {
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  for (const line of lines) {
    if (line.kind === "added") {
      addedCount += 1;
    } else if (line.kind === "removed") {
      removedCount += 1;
    } else if (line.kind === "modified-old") {
      modifiedCount += 1;
    }
  }
  return {
    addedCount,
    removedCount,
    modifiedCount,
    changedCount: addedCount + removedCount + modifiedCount,
    hunkCount: 0,
  };
}

function buildRawDiffLines(beforeText: string, afterText: string) {
  const rawLines: DiffPreviewLine[] = [];
  let oldLine = 1;
  let newLine = 1;
  const changes = diffLines(
    normalizeDiffText(beforeText),
    normalizeDiffText(afterText),
  );

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index];
    const lines = splitPreviewLines(change.value || "");
    if (!change.added && !change.removed) {
      for (const line of lines) {
        rawLines.push({
          kind: "context",
          text: line,
          oldLine,
          newLine,
        });
        oldLine += 1;
        newLine += 1;
      }
      continue;
    }

    const next = changes[index + 1];
    const isModifiedPair =
      (change.removed && next?.added) || (change.added && next?.removed);
    if (isModifiedPair && next) {
      const removedLines = change.removed
        ? lines
        : splitPreviewLines(next.value || "");
      const addedLines = change.added
        ? lines
        : splitPreviewLines(next.value || "");
      const pairCount = Math.max(removedLines.length, addedLines.length);
      for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
        const removedLine = removedLines[pairIndex];
        const addedLine = addedLines[pairIndex];
        if (typeof removedLine === "string" && typeof addedLine === "string") {
          rawLines.push({
            kind: "modified-old",
            text: removedLine,
            oldLine,
          });
          rawLines.push({
            kind: "modified-new",
            text: addedLine,
            newLine,
          });
          oldLine += 1;
          newLine += 1;
        } else if (typeof removedLine === "string") {
          rawLines.push({
            kind: "removed",
            text: removedLine,
            oldLine,
          });
          oldLine += 1;
        } else if (typeof addedLine === "string") {
          rawLines.push({
            kind: "added",
            text: addedLine,
            newLine,
          });
          newLine += 1;
        }
      }
      index += 1;
      continue;
    }

    if (change.removed) {
      for (const line of lines) {
        rawLines.push({
          kind: "removed",
          text: line,
          oldLine,
        });
        oldLine += 1;
      }
      continue;
    }

    for (const line of lines) {
      rawLines.push({
        kind: "added",
        text: line,
        newLine,
      });
      newLine += 1;
    }
  }

  return rawLines;
}

function mergeRanges(ranges: Array<{ start: number; end: number }>) {
  if (!ranges.length) {
    return [] as Array<{ start: number; end: number }>;
  }
  const merged = [ranges[0]];
  for (const range of ranges.slice(1)) {
    const previous = merged[merged.length - 1];
    if (range.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push(range);
    }
  }
  return merged;
}

function resolveHunkRange(
  lines: DiffPreviewLine[],
  key: "oldLine" | "newLine",
) {
  const values = lines
    .map((line) => line[key])
    .filter((value): value is number => typeof value === "number");
  if (!values.length) {
    return { start: 0, end: 0 };
  }
  return {
    start: values[0],
    end: values[values.length - 1],
  };
}

function buildHunk(lines: DiffPreviewLine[]) {
  const summary = summarizeLines(lines);
  const oldRange = resolveHunkRange(lines, "oldLine");
  const newRange = resolveHunkRange(lines, "newLine");
  return {
    oldStart: oldRange.start,
    oldEnd: oldRange.end,
    newStart: newRange.start,
    newEnd: newRange.end,
    lines,
    addedCount: summary.addedCount,
    removedCount: summary.removedCount,
    modifiedCount: summary.modifiedCount,
  } satisfies DiffPreviewHunk;
}

export function buildDiffPreviewModel(
  beforeText: string,
  afterText: string,
  options: {
    contextLines?: number;
  } = {},
): DiffPreviewModel {
  const contextLines = Math.max(0, options.contextLines ?? 2);
  const rawLines = buildRawDiffLines(beforeText, afterText);
  const changedIndexes = rawLines
    .map((line, index) => (isChangedLine(line) ? index : -1))
    .filter((index) => index >= 0);

  if (!changedIndexes.length) {
    return {
      hunks: [],
      summary: {
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 0,
        changedCount: 0,
        hunkCount: 0,
      },
    };
  }

  const ranges = mergeRanges(
    changedIndexes.map((index) => ({
      start: Math.max(0, index - contextLines),
      end: Math.min(rawLines.length - 1, index + contextLines),
    })),
  );

  const hunks = ranges.map((range) =>
    buildHunk(rawLines.slice(range.start, range.end + 1)),
  );
  const summary = hunks.reduce<DiffPreviewSummary>(
    (result, hunk) => ({
      addedCount: result.addedCount + hunk.addedCount,
      removedCount: result.removedCount + hunk.removedCount,
      modifiedCount: result.modifiedCount + hunk.modifiedCount,
      changedCount:
        result.changedCount +
        hunk.addedCount +
        hunk.removedCount +
        hunk.modifiedCount,
      hunkCount: result.hunkCount + 1,
    }),
    {
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
      changedCount: 0,
      hunkCount: 0,
    },
  );

  return {
    hunks,
    summary,
  };
}

function padLineNumber(value?: number) {
  return typeof value === "number" ? String(value).padStart(4, " ") : "    ";
}

function formatHunkHeader(hunk: DiffPreviewHunk, index: number, isZh: boolean) {
  return `@@ ${isZh ? "片段" : "Hunk"} ${index + 1} | old ${hunk.oldStart}-${hunk.oldEnd} -> new ${hunk.newStart}-${hunk.newEnd} | ~${hunk.modifiedCount} +${hunk.addedCount} -${hunk.removedCount}`;
}

function formatPreviewLine(line: DiffPreviewLine) {
  switch (line.kind) {
    case "added":
      return `+ new ${padLineNumber(line.newLine)} | ${formatPreviewText(line.text)}`;
    case "removed":
      return `- old ${padLineNumber(line.oldLine)} | ${formatPreviewText(line.text)}`;
    case "modified-old":
      return `~ old ${padLineNumber(line.oldLine)} | ${formatPreviewText(line.text)}`;
    case "modified-new":
      return `~ new ${padLineNumber(line.newLine)} | ${formatPreviewText(line.text)}`;
    default:
      return `  ${padLineNumber(line.oldLine)} ${padLineNumber(line.newLine)} | ${formatPreviewText(line.text)}`;
  }
}

export function formatDiffPreviewSummary(
  summary: DiffPreviewSummary,
  options: {
    isZh?: boolean;
    includeHunkCount?: boolean;
  } = {},
) {
  const isZh = Boolean(options.isZh);
  const summaryText = `${isZh ? "修改" : "Modified"} ~${summary.modifiedCount}  ${isZh ? "新增" : "Added"} +${summary.addedCount}  ${isZh ? "删除" : "Removed"} -${summary.removedCount}`;
  if (!options.includeHunkCount) {
    return summaryText;
  }
  return `${summaryText}  ${isZh ? "片段" : "Hunks"} ${summary.hunkCount}`;
}

export function formatDiffPreviewText(
  title: string,
  beforeText: string,
  afterText: string,
  options: {
    isZh?: boolean;
    contextLines?: number;
    maxOutputLines?: number;
    maxHunks?: number;
  } = {},
) {
  const isZh = Boolean(options.isZh);
  const maxOutputLines = Math.max(40, options.maxOutputLines ?? 220);
  const maxHunks = Math.max(1, options.maxHunks ?? Number.MAX_SAFE_INTEGER);
  const model = buildDiffPreviewModel(beforeText, afterText, {
    contextLines: options.contextLines,
  });
  const output = [
    `## ${title}`,
    formatDiffPreviewSummary(model.summary, {
      isZh,
      includeHunkCount: true,
    }),
  ];

  if (!model.hunks.length) {
    output.push(isZh ? "没有正文差异。" : "No content changes.");
    return output.join("\n").trim();
  }

  let emittedLines = output.length;
  for (const [index, hunk] of model.hunks.entries()) {
    if (index >= maxHunks) {
      output.push(
        isZh
          ? "... 已截断更多 diff 片段 ..."
          : "... more diff hunks truncated ...",
      );
      break;
    }
    const hunkLines = [
      formatHunkHeader(hunk, index, isZh),
      ...hunk.lines.map((line) => formatPreviewLine(line)),
    ];
    if (emittedLines + hunkLines.length > maxOutputLines) {
      output.push(
        isZh
          ? "... 已截断更多 diff 内容 ..."
          : "... more diff content truncated ...",
      );
      break;
    }
    output.push(...hunkLines);
    emittedLines += hunkLines.length;
  }

  return output.join("\n").trim();
}
