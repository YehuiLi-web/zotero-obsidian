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
exports.refreshTemplatesInNote = refreshTemplatesInNote;
const YAML = require("yamljs");
const str_1 = require("../../utils/str");
function refreshTemplatesInNote(editor) {
    return __awaiter(this, void 0, void 0, function* () {
        const lines = yield addon.api.note.getLinesInNote(editor._item);
        let startIndex = -1;
        const matchedIndexPairs = [];
        function isTemplateWrapperStart(index) {
            return (index < lines.length - 1 &&
                lines[index].trim() === "<hr>" &&
                lines[index + 1].trim().startsWith("<pre>") &&
                lines[index + 1].includes("template: "));
        }
        function isTemplateWrapperEnd(index) {
            return startIndex >= 0 && lines[index].trim() === "<hr>";
        }
        for (let i = 0; i < lines.length; i++) {
            // Match: 1. current line is <hr>; 2. next line is <pre> and contains template key; 3. then contains any number of lines; until end with <hr> line
            if (isTemplateWrapperStart(i)) {
                startIndex = i;
                continue;
            }
            if (isTemplateWrapperEnd(i)) {
                matchedIndexPairs.push({ from: startIndex, to: i });
                startIndex = -1;
            }
        }
        let indexOffset = 0;
        for (const { from, to } of matchedIndexPairs) {
            const yamlContent = (0, str_1.htmlUnescape)(lines[from + 1].replace("<pre>", "").replace("</pre>", ""), { excludeLineBreak: true });
            const { template, items } = YAML.parse(yamlContent);
            let html = "";
            if (template.toLowerCase().startsWith("[item]")) {
                html = yield addon.api.template.runItemTemplate(template, {
                    targetNoteId: editor._item.id,
                    itemIds: items === null || items === void 0 ? void 0 : items.map((id) => {
                        const [libraryID, key] = id.split("/");
                        return Zotero.Items.getIDFromLibraryAndKey(Number(libraryID), key);
                    }).filter((id) => !!id),
                });
            }
            else {
                html = yield addon.api.template.runTextTemplate(template, {
                    targetNoteId: editor._item.id,
                });
            }
            const currentLineCount = addon.api.editor.getLineCount(editor);
            addon.api.editor.del(editor, addon.api.editor.getPositionAtLine(editor, from + indexOffset, "start"), addon.api.editor.getPositionAtLine(editor, to + indexOffset + 1, "start"));
            const position = addon.api.editor.getPositionAtLine(editor, from + indexOffset, "start");
            addon.api.editor.insert(editor, html, position);
            const newLineCount = addon.api.editor.getLineCount(editor);
            indexOffset -= currentLineCount - newLineCount;
        }
    });
}
