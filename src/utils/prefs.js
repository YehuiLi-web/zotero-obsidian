"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPref = getPref;
exports.setPref = setPref;
exports.clearPref = clearPref;
exports.getPrefJSON = getPrefJSON;
exports.registerPrefObserver = registerPrefObserver;
exports.unregisterPrefObserver = unregisterPrefObserver;
const package_json_1 = require("../../package.json");
function getPref(key) {
    return Zotero.Prefs.get(`${package_json_1.config.prefsPrefix}.${key}`, true);
}
function setPref(key, value) {
    return Zotero.Prefs.set(`${package_json_1.config.prefsPrefix}.${key}`, value, true);
}
function clearPref(key) {
    return Zotero.Prefs.clear(`${package_json_1.config.prefsPrefix}.${key}`, true);
}
function getPrefJSON(key) {
    try {
        return JSON.parse(String(getPref(key) || "{}"));
    }
    catch (e) {
        setPref(key, "{}");
    }
    return {};
}
function registerPrefObserver(key, callback) {
    return Zotero.Prefs.registerObserver(`${package_json_1.config.prefsPrefix}.${key}`, callback, true);
}
function unregisterPrefObserver(observerID) {
    return Zotero.Prefs.unregisterObserver(observerID);
}
