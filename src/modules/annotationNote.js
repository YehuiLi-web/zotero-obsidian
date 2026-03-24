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
exports.registerReaderAnnotationButton = registerReaderAnnotationButton;
exports.syncAnnotationNoteTags = syncAnnotationNoteTags;
const package_json_1 = require("../../package.json");
const config_1 = require("../utils/config");
const link_1 = require("../utils/link");
const note_1 = require("../utils/note");
const prefs_1 = require("../utils/prefs");
function registerReaderAnnotationButton() {
    Zotero.Reader.registerEventListener("renderSidebarAnnotationHeader", (event) => {
        const { doc, append, params, reader } = event;
        // TEMP: If not many annotations, create the button immediately
        if (reader._item.numAnnotations() < 200) {
            createNoteFromAnnotationButton(doc, reader, params.annotation, append);
            return;
        }
        const annotationData = params.annotation;
        const placeholder = doc.createElement("img");
        placeholder.src = "chrome://zotero/error.png";
        placeholder.dataset.annotationId = annotationData.id;
        placeholder.dataset.libraryId = reader._item.libraryID.toString();
        // TEMP: Use error event to delay the button creation to avoid blocking the main thread
        placeholder.addEventListener("error", (event) => {
            var _a;
            const placeholder = event.currentTarget;
            (_a = placeholder.ownerGlobal) === null || _a === void 0 ? void 0 : _a.requestIdleCallback(() => {
                var _a;
                const annotationID = placeholder.dataset.annotationId;
                const libraryID = parseInt(placeholder.dataset.libraryId || "");
                const button = doc.createElement("div");
                button.classList.add("icon");
                button.innerHTML = getAnnotationNoteButtonInnerHTML(false);
                button.title = getAnnotationNoteButtonTitle(false);
                button.dataset.annotationId = annotationID;
                button.dataset.libraryId = libraryID.toString();
                button.addEventListener("click", (e) => {
                    const button = e.currentTarget;
                    createNoteFromAnnotation(reader._item.libraryID, annotationID, e.shiftKey ? "window" : "builtin");
                    button.innerHTML = getAnnotationNoteButtonInnerHTML(true);
                    e.preventDefault();
                });
                placeholder.replaceWith(button);
                (_a = placeholder.ownerGlobal) === null || _a === void 0 ? void 0 : _a.requestIdleCallback(() => {
                    updateAnnotationNoteButton(button, libraryID, annotationID);
                });
            });
        });
        append(placeholder);
    }, package_json_1.config.addonID);
}
function createNoteFromAnnotationButton(doc, reader, annotationData, append) {
    const button = ztoolkit.UI.createElement(doc, "div", {
        classList: ["icon"],
        properties: {
            innerHTML: getAnnotationNoteButtonInnerHTML(false),
            title: getAnnotationNoteButtonTitle(false),
        },
        listeners: [
            {
                type: "click",
                listener: (e) => {
                    const button = e.currentTarget;
                    createNoteFromAnnotation(reader._item.libraryID, annotationData.id, e.shiftKey ? "window" : "builtin");
                    button.innerHTML = getAnnotationNoteButtonInnerHTML(true);
                    e.preventDefault();
                },
            },
        ],
        enableElementRecord: false,
    });
    updateAnnotationNoteButton(button, reader._item.libraryID, annotationData.id);
    append(button);
}
function getAnnotationNoteButtonInnerHTML(hasNote) {
    return `${hasNote ? config_1.ICONS.openInNewWindow : config_1.ICONS.readerQuickNote}
<style>
  .icon {
    border-radius: 4px;
    color: #ffd400;
  }
  .icon:hover {
    background-color: var(--fill-quinary);
    outline: 2px solid var(--fill-quinary);
  }
  .icon:active {
    background-color: var(--fill-quarternary);
  }
</style>
  `;
}
function getAnnotationNoteButtonTitle(hasNote) {
    return hasNote ? "Open note" : "Create note from annotation";
}
function updateAnnotationNoteButton(button, libraryID, itemKey) {
    hasNoteFromAnnotation(libraryID, itemKey).then((hasNote) => {
        button.innerHTML = getAnnotationNoteButtonInnerHTML(hasNote);
        button.title = getAnnotationNoteButtonTitle(hasNote);
    });
}
function hasNoteFromAnnotation(libraryID, itemKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const annotationItem = Zotero.Items.getByLibraryAndKey(libraryID, itemKey);
        if (!annotationItem) {
            return false;
        }
        const linkTarget = yield addon.api.relation.getLinkTargetByAnnotation(annotationItem.libraryID, annotationItem.key);
        if (linkTarget) {
            const targetItem = Zotero.Items.getByLibraryAndKey(linkTarget.toLibID, linkTarget.toKey);
            if (targetItem) {
                return true;
            }
        }
        return false;
    });
}
function createNoteFromAnnotation(libraryID, itemKey, openMode) {
    return __awaiter(this, void 0, void 0, function* () {
        const annotationItem = Zotero.Items.getByLibraryAndKey(libraryID, itemKey);
        if (!annotationItem) {
            return;
        }
        // Check if the annotation has a note link tag
        const annotationTags = annotationItem.getTags().map((_) => _.tag);
        const linkRegex = new RegExp("^zotero://note/(.*)$");
        for (const tag of annotationTags) {
            if (linkRegex.test(tag)) {
                const linkParams = (0, link_1.getNoteLinkParams)(tag);
                if (linkParams.noteItem && linkParams.noteItem.isNote()) {
                    addon.hooks.onOpenNote(linkParams.noteItem.id, openMode || "tab", {
                        lineIndex: linkParams.lineIndex || undefined,
                    });
                    // Remove deprecated link tag and create a link in IndexedDB
                    yield addon.api.relation.linkAnnotationToTarget({
                        fromLibID: annotationItem.libraryID,
                        fromKey: annotationItem.key,
                        toLibID: linkParams.libraryID,
                        toKey: linkParams.noteKey,
                        url: tag,
                    });
                    annotationItem.removeTag(tag);
                    yield annotationItem.saveTx();
                    return;
                }
                else {
                    annotationItem.removeTag(tag);
                    yield annotationItem.saveTx();
                }
            }
        }
        const linkTarget = yield addon.api.relation.getLinkTargetByAnnotation(annotationItem.libraryID, annotationItem.key);
        if (linkTarget) {
            const targetItem = Zotero.Items.getByLibraryAndKey(linkTarget.toLibID, linkTarget.toKey);
            if (targetItem) {
                addon.hooks.onOpenNote(targetItem.id, openMode || "builtin", {});
                return;
            }
        }
        const note = new Zotero.Item("note");
        note.libraryID = annotationItem.libraryID;
        note.parentID = annotationItem.parentItem.parentID;
        yield note.saveTx();
        const renderedTemplate = yield addon.api.template.runTemplate("[QuickNoteV5]", "annotationItem, topItem, noteItem", [annotationItem, annotationItem.parentItem.parentItem, note]);
        yield (0, note_1.addLineToNote)(note, renderedTemplate);
        const tags = annotationItem.getTags();
        for (const tag of tags) {
            note.addTag(tag.tag, tag.type);
        }
        yield note.saveTx();
        yield addon.api.relation.linkAnnotationToTarget({
            fromLibID: annotationItem.libraryID,
            fromKey: annotationItem.key,
            toLibID: note.libraryID,
            toKey: note.key,
            url: addon.api.convert.note2link(note, { ignore: true }),
        });
        addon.hooks.onOpenNote(note.id, "builtin", {});
    });
}
function syncAnnotationNoteTags(itemID, action, tagData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, prefs_1.getPref)("annotationNote.enableTagSync")) {
            return;
        }
        const item = Zotero.Items.get(itemID);
        if (!item || (!item.isAnnotation() && !item.isNote())) {
            return;
        }
        let targetItem;
        if (item.isAnnotation()) {
            const annotationModel = yield addon.api.relation.getLinkTargetByAnnotation(item.libraryID, item.key);
            if (!annotationModel) {
                return;
            }
            targetItem = Zotero.Items.getByLibraryAndKey(annotationModel.toLibID, annotationModel.toKey);
        }
        else {
            const annotationModel = yield addon.api.relation.getAnnotationByLinkTarget(item.libraryID, item.key);
            if (!annotationModel) {
                return;
            }
            targetItem = Zotero.Items.getByLibraryAndKey(annotationModel.fromLibID, annotationModel.fromKey);
        }
        if (!targetItem) {
            return;
        }
        if (action === "add") {
            targetItem.addTag(tagData.tag, tagData.type);
        }
        else {
            targetItem.removeTag(tagData.tag);
        }
        yield targetItem.saveTx();
    });
}
