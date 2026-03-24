"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const linkedom_1 = require("linkedom");
globalThis.document = (0, linkedom_1.parseHTML)("...").document;
// @ts-ignore
globalThis.DOMParser = linkedom_1.DOMParser;
// @ts-ignore
globalThis._fakeDOM = true;
