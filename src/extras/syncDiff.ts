import { Change } from "diff";
import { VirtualizedTableHelper, wait } from "zotero-plugin-toolkit";
import {
  buildDiffPreviewModel,
  formatDiffPreviewSummary,
} from "../modules/sync/diffPreview";

const _require = window.require;
const { getCSSItemTypeIcon } = _require("components/icons");

window.goBuildEditContextMenu = () => {};

type DiffData = Change & {
  id: number;
  text: string;
};

type DiffChunkRow = {
  id: number;
  added: boolean;
  removed: boolean;
  preview: string;
  detail: string;
};

function diffText(zh: string, en: string) {
  return String(Zotero.locale || "")
    .toLowerCase()
    .startsWith("zh")
    ? zh
    : en;
}

const io: {
  defer: _ZoteroTypes.Promise.DeferredPromise<void>;
  result: string;
  type: "skip" | "finish" | "unsync";
  imageData: Record<string, string>;
  diffData: DiffData[];
  syncInfo: {
    noteName: string;
    noteModify: string;
    mdName: string;
    mdModify: string;
    syncTime: string;
  };
  noteText: string;
  mdText: string;
} = window.arguments[0].wrappedJSObject;
const checkedIDs: Set<number> = new Set();
const changedDiffData: DiffData[] = io.diffData.filter(
  (diff) => diff.added || diff.removed,
);
const linePreviewModel = buildDiffPreviewModel(
  io.noteText || "",
  io.mdText || "",
  {
    contextLines: 2,
  },
);
const changedDiffRows: DiffChunkRow[] = changedDiffData.map((diff) => {
  const normalized = String(diff.value || "").replace(/\r\n/g, "\n");
  const previewSource = normalized.trim() || normalized;
  const preview = previewSource
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .slice(0, 2)
    .join(" / ")
    .trim();
  const lineCount = normalized
    .split("\n")
    .filter(
      (line, index, lines) => line.length > 0 || index < lines.length - 1,
    ).length;
  return {
    id: diff.id,
    added: Boolean(diff.added),
    removed: Boolean(diff.removed),
    preview: preview || "<empty>",
    detail: `${diff.added ? diffText("新增", "Added") : diffText("删除", "Removed")} · ${
      lineCount || 1
    } ${diffText("行", "lines")} · ${normalized.length} ${diffText("字符", "chars")}`,
  };
});

function initSyncInfo() {
  console.log(io.syncInfo);
  const diffDesc = document.querySelector("#diff-desc") as HTMLSpanElement;
  diffDesc.dataset.l10nArgs = JSON.stringify({
    title: `Last sync time: ${io.syncInfo.syncTime}`,
  });

  const diffNoteBtn = document.querySelector(
    "#diff-note-btn",
  ) as HTMLButtonElement;
  const diffNoteBtnImg = getCSSItemTypeIcon("note");
  diffNoteBtnImg.classList.add("diff-btn-img");
  diffNoteBtn
    .querySelector(".diff-btn-inner")
    ?.replaceChild(diffNoteBtnImg, diffNoteBtn.querySelector(".diff-btn-img")!);
  diffNoteBtn.querySelector(".diff-btn-inner-text")!.textContent =
    io.syncInfo.noteName;
  diffNoteBtn.dataset.l10nArgs = JSON.stringify({
    title: io.syncInfo.noteModify,
  });
  diffNoteBtn.addEventListener("click", (e) => {
    toggleAll(false);
  });

  const diffMdBtn = document.querySelector("#diff-md-btn") as HTMLButtonElement;
  diffMdBtn.querySelector(".diff-btn-inner-text")!.textContent =
    io.syncInfo.mdName;
  diffMdBtn.dataset.l10nArgs = JSON.stringify({
    title: io.syncInfo.mdModify,
  });
  diffMdBtn.addEventListener("click", (e) => {
    toggleAll(true);
  });

  const diffBothBtn = document.querySelector(
    "#diff-both-btn",
  ) as HTMLButtonElement;
  diffBothBtn.addEventListener("click", (e) => {
    checkedIDs.clear();
    for (const diff of changedDiffData) {
      if (diff.added) {
        checkedIDs.add(diff.id);
      }
    }
    updateDiffRender();
    vtableHelper.render();
  });

  (document.querySelector("#added-count") as HTMLDivElement).textContent =
    `~${linePreviewModel.summary.modifiedCount} +${linePreviewModel.summary.addedCount}`;
  (document.querySelector("#removed-count") as HTMLDivElement).textContent =
    `-${linePreviewModel.summary.removedCount}`;
}

let vtableHelper: VirtualizedTableHelper;

