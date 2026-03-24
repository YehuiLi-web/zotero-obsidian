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
exports.runTemplate = runTemplate;
exports.runTextTemplate = runTextTemplate;
exports.runItemTemplate = runItemTemplate;
exports.runQuickInsertTemplate = runQuickInsertTemplate;
const YAML = require("yamljs");
const itemPicker_1 = require("../../utils/itemPicker");
const locale_1 = require("../../utils/locale");
const str_1 = require("../../utils/str");
const AsyncFunction = Object.getPrototypeOf(function () {
    return __awaiter(this, void 0, void 0, function* () { });
}).constructor;
function runTemplate(key_1) {
    return __awaiter(this, arguments, void 0, function* (key, argString = "", argList = [], options = {
        useDefault: true,
        dryRun: false,
        stage: "default",
    }) {
        var _a;
        ztoolkit.log(`runTemplate: ${key}`);
        if (argList.length > 0) {
            argString += ", ";
        }
        argString += "_env";
        argList.push({
            dryRun: options.dryRun,
        });
        let templateText = addon.api.template.getTemplateText(key);
        if (options.useDefault && !templateText) {
            templateText =
                ((_a = addon.api.template.DEFAULT_TEMPLATES.find((t) => t.name === key)) === null || _a === void 0 ? void 0 : _a.text) ||
                    "";
            if (!templateText) {
                return "";
            }
        }
        if (!options.stage) {
            options.stage = "default";
        }
        let templateLines = templateText.split(/\r?\n/);
        let startIndex = templateLines.indexOf(`// @${options.stage}-begin`), endIndex = templateLines.indexOf(`// @${options.stage}-end`);
        if (startIndex < 0 &&
            endIndex < 0 &&
            typeof options.stage === "string" &&
            options.stage !== "default") {
            // Skip this stage
            return "";
        }
        if (startIndex < 0) {
            // We skip the pragma line later
            startIndex = -1;
        }
        if (endIndex < 0) {
            endIndex = templateLines.length;
        }
        // Check the markdown pragma
        templateLines = templateLines.slice(startIndex + 1, endIndex);
        let useMarkdown = false;
        const mdIndex = templateLines.findIndex((line) => line.startsWith("// @use-markdown"));
        if (mdIndex >= 0) {
            useMarkdown = true;
        }
        // Skip other pragmas
        templateLines = templateLines.filter((line) => !line.startsWith("// @"));
        templateText = templateLines.join("\n");
        function constructFunction(content) {
            return `$\{await (async () => {
        ${content}
      })()}`;
        }
        // Replace string inside ${{}}$ to async function
        templateText = templateText.replace(/\$\{\{([\s\S]*?)\}\}\$/g, (match, content) => {
            return constructFunction(content);
        });
        try {
            const func = new AsyncFunction(argString, "return `" + templateText + "`");
            let res = (yield func(...argList));
            if (useMarkdown) {
                res = yield addon.api.convert.md2html(res);
            }
            ztoolkit.log(res);
            return res;
        }
        catch (e) {
            ztoolkit.log(e);
            if (options.dryRun) {
                return "Template Preview Error: " + String(e);
            }
            Zotero.getMainWindow().alert(`Template ${key} Error: ${e}`);
            return "";
        }
    });
}
function runTextTemplate(key_1) {
    return __awaiter(this, arguments, void 0, function* (key, options = {}) {
        const { targetNoteId, dryRun } = options;
        const targetNoteItem = Zotero.Items.get(targetNoteId || -1);
        const sharedObj = {};
        let renderedString = yield runTemplate(key, "targetNoteItem, sharedObj", [targetNoteItem, sharedObj], {
            dryRun,
        });
        const templateText = addon.api.template.getTemplateText(key);
        // Find if any line starts with // @use-refresh using regex
        if (/\/\/ @use-refresh/.test(templateText)) {
            renderedString = wrapYAMLData(renderedString, {
                template: key,
            });
        }
        return renderedString;
    });
}
function runItemTemplate(key_1) {
    return __awaiter(this, arguments, void 0, function* (key, options = {}) {
        /**
         * args:
         * beforeloop stage: items, copyNoteImage, sharedObj(for temporary variables, shared by all stages)
         * default stage: topItem, itemNotes, copyNoteImage, sharedObj
         * afterloop stage: items, copyNoteImage, sharedObj
         */
        let { itemIds } = options;
        const { targetNoteId, dryRun } = options;
        if (!itemIds) {
            itemIds = yield getItemTemplateData();
        }
        if ((itemIds === null || itemIds === void 0 ? void 0 : itemIds.length) === 0) {
            return "";
        }
        let targetNoteItem = Zotero.Items.get(targetNoteId || -1);
        if (!targetNoteItem) {
            targetNoteItem = undefined;
        }
        const items = (itemIds === null || itemIds === void 0 ? void 0 : itemIds.map((id) => Zotero.Items.get(id))) || [];
        const copyImageRefNotes = [];
        const copyNoteImage = (noteItem) => {
            copyImageRefNotes.push(noteItem);
        };
        const sharedObj = {};
        const results = [];
        results.push(yield runTemplate(key, "items, targetNoteItem, copyNoteImage, sharedObj", [items, targetNoteItem, copyNoteImage, sharedObj], {
            stage: "beforeloop",
            useDefault: false,
            dryRun,
        }));
        for (const topItem of items) {
            const itemNotes = topItem.isNote()
                ? []
                : Zotero.Items.get(topItem.getNotes());
            results.push(yield runTemplate(key, "topItem, targetNoteItem, itemNotes, copyNoteImage, sharedObj", [topItem, targetNoteItem, itemNotes, copyNoteImage, sharedObj], {
                dryRun,
            }));
        }
        results.push(yield runTemplate(key, "items, targetNoteItem, copyNoteImage, sharedObj", [items, targetNoteItem, copyNoteImage, sharedObj], {
            stage: "afterloop",
            useDefault: false,
            dryRun,
        }));
        const html = results.join("\n");
        let renderedString = yield addon.api.convert.note2html(copyImageRefNotes, {
            targetNoteItem,
            html,
        });
        const templateText = addon.api.template.getTemplateText(key);
        // Find if any line starts with // @use-refresh using regex
        if (/\/\/ @use-refresh/.test(templateText)) {
            renderedString = wrapYAMLData(renderedString, {
                template: key,
                items: Array.from(items.map((item) => item.libraryKey)),
            });
        }
        return renderedString;
    });
}
function runQuickInsertTemplate(noteItem_1, targetNoteItem_1) {
    return __awaiter(this, arguments, void 0, function* (noteItem, targetNoteItem, options = {}) {
        if (!noteItem)
            return "";
        const link = addon.api.convert.note2link(noteItem, {
            lineIndex: options.lineIndex,
            sectionName: options.sectionName,
            selectionText: options.selectionText,
        });
        if (!link) {
            ztoolkit.log("No link found");
            return "";
        }
        if (options._internal) {
            options._internal.link = link;
        }
        const noteTitle = noteItem.getNoteTitle().trim();
        let linkText;
        if (options.selectionText) {
            linkText = noteTitle ? `#${options.selectionText} - ${noteTitle}` : link;
        }
        else if (options.sectionName) {
            linkText = noteTitle ? `${options.sectionName} - ${noteTitle}` : link;
        }
        else if (options.lineIndex) {
            linkText = noteTitle ? `L${options.lineIndex} - ${noteTitle}` : link;
        }
        else {
            linkText = noteTitle || link;
        }
        const content = yield runTemplate("[QuickInsertV3]", "link, linkText, subNoteItem, noteItem, lineIndex, sectionName, selectionText", [
            link,
            linkText,
            noteItem,
            targetNoteItem,
            options.lineIndex,
            options.sectionName,
            options.selectionText,
        ], {
            dryRun: options.dryRun,
        });
        return content;
    });
}
function getItemTemplateData() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // If topItems are pre-defined, use it without asking
        if (((_a = addon.data.template.picker.data.topItemIds) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            return addon.data.template.picker.data.topItemIds;
        }
        const librarySelectedIds = addon.data.template.picker.data
            .librarySelectedIds;
        // If librarySelectedIds are pre-defined, ask user whether to use it
        if (librarySelectedIds && librarySelectedIds.length !== 0) {
            const firstSelectedItem = Zotero.Items.get(librarySelectedIds[0]);
            const data = {};
            data;
            new ztoolkit.Dialog(1, 1)
                .setDialogData(data)
                .addCell(0, 0, {
                tag: "div",
                properties: {
                    innerHTML: `${(0, str_1.fill)((0, str_1.slice)(firstSelectedItem.getField("title") ||
                        firstSelectedItem.key, 40), 40)} ${librarySelectedIds.length > 1
                        ? `and ${librarySelectedIds.length - 1} more`
                        : ""} ${(0, locale_1.getString)("templatePicker-itemData-info")}`,
                },
            })
                .addButton((0, locale_1.getString)("templatePicker-itemData-useLibrary"), "useLibrary")
                .addButton((0, locale_1.getString)("templatePicker-itemData-useCustom"), "useCustom")
                .open((0, locale_1.getString)("templatePicker-itemData-title"));
            yield data.unloadLock.promise;
            if (data._lastButtonId === "useLibrary") {
                return librarySelectedIds;
            }
            else if (data._lastButtonId == "useCustom") {
                return yield (0, itemPicker_1.itemPicker)();
            }
            else {
                return [];
            }
        }
        return yield (0, itemPicker_1.itemPicker)();
    });
}
function wrapYAMLData(str, data) {
    const yamlContent = YAML.stringify(data, 4);
    return `<hr>
<pre>${yamlContent}</pre>${str}
<hr>`;
}
