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
exports.slice = slice;
exports.fill = fill;
exports.formatPath = formatPath;
exports.getFileContent = getFileContent;
exports.randomString = randomString;
exports.getItemDataURL = getItemDataURL;
exports.fileExists = fileExists;
exports.jointPath = jointPath;
exports.tryDecodeParse = tryDecodeParse;
exports.htmlEscape = htmlEscape;
exports.htmlUnescape = htmlUnescape;
exports.xhtmlEscape = xhtmlEscape;
const seedrandom = require("seedrandom");
const pathHelper = require("path-browserify");
function slice(str, len) {
    return str.length > len ? `${str.slice(0, len - 3)}...` : str;
}
function fill(str, len, options = {
    char: " ",
    position: "end",
}) {
    if (str.length >= len) {
        return str;
    }
    return str[options.position === "start" ? "padStart" : "padEnd"](len - str.length, options.char);
}
function formatPath(path, suffix = "") {
    path = Zotero.File.normalizeToUnix(path);
    if (Zotero.isWin) {
        path = path.replace(/\//g, "\\");
        if (path[0] === "\\" && path[1] !== "\\") {
            // Assume it's an UNC path wrongly formatted, e.g. `\wsl.localhost\...` from pathHelper
            path = `\\${path}`;
        }
        return path;
    }
    if (suffix && !path.endsWith(suffix)) {
        path += suffix;
    }
    return path;
}
function getFileContent(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const contentOrXHR = yield Zotero.File.getContentsAsync(path);
        const content = typeof contentOrXHR === "string"
            ? contentOrXHR
            : contentOrXHR.response;
        return content;
    });
}
function randomString(len, seed, chars) {
    if (!chars) {
        chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    }
    if (!len) {
        len = 8;
    }
    let str = "";
    const random = seedrandom(seed);
    for (let i = 0; i < len; i++) {
        const rnum = Math.floor(random() * chars.length);
        str += chars.substring(rnum, rnum + 1);
    }
    return str;
}
function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return ztoolkit.getGlobal("btoa")(binary);
}
function getItemDataURL(item) {
    return __awaiter(this, void 0, void 0, function* () {
        if (addon.data.imageCache[item.id]) {
            return addon.data.imageCache[item.id];
        }
        const path = (yield item.getFilePathAsync());
        const buf = (yield IOUtils.read(path)).buffer;
        const dataURL = "data:" +
            item.attachmentContentType +
            ";base64," +
            arrayBufferToBase64(buf);
        const keys = Object.keys(addon.data.imageCache);
        // Limit cache size
        while (keys.length > 100) {
            delete addon.data.imageCache[keys.shift()];
        }
        addon.data.imageCache[item.id] = dataURL;
        return dataURL;
    });
}
function fileExists(path) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!path) {
            return false;
        }
        try {
            // IOUtils.exists() will throw error if path is not valid
            return yield IOUtils.exists(formatPath(path));
        }
        catch (e) {
            ztoolkit.log("[fileExists]", e);
            return false;
        }
    });
}
function jointPath(...paths) {
    try {
        return formatPath(pathHelper.join(...paths.map((p) => p.replaceAll("\\", "/"))));
    }
    catch (e) {
        ztoolkit.log("[jointPath]", e);
        return "";
    }
}
function tryDecodeParse(s) {
    try {
        return JSON.parse(decodeURIComponent(s));
    }
    catch (e) {
        return null;
    }
}
function htmlEscape(doc, str) {
    const div = doc.createElement("div");
    const text = doc.createTextNode(str);
    div.appendChild(text);
    return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function htmlUnescape(str, options = {}) {
    const map = {
        "&nbsp;": " ",
        "&quot;": '"',
        "&#39;": "'",
    };
    if (!options.excludeLineBreak) {
        map["\n"] = "";
    }
    const re = new RegExp(Object.keys(map).join("|"), "g");
    return str.replace(re, function (match) {
        return map[match];
    });
}
function xhtmlEscape(str) {
    return str
        .replace(/&nbsp;/g, "#160;")
        .replace(/<br>/g, "<br/>")
        .replace(/<hr>/g, "<hr/>")
        .replace(/<img([^>]+)>/g, "<img$1/>");
}
