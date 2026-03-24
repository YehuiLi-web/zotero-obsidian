"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlers = void 0;
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const convert_1 = require("../convert");
const handlers = {
    note2rehype: convert_1.note2rehype,
    rehype2remark: convert_1.rehype2remark,
    rehype2note: convert_1.rehype2note,
    remark2rehype: convert_1.remark2rehype,
    remark2md: convert_1.remark2md,
    remark2latex: convert_1.remark2latex,
    md2remark: convert_1.md2remark,
    content2diff: convert_1.content2diff,
    md2html: convert_1.md2html,
};
exports.handlers = handlers;
const messageServer = new zotero_plugin_toolkit_1.MessageHelper({
    canBeDestroyed: true,
    dev: true,
    name: "convertWorker",
    target: self,
    handlers,
});
messageServer.start();
