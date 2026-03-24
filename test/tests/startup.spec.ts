import { config } from "../../package.json";
import { getAddon } from "../utils/global";

describe("Startup", function () {
  it("should have plugin instance defined", function () {
    assert.isNotEmpty(getAddon());
  });

  it("should register the preferences pane with the Obsidian Bridge identity", function () {
    assert.equal(config.addonName, "Obsidian Bridge for Zotero");

    const pane = Zotero.PreferencePanes.pluginPanes.find(
      (item) => item.pluginID === config.addonID,
    );

    assert.exists(pane);
    assert.equal(pane?.pluginID, config.addonID);
    assert.match(
      pane?.src || "",
      /(?:chrome|file):.*chrome\/content\/preferences\.xhtml$/,
    );
  });
});
