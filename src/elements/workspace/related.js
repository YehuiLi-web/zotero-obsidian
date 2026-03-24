"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteRelatedBox = void 0;
// @ts-nocheck
const package_json_1 = require("../../../package.json");
const workspace_1 = require("../../utils/workspace");
const RelatedBox = document.createXULElement("related-box")
    .constructor;
const _require = window.require;
const { getCSSItemTypeIcon } = _require("components/icons");
class NoteRelatedBox extends RelatedBox {
    constructor() {
        super(...arguments);
        this.content = MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/workspace/related.css"
  ></html:link>
</linkset>
<collapsible-section
  data-l10n-id="section-related"
  data-pane="related"
  extra-buttons="add"
>
  <html:div class="body" />
</collapsible-section>`);
    }
    // Following code is from chrome/content/zotero/elements/relatedBox.js
    render() {
        if (!this.item)
            return;
        if (this._isAlreadyRendered())
            return;
        const body = this.querySelector(".body");
        body.replaceChildren();
        if (this._item) {
            const relatedKeys = this._item.relatedItems;
            for (let i = 0; i < relatedKeys.length; i++) {
                const key = relatedKeys[i];
                const relatedItem = Zotero.Items.getByLibraryAndKey(this._item.libraryID, key);
                if (!relatedItem) {
                    Zotero.debug(`Related item ${this._item.libraryID}/${key} not found ` +
                        `for item ${this._item.libraryKey}`, 2);
                    continue;
                }
                const id = relatedItem.id;
                const row = document.createElement("div");
                row.className = "row";
                const icon = getCSSItemTypeIcon(relatedItem.getItemTypeIconName());
                const label = document.createElement("span");
                label.className = "label";
                label.append(relatedItem.getDisplayTitle());
                const box = document.createElement("div");
                box.addEventListener("click", () => this._handleShowItem(id));
                box.setAttribute("tabindex", "0");
                box.className = "box keyboard-clickable";
                box.appendChild(icon);
                box.appendChild(label);
                row.append(box);
                // Extra button to open note
                if (relatedItem.isNote()) {
                    const openNote = document.createXULElement("toolbarbutton");
                    openNote.addEventListener("command", (event) => {
                        const position = event.shiftKey ? "window" : "tab";
                        Zotero[package_json_1.config.addonRef].hooks.onOpenNote(id, position);
                    });
                    openNote.className = "zotero-clicky zotero-clicky-open-link";
                    openNote.setAttribute("tabindex", "0");
                    row.append(openNote);
                }
                if (this.editable) {
                    const remove = document.createXULElement("toolbarbutton");
                    remove.addEventListener("command", () => this._handleRemove(id));
                    remove.className = "zotero-clicky zotero-clicky-minus";
                    remove.setAttribute("tabindex", "0");
                    row.append(remove);
                }
                body.append(row);
            }
            this._updateCount();
        }
    }
    _handleShowItem(id) {
        const item = Zotero.Items.get(id);
        if (!item)
            return;
        if (!item.isNote()) {
            // @ts-ignore
            return super._handleShowItem(id);
        }
        Zotero[package_json_1.config.addonRef].hooks.onOpenNote(item.id, "preview", {
            workspaceUID: (0, workspace_1.getWorkspaceUID)(this),
        });
    }
}
exports.NoteRelatedBox = NoteRelatedBox;
