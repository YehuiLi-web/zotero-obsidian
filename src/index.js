"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const addon_1 = require("./addon");
const package_json_1 = require("../package.json");
const basicTool = new zotero_plugin_toolkit_1.BasicTool();
// @ts-ignore - plugin instance
if (!basicTool.getGlobal("Zotero")[package_json_1.config.addonInstance]) {
    // Set global variables
    defineGlobal("window");
    defineGlobal("document");
    defineGlobal("ZoteroPane");
    defineGlobal("Zotero_Tabs");
    _globalThis.addon = new addon_1.default();
    Object.defineProperty(_globalThis, "ztoolkit", {
        get() {
            return _globalThis.addon.data.ztoolkit;
        },
    });
    // @ts-ignore - plugin instance
    Zotero[package_json_1.config.addonInstance] = addon;
}
function defineGlobal(name) {
    Object.defineProperty(_globalThis, name, {
        get() {
            return basicTool.getGlobal(name);
        },
    });
}
