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
exports.initWorkspace = initWorkspace;
const wait_1 = require("../../utils/wait");
function initWorkspace(container, item) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!container) {
            return;
        }
        container.style.minWidth = "0px";
        container.style.minHeight = "0px";
        // @ts-ignore
        const customElements = container.ownerGlobal
            .customElements;
        yield (0, wait_1.waitUtilAsync)(() => !!customElements.get("zob-workspace"));
        const workspace = new (customElements.get("zob-workspace"))();
        container.append(workspace);
        workspace.item = item;
        workspace.containerType = "tab";
        yield workspace.render();
        return workspace;
    });
}
