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
exports.showUserGuide = showUserGuide;
const package_json_1 = require("../../package.json");
const locale_1 = require("../utils/locale");
const prefs_1 = require("../utils/prefs");
const LATEST_TOUR_VERSION = 1;
function showUserGuide(win_1) {
    return __awaiter(this, arguments, void 0, function* (win, force = false) {
        const doc = win.document;
        if (!force && (0, prefs_1.getPref)("latestTourVersion") == LATEST_TOUR_VERSION)
            return;
        (0, prefs_1.setPref)("latestTourVersion", LATEST_TOUR_VERSION);
        const exampleNote = `
# Welcome to Obsidian Bridge

This note is created by the Obsidian Bridge user guide.
You can always run the user guide again from menu Help -> Obsidian Bridge User Guide.

## 📝 Introduction

> Bridge Zotero notes and metadata into your Obsidian workflow.

Obsidian Bridge is a personal Zotero plugin for [Zotero](https://zotero.org).

It helps you iterate on workflows such as:

- metadata export
- markdown sync
- template customization
- field probing
- Obsidian-friendly note generation

and:

- stays inside Zotero
- remains highly customizable
- focuses on Obsidian integration first
`;
        let noteItem;
        let tabID;
        addon.data.hint.silent = true;
        yield new ztoolkit.Guide()
            .addStep({
            title: (0, locale_1.getString)("userGuide-start-title"),
            description: `<html:img src='chrome://${package_json_1.config.addonRef}/content/icons/knowledge-app.png' style="width: 300px; height: auto;"></html:img>
    <html:span style='width: 300px; display: block; margin-top: 10px;'>
      ${(0, locale_1.getString)("userGuide-start-desc")}
    </html:span>`,
            position: "center",
            showButtons: ["next", "close"],
            closeBtnText: (0, locale_1.getString)("userGuide-start-close"),
            showProgress: true,
            onCloseClick: () => {
                (0, prefs_1.clearPref)("latestTourVersion");
            },
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-createNoteButton-title"),
            description: (0, locale_1.getString)("userGuide-createNoteButton-desc"),
            element: "#zotero-tb-note-add",
            showButtons: ["prev", "next"],
            showProgress: true,
            onBeforeRender: () => __awaiter(this, void 0, void 0, function* () {
                const Zotero_Tabs = Zotero.getMainWindow().Zotero_Tabs;
                Zotero_Tabs.select("zotero-pane");
                const collectionsView = win.ZoteroPane.collectionsView;
                collectionsView && collectionsView.selectLibrary(1);
            }),
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-createNote-title"),
            description: (0, locale_1.getString)("userGuide-createNote-desc"),
            position: "center",
            showButtons: ["next"],
            showProgress: true,
            onBeforeRender: (_a) => __awaiter(this, [_a], void 0, function* ({ state, config }) {
                noteItem = (yield Zotero.Items.getAll(1)).find((item) => item.isNote());
                if (noteItem) {
                    yield win.ZoteroPane.selectItem(noteItem.id);
                    config.description = (0, locale_1.getString)("userGuide-createNoteFound-desc");
                }
            }),
            onExit: () => __awaiter(this, void 0, void 0, function* () {
                noteItem = new Zotero.Item("note");
                noteItem.setNote(yield addon.api.convert.md2html(exampleNote));
                yield noteItem.saveTx();
            }),
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-openNote-title"),
            description: (0, locale_1.getString)("userGuide-openNote-desc"),
            element: "#item-tree-main-default .row.selected",
            showButtons: ["next"],
            nextBtnText: (0, locale_1.getString)("userGuide-openNote-next"),
            showProgress: true,
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspace-title"),
            description: (0, locale_1.getString)("userGuide-workspace-desc"),
            position: "center",
            showButtons: ["next"],
            showProgress: true,
            onBeforeRender: (_a) => __awaiter(this, [_a], void 0, function* ({ state: { step, controller } }) {
                tabID = (yield addon.hooks.onOpenNote(noteItem.id, "tab", {
                    forceTakeover: true,
                }));
                if (!tabID) {
                    controller.abort();
                    win.alert("Failed to open the note.");
                    return;
                }
            }),
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspaceEditor-title"),
            description: (0, locale_1.getString)("userGuide-workspaceEditor-desc"),
            element: () => doc.querySelector(`#${tabID} #${package_json_1.config.addonRef}-editor-main`),
            position: "center",
            showButtons: ["prev", "next"],
            showProgress: true,
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspaceEditorToolbar-title"),
            description: (0, locale_1.getString)("userGuide-workspaceEditorToolbar-desc"),
            element: () => doc.querySelector(`#${tabID} #${package_json_1.config.addonRef}-editor-main`)._iframe.contentDocument.querySelector(".toolbar"),
            onMask: ({ mask }) => {
                const elem = doc.querySelector(`#${tabID} #${package_json_1.config.addonRef}-editor-main`);
                mask(elem);
                mask(elem._iframe.contentDocument.querySelector(".toolbar"));
            },
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspaceEditorLinkCreator-title"),
            description: (0, locale_1.getString)("userGuide-workspaceEditorLinkCreator-desc"),
            element: () => doc.querySelector(`#${tabID} #${package_json_1.config.addonRef}-editor-main`)._iframe.contentDocument.querySelector(".toolbar .start button"),
            onMask: ({ mask }) => {
                const elem = doc.querySelector(`#${tabID} #${package_json_1.config.addonRef}-editor-main`);
                mask(elem);
                mask(elem._iframe.contentDocument.querySelector(".toolbar .start button"));
            },
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspaceEditorMoreOptions-title"),
            description: (0, locale_1.getString)("userGuide-workspaceEditorMoreOptions-desc"),
            element: () => doc.querySelector(`#${tabID} #${package_json_1.config.addonRef}-editor-main`)._iframe.contentDocument.querySelector(".toolbar .end .dropdown.more-dropdown"),
            onMask: ({ mask }) => {
                const elem = doc.querySelector(`#${tabID} #${package_json_1.config.addonRef}-editor-main`);
                mask(elem);
                mask(elem._iframe.contentDocument.querySelector(".toolbar .end .dropdown.more-dropdown"));
            },
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspaceOutline-title"),
            description: (0, locale_1.getString)("userGuide-workspaceOutline-desc"),
            element: () => doc.querySelector(`#${tabID} zob-outline`),
            position: "center",
            showButtons: ["prev", "next"],
            showProgress: true,
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspaceOutlineMode-title"),
            description: (0, locale_1.getString)("userGuide-workspaceOutlineMode-desc"),
            element: () => doc.querySelector(`#${tabID} zob-outline #${package_json_1.config.addonRef}-setOutline`),
            showButtons: ["prev", "next"],
            showProgress: true,
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspaceOutlineSaveAs-title"),
            description: (0, locale_1.getString)("userGuide-workspaceOutlineSaveAs-desc"),
            element: () => doc.querySelector(`#${tabID} zob-outline #${package_json_1.config.addonRef}-saveOutline`),
            showButtons: ["prev", "next"],
            showProgress: true,
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-workspaceNoteInfo-title"),
            description: (0, locale_1.getString)("userGuide-workspaceNoteInfo-desc"),
            element: () => doc.querySelector(`#${tabID} zob-context`),
            position: "center",
            showButtons: ["prev", "next"],
            showProgress: true,
        })
            .addStep({
            title: (0, locale_1.getString)("userGuide-finish-title"),
            description: (0, locale_1.getString)("userGuide-finish-desc"),
            position: "center",
            showButtons: ["prev", "close"],
            showProgress: true,
        })
            .show(doc);
        addon.data.hint.silent = false;
    });
}
