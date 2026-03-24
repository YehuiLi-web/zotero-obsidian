window.addEventListener("DOMContentLoaded", () => {
    const registeredKey = Zotero.Notifier.registerObserver({
        notify(action, type, ids, extraData) {
            if (action === "modify" && type === "item") {
                const item = getItem();
                if (ids.includes(item.id)) {
                    updateTitle();
                }
            }
        },
    });
    window.addEventListener("unload", () => {
        Zotero.Notifier.unregisterObserver(registeredKey);
    }, { once: true });
    window.arguments[0]._initPromise.resolve();
});
function updateTitle() {
    const item = getItem();
    if (item === null || item === void 0 ? void 0 : item.isNote()) {
        document.title = item.getNoteTitle();
    }
}
function getItem() {
    var _a;
    // @ts-ignore
    return (_a = document.querySelector("zob-workspace")) === null || _a === void 0 ? void 0 : _a.item;
}
window.updateTitle = updateTitle;
