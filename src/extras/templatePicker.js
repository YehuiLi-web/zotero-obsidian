"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const package_json_1 = require("../../package.json");
document.addEventListener("DOMContentLoaded", (ev) => {
    init();
});
document.addEventListener("dialogaccept", () => accept());
window.addEventListener("unload", () => {
    var _a;
    (_a = args.deferred) === null || _a === void 0 ? void 0 : _a.resolve();
});
let args = window.arguments[0];
if (!args.deferred) {
    args = args.wrappedJSObject;
}
const templateData = args.templates || [];
templateData.sort();
const multiSelect = args.multiSelect;
const initialSelected = Array.isArray(args.selected) ? args.selected : [];
let tableHelper;
function init() {
    initTable();
    requestIdleCallback(() => {
        window.sizeToContent();
    });
}
function accept() {
    const selection = tableHelper.treeInstance.selection;
    let selected = Array.from(selection.selected);
    if (!selected.length && Number.isInteger(selection.focused)) {
        selected = [selection.focused];
    }
    args.selected = selected.map((index) => templateData[index]);
}
// @ts-ignore - plugin instance
const getString = Zotero[package_json_1.config.addonRef].api.utils.getString;
function initTable() {
    tableHelper = new zotero_plugin_toolkit_1.VirtualizedTableHelper(window)
        .setContainerId("table-container")
        .setProp({
        id: "templates-table",
        // Do not use setLocale, as it modifies the Zotero.Intl.strings
        // Set locales directly to columns
        columns: [
            {
                dataKey: "type",
                label: "templateEditor-templateType",
                width: 60,
                fixedWidth: true,
            },
            {
                dataKey: "name",
                label: "templateEditor-templateName",
                fixedWidth: false,
            },
        ].map((column) => Object.assign(column, {
            label: getString(column.label),
        })),
        showHeader: true,
        multiSelect: multiSelect,
        staticColumns: true,
        disableFontSizeScaling: true,
    })
        .setProp("getRowCount", () => templateData.length)
        .setProp("getRowData", getRowData)
        .setProp("getRowString", (index) => templateData[index] || "")
        .setProp("renderItem", (index, selection, oldElem, columns) => {
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
        const rowData = getRowData(index);
        for (const column of columns) {
            const span = document.createElement("span");
            // @ts-ignore
            span.className = `cell ${column === null || column === void 0 ? void 0 : column.className}`;
            const cellData = rowData[column.dataKey];
            span.textContent = cellData;
            if (column.dataKey === "type") {
                span.style.backgroundColor = getRowLabelColor(cellData);
                span.style.borderRadius = "4px";
                span.style.paddingInline = "4px";
                span.style.marginInline = "2px -2px";
                span.style.textAlign = "center";
                span.textContent = getString("templateEditor-templateDisplayType", cellData);
            }
            div.append(span);
        }
        return div;
    })
        .render();
    if (initialSelected.length) {
        requestAnimationFrame(() => {
            const firstIndex = templateData.findIndex((templateName) => templateName === initialSelected[0]);
            if (firstIndex >= 0) {
                tableHelper.treeInstance.selection.select(firstIndex);
            }
        });
    }
}
function getRowData(index) {
    const rowData = templateData[index];
    if (!rowData) {
        return {
            name: "",
            type: "unknown",
        };
    }
    let templateType = "unknown";
    let templateDisplayName = rowData;
    if (rowData.toLowerCase().startsWith("[item]")) {
        templateType = "item";
        templateDisplayName = rowData.slice(6);
    }
    else if (rowData.toLowerCase().startsWith("[text]")) {
        templateType = "text";
        templateDisplayName = rowData.slice(6);
    }
    return {
        name: templateDisplayName,
        type: templateType,
    };
}
function getRowLabelColor(type) {
    switch (type) {
        case "system":
            return "var(--accent-yellow)";
        case "item":
            return "var(--accent-green)";
        case "text":
            return "var(--accent-azure)";
        default:
            return "var(--accent-red)";
    }
}
