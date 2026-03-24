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
const prefs_1 = require("../utils/prefs");
let tabbox;
let inboundCreator;
let outboundCreator;
let io;
window.onload = function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (document.readyState === "complete") {
            setTimeout(init, 0);
            return;
        }
        document.addEventListener("DOMContentLoaded", init, { once: true });
    });
};
window.onunload = function () {
    io.deferred && io.deferred.resolve();
    (0, prefs_1.setPref)("windows.linkCreator.size", `${document.documentElement.getAttribute("width")},${document.documentElement.getAttribute("height")}`);
    (0, prefs_1.setPref)("windows.linkCreator.tabIndex", tabbox.selectedIndex);
};
function init() {
    // Set font size from pref
    const sbc = document.getElementById("top-container");
    Zotero.UIProperties.registerRoot(sbc);
    setTimeout(() => {
        const size = ((0, prefs_1.getPref)("windows.linkCreator.size") || "").split(",");
        if (size.length === 2) {
            window.resizeTo(Number(size[0] || "800"), Number(size[1] || "600"));
        }
        else {
            window.sizeToContent();
        }
    }, 0);
    io = window.arguments[0];
    if (!io.deferred) {
        // @ts-ignore
        io = io.wrappedJSObject;
    }
    tabbox = document.querySelector("#top-container");
    if (io.mode) {
        tabbox.selectedIndex = io.mode === "inbound" ? 0 : 1;
    }
    else {
        tabbox.selectedIndex =
            (0, prefs_1.getPref)("windows.linkCreator.tabIndex") || 0;
    }
    tabbox.addEventListener("select", loadSelectedPanel);
    inboundCreator = document.querySelector("zob-inbound-creator");
    outboundCreator = document.querySelector("zob-outbound-creator");
    loadSelectedPanel();
    document.addEventListener("dialogaccept", doAccept);
}
function loadSelectedPanel() {
    return __awaiter(this, void 0, void 0, function* () {
        const content = getSelectedContent();
        yield content.load(io);
    });
}
function acceptSelectedPanel() {
    return __awaiter(this, void 0, void 0, function* () {
        yield getSelectedContent().accept(io);
    });
}
function getSelectedContent() {
    return tabbox.selectedPanel.querySelector("[data-bn-type=content]");
}
function doAccept() {
    return __awaiter(this, void 0, void 0, function* () {
        yield acceptSelectedPanel();
    });
}
