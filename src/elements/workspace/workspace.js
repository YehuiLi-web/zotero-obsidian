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
exports.Workspace = void 0;
const package_json_1 = require("../../../package.json");
const config_1 = require("../../utils/config");
const prefs_1 = require("../../utils/prefs");
const wait_1 = require("../../utils/wait");
const base_1 = require("../base");
const persistKey = "persist.workspace";
class Workspace extends base_1.PluginCEBase {
    constructor() {
        super(...arguments);
        this.uid = Zotero.Utilities.randomString(8);
    }
    get content() {
        return this._parseContentID(MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/workspace/workspace.css"
  ></html:link>
</linkset>
<hbox id="top-container" class="container">
  <zob-outline id="left-container" class="container" zotero-persist="width">
  </zob-outline>
  <splitter
    id="left-splitter"
    collapse="before"
    zotero-persist="state"
  ></splitter>
  <vbox id="center-container" class="container" zotero-persist="width">
    <note-editor id="editor-main" class="container"></note-editor>
  </vbox>
  <splitter
    id="right-splitter"
    collapse="after"
    zotero-persist="state"
  ></splitter>
  <zob-context id="right-container" class="container" zotero-persist="width"></zob-context>
</hbox>  
`));
    }
    get containerType() {
        return this.getAttribute("container-type") || "";
    }
    set containerType(val) {
        this.setAttribute("container-type", val);
    }
    get item() {
        return this._item;
    }
    set item(val) {
        if (!val)
            return;
        this._addon.api.relation.updateNoteLinkRelation(val.id);
        this._item = val;
        this._outline.item = val;
        this._context.item = val;
    }
    get editor() {
        return this._editorElement._editorInstance;
    }
    init() {
        // MozXULElement.insertFTLIfNeeded(`${config.addonRef}-workspace.ftl`);
        // For note preview section enabled decision
        this.dataset.uid = this.uid;
        this._addon.data.workspace.instances[this.uid] = new WeakRef(this);
        this._outline = this._queryID("left-container");
        this._editorContainer = this._queryID("center-container");
        this._editorElement = this._queryID("editor-main");
        this._outline._editorElement = this._editorElement;
        this._context = this._queryID("right-container");
        this._leftSplitter = this._queryID("left-splitter");
        this._rightSplitter = this._queryID("right-splitter");
        this._leftSplitter.addEventListener("mouseup", () => {
            this._persistState();
        });
        this._rightSplitter.addEventListener("mouseup", () => {
            this._persistState();
        });
        this._initEditor();
        this.resizeOb = new ResizeObserver(() => {
            if (!this.editor)
                return;
            this._addon.api.editor.scroll(this.editor, this._addon.api.editor.getLineAtCursor(this.editor));
        });
        this.resizeOb.observe(this._editorElement);
        this._prefObserverID = (0, prefs_1.registerPrefObserver)(persistKey, this._restoreState.bind(this));
    }
    destroy() {
        (0, prefs_1.unregisterPrefObserver)(this._prefObserverID);
        this.resizeOb.disconnect();
        delete this._addon.data.workspace.instances[this.uid];
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._outline.render();
            yield this.updateEditor();
            yield this._context.render();
            this._restoreState();
        });
    }
    updateEditor() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield (0, wait_1.waitUtilAsync)(() => Boolean(this._editorElement._initialized));
            if (!this._editorElement._initialized) {
                throw new Error("initNoteEditor: waiting initialization failed");
            }
            this._editorElement.mode = "edit";
            this._editorElement.viewMode = "library";
            this._editorElement.parent = (_a = this.item) === null || _a === void 0 ? void 0 : _a.parentItem;
            this._editorElement.item = this.item;
            yield (0, wait_1.waitUtilAsync)(() => Boolean(this._editorElement._editorInstance));
            yield this._editorElement._editorInstance._initPromise;
            return;
        });
    }
    scrollEditorTo(options = {}) {
        if (typeof options.lineIndex === "number") {
            this._addon.api.editor.scroll(this.editor, options.lineIndex);
        }
        if (typeof options.sectionName === "string") {
            this._addon.api.editor.scrollToSection(this.editor, options.sectionName);
        }
    }
    toggleOutline(open) {
        if (typeof open !== "boolean") {
            open = this._leftSplitter.getAttribute("state") === "collapsed";
        }
        this._leftSplitter.setAttribute("state", open ? "open" : "collapsed");
        this._persistState();
    }
    toggleContext(open) {
        if (typeof open !== "boolean") {
            open = this._rightSplitter.getAttribute("state") === "collapsed";
        }
        this._rightSplitter.setAttribute("state", open ? "open" : "collapsed");
        this._persistState();
    }
    scrollToPane(key) {
        const itemDetails = this._context._details;
        return itemDetails.scrollToPane(key);
    }
    getPreviewEditor(itemID) {
        return this.querySelector(`note-editor[data-id="${itemID}"]`);
    }
    _initEditor() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            yield (0, wait_1.waitUtilAsync)(() => !!this._editorElement._editorInstance);
            const editor = this._editorElement._editorInstance;
            yield editor._initPromise;
            const _document = editor._iframeWindow.document;
            yield (0, wait_1.waitUtilAsync)(() => !!_document.querySelector(".toolbar"));
            const toolbar = _document.querySelector(".toolbar");
            const toggleOutline = this._addon.data.ztoolkit.UI.createElement(_document, "button", {
                classList: ["toolbar-button"],
                properties: {
                    innerHTML: config_1.ICONS.workspaceToggle,
                    title: "Toggle left pane",
                },
                listeners: [
                    {
                        type: "click",
                        listener: (e) => {
                            this.toggleOutline();
                        },
                    },
                ],
            });
            (_a = toolbar.querySelector(".start")) === null || _a === void 0 ? void 0 : _a.append(toggleOutline);
            const toggleContext = this._addon.data.ztoolkit.UI.createElement(_document, "button", {
                classList: ["toolbar-button"],
                properties: {
                    innerHTML: config_1.ICONS.workspaceToggle,
                    title: "Toggle right pane",
                },
                styles: {
                    transform: "rotate(180deg)",
                },
                listeners: [
                    {
                        type: "click",
                        listener: (e) => {
                            this.toggleContext();
                        },
                    },
                ],
            });
            (_b = toolbar.querySelector(".end")) === null || _b === void 0 ? void 0 : _b.prepend(toggleContext);
        });
    }
    _persistState() {
        var _a, _b, _c;
        const state = {
            leftState: this._leftSplitter.getAttribute("state"),
            rightState: this._rightSplitter.getAttribute("state"),
            leftWidth: (_a = window.getComputedStyle(this._outline)) === null || _a === void 0 ? void 0 : _a.width,
            centerWidth: (_b = window.getComputedStyle(this._editorContainer)) === null || _b === void 0 ? void 0 : _b.width,
            rightWidth: (_c = window.getComputedStyle(this._context)) === null || _c === void 0 ? void 0 : _c.width,
        };
        (0, prefs_1.setPref)(persistKey, JSON.stringify(state));
    }
    _restoreState() {
        const state = (0, prefs_1.getPrefJSON)(persistKey);
        if (typeof state.leftState === "string") {
            this._leftSplitter.setAttribute("state", state.leftState);
        }
        if (typeof state.rightState === "string") {
            this._rightSplitter.setAttribute("state", state.rightState);
        }
        if (state.leftWidth) {
            this._outline.style.width = state.leftWidth;
        }
        if (state.centerWidth) {
            this._editorContainer.style.width = state.centerWidth;
        }
        if (state.rightWidth) {
            this._context.style.width = state.rightWidth;
        }
    }
}
exports.Workspace = Workspace;
