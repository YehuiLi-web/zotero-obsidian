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
exports.initEditorPopup = initEditorPopup;
const config_1 = require("../../utils/config");
const editor_1 = require("../../utils/editor");
const link_1 = require("../../utils/link");
const locale_1 = require("../../utils/locale");
const wait_1 = require("../../utils/wait");
const workspace_1 = require("../../utils/workspace");
function initEditorPopup(editor) {
    if (editor._disableUI) {
        return;
    }
    const ob = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
        var _a, _b, _c, _d, _e;
        for (const mut of muts) {
            ztoolkit.log(mut);
            if ((mut.addedNodes.length &&
                ((_a = mut.addedNodes[0]) === null || _a === void 0 ? void 0 : _a.hasChildNodes()) &&
                ((_b = mut.addedNodes[0]) === null || _b === void 0 ? void 0 : _b.querySelector(".link-popup"))) ||
                (mut.attributeName === "href" &&
                    ((_c = mut.target.parentElement) === null || _c === void 0 ? void 0 : _c.classList.contains("link")))) {
                updateEditorLinkPopup(editor);
            }
            else if (mut.addedNodes.length &&
                ((_d = mut.addedNodes[0]) === null || _d === void 0 ? void 0 : _d.hasChildNodes()) &&
                ((_e = mut.addedNodes[0]) === null || _e === void 0 ? void 0 : _e.querySelector(".image-popup"))) {
                updateEditorImagePopup(editor);
            }
        }
    });
    ob.observe(editor._iframeWindow.document.querySelector(".relative-container"), {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["href"],
    });
}
function updateEditorLinkPopup(editor) {
    return __awaiter(this, void 0, void 0, function* () {
        const _window = editor._iframeWindow;
        const link = (0, editor_1.getURLAtCursor)(editor);
        const linkParams = (0, link_1.getNoteLinkParams)(link);
        Object.assign(linkParams, {
            forceTakeover: true,
            workspaceUID: (0, workspace_1.getWorkspaceUID)(editor._popup),
        });
        const linkNote = linkParams.noteItem;
        const editorNote = editor._item;
        // If the note is invalid, we remove the buttons
        if (linkNote) {
            const insertButton = ztoolkit.UI.createElement(_window.document, "button", {
                id: "link-popup-insert",
                properties: {
                    title: `Import Linked Note: ${linkNote.getNoteTitle()}`,
                    innerHTML: config_1.ICONS["embedLinkContent"],
                },
                classList: ["link-popup-extra"],
                removeIfExists: true,
                // The popup is removed when link is not in selection. Do not need to record it.
                enableElementRecord: false,
                listeners: [
                    {
                        type: "click",
                        listener: (e) => __awaiter(this, void 0, void 0, function* () {
                            if (!linkParams.ignore) {
                                const templateText = yield addon.api.template.runTemplate("[QuickImportV2]", "link, noteItem", [link, editorNote]);
                                // auto insert to anchor position
                                (0, editor_1.updateURLAtCursor)(editor, undefined, (0, link_1.getNoteLink)(linkNote, Object.assign({}, linkParams, { ignore: true })));
                                (0, editor_1.insert)(editor, templateText);
                            }
                            else {
                                (0, editor_1.updateURLAtCursor)(editor, undefined, (0, link_1.getNoteLink)(linkNote, Object.assign({}, linkParams, { ignore: null })));
                                const lineIndex = (0, editor_1.getLineAtCursor)(editor);
                                (0, editor_1.del)(editor, (0, editor_1.getPositionAtLine)(editor, lineIndex), (0, editor_1.getPositionAtLine)(editor, lineIndex + 1));
                            }
                        }),
                    },
                ],
            });
            const updateButton = ztoolkit.UI.createElement(_window.document, "button", {
                id: "link-popup-update",
                properties: {
                    title: `Update Link Text: ${linkNote.getNoteTitle()}`,
                    innerHTML: config_1.ICONS["updateLinkText"],
                },
                classList: ["link-popup-extra"],
                removeIfExists: true,
                enableElementRecord: false,
                listeners: [
                    {
                        type: "click",
                        listener: (e) => __awaiter(this, void 0, void 0, function* () {
                            (0, editor_1.updateURLAtCursor)(editor, linkNote.getNoteTitle(), (0, editor_1.getURLAtCursor)(editor));
                        }),
                    },
                ],
            });
            const openButton = ztoolkit.UI.createElement(_window.document, "button", {
                id: "link-popup-open",
                properties: {
                    title: "Open in preview pane (Click) or new BN window (Shift+Click)",
                    innerHTML: config_1.ICONS["openInNewWindow"],
                },
                classList: ["link-popup-extra"],
                removeIfExists: true,
                enableElementRecord: false,
                listeners: [
                    {
                        type: "click",
                        listener: (e) => __awaiter(this, void 0, void 0, function* () {
                            addon.hooks.onOpenNote(linkNote.id, e.shiftKey ? "window" : "preview", linkParams);
                        }),
                    },
                ],
            });
            const linkPopup = _window.document.querySelector(".link-popup");
            if (!linkPopup) {
                return;
            }
            // Ensure the builtin buttons are appended
            yield (0, wait_1.waitUtilAsync)(() => linkPopup.querySelectorAll("button").length >= 2);
            linkPopup === null || linkPopup === void 0 ? void 0 : linkPopup.append(insertButton, updateButton, openButton);
        }
        else {
            Array.from(_window.document.querySelectorAll(".link-popup-extra")).forEach((elem) => elem === null || elem === void 0 ? void 0 : elem.remove());
        }
    });
}
function updateEditorImagePopup(editor) {
    ztoolkit.UI.appendElement({
        tag: "fragment",
        children: [
            {
                tag: "button",
                id: "image-popup-preview",
                properties: {
                    innerHTML: config_1.ICONS.previewImage,
                    title: (0, locale_1.getString)("editor-previewImage-title"),
                },
                removeIfExists: true,
                enableElementRecord: false,
                listeners: [
                    {
                        type: "click",
                        listener: (e) => {
                            var _a, _b, _c;
                            const imgs = (_a = editor._iframeWindow.document
                                .querySelector(".primary-editor")) === null || _a === void 0 ? void 0 : _a.querySelectorAll("img");
                            if (!imgs) {
                                return;
                            }
                            const imageList = Array.from(imgs);
                            addon.hooks.onShowImageViewer(imageList.map((elem) => elem === null || elem === void 0 ? void 0 : elem.src), imageList.indexOf((_c = (_b = editor._iframeWindow.document
                                .querySelector(".primary-editor")) === null || _b === void 0 ? void 0 : _b.querySelector(".selected")) === null || _c === void 0 ? void 0 : _c.querySelector("img")), editor._item.getNoteTitle());
                        },
                    },
                ],
            },
            {
                tag: "button",
                id: "image-popup-resize",
                properties: {
                    innerHTML: config_1.ICONS.resizeImage,
                    title: (0, locale_1.getString)("editor-resizeImage-title"),
                },
                removeIfExists: true,
                listeners: [
                    {
                        type: "click",
                        listener: (e) => {
                            var _a, _b;
                            const newWidth = parseFloat(editor._iframeWindow.prompt((0, locale_1.getString)("editor-resizeImage-prompt"), 
                            // @ts-ignore
                            (_b = (_a = (0, editor_1.getEditorCore)(editor).view.state.selection.node) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.width) || "");
                            if (newWidth && newWidth > 10) {
                                (0, editor_1.updateImageDimensionsAtCursor)(editor, newWidth);
                            }
                        },
                    },
                ],
            },
        ],
    }, editor._iframeWindow.document.querySelector(".image-popup"));
}