function initList() {
  document.querySelector("#select-all")?.addEventListener("change", (e) => {
    toggleAll((e.target as HTMLInputElement).checked);
  });

  vtableHelper = new VirtualizedTableHelper(window)
    .setContainerId("table-container")
    .setProp({
      id: "zob-sync-diff",
      columns: [
        {
          dataKey: "value",
          label: "Changes",
          fixedWidth: false,
        },
      ],
      showHeader: false,
      multiSelect: false,
      staticColumns: true,
      disableFontSizeScaling: true,
    })
    .setProp("getRowCount", () => changedDiffRows.length)
    .setProp("getRowData", (index) => {
      const diff = changedDiffRows[index];
      return {
        value: diff?.preview || "",
      };
    })
    .setProp("onKeyDown", (e) => {
      if (e.key === "Enter") {
        const index = vtableHelper.treeInstance.selection.focused;
        toggleRow(changedDiffRows[index].id);
        return false;
      }
      return true;
    })
    .setProp("onActivate", (e) => {
      const index = vtableHelper.treeInstance.selection.focused;
      toggleRow(changedDiffRows[index].id);
      return false;
    })
    .setProp("renderItem", (index, selection, oldElem, columns) => {
      const diff = changedDiffRows[index];
      if (!diff) {
        return document.createElement("div");
      }
      let div: HTMLDivElement;
      if (oldElem) {
        div = oldElem as HTMLDivElement;
        div.innerHTML = "";
      } else {
        div = document.createElement("div");
        div.className = "row";
      }

      div.classList.toggle("selected", selection.isSelected(index));
      div.classList.toggle("focused", selection.focused == index);
      div.classList.toggle("diff-added", !!diff.added);
      div.classList.toggle("diff-removed", !!diff.removed);

      // Only one column
      const column = columns[0];
      const cell = document.createElement("div");
      // @ts-ignore
      cell.className = `cell ${column.className}`;
      cell.classList.add("diff-row-cell");

      // Append a checkbox before the text
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = checkedIDs.has(diff.id);
      checkbox.addEventListener("change", (e) => {
        if (checkbox.checked) {
          checkedIDs.add(diff.id);
        } else {
          checkedIDs.delete(diff.id);
        }
        updateDiffRender();
      });
      cell.appendChild(checkbox);

      const body = document.createElement("div");
      body.className = "diff-row-body";

      const badge = document.createElement("span");
      badge.className = `diff-row-badge ${diff.added ? "is-added" : "is-removed"}`;
      badge.textContent = diff.added
        ? diffText("新增", "ADD")
        : diffText("删除", "DEL");
      body.appendChild(badge);

      const content = document.createElement("div");
      content.className = "diff-row-content";

      const preview = document.createElement("div");
      preview.className = "diff-row-preview";
      preview.textContent = diff.preview;
      content.appendChild(preview);

      const detail = document.createElement("div");
      detail.className = "diff-row-detail";
      detail.textContent = diff.detail;
      content.appendChild(detail);

      body.appendChild(content);
      cell.appendChild(body);

      div.appendChild(cell);
      return div;
    })
    .render();
}

function toggleRow(index: number) {
  if (checkedIDs.has(index)) {
    checkedIDs.delete(index);
  } else {
    checkedIDs.add(index);
  }
  updateDiffRender();
  vtableHelper.render();
}

function toggleAll(force?: boolean) {
  if (force === undefined) {
    force = checkedIDs.size < changedDiffData.length;
  }
  if (force) {
    for (const diff of changedDiffData) {
      checkedIDs.add(diff.id);
    }
  } else {
    checkedIDs.clear();
  }
  updateDiffRender();
  vtableHelper.render();
}

function initDiffViewer() {
  const diffViewer = document.querySelector(".diff-viewport");
  if (!diffViewer) {
    return;
  }
  diffViewer.innerHTML = "";
  const frag = document.createDocumentFragment();

  const summary = document.createElement("div");
  summary.className = "diff-summary";
  summary.textContent = formatDiffPreviewSummary(linePreviewModel.summary, {
    isZh: String(Zotero.locale || "")
      .toLowerCase()
      .startsWith("zh"),
    includeHunkCount: true,
  });
  frag.append(summary);

  for (const [index, hunk] of linePreviewModel.hunks.entries()) {
    const hunkElement = document.createElement("section");
    hunkElement.className = "diff-hunk";

    const header = document.createElement("div");
    header.className = "diff-hunk-header";
    header.textContent = `@@ ${diffText("片段", "Hunk")} ${index + 1} | old ${
      hunk.oldStart
    }-${hunk.oldEnd} -> new ${hunk.newStart}-${hunk.newEnd} | ~${hunk.modifiedCount} +${
      hunk.addedCount
    } -${hunk.removedCount}`;
    hunkElement.append(header);

    for (const line of hunk.lines) {
      const row = document.createElement("div");
      row.className = `diff-line diff-line-${line.kind}`;

      const oldLine = document.createElement("span");
      oldLine.className = "diff-line-number";
      oldLine.textContent =
        typeof line.oldLine === "number" ? String(line.oldLine) : "";
      row.append(oldLine);

      const newLine = document.createElement("span");
      newLine.className = "diff-line-number";
      newLine.textContent =
        typeof line.newLine === "number" ? String(line.newLine) : "";
      row.append(newLine);

      const marker = document.createElement("span");
      marker.className = "diff-line-marker";
      marker.textContent =
        line.kind === "added"
          ? "+"
          : line.kind === "removed"
            ? "-"
            : line.kind === "modified-old" || line.kind === "modified-new"
              ? "~"
              : " ";
      row.append(marker);

      const text = document.createElement("span");
      text.className = "diff-line-text";
      text.textContent = line.text || "<empty>";
      row.append(text);

      hunkElement.append(row);
    }

    frag.append(hunkElement);
  }

  diffViewer.append(frag);
}

