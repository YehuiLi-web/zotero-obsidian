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
exports.initEditorToolbar = initEditorToolbar;
const package_json_1 = require("../../../package.json");
const config_1 = require("../../utils/config");
const editor_1 = require("../../utils/editor");
const locale_1 = require("../../utils/locale");
const linkCreator_1 = require("../../utils/linkCreator");
const str_1 = require("../../utils/str");
const wait_1 = require("../../utils/wait");
function initEditorToolbar(editor) {
    return __awaiter(this, void 0, void 0, function* () {
        if (editor._disableUI) {
            return;
        }
        const noteItem = editor._item;
        const _document = editor._iframeWindow.document;
        try {
            yield (0, wait_1.waitUtilAsync)(() => !!_document.querySelector(".toolbar"));
        }
        catch (e) {
            ztoolkit.log("Editor toolbar not found");
        }
        const toolbar = _document.querySelector(".toolbar");
        if (!toolbar) {
            ztoolkit.log("Editor toolbar not found");
            return;
        }
        // Link creator
        registerEditorToolbarElement(editor, toolbar, "start", ztoolkit.UI.createElement(_document, "button", {
            classList: ["toolbar-button"],
            properties: {
                innerHTML: config_1.ICONS.linkCreator,
                title: "Link creator",
            },
            listeners: [
                {
                    type: "click",
                    listener: (e) => {
                        editor.saveSync();
                        (0, linkCreator_1.openLinkCreator)(noteItem, {
                            lineIndex: (0, editor_1.getLineAtCursor)(editor),
                        });
                    },
                },
            ],
        }));
        if (editor._tabID) {
            const sidebarState = Zotero.getMainWindow().Zotero_Tabs.getSidebarState("note");
            registerEditorToolbarElement(editor, toolbar, "start", ztoolkit.UI.createElement(_document, "button", {
                classList: ["toolbar-button", "zob-toggle-left-pane"],
                properties: {
                    innerHTML: config_1.ICONS.workspaceToggle,
                    title: "Toggle left pane",
                },
                styles: {
                    display: sidebarState.open ? "none" : "inherit",
                },
                listeners: [
                    {
                        type: "click",
                        listener: () => {
                            Zotero.Notes.toggleSidebar(true);
                        },
                    },
                ],
            }));
        }
        const settingsButton = editor._iframeWindow.document.querySelector(".toolbar .end .dropdown .toolbar-button");
        const MutationObserver = // @ts-ignore
         editor._iframeWindow.MutationObserver;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => __awaiter(this, void 0, void 0, function* () {
                if (mutation.type === "attributes" &&
                    mutation.attributeName === "class" &&
                    mutation.target === settingsButton) {
                    if (settingsButton.classList.contains("active")) {
                        const dropdown = settingsButton.parentElement;
                        const popup = dropdown.querySelector(".popup");
                        ztoolkit.log(popup);
                        registerEditorToolbarPopup(editor, popup, yield getMenuData(editor));
                    }
                }
            }));
        });
        observer.observe(settingsButton, {
            attributes: true,
            attributeFilter: ["class"],
        });
    });
}
function getMenuData(editor) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const noteItem = editor._item;
        const currentLine = (0, editor_1.getLineAtCursor)(editor);
        const currentSection = (yield (0, editor_1.getSectionAtCursor)(editor)) || "";
        const settingsMenuData = [
            {
                id: makeId("settings-openAsTab"),
                text: (0, locale_1.getString)("editor-toolbar-settings-openAsTab"),
                callback: (e) => {
                    addon.hooks.onOpenNote(noteItem.id, "tab");
                },
            },
            {
                id: makeId("settings-openAsWindow"),
                text: (0, locale_1.getString)("editor-toolbar-settings-openAsWindow"),
                callback: (e) => {
                    addon.hooks.onOpenNote(noteItem.id, "window", { forceTakeover: true });
                },
            },
            {
                id: makeId("settings-showInLibrary"),
                text: (0, locale_1.getString)("editor-toolbar-settings-showInLibrary"),
                callback: (e) => {
                    Zotero.getMainWindow().ZoteroPane.selectItems([e.editor._item.id]);
                },
            },
        ];
        if (currentLine >= 0) {
            settingsMenuData.push(...[
                {
                    type: "splitter",
                },
                {
                    id: makeId("settings-export"),
                    text: (0, locale_1.getString)("editor-toolbar-settings-export"),
                    callback: (e) => {
                        if (addon.api.sync.isSyncNote(noteItem.id)) {
                            addon.hooks.onShowSyncInfo(noteItem.id);
                        }
                        else {
                            addon.hooks.onShowExportNoteOptions([noteItem.id]);
                        }
                    },
                },
                {
                    type: "splitter",
                },
                {
                    id: makeId("settings-insertTemplate"),
                    text: (0, locale_1.getString)("editor-toolbar-settings-insertTemplate"),
                    callback: (e) => {
                        addon.hooks.onShowTemplatePicker("insert", {
                            noteId: e.editor._item.id,
                            lineIndex: currentLine,
                        });
                    },
                },
                {
                    id: makeId("settings-refreshTemplates"),
                    text: (0, locale_1.getString)("editor-toolbar-settings-refreshTemplates"),
                    callback: (e) => {
                        addon.hooks.onRefreshTemplatesInNote(e.editor);
                    },
                },
                {
                    type: "splitter",
                },
                {
                    id: makeId("settings-copyLink"),
                    text: (0, locale_1.getString)("editor-toolbar-settings-copyLink", {
                        args: {
                            line: currentLine,
                        },
                    }),
                    callback: (e) => {
                        (0, editor_1.copyNoteLink)(e.editor, "line");
                    },
                },
                {
                    id: makeId("settings-copyLinkAtSection"),
                    text: (0, locale_1.getString)("editor-toolbar-settings-copyLinkAtSection", {
                        args: {
                            section: (0, str_1.slice)(currentSection, 10),
                        },
                    }),
                    callback: (e) => {
                        (0, editor_1.copyNoteLink)(e.editor, "section");
                    },
                },
                {
                    id: makeId("settings-updateRelatedNotes"),
                    text: (0, locale_1.getString)("editor-toolbar-settings-updateRelatedNotes"),
                    callback: (e) => {
                        addon.api.relation.updateNoteLinkRelation(e.editor._item.id);
                    },
                },
            ]);
        }
        const parentAttachment = yield ((_a = noteItem.parentItem) === null || _a === void 0 ? void 0 : _a.getBestAttachment());
        if (parentAttachment) {
            settingsMenuData.push(...[
                {
                    type: "splitter",
                },
                {
                    id: makeId("settings-openParent"),
                    text: (0, locale_1.getString)("editor-toolbar-settings-openParent"),
                    callback: (e) => {
                        Zotero.getMainWindow().ZoteroPane.viewAttachment([
                            parentAttachment.id,
                        ]);
                        Zotero.Notifier.trigger("open", "file", parentAttachment.id);
                    },
                },
            ]);
        }
        if (addon.api.sync.isSyncNote(noteItem.id)) {
            settingsMenuData.splice(5, 0, {
                id: makeId("settings-refreshSyncing"),
                text: (0, locale_1.getString)("editor-toolbar-settings-refreshSyncing"),
                callback: (e) => {
                    addon.hooks.onSyncing([noteItem], {
                        quiet: false,
                        skipActive: false,
                        reason: "manual-editor",
                    });
                },
            });
        }
        return settingsMenuData;
    });
}
function registerEditorToolbarPopup(editor, popup, popupLines) {
    return __awaiter(this, void 0, void 0, function* () {
        yield editor._initPromise;
        ztoolkit.UI.appendElement({
            tag: "fragment",
            children: popupLines.map((props) => {
                return props.type === "splitter"
                    ? {
                        tag: "div",
                        classList: ["separator"],
                        properties: {
                            id: props.id,
                        },
                    }
                    : {
                        tag: "button",
                        classList: ["option"],
                        properties: {
                            id: props.id,
                            innerHTML: (0, str_1.slice)((props.prefix || "") + props.text, 50) +
                                (props.suffix || ""),
                            title: "",
                        },
                        listeners: [
                            {
                                type: "click",
                                listener: (e) => {
                                    Object.assign(e, { editor });
                                    props.callback &&
                                        props.callback(e);
                                },
                            },
                        ],
                    };
            }),
        }, popup);
        popup.style.removeProperty("left");
        popup.style.right = "0px";
    });
}
function registerEditorToolbarElement(editor_2, toolbar_1, position_1, elem_1) {
    return __awaiter(this, arguments, void 0, function* (editor, toolbar, position, elem, after = false) {
        yield editor._initPromise;
        const target = toolbar.querySelector(`.${position}`);
        if (target) {
            if (after) {
                target.append(elem);
            }
            else {
                target.prepend(elem);
            }
        }
        return elem;
    });
}
function makeId(key) {
    return `${package_json_1.config.addonRef}-${key}`;
}
