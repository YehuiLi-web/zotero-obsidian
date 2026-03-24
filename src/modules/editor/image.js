"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initEditorImagePreviewer = initEditorImagePreviewer;
function initEditorImagePreviewer(editor) {
    const openPreview = (e) => {
        var _a;
        const imgs = (_a = editor._iframeWindow.document
            .querySelector(".primary-editor")) === null || _a === void 0 ? void 0 : _a.querySelectorAll("img");
        if (!(imgs === null || imgs === void 0 ? void 0 : imgs.length)) {
            return;
        }
        const imageList = Array.from(imgs);
        addon.hooks.onShowImageViewer(imageList.map((elem) => elem === null || elem === void 0 ? void 0 : elem.src), imageList.indexOf(e.target), editor._item.getNoteTitle());
    };
    editor._iframeWindow.document.addEventListener("dblclick", (e) => {
        if (e.target.tagName === "IMG") {
            openPreview(e);
        }
    });
    editor._iframeWindow.document.addEventListener("click", (e) => {
        if (e.target.tagName === "IMG" && e.ctrlKey) {
            openPreview(e);
        }
    });
}
