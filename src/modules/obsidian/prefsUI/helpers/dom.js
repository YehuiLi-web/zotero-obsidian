"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrefWindowDocument = getPrefWindowDocument;
exports.setPrefElementValue = setPrefElementValue;
exports.setPrefElementChecked = setPrefElementChecked;
exports.getPrefElement = getPrefElement;
exports.toPrefXHTMLMarkup = toPrefXHTMLMarkup;
exports.createPrefHTMLElement = createPrefHTMLElement;
exports.replacePrefHTML = replacePrefHTML;
exports.setPrefRadioValue = setPrefRadioValue;
exports.uiText = uiText;
exports.escapePrefHTML = escapePrefHTML;
exports.getObsidianResolvedPaths = getObsidianResolvedPaths;
exports.getObsidianSettingsRoot = getObsidianSettingsRoot;
const prefs_1 = require("../../../../utils/prefs");
const str_1 = require("../../../../utils/str");
const settings_1 = require("../../settings");
const paths_1 = require("../../paths");
const shared_1 = require("../../shared");
const uiIds_1 = require("../uiIds");
const PREF_XHTML_TAGS = [
    "aside",
    "button",
    "code",
    "details",
    "div",
    "h3",
    "input",
    "label",
    "option",
    "p",
    "pre",
    "section",
    "select",
    "span",
    "summary",
];
function getPrefWindowDocument() {
    var _a;
    const prefWindow = (_a = addon.data.prefs) === null || _a === void 0 ? void 0 : _a.window;
    if (!prefWindow || prefWindow.closed) {
        return null;
    }
    return prefWindow.document;
}
function setPrefElementValue(inputId, value) {
    const doc = getPrefWindowDocument();
    if (!doc) {
        return;
    }
    const input = doc.getElementById(inputId);
    if (input) {
        input.value = value;
    }
}
function setPrefElementChecked(inputId, checked) {
    const doc = getPrefWindowDocument();
    if (!doc) {
        return;
    }
    const input = doc.getElementById(inputId);
    if (input && "checked" in input) {
        input.checked = checked;
    }
}
function getPrefElement(inputId) {
    const doc = getPrefWindowDocument();
    if (!doc) {
        return null;
    }
    return doc.getElementById(inputId);
}
function toPrefXHTMLMarkup(markup) {
    let nextMarkup = String(markup || "").trim();
    for (const tagName of PREF_XHTML_TAGS) {
        const openOrCloseTag = new RegExp(`<(/?)${tagName}(?=[\\s>/])`, "g");
        nextMarkup = nextMarkup.replace(openOrCloseTag, `<$1html:${tagName}`);
    }
    return nextMarkup;
}
function createPrefHTMLElement(doc, tagName) {
    return doc.createElementNS(shared_1.XHTML_NS, tagName);
}
function replacePrefHTML(target, markup) {
    var _a;
    const targetDoc = target.ownerDocument;
    const DOMParserCtor = (_a = targetDoc.defaultView) === null || _a === void 0 ? void 0 : _a.DOMParser;
    if (!DOMParserCtor) {
        throw new Error("DOMParser is not available in the preference window.");
    }
    const parser = new DOMParserCtor();
    const xmlDoc = parser.parseFromString(`<root xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" xmlns:html="${shared_1.XHTML_NS}">${toPrefXHTMLMarkup(markup)}</root>`, "application/xml");
    const parserError = xmlDoc.getElementsByTagName("parsererror")[0];
    if (parserError) {
        throw new Error((0, shared_1.cleanInline)(parserError.textContent || "") ||
            "Failed to parse preference markup.");
    }
    const fragment = targetDoc.createDocumentFragment();
    const nodes = Array.from(xmlDoc.documentElement.childNodes);
    for (const node of nodes) {
        if (!node) {
            continue;
        }
        fragment.appendChild(targetDoc.importNode(node, true));
    }
    target.replaceChildren(fragment);
}
function setPrefRadioValue(name, value) {
    const doc = getPrefWindowDocument();
    if (!doc) {
        return;
    }
    doc
        .querySelectorAll(`input[name="${name}"]`)
        .forEach((input) => {
        input.checked = input.value === value;
    });
}
function uiText(zh, en) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const prefDoc = getPrefWindowDocument();
    const locale = ((_k = [
        (0, shared_1.cleanInline)(((_a = prefDoc === null || prefDoc === void 0 ? void 0 : prefDoc.documentElement) === null || _a === void 0 ? void 0 : _a.getAttribute("lang")) || ""),
        (0, shared_1.cleanInline)(String(((_c = (_b = prefDoc === null || prefDoc === void 0 ? void 0 : prefDoc.defaultView) === null || _b === void 0 ? void 0 : _b.navigator) === null || _c === void 0 ? void 0 : _c.language) || "")),
        (0, shared_1.cleanInline)(String(((_e = (_d = globalThis.Services) === null || _d === void 0 ? void 0 : _d.locale) === null || _e === void 0 ? void 0 : _e.appLocaleAsBCP47) || "")),
        (0, shared_1.cleanInline)(String(((_f = globalThis.navigator) === null || _f === void 0 ? void 0 : _f.language) || "")),
        (0, shared_1.cleanInline)(String(((_j = (_h = (_g = Zotero.getMainWindow) === null || _g === void 0 ? void 0 : _g.call(Zotero)) === null || _h === void 0 ? void 0 : _h.navigator) === null || _j === void 0 ? void 0 : _j.language) || "")),
        (0, shared_1.cleanInline)(String(Zotero.locale || "")),
    ]
        .find(Boolean)) === null || _k === void 0 ? void 0 : _k.toLowerCase()) || "";
    return locale.startsWith("zh") ? zh : en;
}
function escapePrefHTML(doc, value) {
    const span = createPrefHTMLElement(doc, "span");
    span.textContent = value;
    return span.innerHTML;
}
function getObsidianResolvedPaths() {
    const appPath = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.appPath") || ""));
    const vaultRoot = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.vaultRoot") || ""));
    const defaults = (0, settings_1.deriveObsidianPathDefaults)(vaultRoot);
    const notesDirPref = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.notesDir") || ""));
    const assetsDirPref = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)("obsidian.assetsDir") || ""));
    const dashboardDirPref = (0, shared_1.cleanInline)(String((0, prefs_1.getPref)(settings_1.OBSIDIAN_DASHBOARD_DIR_PREF) || ""));
    const notesDir = (0, str_1.formatPath)(notesDirPref || defaults.notesDir);
    const assetsDir = (0, str_1.formatPath)(assetsDirPref ||
        defaults.assetsDir ||
        (notesDir
            ? (0, str_1.jointPath)(PathUtils.parent(notesDir) || notesDir, "assets", "zotero")
            : ""));
    const dashboardDir = (0, str_1.formatPath)(dashboardDirPref ||
        defaults.dashboardDir ||
        (0, paths_1.getDefaultDashboardDir)(vaultRoot, notesDir));
    return {
        appPath,
        vaultRoot,
        notesDirPref,
        notesDir,
        assetsDirPref,
        assetsDir,
        dashboardDirPref,
        dashboardDir,
    };
}
function getObsidianSettingsRoot(doc) {
    return doc.getElementById(uiIds_1.OBSIDIAN_SETTINGS_ROOT_ID);
}
