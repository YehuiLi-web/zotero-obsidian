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
exports.getParsingServer = getParsingServer;
exports.closeParsingServer = closeParsingServer;
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const package_json_1 = require("../../package.json");
function closeParsingServer() {
    if (addon.data.parsing.server) {
        addon.data.parsing.server.destroy();
        addon.data.parsing.server = undefined;
    }
}
function getParsingServer() {
    return __awaiter(this, void 0, void 0, function* () {
        if (addon.data.parsing.server) {
            return addon.data.parsing.server;
        }
        const worker = new ChromeWorker(`chrome://${package_json_1.config.addonRef}/content/scripts/parsingWorker.js`, { name: "parsingWorker" });
        const server = new zotero_plugin_toolkit_1.MessageHelper({
            canBeDestroyed: false,
            dev: __env__ === "development",
            name: "parsingWorkerMain",
            target: worker,
            handlers: {},
        });
        server.start();
        yield server.proxy._ping();
        addon.data.parsing.server = server;
        return server;
    });
}
