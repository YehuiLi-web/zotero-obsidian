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
const package_json_1 = require("../../package.json");
// @ts-ignore defined by html-docx-js
const html_docx_1 = require("html-docx-js/dist/html-docx");
const XSL_PATH = `chrome://${package_json_1.config.addonRef}/content/lib/js/mml2omml.sef.json`;
// this runs in a iframe. accept input message
// and return output message
onmessage = (_a) => __awaiter(void 0, [_a], void 0, function* ({ data: { type, jobID, message } }) {
    if (type === "parseDocx") {
        console.log("DOCX Worker", type, jobID, message);
        const blob = html_docx_1.default.asBlob(message);
        postMessage({ type: "parseDocxReturn", jobID, message: blob }, "*");
    }
    else if (type === "parseMML") {
        console.log("MML Worker", type, jobID, message);
        // @ts-ignore defined by SaxonJS
        const result = yield SaxonJS.transform({
            stylesheetLocation: XSL_PATH,
            sourceType: "xml",
            sourceText: message,
            destination: "serialized",
        }, "async");
        postMessage({ type: "parseMMLReturn", jobID, message: result.principalResult }, "*");
    }
});
