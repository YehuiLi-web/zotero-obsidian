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
exports.registerNotify = registerNotify;
function registerNotify(types, win) {
    const callback = {
        notify: (...data) => __awaiter(this, void 0, void 0, function* () {
            if (!(addon === null || addon === void 0 ? void 0 : addon.data.alive)) {
                unregisterNotify(notifyID);
                return;
            }
            addon.hooks.onNotify(...data);
        }),
    };
    // Register the callback in Zotero as an item observer
    const notifyID = Zotero.Notifier.registerObserver(callback, types);
    // Unregister callback when the window closes (important to avoid a memory leak)
    win.addEventListener("unload", (e) => {
        unregisterNotify(notifyID);
    }, false);
}
function unregisterNotify(notifyID) {
    Zotero.Notifier.unregisterObserver(notifyID);
}
