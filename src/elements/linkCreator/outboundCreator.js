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
exports.OutboundCreator = void 0;
const package_json_1 = require("../../../package.json");
const base_1 = require("../base");
const prefs_1 = require("../../utils/prefs");
class OutboundCreator extends base_1.PluginCEBase {
    constructor() {
        super(...arguments);
        this._openedNoteIDs = [];
        this.loaded = false;
    }
    get content() {
        return MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/linkCreator/outboundCreator.css"
  ></html:link>
</linkset>
      <zob-note-picker></zob-note-picker>
      <zob-note-outline></zob-note-outline>
      <zob-note-preview></zob-note-preview>
`);
    }
    get openedNoteIDs() {
        return this._openedNoteIDs;
    }
    set openedNoteIDs(val) {
        this._openedNoteIDs = val;
    }
    get item() {
        return this.currentNote;
    }
    set item(val) {
        this.currentNote = val;
    }
    load(io) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loaded)
                return;
            this.openedNoteIDs = io.openedNoteIDs || [];
            this._currentLineIndex = io.currentLineIndex;
            this.item = Zotero.Items.get(io.currentNoteID);
            this.loadNotePicker();
            this.loadNoteOutline();
            this.loadNotePreview();
            this.loadInsertPosition();
            this.loaded = true;
            this.scrollToSection("picker");
        });
    }
    accept(io) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.targetNotes)
                return;
            this.notePicker.saveRecentNotes();
            io.targetNoteID = this.currentNote.id;
            io.sourceNoteIDs = this.targetNotes.map((item) => item.id).filter(Boolean);
            io.content = content;
            io.lineIndex = this.getIndexToInsert();
        });
    }
    loadNotePicker() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.notePicker = this.querySelector("zob-note-picker");
            this.notePicker.openedNoteIDs = this.openedNoteIDs;
            yield this.notePicker.load();
            this.notePicker.addEventListener("selectionchange", (event) => {
                this.targetNotes = this.notePicker.getSelectedNotes();
                this.updatePickerTitle(this.targetNotes);
                this.updateNotePreview();
                if (this.targetNotes)
                    this.scrollToSection("outline");
            });
            const content = document.createElement("span");
            content.innerHTML = "";
            content.dataset.l10nId = `${package_json_1.config.addonRef}-outbound-step1-content`;
            content.classList.add("toolbar-header", "content");
            const title = document.createElement("span");
            title.id = "selected-note-title";
            title.classList.add("toolbar-header", "highlight");
            (_a = this.notePicker
                .querySelector("#search-toolbar .toolbar-start")) === null || _a === void 0 ? void 0 : _a.append(content, title);
        });
    }
    loadNoteOutline() {
        var _a;
        this.noteOutline = this.querySelector("zob-note-outline");
        this.noteOutline.load();
        this.noteOutline.item = this.currentNote;
        if (typeof this._currentLineIndex === "number") {
            this.noteOutline.lineIndex = this._currentLineIndex;
        }
        this.noteOutline.render();
        this.positionData = undefined;
        this.updateNotePreview();
        this.noteOutline.addEventListener("selectionchange", (event) => {
            this.positionData = event.detail.selectedSection;
            this.updateNotePreview();
            this.updateOutlineTitle();
        });
        const content = document.createElement("span");
        content.dataset.l10nId = `${package_json_1.config.addonRef}-outbound-step2-content`;
        content.classList.add("toolbar-header", "content");
        const title = document.createElement("span");
        title.id = "selected-outline-title";
        title.classList.add("toolbar-header", "highlight");
        (_a = this.noteOutline
            .querySelector(".toolbar .toolbar-start")) === null || _a === void 0 ? void 0 : _a.append(content, title);
    }
    loadInsertPosition() {
        const insertPosition = this.querySelector("#bn-link-insert-position");
        insertPosition.value = (0, prefs_1.getPref)("insertLinkPosition");
        insertPosition.addEventListener("command", () => {
            (0, prefs_1.setPref)("insertLinkPosition", insertPosition.value);
            this.updateNotePreview();
        });
    }
    loadNotePreview() {
        var _a;
        this.notePreview = this.querySelector("zob-note-preview");
        const content = document.createElement("span");
        content.dataset.l10nId = `${package_json_1.config.addonRef}-outbound-step3-content`;
        content.classList.add("toolbar-header", "content");
        const fromTitle = document.createElement("span");
        fromTitle.id = "preview-note-from-title";
        fromTitle.classList.add("toolbar-header", "highlight");
        const middleTitle = document.createElement("span");
        middleTitle.id = "preview-note-middle-title";
        middleTitle.dataset.l10nId = `${package_json_1.config.addonRef}-outbound-step3-middle`;
        middleTitle.classList.add("toolbar-header", "content");
        const toTitle = document.createElement("span");
        toTitle.id = "preview-note-to-title";
        toTitle.classList.add("toolbar-header", "highlight");
        (_a = this.notePreview
            .querySelector(".toolbar .toolbar-start")) === null || _a === void 0 ? void 0 : _a.append(content, fromTitle, middleTitle, toTitle);
    }
    getPickedNotesTitle(noteItems) {
        let title = "";
        if (!(noteItems === null || noteItems === void 0 ? void 0 : noteItems.length)) {
            title = "-";
        }
        if ((noteItems === null || noteItems === void 0 ? void 0 : noteItems.length) === 1) {
            title = noteItems[0].getNoteTitle();
        }
        else {
            title = `${noteItems === null || noteItems === void 0 ? void 0 : noteItems.length} notes`;
        }
        return title;
    }
    updatePickerTitle(noteItems) {
        this.querySelector("#selected-note-title").textContent =
            this.getPickedNotesTitle(noteItems);
    }
    updateOutlineTitle() {
        var _a;
        const title = ((_a = this.positionData) === null || _a === void 0 ? void 0 : _a.name) || "";
        this.querySelector("#selected-outline-title").textContent = title;
    }
    updatePreviewTitle() {
        var _a;
        this.querySelector("#preview-note-from-title").textContent =
            ((_a = this.currentNote) === null || _a === void 0 ? void 0 : _a.getNoteTitle()) || "No title";
        this.querySelector("#preview-note-middle-title").dataset.l10nArgs = `{"show": "true"}`;
        this.querySelector("#preview-note-to-title").textContent =
            this.getPickedNotesTitle(this.targetNotes);
    }
    updateNotePreview() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.loaded || !this.currentNote)
                return;
            const lines = yield this._addon.api.note.getLinesInNote(this.currentNote, {
                convertToHTML: true,
            });
            let index = this.getIndexToInsert();
            if (index < 0) {
                index = lines.length;
            }
            else {
                this.scrollToSection("preview");
            }
            const before = lines.slice(0, index).join("\n");
            const after = lines.slice(index).join("\n");
            // TODO: use index or section
            const middle = yield this.getContentToInsert();
            this.notePreview.render({ before, middle, after });
            this.updatePreviewTitle();
        });
    }
    scrollToSection(type) {
        if (!this.loaded)
            return;
        const querier = {
            picker: "zob-note-picker",
            outline: "zob-note-outline",
            preview: "zob-note-preview",
        };
        const container = this.querySelector(querier[type]);
        if (!container)
            return;
        container.scrollIntoView({
            behavior: "smooth",
            inline: "center",
        });
    }
    getContentToInsert() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.currentNote || !((_a = this.targetNotes) === null || _a === void 0 ? void 0 : _a.length))
                return "";
            let content = "";
            for (const note of this.targetNotes) {
                content += yield this._addon.api.template.runQuickInsertTemplate(note, this.currentNote, { dryRun: true });
                content += "\n";
            }
            return content;
        });
    }
    getIndexToInsert() {
        if (!this.positionData)
            return -1;
        let position = (0, prefs_1.getPref)("insertLinkPosition");
        if (!["start", "end"].includes(position)) {
            position = "end";
        }
        let index = {
            start: this.positionData.lineIndex + 1,
            end: this.positionData.endIndex + 1,
        }[position];
        if (index === undefined) {
            index = -1;
        }
        return index;
    }
}
exports.OutboundCreator = OutboundCreator;
