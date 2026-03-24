"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPrefsWindow = registerPrefsWindow;
exports.registerPrefsScripts = registerPrefsScripts;
const package_json_1 = require("../../package.json");
const locale_1 = require("../utils/locale");
function registerPrefsWindow() {
    Zotero.PreferencePanes.register({
        pluginID: package_json_1.config.addonID,
        src: rootURI + "chrome/content/preferences.xhtml",
        label: (0, locale_1.getString)("pref-title"),
        image: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
    });
}
function registerPrefsScripts(_window) {
    // This function is called when the prefs window is opened
    if (!addon.data.prefs) {
        addon.data.prefs = {
            window: _window,
        };
    }
    else {
        addon.data.prefs.window = _window;
    }
}
