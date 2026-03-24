import { config } from "../../package.json";
import { getString } from "../utils/locale";

export function registerPrefsWindow() {
  Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    scripts: [rootURI + "chrome/content/preferencesPane.js"],
    label: getString("pref-title"),
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
  });
}

export function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
}
