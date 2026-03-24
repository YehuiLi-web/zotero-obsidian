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
exports.initEditorMenu = initEditorMenu;
const package_json_1 = require("../../../package.json");
const editor_1 = require("../../utils/editor");
const locale_1 = require("../../utils/locale");
const editor_2 = require("../../utils/editor");
function initEditorMenu(editor) {
    const makeId = (key) => `${package_json_1.config.addonRef}-editor-menu-${editor.instanceID}-${key}`;
    if (editor._popup.dataset.bnMenuInitialized === "true") {
        return;
    }
    editor._popup.dataset.bnMenuInitialized = "true";
    editor._popup.addEventListener("popupshowing", (ev) => __awaiter(this, void 0, void 0, function* () {
        if (ev.target !== editor._popup) {
            return;
        }
        editor._popup
            .querySelectorAll(`.${package_json_1.config.addonRef}`)
            .forEach((elem) => {
            elem.remove();
        });
        if ((0, editor_1.isImageAtCursor)(editor)) {
            ztoolkit.Menu.register(editor._popup, {
                tag: "menuitem",
                id: makeId("resizeImage"),
                classList: [package_json_1.config.addonRef],
                label: (0, locale_1.getString)("menuEditor-resizeImage"),
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                commandListener: (ev) => {
                    var _a, _b;
                    const newWidth = parseFloat(editor._iframeWindow.prompt((0, locale_1.getString)("editor-resizeImage-prompt"), 
                    // @ts-ignore
                    (_b = (_a = (0, editor_2.getEditorCore)(editor).view.state.selection.node) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.width) || "");
                    if (newWidth && newWidth > 10) {
                        (0, editor_1.updateImageDimensionsAtCursor)(editor, newWidth);
                    }
                },
            });
        }
        const currentLine = (0, editor_1.getLineAtCursor)(editor);
        const currentSection = (yield (0, editor_1.getSectionAtCursor)(editor)) || "";
        ztoolkit.Menu.register(editor._popup, {
            tag: "menu",
            id: makeId("copyMenus"),
            classList: [package_json_1.config.addonRef],
            label: (0, locale_1.getString)("menuEditor-copy"),
            icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
            children: [
                {
                    tag: "menuitem",
                    id: makeId("copyLine"),
                    classList: [package_json_1.config.addonRef],
                    label: (0, locale_1.getString)("menuEditor-copyLine", {
                        args: {
                            line: currentLine,
                        },
                    }),
                    commandListener: (ev) => {
                        (0, editor_1.copyNoteLink)(editor, "line");
                    },
                },
                {
                    tag: "menuitem",
                    id: makeId("copySection"),
                    classList: [package_json_1.config.addonRef],
                    label: (0, locale_1.getString)("menuEditor-copySection", {
                        args: {
                            section: currentSection,
                        },
                    }),
                    commandListener: (ev) => {
                        (0, editor_1.copyNoteLink)(editor, "section");
                    },
                },
            ],
        });
    }));
}
