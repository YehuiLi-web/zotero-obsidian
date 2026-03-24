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
exports.initLinkPreviewPlugin = initLinkPreviewPlugin;
const prosemirror_state_1 = require("prosemirror-state");
const popup_1 = require("./popup");
class PluginState {
    constructor(state, options) {
        this.popup = null;
        this.node = null;
        this.currentLink = null;
        this.hasHover = false;
        this.handleMouseMove = (event) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.options.previewType === "disable") {
                return;
            }
            const { target } = event;
            let isValid = false;
            if (target instanceof HTMLElement) {
                const href = (_a = target.closest("a")) === null || _a === void 0 ? void 0 : _a.getAttribute("href");
                if (href === null || href === void 0 ? void 0 : href.startsWith("zotero://note/")) {
                    isValid = true;
                    if (this.currentLink !== href) {
                        this.node = target;
                        this.currentLink = href;
                        this.hasHover = true;
                        this.tryOpenPopupByHover();
                    }
                }
            }
            if (!isValid && this.currentLink) {
                this.hasHover = false;
                this.currentLink = null;
                this.tryClosePopup();
            }
        });
        this.handleKeydown = (event) => __awaiter(this, void 0, void 0, function* () {
            if (this.options.previewType !== "ctrl") {
                return;
            }
            if (!this.hasHover || !this.currentLink) {
                return;
            }
            const isMac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;
            if ((isMac && event.metaKey) || (!isMac && event.ctrlKey)) {
                this.tryTogglePopupByKey();
            }
        });
        this.state = state;
        this.options = options;
        this.update(state);
    }
    update(state, prevState) {
        this.state = state;
        if (this.options.previewType === "disable") {
            return;
        }
        if (prevState &&
            prevState.doc.eq(state.doc) &&
            prevState.selection.eq(state.selection)) {
            return;
        }
        // Handle selection change
        setTimeout(() => {
            var _a;
            (_a = this.popup) === null || _a === void 0 ? void 0 : _a.layoutPopup(this);
        }, 10);
    }
    destroy() {
        var _a;
        (_a = this.popup) === null || _a === void 0 ? void 0 : _a.remove();
    }
    tryOpenPopupByHover() {
        if (this.options.previewType !== "hover") {
            return;
        }
        const href = this.currentLink;
        setTimeout(() => {
            if (this.currentLink === href) {
                this._openPopup();
            }
        }, 300);
    }
    tryTogglePopupByKey() {
        if (this._hasPopup()) {
            this._closePopup();
        }
        else {
            this._openPopup();
        }
    }
    _openPopup() {
        console.log("Enter Link Preview", this.currentLink, this.options);
        document.querySelectorAll(".link-preview").forEach((el) => el.remove());
        this.popup = new popup_1.Popup(document, "link-preview", [
            document.createRange().createContextualFragment(`
<style>
  .link-preview > .popup {
    max-width: 360px;
    max-height: 360px;
    overflow: hidden auto;
  }
  .link-preview > .popup > * {
    margin-block: 0;
  }
  .link-preview .primary-editor img:not(.ProseMirror-separator) {
    max-width: 100%;
    height: auto;
  }
  .link-preview .primary-editor li {
    white-space: normal;
  }
</style>`),
        ]);
        this.popup.popup.classList.add("primary-editor");
        this.popup.container.style.display = "none";
        this.popup.layoutPopup(this);
        this.options.setPreviewContent(this.currentLink, (content) => {
            var _a, _b;
            (_a = this.popup) === null || _a === void 0 ? void 0 : _a.popup.append(document.createRange().createContextualFragment(content));
            this.popup.container.style.removeProperty("display");
            (_b = this.popup) === null || _b === void 0 ? void 0 : _b.layoutPopup(this);
        });
        this.popup.container.addEventListener("mouseleave", () => {
            this.currentLink = null;
            this.tryClosePopup();
        });
        this.popup.container.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const target = event.target;
            if (target.localName === "a") {
                const href = target.getAttribute("href");
                if (href) {
                    this.options.openURL(href);
                }
            }
            this._closePopup();
        });
    }
    tryClosePopup() {
        setTimeout(() => {
            var _a, _b;
            console.log("Close Link Preview", this.currentLink, (_a = this.popup) === null || _a === void 0 ? void 0 : _a.hasHover);
            if (this.hasHover || ((_b = this.popup) === null || _b === void 0 ? void 0 : _b.hasHover)) {
                return;
            }
            this._closePopup();
        }, 300);
    }
    _closePopup() {
        this.node = null;
        document.querySelectorAll(".link-preview").forEach((el) => el.remove());
        this.popup = null;
    }
    _hasPopup() {
        return !!document.querySelector(".link-preview");
    }
}
function initLinkPreviewPlugin(plugins, options) {
    const core = _currentEditorInstance._editorCore;
    console.log("Init BN Link Preview Plugin");
    const key = new prosemirror_state_1.PluginKey("linkPreviewPlugin");
    return [
        ...plugins,
        new prosemirror_state_1.Plugin({
            key,
            state: {
                init(config, state) {
                    return new PluginState(state, options);
                },
                apply: (tr, pluginState, oldState, newState) => {
                    pluginState.update(newState, oldState);
                    return pluginState;
                },
            },
            props: {
                handleDOMEvents: {
                    mousemove: (view, event) => {
                        const pluginState = key.getState(view.state);
                        pluginState.update(view.state);
                        pluginState.handleMouseMove(event);
                    },
                    keydown: (view, event) => {
                        const pluginState = key.getState(view.state);
                        pluginState.handleKeydown(event);
                    },
                    wheel: (view, event) => {
                        var _a;
                        const pluginState = key.getState(view.state);
                        (_a = pluginState.popup) === null || _a === void 0 ? void 0 : _a.layoutPopup(pluginState);
                    },
                },
            },
            view: (editorView) => {
                return {
                    update(view, prevState) {
                        const pluginState = key.getState(view.state);
                        pluginState.update(view.state, prevState);
                    },
                    destroy() {
                        const pluginState = key.getState(editorView.state);
                        pluginState.destroy();
                    },
                };
            },
        }),
    ];
}
