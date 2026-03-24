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
exports.renderTemplatePreview = renderTemplatePreview;
const YAML = require("yamljs");
const link_1 = require("../../utils/link");
const note_1 = require("../../utils/note");
function renderTemplatePreview(templateName, inputItems) {
    return __awaiter(this, void 0, void 0, function* () {
        let html = generateWarning("Preview not available");
        if (!inputItems) {
            inputItems = Zotero.getMainWindow().ZoteroPane.getSelectedItems();
        }
        try {
            if (templateName.toLowerCase().startsWith("[text]")) {
                html = yield addon.api.template.runTextTemplate(templateName, {
                    dryRun: true,
                });
            }
            else if (templateName.toLowerCase().startsWith("[item]")) {
                if (inputItems.length === 0) {
                    return messages.noItem;
                }
                const data = inputItems === null || inputItems === void 0 ? void 0 : inputItems.map((item) => item.id);
                html = yield addon.api.template.runItemTemplate(templateName, {
                    itemIds: data,
                    dryRun: true,
                });
            }
            else if (templateName.includes("ExportMDFileName")) {
                // noteItem
                const data = inputItems === null || inputItems === void 0 ? void 0 : inputItems.find((item) => item.isNote());
                if (!data) {
                    html = messages.noNoteItem;
                }
                else {
                    html = yield addon.api.template.runTemplate(templateName, "noteItem", [data], {
                        dryRun: true,
                    });
                }
            }
            else if (templateName.includes("ExportMDFileHeader")) {
                // noteItem
                const data = inputItems === null || inputItems === void 0 ? void 0 : inputItems.find((item) => item.isNote());
                if (!data) {
                    html = messages.noNoteItem;
                }
                else {
                    const raw = yield addon.api.template.runTemplate(templateName, "noteItem", [data], {
                        dryRun: true,
                    });
                    const header = Object.assign({}, JSON.parse(raw), {
                        version: data.version,
                        libraryID: data.libraryID,
                        itemKey: data.key,
                    });
                    html = `<pre>${YAML.stringify(header, 10)}</pre>`;
                }
            }
            else if (templateName.includes("ExportMDFileContent")) {
                // noteItem
                const data = inputItems === null || inputItems === void 0 ? void 0 : inputItems.find((item) => item.isNote());
                if (!data) {
                    html = messages.noNoteItem;
                }
                else {
                    html = `<pre>${yield addon.api.convert.note2md(data, Zotero.getTempDirectory().path, { withYAMLHeader: false, skipSavingImages: true, keepNoteLink: true })}</pre>`;
                }
            }
            else if (templateName.includes("ExportLatexFileContent")) {
                // noteItem
                const data = inputItems === null || inputItems === void 0 ? void 0 : inputItems.find((item) => item.isNote());
                if (!data) {
                    html = messages.noNoteItem;
                }
                else {
                    const [latexContent, bibString] = yield addon.api.convert.note2latex(data, Zotero.getTempDirectory().path, { withYAMLHeader: false, skipSavingImages: true, keepNoteLink: true });
                    html = `<pre>${latexContent}</pre>`;
                }
            }
            else if (templateName.includes("QuickInsert")) {
                // link, linkText, subNoteItem, noteItem
                const data = inputItems === null || inputItems === void 0 ? void 0 : inputItems.find((item) => item.isNote());
                if (!data) {
                    html = messages.noNoteItem;
                }
                else {
                    const link = (0, link_1.getNoteLink)(data);
                    const linkText = data.getNoteTitle().trim() || link;
                    const subNoteItem = data;
                    const noteItem = new Zotero.Item("note");
                    html = yield addon.api.template.runTemplate(templateName, "link, linkText, subNoteItem, noteItem", [link, linkText, subNoteItem, noteItem], {
                        dryRun: true,
                    });
                }
            }
            else if (templateName.includes("QuickImport")) {
                // link, noteItem
                const data = inputItems === null || inputItems === void 0 ? void 0 : inputItems.find((item) => item.isNote());
                if (!data) {
                    html = messages.noNoteItem;
                }
                else {
                    const link = (0, link_1.getNoteLink)(data);
                    const noteItem = new Zotero.Item("note");
                    html = yield addon.api.template.runTemplate(templateName, "link, noteItem", [link, noteItem], {
                        dryRun: true,
                    });
                }
            }
            else if (templateName.includes("QuickNote")) {
                // annotationItem, topItem, noteItem
                html = generateWarning(`Preview not available for template ${templateName}`);
            }
            else {
                html = generateWarning(`Preview not available for template ${templateName}`);
            }
        }
        catch (err) {
            html = generateWarning(`Error: ${err.message || "Unknown error"}`);
        }
        // TODO: might not be stable?
        html = yield (0, note_1.renderNoteHTML)(html, []);
        return html;
    });
}
function generateWarning(message) {
    return `<p style="color: red;">${message}</p>`;
}
const messages = {
    noItem: generateWarning("No item selected. Please select an item in the library."),
    noNoteItem: generateWarning("No NOTE item selected. Please select a NOTE item in the library."),
};
