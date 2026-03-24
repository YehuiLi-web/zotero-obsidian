"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWindowAlive = isWindowAlive;
exports.getFocusedWindow = getFocusedWindow;
exports.isElementVisible = isElementVisible;
function isWindowAlive(win) {
    return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}
function getFocusedWindow() {
    var _a;
    const wins = Services.wm.getEnumerator("");
    for (const win of wins) {
        if ((_a = win.document) === null || _a === void 0 ? void 0 : _a.hasFocus()) {
            return win;
        }
    }
}
function isElementVisible(el) {
    if (!el || !el.ownerDocument)
        return false;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const elementAtCenter = el.ownerDocument.elementFromPoint(centerX, centerY);
    // Check if the element at the center point is the element or one of its descendants
    return el.contains(elementAtCenter);
}
