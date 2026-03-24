"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginCEBase = void 0;
const package_json_1 = require("../../package.json");
class PluginCEBase extends XULElementBase {
    constructor() {
        super(...arguments);
        this.useShadowRoot = false;
    }
    connectedCallback() {
        var _a;
        // @ts-ignore - plugin instance
        this._addon = Zotero[package_json_1.config.addonInstance];
        Zotero.UIProperties.registerRoot(this);
        if (!this.useShadowRoot) {
            super.connectedCallback();
            return;
        }
        this.attachShadow({ mode: "open" });
        // Following the connectedCallback from XULElementBase
        let content = this.content;
        if (content) {
            content = document.importNode(content, true);
            (_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.append(content);
        }
        MozXULElement.insertFTLIfNeeded("branding/brand.ftl");
        MozXULElement.insertFTLIfNeeded("zotero.ftl");
        if (document.l10n && this.shadowRoot) {
            document.l10n.connectRoot(this.shadowRoot);
        }
        // @ts-ignore
        window.addEventListener("unload", this._handleWindowUnload);
        // @ts-ignore
        this.initialized = true;
        this.init();
    }
    _wrapID(key) {
        if (key.startsWith(package_json_1.config.addonRef)) {
            return key;
        }
        return `${package_json_1.config.addonRef}-${key}`;
    }
    _unwrapID(id) {
        if (id.startsWith(package_json_1.config.addonRef)) {
            return id.slice(package_json_1.config.addonRef.length + 1);
        }
        return id;
    }
    _queryID(key) {
        var _a;
        const selector = `#${this._wrapID(key)}`;
        return (this.querySelector(selector) ||
            ((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector(selector)));
    }
    _parseContentID(dom) {
        dom.querySelectorAll("*[id]").forEach((elem) => {
            elem.id = this._wrapID(elem.id);
        });
        return dom;
    }
}
exports.PluginCEBase = PluginCEBase;
