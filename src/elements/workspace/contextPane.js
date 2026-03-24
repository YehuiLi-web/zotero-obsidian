"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextPane = void 0;
const package_json_1 = require("../../../package.json");
const base_1 = require("../base");
class ContextPane extends base_1.PluginCEBase {
    get item() {
        return this._item;
    }
    set item(val) {
        this._item = val;
    }
    get content() {
        return this._parseContentID(MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/workspace/context.css"
  ></html:link>
</linkset>
  <zob-details id="container" class="container"></zob-details>
<item-pane-sidenav id="sidenav"></item-pane-sidenav>
`));
    }
    init() {
        this._details = this._queryID("container");
        this._sidenav = this._queryID("sidenav");
        // Make sure the item-pane-sidenav works after https://github.com/zotero/zotero/commit/3102b6b67a3866514e062c653c4c4d7d03f4e1fb
        if (typeof globalThis.Zotero_Tabs === "undefined") {
            globalThis.Zotero_Tabs = {
                selectedType: "unknown",
            };
        }
    }
    render() {
        if (!this.item)
            return;
        this._details.editable = this.item.isEditable();
        this._details.item = this.item;
        this._details.parentID = this.item.parentID;
        this._details.sidenav = this._sidenav;
        this._details.render();
        this._sidenav.toggleDefaultStatus();
    }
}
exports.ContextPane = ContextPane;