async function updateDiffRender() {
  console.log("update render");
  console.log(checkedIDs);
  const result = io.diffData
    .filter((diff) => {
      return (
        (diff.added && checkedIDs.has(diff.id)) ||
        (diff.removed && !checkedIDs.has(diff.id)) ||
        (!diff.added && !diff.removed)
      );
    })
    .map((diff) => diff.value)
    .join("");
  const renderViewer = document.querySelector(
    ".render-viewport",
  ) as EditorElement;
  renderViewer.mode = "merge";
  const item = new Zotero.Item("note");
  item.libraryID = 1;
  item.setNote(result);
  renderViewer.item = item;

  await wait.waitUtilAsync(() => !!renderViewer._editorInstance);
  await renderViewer._editorInstance._initPromise;

  renderViewer._iframe.contentDocument
    ?.querySelectorAll("img[data-attachment-key]")
    .forEach((e) => {
      (e as HTMLImageElement).src =
        io.imageData[e.getAttribute("data-attachment-key") as string];
    });
  io.result = result;

  const diffViewer = document.querySelector(".diff-viewport") as HTMLElement;

  syncScroller(
    diffViewer,
    renderViewer._iframe.contentDocument!.querySelector(".editor-core")!,
  );

  // Update check all status
  const selectAll = document.querySelector("#select-all") as HTMLInputElement;
  const allSelected = checkedIDs.size >= changedDiffData.length;
  let bothKept = false;
  if (!allSelected) {
    // All added are selected and all removed are not selected
    bothKept = !changedDiffData.find((diff) => {
      return (
        (diff.added && !checkedIDs.has(diff.id)) ||
        (diff.removed && checkedIDs.has(diff.id))
      );
    });
  }
  selectAll.checked = allSelected;

  // Update button status
  const noteBtn = document.querySelector("#diff-note-btn") as HTMLButtonElement;
  const mdBtn = document.querySelector("#diff-md-btn") as HTMLButtonElement;
  const bothBtn = document.querySelector("#diff-both-btn") as HTMLButtonElement;
  noteBtn.classList.toggle("selected", checkedIDs.size === 0);
  mdBtn.classList.toggle("selected", allSelected);
  bothBtn.classList.toggle("selected", bothKept);
}

const syncScrollNodes: HTMLElement[] = [];

// https://juejin.cn/post/6844904020281147405
const syncScroller = function (...nodes: HTMLElement[]) {
  const max = nodes.length;
  if (!max || max === 1) return;
  syncScrollNodes.splice(0, syncScrollNodes.length, ...nodes);
  let sign = 0;
  nodes.forEach((ele) => {
    if (!ele) return;
    if (ele.dataset.scrollSync) return;
    ele.dataset.scrollSync = "true";
    ele.addEventListener("scroll", function (event) {
      const target = event.target as HTMLElement;
      if (target !== ele) return;
      if (!sign) {
        sign = max - 1;
        const top =
          target.scrollTop / (target.scrollHeight - target.clientHeight);
        const left =
          target.scrollLeft / (target.scrollWidth - target.clientWidth);
        for (const node of syncScrollNodes) {
          if (node == target) continue;
          node.scrollTo(
            left * (node.scrollWidth - node.clientWidth),
            top * (node.scrollHeight - node.clientHeight),
          );
        }
      } else --sign;
    });
  });
};

window.addEventListener("DOMContentLoaded", async (e) => {
  if (e.target !== document) {
    return;
  }
  initSyncInfo();
  initList();
  initDiffViewer();
  await updateDiffRender();

  document.querySelector("#finish")?.addEventListener("click", (e) => {
    io.type = "finish";
    window.close();
  });
  document.querySelector("#unsync")?.addEventListener("click", (e) => {
    if (confirm("This note will not be synced any more. Continue?")) {
      io.type = "unsync";
      window.close();
    }
  });
  document.querySelector("#skip")?.addEventListener("click", (e) => {
    io.type = "skip";
    window.close();
  });
});

window.addEventListener("unload", (e) => {
  io.defer.resolve();
});
