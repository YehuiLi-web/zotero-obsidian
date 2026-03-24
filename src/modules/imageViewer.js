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
exports.showImageViewer = showImageViewer;
const package_json_1 = require("../../package.json");
const config_1 = require("../utils/config");
const hint_1 = require("../utils/hint");
const str_1 = require("../utils/str");
const wait_1 = require("../utils/wait");
function showImageViewer(srcList, idx, title) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        if (!addon.data.imageViewer.window ||
            Components.utils.isDeadWrapper(addon.data.imageViewer.window) ||
            addon.data.imageViewer.window.closed) {
            addon.data.imageViewer.window = Services.ww.openWindow(
            // @ts-ignore
            null, `chrome://${package_json_1.config.addonRef}/content/imageViewer.html`, `${package_json_1.config.addonRef}-imageViewer`, `chrome,centerscreen,resizable,status,width=500,height=550,dialog=no${addon.data.imageViewer.pined ? ",alwaysRaised=yes" : ""}`, {});
            yield (0, wait_1.waitUtilAsync)(() => { var _a; return ((_a = addon.data.imageViewer.window) === null || _a === void 0 ? void 0 : _a.document.readyState) === "complete"; });
            const container = addon.data.imageViewer.window.document.querySelector(".container");
            const img = addon.data.imageViewer.window.document.querySelector("#image");
            (_a = addon.data.imageViewer.window.document
                .querySelector("#left")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", (e) => {
                setIndex("left");
            });
            (_b = addon.data.imageViewer.window.document
                .querySelector("#bigger")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", (e) => {
                addon.data.imageViewer.anchorPosition = {
                    left: img.scrollWidth / 2 - container.scrollLeft / 2,
                    top: img.scrollHeight / 2 - container.scrollLeft / 2,
                };
                setScale(addon.data.imageViewer.scaling * 1.1);
            });
            (_c = addon.data.imageViewer.window.document
                .querySelector("#smaller")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", (e) => {
                addon.data.imageViewer.anchorPosition = {
                    left: img.scrollWidth / 2 - container.scrollLeft / 2,
                    top: img.scrollHeight / 2 - container.scrollLeft / 2,
                };
                setScale(addon.data.imageViewer.scaling / 1.1);
            });
            (_d = addon.data.imageViewer.window.document
                .querySelector("#resetwidth")) === null || _d === void 0 ? void 0 : _d.addEventListener("click", (e) => {
                setScale(1);
            });
            (_e = addon.data.imageViewer.window.document
                .querySelector("#right")) === null || _e === void 0 ? void 0 : _e.addEventListener("click", (e) => {
                setIndex("right");
            });
            (_f = addon.data.imageViewer.window.document
                .querySelector("#copy")) === null || _f === void 0 ? void 0 : _f.addEventListener("click", (e) => {
                new ztoolkit.Clipboard()
                    .addImage(addon.data.imageViewer.srcList[addon.data.imageViewer.idx])
                    .copy();
                (0, hint_1.showHint)("Image Copied.");
            });
            (_g = addon.data.imageViewer.window.document
                .querySelector("#save")) === null || _g === void 0 ? void 0 : _g.addEventListener("click", (e) => __awaiter(this, void 0, void 0, function* () {
                const parts = addon.data.imageViewer.srcList[addon.data.imageViewer.idx].split(",");
                if (!parts[0].includes("base64")) {
                    return;
                }
                const mime = parts[0].match(/:(.*?);/)[1];
                const bstr = atob(parts[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const ext = Zotero.MIME.getPrimaryExtension(mime, "");
                const filename = yield new ztoolkit.FilePicker(Zotero.getString("noteEditor.saveImageAs"), "save", [[`Image(*.${ext})`, `*.${ext}`]], `Image.${ext}`, addon.data.imageViewer.window, "images").open();
                if (filename) {
                    yield IOUtils.write((0, str_1.formatPath)(filename), u8arr);
                    (0, hint_1.showHintWithLink)(`Image Saved to ${filename}`, "Show in Folder", (ev) => {
                        Zotero.File.reveal(filename);
                    });
                }
            }));
            const pin = addon.data.imageViewer.window.document.querySelector("#pin");
            pin.innerHTML = addon.data.imageViewer.pined
                ? config_1.ICONS.imageViewerPined
                : config_1.ICONS.imageViewerPin;
            pin.title = addon.data.imageViewer.pined ? "Unpin" : "Pin";
            pin === null || pin === void 0 ? void 0 : pin.addEventListener("click", (e) => {
                setPin();
            });
            addon.data.imageViewer.window.addEventListener("keydown", (e) => {
                var _a;
                const isCtrl = (Zotero.isMac && e.metaKey) || (!Zotero.isMac && e.ctrlKey);
                // ctrl+w or esc
                if ((e.key === "w" && isCtrl) || e.keyCode === 27) {
                    (_a = addon.data.imageViewer.window) === null || _a === void 0 ? void 0 : _a.close();
                }
                addon.data.imageViewer.anchorPosition = {
                    left: img.scrollWidth / 2 - container.scrollLeft / 2,
                    top: img.scrollHeight / 2 - container.scrollLeft / 2,
                };
                if (e.keyCode === 37 || e.keyCode === 40) {
                    setIndex("left");
                }
                if (e.keyCode === 38 || e.keyCode === 39) {
                    setIndex("right");
                }
                if (e.key === "0") {
                    setScale(1);
                }
                else if (e.keyCode === 107 || e.keyCode === 187 || e.key === "=") {
                    setScale(addon.data.imageViewer.scaling * 1.1);
                }
                else if (e.key === "-") {
                    setScale(addon.data.imageViewer.scaling / 1.1);
                }
            });
            addon.data.imageViewer.window.addEventListener("wheel", (e) => __awaiter(this, void 0, void 0, function* () {
                addon.data.imageViewer.anchorPosition = {
                    left: e.pageX - container.offsetLeft,
                    top: e.pageY - container.offsetTop,
                };
                function normalizeWheelEventDirection(evt) {
                    let delta = Math.hypot(evt.deltaX, evt.deltaY);
                    const angle = Math.atan2(evt.deltaY, evt.deltaX);
                    if (-0.25 * Math.PI < angle && angle < 0.75 * Math.PI) {
                        // All that is left-up oriented has to change the sign.
                        delta = -delta;
                    }
                    return delta;
                }
                const delta = normalizeWheelEventDirection(e);
                if (e.ctrlKey) {
                    setScale(addon.data.imageViewer.scaling *
                        Math.pow(delta > 0 ? 1.1 : 1 / 1.1, Math.round(Math.abs(delta))));
                }
                else if (e.shiftKey) {
                    container.scrollLeft -= delta * 10;
                }
                else {
                    container.scrollLeft += e.deltaX * 10;
                    container.scrollTop += e.deltaY * 10;
                }
            }));
            img.addEventListener("mousedown", (e) => {
                e.preventDefault();
                // if (addon.data.imageViewer.scaling <= 1) {
                //   return;
                // }
                img.onmousemove = (e) => {
                    e.preventDefault();
                    container.scrollLeft -= e.movementX;
                    container.scrollTop -= e.movementY;
                };
                img.onmouseleave = () => {
                    img.onmousemove = null;
                    img.onmouseup = null;
                };
                img.onmouseup = () => {
                    img.onmousemove = null;
                    img.onmouseup = null;
                };
            });
        }
        addon.data.imageViewer.srcList = srcList;
        addon.data.imageViewer.idx = idx;
        addon.data.imageViewer.title = title || "Note";
        yield setImage();
        setScale(1);
        addon.data.imageViewer.window.focus();
    });
}
function setImage() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const doc = (_a = addon.data.imageViewer.window) === null || _a === void 0 ? void 0 : _a.document;
        if (!doc) {
            return;
        }
        yield (0, wait_1.waitUtilAsync)(() => doc.readyState === "complete");
        doc.querySelector("#image").src =
            addon.data.imageViewer.srcList[addon.data.imageViewer.idx];
        setTitle();
        doc.querySelector("#left").style.opacity =
            addon.data.imageViewer.idx === 0 ? "0.5" : "1";
        doc.querySelector("#right").style.opacity =
            addon.data.imageViewer.idx === addon.data.imageViewer.srcList.length - 1
                ? "0.5"
                : "1";
    });
}
function setIndex(type) {
    return __awaiter(this, void 0, void 0, function* () {
        if (type === "left") {
            addon.data.imageViewer.idx > 0
                ? (addon.data.imageViewer.idx -= 1)
                : undefined;
        }
        if (type === "right") {
            addon.data.imageViewer.idx < addon.data.imageViewer.srcList.length - 1
                ? (addon.data.imageViewer.idx += 1)
                : undefined;
        }
        yield setImage();
    });
}
function setScale(scaling) {
    var _a, _b, _c, _d;
    const oldScale = addon.data.imageViewer.scaling;
    addon.data.imageViewer.scaling = scaling;
    if (addon.data.imageViewer.scaling > 10) {
        addon.data.imageViewer.scaling = 10;
    }
    if (addon.data.imageViewer.scaling < 0.1) {
        addon.data.imageViewer.scaling = 0.1;
    }
    const container = (_a = addon.data.imageViewer.window) === null || _a === void 0 ? void 0 : _a.document.querySelector(".container");
    ((_b = addon.data.imageViewer.window) === null || _b === void 0 ? void 0 : _b.document.querySelector("#image")).style.width = `calc(100% * ${addon.data.imageViewer.scaling})`;
    if (addon.data.imageViewer.scaling > 1) {
        container.scrollLeft +=
            addon.data.imageViewer.anchorPosition.left *
                (addon.data.imageViewer.scaling - oldScale);
        container.scrollTop +=
            addon.data.imageViewer.anchorPosition.top *
                (addon.data.imageViewer.scaling - oldScale);
    }
    ((_c = addon.data.imageViewer.window) === null || _c === void 0 ? void 0 : _c.document.querySelector("#bigger")).style.opacity = addon.data.imageViewer.scaling === 10 ? "0.5" : "1";
    ((_d = addon.data.imageViewer.window) === null || _d === void 0 ? void 0 : _d.document.querySelector("#smaller")).style.opacity = addon.data.imageViewer.scaling === 0.1 ? "0.5" : "1";
    // (
    //   addon.data.imageViewer.window.document.querySelector("#image") as HTMLImageElement
    // ).style.cursor = addon.data.imageViewer.scaling <= 1 ? "default" : "move";
}
function setTitle() {
    addon.data.imageViewer.window.document.querySelector("title").innerText =
        `${addon.data.imageViewer.idx + 1}/${addon.data.imageViewer.srcList.length}:${addon.data.imageViewer.title}`;
}
function setPin() {
    var _a;
    (_a = addon.data.imageViewer.window) === null || _a === void 0 ? void 0 : _a.close();
    addon.data.imageViewer.pined = !addon.data.imageViewer.pined;
    showImageViewer(addon.data.imageViewer.srcList, addon.data.imageViewer.idx, addon.data.imageViewer.title);
}
