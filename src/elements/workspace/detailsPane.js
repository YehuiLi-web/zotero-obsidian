"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetailsPane = void 0;
const package_json_1 = require("../../../package.json");
const prefs_1 = require("../../utils/prefs");
const ItemDetails = document.createXULElement("item-details")
    .constructor;
const persistKey = "persist.workspaceContext";
class DetailsPane extends ItemDetails {
    constructor() {
        super(...arguments);
        this.content = MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/workspace/details.css"
  ></html:link>
</linkset>
<hbox id="zotero-view-item-container" class="zotero-view-item-container" flex="1">
  <html:div class="zotero-view-item-main">
		<pane-header id="zotero-item-pane-header" />
    <html:div id="zotero-view-item" class="zotero-view-item" tabindex="0">
      <tags-box id="zotero-editpane-tags" class="zotero-editpane-tags" data-pane="tags" />

      <zob-related-box id="zotero-editpane-related" class="zotero-editpane-related"
        data-pane="related" />
    </html:div>
  </html:div>
</hbox>`);
    }
    get pinnedPane() {
        // @ts-ignore super
        return super.pinnedPane;
    }
    set pinnedPane(val) {
        // @ts-ignore super
        super.pinnedPane = val;
        this._persistState();
    }
    init() {
        MozXULElement.insertFTLIfNeeded(`${package_json_1.config.addonRef}-notePreview.ftl`);
        MozXULElement.insertFTLIfNeeded(`${package_json_1.config.addonRef}-noteRelation.ftl`);
        this._prefObserverID = (0, prefs_1.registerPrefObserver)(persistKey, this._restoreState.bind(this));
        super.init();
    }
    destroy() {
        (0, prefs_1.unregisterPrefObserver)(this._prefObserverID);
        super.destroy();
    }
    render() {
        super.render();
        this._restoreState();
    }
    forceUpdateSideNav() {
        this._sidenav
            .querySelectorAll("toolbarbutton")
            .forEach((elem) => (elem.parentElement.hidden = true));
        super.forceUpdateSideNav();
    }
    _restorePinnedPane() { }
    _persistState() {
        let state = (0, prefs_1.getPrefJSON)(persistKey);
        if ((state === null || state === void 0 ? void 0 : state.pinnedPane) === this.pinnedPane) {
            return;
        }
        state = Object.assign(Object.assign({}, state), { pinnedPane: this.pinnedPane });
        (0, prefs_1.setPref)(persistKey, JSON.stringify(state));
    }
    _restoreState() {
        const state = (0, prefs_1.getPrefJSON)(persistKey);
        this.pinnedPane = state === null || state === void 0 ? void 0 : state.pinnedPane;
        this.scrollToPane(this.pinnedPane);
    }
}
exports.DetailsPane = DetailsPane;
