"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initLocale = initLocale;
exports.getString = getString;
exports.getLocaleID = getLocaleID;
const package_json_1 = require("../../package.json");
/**
 * Initialize locale data
 */
function initLocale() {
    const l10n = new (typeof Localization === "undefined"
        ? ztoolkit.getGlobal("Localization")
        : Localization)([
        `${package_json_1.config.addonRef}-addon.ftl`,
        `${package_json_1.config.addonRef}-preferences.ftl`,
        `${package_json_1.config.addonRef}-mainWindow.ftl`,
        `${package_json_1.config.addonRef}-exportNotes.ftl`,
    ], true);
    addon.data.locale = {
        current: l10n,
    };
}
function getString(...inputs) {
    if (inputs.length === 1) {
        return _getString(inputs[0]);
    }
    else if (inputs.length === 2) {
        if (typeof inputs[1] === "string") {
            return _getString(inputs[0], { branch: inputs[1] });
        }
        else {
            return _getString(inputs[0], inputs[1]);
        }
    }
    else {
        throw new Error("Invalid arguments");
    }
}
function _getString(localeString, options = {}) {
    var _a;
    const localStringWithPrefix = `${package_json_1.config.addonRef}-${localeString}`;
    const { branch, args } = options;
    const pattern = (_a = addon.data.locale) === null || _a === void 0 ? void 0 : _a.current.formatMessagesSync([
        { id: localStringWithPrefix, args },
    ])[0];
    if (!pattern) {
        return localStringWithPrefix;
    }
    if (branch && pattern.attributes) {
        for (const attr of pattern.attributes) {
            if (attr.name === branch) {
                return attr.value;
            }
        }
        return pattern.attributes[branch] || localStringWithPrefix;
    }
    else {
        return pattern.value || localStringWithPrefix;
    }
}
function getLocaleID(id) {
    return `${package_json_1.config.addonRef}-${id}`;
}
