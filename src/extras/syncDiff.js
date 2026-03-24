"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const _require = window.require;
const { getCSSItemTypeIcon } = _require("components/icons");
window.goBuildEditContextMenu = () => { };
const io = window.arguments[0].wrappedJSObject;
const checkedIDs = new Set();
const changedDiffData = io.diffData.filter((diff) => diff.added || diff.removed);
function initSyncInfo() {
    var _a;
    console.log(io.syncInfo);
    const diffDesc = document.querySelector("#diff-desc");
    diffDesc.dataset.l10nArgs = JSON.stringify({
        title: `Last sync time: ${io.syncInfo.syncTime}`,
    });
    const diffNoteBtn = document.querySelector("#diff-note-btn");
    const diffNoteBtnImg = getCSSItemTypeIcon("note");
    diffNoteBtnImg.classList.add("diff-btn-img");
    (_a = diffNoteBtn
        .querySelector(".diff-btn-inner")) === null || _a === void 0 ? void 0 : _a.replaceChild(diffNoteBtnImg, diffNoteBtn.querySelector(".diff-btn-img"));
    diffNoteBtn.querySelector(".diff-btn-inner-text").textContent =
        io.syncInfo.noteName;
    diffNoteBtn.dataset.l10nArgs = JSON.stringify({
        title: io.syncInfo.noteModify,
    });
    diffNoteBtn.addEventListener("click", (e) => {
        toggleAll(false);
    });
    const diffMdBtn = document.querySelector("#diff-md-btn");
    diffMdBtn.querySelector(".diff-btn-inner-text").textContent =
        io.syncInfo.mdName;
    diffMdBtn.dataset.l10nArgs = JSON.stringify({
        title: io.syncInfo.mdModify,
    });
    diffMdBtn.addEventListener("click", (e) => {
        toggleAll(true);
    });
    const diffBothBtn = document.querySelector("#diff-both-btn");
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
    document.querySelector("#added-count").textContent =
        "+" + io.diffData.filter((diff) => diff.added).length.toString();
    document.querySelector("#removed-count").textContent =
        "-" + io.diffData.filter((diff) => diff.removed).length.toString();
}
let vtableHelper;
function initList() {
    var _a;
    (_a = document.querySelector("#select-all")) === null || _a === void 0 ? void 0 : _a.addEventListener("change", (e) => {
        toggleAll(e.target.checked);
    });
    vtableHelper = new zotero_plugin_toolkit_1.VirtualizedTableHelper(window)
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
        .setProp("getRowCount", () => changedDiffData.length)
        .setProp("getRowData", (index) => {
        const diff = changedDiffData[index];
        return {
            value: (diff === null || diff === void 0 ? void 0 : diff.value) || "",
        };
    })
        .setProp("onKeyDown", (e) => {
        if (e.key === "Enter") {
            const index = vtableHelper.treeInstance.selection.focused;
            toggleRow(changedDiffData[index].id);
            return false;
        }
        return true;
    })
        .setProp("onActivate", (e) => {
        const index = vtableHelper.treeInstance.selection.focused;
        toggleRow(changedDiffData[index].id);
        return false;
    })
        .setProp("renderItem", (index, selection, oldElem, columns) => {
        const diff = changedDiffData[index];
        if (!diff) {
            return document.createElement("div");
        }
        let div;
        if (oldElem) {
            div = oldElem;
            div.innerHTML = "";
        }
        else {
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
        // Append a checkbox before the text
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = checkedIDs.has(diff.id);
        checkbox.addEventListener("change", (e) => {
            if (checkbox.checked) {
                checkedIDs.add(diff.id);
            }
            else {
                checkedIDs.delete(diff.id);
            }
            updateDiffRender();
        });
        cell.appendChild(checkbox);
        const span = document.createElement("span");
        span.textContent = diff.value;
        cell.appendChild(span);
        div.appendChild(cell);
        return div;
    })
        .render();
}
function toggleRow(index) {
    if (checkedIDs.has(index)) {
        checkedIDs.delete(index);
    }
    else {
        checkedIDs.add(index);
    }
    updateDiffRender();
    vtableHelper.render();
}
function toggleAll(force) {
    if (force === undefined) {
        force = checkedIDs.size < changedDiffData.length;
    }
    if (force) {
        for (const diff of changedDiffData) {
            checkedIDs.add(diff.id);
        }
    }
    else {
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
    io.diffData.forEach((diff) => {
        const span = document.createElement("span");
        span.className = diff.added ? "added" : diff.removed ? "removed" : "normal";
        span.innerText = diff.value;
        frag.append(span);
    });
    diffViewer.append(frag);
}
function updateDiffRender() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log("update render");
        console.log(checkedIDs);
        const result = io.diffData
            .filter((diff) => {
            return ((diff.added && checkedIDs.has(diff.id)) ||
                (diff.removed && !checkedIDs.has(diff.id)) ||
                (!diff.added && !diff.removed));
        })
            .map((diff) => diff.value)
            .join("");
        const renderViewer = document.querySelector(".render-viewport");
        renderViewer.mode = "merge";
        const item = new Zotero.Item("note");
        item.libraryID = 1;
        item.setNote(result);
        renderViewer.item = item;
        yield zotero_plugin_toolkit_1.wait.waitUtilAsync(() => !!renderViewer._editorInstance);
        yield renderViewer._editorInstance._initPromise;
        (_a = renderViewer._iframe.contentDocument) === null || _a === void 0 ? void 0 : _a.querySelectorAll("img[data-attachment-key]").forEach((e) => {
            e.src =
                io.imageData[e.getAttribute("data-attachment-key")];
        });
        io.result = result;
        const diffViewer = document.querySelector(".diff-viewport");
        syncScroller(diffViewer, renderViewer._iframe.contentDocument.querySelector(".editor-core"));
        // Update check all status
        const selectAll = document.querySelector("#select-all");
        const allSelected = checkedIDs.size >= changedDiffData.length;
        let bothKept = false;
        if (!allSelected) {
            // All added are selected and all removed are not selected
            bothKept = !changedDiffData.find((diff) => {
                return ((diff.added && !checkedIDs.has(diff.id)) ||
                    (diff.removed && checkedIDs.has(diff.id)));
            });
        }
        selectAll.checked = allSelected;
        // Update button status
        const noteBtn = document.querySelector("#diff-note-btn");
        const mdBtn = document.querySelector("#diff-md-btn");
        const bothBtn = document.querySelector("#diff-both-btn");
        noteBtn.classList.toggle("selected", checkedIDs.size === 0);
        mdBtn.classList.toggle("selected", allSelected);
        bothBtn.classList.toggle("selected", bothKept);
    });
}
const syncScrollNodes = [];
// https://juejin.cn/post/6844904020281147405
const syncScroller = function (...nodes) {
    const max = nodes.length;
    if (!max || max === 1)
        return;
    syncScrollNodes.splice(0, syncScrollNodes.length, ...nodes);
    let sign = 0;
    nodes.forEach((ele) => {
        if (!ele)
            return;
        if (ele.dataset.scrollSync)
            return;
        ele.dataset.scrollSync = "true";
        ele.addEventListener("scroll", function (event) {
            const target = event.target;
            if (target !== ele)
                return;
            if (!sign) {
                sign = max - 1;
                const top = target.scrollTop / (target.scrollHeight - target.clientHeight);
                const left = target.scrollLeft / (target.scrollWidth - target.clientWidth);
                for (const node of syncScrollNodes) {
                    if (node == target)
                        continue;
                    node.scrollTo(left * (node.scrollWidth - node.clientWidth), top * (node.scrollHeight - node.clientHeight));
                }
            }
            else
                --sign;
        });
    });
};
window.addEventListener("DOMContentLoaded", (e) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (e.target !== document) {
        return;
    }
    initSyncInfo();
    initList();
    initDiffViewer();
    yield updateDiffRender();
    (_a = document.querySelector("#finish")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", (e) => {
        io.type = "finish";
        window.close();
    });
    (_b = document.querySelector("#unsync")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", (e) => {
        if (confirm("This note will not be synced any more. Continue?")) {
            io.type = "unsync";
            window.close();
        }
    });
    (_c = document.querySelector("#skip")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", (e) => {
        io.type = "skip";
        window.close();
    });
}));
window.addEventListener("unload", (e) => {
    io.defer.resolve();
});
