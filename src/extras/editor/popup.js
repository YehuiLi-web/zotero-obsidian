"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Popup = void 0;
class Popup {
    get container() {
        return this._popup;
    }
    get popup() {
        return this._popup.querySelector(".popup");
    }
    constructor(doc, className, children = []) {
        var _a;
        this.hasHover = false;
        this.className = className || "";
        this._popup = doc.createElement("div");
        this._popup.className = `popup-container ${className}`;
        this._popup.innerHTML = `
        <div class="popup popup-top">
        </div>
    `;
        this.popup.append(...children);
        (_a = doc.querySelector(".relative-container")) === null || _a === void 0 ? void 0 : _a.appendChild(this._popup);
        this._popup.addEventListener("mouseenter", () => {
            this.hasHover = true;
        });
        this._popup.addEventListener("mouseleave", () => {
            this.hasHover = false;
        });
    }
    layoutPopup(pluginState) {
        var _a;
        const rect = pluginState.rect || ((_a = pluginState.node) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect());
        if (!rect)
            return;
        const padding = 10;
        const editor = document.querySelector(".editor-core");
        const popupParent = this.container.parentElement;
        const parentScrollTop = popupParent.scrollTop;
        const parentTop = popupParent.getBoundingClientRect().top;
        const popupHeight = this.popup.offsetHeight;
        const maxWidth = this.container.offsetWidth;
        const topSpace = rect.top - popupHeight - padding;
        let top;
        if (topSpace < 0) {
            // Bottom
            const otherPopupHeight = Array.from(popupParent.querySelectorAll(`.popup-container:not(.${this.className}) > .popup.popup-bottom`)).reduce((acc, el) => acc + el.offsetHeight, 0);
            top =
                parentScrollTop +
                    (rect.bottom - parentTop) +
                    otherPopupHeight +
                    padding;
            this.popup.classList.remove("popup-top");
            this.popup.classList.add("popup-bottom");
        }
        else {
            // Top
            const otherPopupHeight = Array.from(popupParent.querySelectorAll(`.popup-container:not(.${this.className}) > .popup.popup-top`)).reduce((acc, el) => acc + el.offsetHeight, 0);
            top =
                parentScrollTop +
                    (rect.top - parentTop) -
                    popupHeight -
                    otherPopupHeight -
                    padding;
            this.popup.classList.remove("popup-bottom");
            this.popup.classList.add("popup-top");
        }
        const width = this.popup.offsetWidth;
        let left = rect.left + (rect.right - rect.left) / 2 - width / 2 + 1;
        if (left + width >= maxWidth) {
            left = maxWidth - width;
        }
        if (left < 2) {
            left = 2;
        }
        this.popup.style.top = Math.round(top) + "px";
        this.popup.style.left = Math.round(left) + "px";
        // Make sure the popup height is not larger than the editor height
        // if (editor) {
        //   const editorRect = editor.getBoundingClientRect();
        //   const popupRect = this.popup.getBoundingClientRect();
        //   if (popupRect.bottom > editorRect.bottom + padding) {
        //     this.popup.style.maxHeight =
        //       editorRect.bottom - popupRect.top - padding + "px";
        //   } else {
        //     this.popup.style.maxHeight = "";
        //   }
        // }
        return this;
    }
    remove() {
        this._popup.remove();
    }
}
exports.Popup = Popup;
