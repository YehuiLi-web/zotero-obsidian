"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCitationHTML = parseCitationHTML;
function parseCitationHTML(citationIds_1) {
    return __awaiter(this, arguments, void 0, function* (citationIds, args = []) {
        let html = "";
        if (citationIds.length === 0 || !citationIds.every((id) => id)) {
            return null;
        }
        const items = yield Zotero.Items.getAsync(citationIds);
        for (const item of items) {
            if (item.isNote() &&
                !(yield Zotero.Notes.ensureEmbeddedImagesAreAvailable(item)) &&
                !Zotero.Notes.promptToIgnoreMissingImage()) {
                return null;
            }
        }
        let i = 0;
        for (const item of items) {
            if (item.isRegularItem()) {
                const currentArgs = {
                    locator: args[i].locator || "",
                    label: args[i].label || "",
                    prefix: args[i].prefix || "",
                    suffix: args[i].suffix || "",
                };
                // @ts-ignore
                const itemData = Zotero.Utilities.Item.itemToCSLJSON(item);
                const citation = {
                    citationItems: [
                        Object.assign(Object.assign({ uris: [Zotero.URI.getItemURI(item)] }, currentArgs), { itemData }),
                    ],
                    properties: {},
                };
                const formatted = Zotero.EditorInstanceUtilities.formatCitation(citation);
                html += `<p><span class="citation" data-citation="${encodeURIComponent(JSON.stringify(citation))}">${formatted}</span></p>`;
                i++;
            }
        }
        return html;
    });
}
