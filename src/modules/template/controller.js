"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplateKeys = getTemplateKeys;
exports.getTemplateText = getTemplateText;
exports.setTemplate = setTemplate;
exports.removeTemplate = removeTemplate;
exports.initTemplates = initTemplates;
exports.importTemplateFromClipboard = importTemplateFromClipboard;
const YAML = require("yamljs");
const prefs_1 = require("../../utils/prefs");
const hint_1 = require("../../utils/hint");
const package_json_1 = require("../../../package.json");
function initTemplates() {
    addon.data.template.data = new ztoolkit.LargePref(`${package_json_1.config.prefsPrefix}.templateKeys`, `${package_json_1.config.prefsPrefix}.template.`, "parser");
    // Convert old template keys to new format
    const raw = (0, prefs_1.getPref)("templateKeys");
    let keys = raw ? JSON.parse(raw) : [];
    if (keys.length > 0) {
        keys = keys.map((t) => {
            if (typeof t === "string") {
                return t;
            }
            return t.name;
        });
        setTemplateKeys(Array.from(new Set(keys)));
    }
    // Add default templates
    const templateKeys = getTemplateKeys();
    for (const defaultTemplate of addon.api.template.DEFAULT_TEMPLATES) {
        if (!templateKeys.includes(defaultTemplate.name)) {
            setTemplate(defaultTemplate);
        }
    }
}
function getTemplateKeys() {
    var _a;
    return ((_a = addon.data.template.data) === null || _a === void 0 ? void 0 : _a.getKeys()) || [];
}
function setTemplateKeys(templateKeys) {
    var _a;
    (_a = addon.data.template.data) === null || _a === void 0 ? void 0 : _a.setKeys(templateKeys);
}
function getTemplateText(keyName) {
    var _a;
    return ((_a = addon.data.template.data) === null || _a === void 0 ? void 0 : _a.getValue(keyName)) || "";
}
function setTemplate(template) {
    var _a;
    (_a = addon.data.template.data) === null || _a === void 0 ? void 0 : _a.setValue(template.name, template.text);
}
function removeTemplate(keyName) {
    var _a;
    if (!keyName) {
        return;
    }
    (_a = addon.data.template.data) === null || _a === void 0 ? void 0 : _a.deleteKey(keyName);
}
function importTemplateFromClipboard(text, options = {}) {
    if (!text) {
        text = Zotero.Utilities.Internal.getClipboard("text/plain") || "";
    }
    if (!text) {
        return;
    }
    let template;
    try {
        template = YAML.parse(text);
    }
    catch (e) {
        try {
            template = JSON.parse(text);
        }
        catch (e) {
            template = { name: "", text: "" };
        }
    }
    if (!template.name) {
        (0, hint_1.showHint)("The copied template is invalid");
        return;
    }
    if (!options.quiet &&
        !window.confirm(`Import template "${template.name}"?`)) {
        return;
    }
    setTemplate({ name: template.name, text: template.content });
    (0, hint_1.showHint)(`Template ${template.name} saved.`);
    if (addon.data.template.editor.window) {
        addon.data.template.editor.window.refresh();
    }
    return template.name;
}
