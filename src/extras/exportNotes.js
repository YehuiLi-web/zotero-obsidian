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
const prefs_1 = require("../utils/prefs");
let io;
window.onload = function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (document.readyState === "complete") {
            setTimeout(init, 0);
            return;
        }
        document.addEventListener("DOMContentLoaded", init, { once: true });
    });
};
window.onunload = function () {
    io.deferred && io.deferred.resolve();
};
function init() {
    const dialog = document.querySelector("dialog");
    Zotero.UIProperties.registerRoot(dialog);
    io = window.arguments[0];
    window.addEventListener("dialogaccept", doAccept);
    window.addEventListener("dialogextra1", () => doUseBuiltInExport());
    document
        .querySelector("#format")
        .addEventListener("command", onFormatChange);
    document
        .querySelector("#linkMode")
        .addEventListener("command", updateMarkdownOptions);
    document
        .querySelector("#markdown-autoSync")
        .addEventListener("command", updateMarkdownOptions);
    document
        .querySelector("#useDefaultExport")
        .addEventListener("command", () => {
        doUseBuiltInExport();
    });
    document.querySelector("#target").dataset.l10nArgs =
        JSON.stringify(io.targetData);
    restore();
    onFormatChange();
    updateMarkdownOptions();
}
function restore() {
    let format = (0, prefs_1.getPref)("export.format");
    if (!["markdown", "msword", "pdf", "freemind", "note", "latex"].includes(format)) {
        format = "markdown";
    }
    document.querySelector("#format").value = format;
    let linkMode = (0, prefs_1.getPref)("export.linkMode");
    if (!["keep", "embed", "standalone", "remove"].includes(linkMode)) {
        linkMode = "keep";
    }
    document.querySelector("#linkMode").value =
        linkMode;
    const markdownPrefs = ["autoSync", "withYAMLHeader", "autoFilename"];
    for (const pref of markdownPrefs) {
        document.querySelector(`#markdown-${pref}`).checked = (0, prefs_1.getPref)(`export.markdown-${pref}`);
    }
}
function cache() {
    (0, prefs_1.setPref)("export.format", document.querySelector("#format").value);
    (0, prefs_1.setPref)("export.linkMode", document.querySelector("#linkMode").value);
    const markdownPrefs = ["autoSync", "withYAMLHeader", "autoFilename"];
    for (const pref of markdownPrefs) {
        (0, prefs_1.setPref)(`export.markdown-${pref}`, document.querySelector(`#markdown-${pref}`)
            .checked);
    }
}
function onFormatChange() {
    const format = document.querySelector("#format")
        .value;
    const isMD = format === "markdown";
    const isLaTeX = format === "latex";
    const noteItems = Zotero.getMainWindow().ZoteroPane.getSelectedItems();
    document.querySelector("#markdown-options").hidden = !isMD;
    document.querySelector("#latex-options").hidden =
        !isLaTeX || noteItems.length == 1;
    window.sizeToContent();
}
function updateMarkdownOptions() {
    const linkModeRadio = document.querySelector("#linkMode");
    const autoSyncRadio = document.querySelector("#markdown-autoSync");
    if (linkModeRadio.value !== "standalone") {
        autoSyncRadio.checked = false;
        autoSyncRadio.disabled = true;
    }
    else {
        autoSyncRadio.disabled = false;
    }
    const autoFilename = document.querySelector("#markdown-autoFilename");
    const withYAMLHeader = document.querySelector("#markdown-withYAMLHeader");
    if (autoSyncRadio.checked) {
        autoFilename.checked = true;
        autoFilename.disabled = true;
        withYAMLHeader.checked = true;
        withYAMLHeader.disabled = true;
    }
    else {
        autoFilename.disabled = false;
        withYAMLHeader.disabled = false;
    }
}
function doAccept() {
    cache();
    // Format
    const format = document.querySelector("#format")
        .value;
    io.exportMD = format === "markdown";
    io.exportDocx = format === "msword";
    io.exportPDF = format === "pdf";
    io.exportFreeMind = format === "freemind";
    io.exportNote = format === "note";
    io.exportLatex = format === "latex";
    // Markdown options
    io.autoMDFileName = document.querySelector("#markdown-autoFilename").checked;
    io.withYAMLHeader = document.querySelector("#markdown-withYAMLHeader").checked;
    io.setAutoSync = document.querySelector("#markdown-autoSync").checked;
    // LaTeX options
    io.mergeLatex = document.querySelector("#latex-merge").checked;
    // Link mode
    const linkMode = document.querySelector("#linkMode")
        .value;
    io.embedLink = linkMode === "embed";
    io.standaloneLink = linkMode === "standalone";
    io.accepted = true;
}
function doUseBuiltInExport() {
    io.useBuiltInExport = true;
    window.close();
}
