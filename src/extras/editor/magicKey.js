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
exports.initMagicKeyPlugin = initMagicKeyPlugin;
const prosemirror_state_1 = require("prosemirror-state");
const popup_1 = require("./popup");
const editorStrings_1 = require("./editorStrings");
class PluginState {
    get commands() {
        return this._commands.filter((command) => {
            if (command.enabled) {
                return command.enabled(this.state);
            }
            return true;
        });
    }
    get node() {
        const node = 
        // @ts-ignore - private API
        _currentEditorInstance._editorCore.view.domSelection().anchorNode;
        if (node.nodeType === Node.TEXT_NODE) {
            return node.parentElement;
        }
        return node;
    }
    constructor(state, options) {
        this._commands = [
            {
                messageId: "insertTemplate",
                searchParts: ["it", "insertTemplate"],
                command: (state) => {
                    var _a, _b;
                    (_b = (_a = this.options).insertTemplate) === null || _b === void 0 ? void 0 : _b.call(_a);
                },
            },
            {
                messageId: "outboundLink",
                searchParts: ["ob", "obl", "outboundLink"],
                command: (state) => {
                    var _a, _b;
                    (_b = (_a = this.options).insertLink) === null || _b === void 0 ? void 0 : _b.call(_a, "outbound");
                },
            },
            {
                messageId: "inboundLink",
                searchParts: ["ib", "ibl", "inboundLink"],
                command: (state) => {
                    var _a, _b;
                    (_b = (_a = this.options).insertLink) === null || _b === void 0 ? void 0 : _b.call(_a, "inbound");
                },
            },
            {
                messageId: "insertCitation",
                searchParts: ["ic", "insertCitation"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin("citation")) === null || _a === void 0 ? void 0 : _a.insertCitation();
                },
            },
            {
                messageId: "openAttachment",
                searchParts: ["oa", "openAttachment"],
                command: (state) => {
                    var _a, _b;
                    (_b = (_a = this.options).openAttachment) === null || _b === void 0 ? void 0 : _b.call(_a);
                },
                enabled: (state) => {
                    var _a, _b;
                    return ((_b = (_a = this.options).canOpenAttachment) === null || _b === void 0 ? void 0 : _b.call(_a)) || false;
                },
            },
            {
                messageId: "copySectionLink",
                searchParts: ["csl", "copySectionLink"],
                command: (state) => {
                    var _a, _b;
                    (_b = (_a = this.options).copyLink) === null || _b === void 0 ? void 0 : _b.call(_a, "section");
                },
            },
            {
                messageId: "copyLineLink",
                searchParts: ["cll", "copyLineLink"],
                command: (state) => {
                    var _a, _b;
                    (_b = (_a = this.options).copyLink) === null || _b === void 0 ? void 0 : _b.call(_a, "line");
                },
            },
            {
                messageId: "refreshTemplates",
                searchParts: ["rt", "refreshTemplates"],
                command: (state) => {
                    var _a, _b;
                    (_b = (_a = this.options).refreshTemplates) === null || _b === void 0 ? void 0 : _b.call(_a);
                },
            },
            {
                messageId: "table",
                searchParts: ["tb", "table"],
                command: (state) => {
                    const input = prompt("Enter the number of rows and columns, separated by a comma (e.g., 3,3)");
                    if (!input) {
                        return state.tr;
                    }
                    const splitter = input.includes("x")
                        ? "x"
                        : input.includes(",")
                            ? ","
                            : " ";
                    const [rows, cols] = input.split(splitter).map((n) => parseInt(n, 10));
                    if (isNaN(rows) || isNaN(cols)) {
                        return state.tr;
                    }
                    const { tr, selection } = state;
                    const { $from, $to } = selection;
                    const { pos } = $from;
                    const table = state.schema.nodes.table.createAndFill({}, Array.from({ length: rows }, () => state.schema.nodes.table_row.createAndFill({}, Array.from({ length: cols }, () => state.schema.nodes.table_cell.createAndFill()))));
                    tr.replaceWith(pos, pos, table);
                    _currentEditorInstance._editorCore.view.dispatch(tr);
                },
            },
            {
                messageId: "heading1",
                searchParts: ["h1", "heading1"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.heading1.run();
                },
            },
            {
                messageId: "heading2",
                searchParts: ["h2", "heading2"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.heading2.run();
                },
            },
            {
                messageId: "heading3",
                searchParts: ["h3", "heading3"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.heading3.run();
                },
            },
            {
                messageId: "paragraph",
                searchParts: ["pg", "paragraph"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.paragraph.run();
                },
            },
            {
                messageId: "monospaced",
                searchParts: ["ms", "monospaced"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.codeBlock.run();
                },
            },
            {
                messageId: "bulletList",
                searchParts: ["ul", "bulletList", "unorderedList"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.bulletList.run();
                },
            },
            {
                messageId: "orderedList",
                searchParts: ["ol", "orderedList"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.orderedList.run();
                },
            },
            {
                messageId: "blockquote",
                searchParts: ["bq", "blockquote"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.blockquote.run();
                },
            },
            {
                messageId: "mathBlock",
                searchParts: ["mb", "mathBlock"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.math_display.run();
                },
            },
            {
                messageId: "clearFormatting",
                searchParts: ["cf", "clearFormatting"],
                command: (state) => {
                    var _a;
                    (_a = getPlugin()) === null || _a === void 0 ? void 0 : _a.clearFormatting.run();
                },
            },
        ];
        this.popup = null;
        this.selectedCommandIndex = 0;
        this.popupClass = "command-palette";
        this.handleKeydown = (event) => __awaiter(this, void 0, void 0, function* () {
            if (event.key === "Escape") {
                if (this._hasPopup()) {
                    this._closePopup();
                }
                return;
            }
            const isMac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;
            if (this.options.enableShortcut &&
                ((isMac && event.metaKey) || (!isMac && event.ctrlKey)) &&
                event.key === "/") {
                if (!this._hasPopup()) {
                    this._openPopup(this.state);
                }
                else {
                    this._closePopup();
                }
                event.preventDefault();
                return;
            }
        });
        this.state = state;
        this.options = options;
        const locale = window.navigator.language || "en-US";
        for (const key in this.commands) {
            const command = this.commands[key];
            if (command.messageId) {
                command.title = (0, editorStrings_1.formatMessage)(command.messageId, locale);
            }
        }
        this.update(state);
    }
    update(state, prevState) {
        this.state = state;
        if (!prevState) {
            return;
        }
        // Check if the selection has changed, then try to close the popup
        if (!prevState.selection.eq(state.selection)) {
            this._closePopup();
        }
        if (!this.options.enable) {
            return;
        }
        // If the document hasn't changed, we don't need to do anything
        if (prevState.doc.eq(state.doc)) {
            return;
        }
        // When `/` is pressed, we should open the command palette
        const selectionText = state.doc.textBetween(state.selection.from, state.selection.to);
        if (!selectionText) {
            const { $from } = this.state.selection;
            const { parent } = $from;
            // Don't open the popup if we are in the document root
            if (parent.type.name === "doc") {
                return;
            }
            const textBeforeCursor = getTextBeforeCursor($from);
            if (textBeforeCursor.endsWith("/") && !textBeforeCursor.endsWith("//")) {
                this._openPopup(state);
            }
            else {
                this._closePopup();
            }
        }
    }
    destroy() {
        var _a;
        (_a = this.popup) === null || _a === void 0 ? void 0 : _a.remove();
    }
    _openPopup(state) {
        if (this._hasPopup()) {
            return;
        }
        this.popup = new popup_1.Popup(document, this.popupClass, [
            document.createRange().createContextualFragment(`
<style>
  .${this.popupClass} > .popup {
    max-width: 360px;
    max-height: 360px;
    overflow: hidden;
  }
  .${this.popupClass} > .popup input {
    padding: 0 7px;
    background: var(--material-background);
    border-radius: 5px;
    border: var(--material-border-quinary);
    width: 100%;
    outline: none;
    height: 28px;
    flex-shrink: 0;
  }
  .${this.popupClass} > .popup input:focus {
    outline: none;
    border-color: rgba(0, 0, 0, 0);
    box-shadow: 0 0 0 var(--width-focus-border) var(--color-focus-search);
  }
  .${this.popupClass} .popup-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .${this.popupClass} .popup-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden auto;
  }
  .${this.popupClass} .popup-item {
    display: flex;
    align-items: flex-end;
    padding: 6px;
    cursor: pointer;
    border-radius: 5px;
  }
  .${this.popupClass} .popup-item[hidden] {
    display: none !important;
  }
  .${this.popupClass} .popup-item-title {
    flex: 1;
  }
  .${this.popupClass} .popup-item-key {
    margin-left: 12px;
    font-size: 0.9em;
    font-family: monospace;
  }
  .${this.popupClass} .popup-item:hover {
    background-color: var(--fill-senary);
  }
  .${this.popupClass} .popup-item.selected {
    background-color: var(--color-accent);
    color: #fff;
  }
</style>
<div class="popup-content">
  <input type="text" class="popup-input" placeholder="Search commands" />
  <div class="popup-list" tabindex="-1">
    ${Object.entries(this.commands)
                .map(([id, command]) => `
      <div class="popup-item" data-command-id="${id}">
        <div class="popup-item-icon">${command.icon || ""}</div>
        <div class="popup-item-title">${command.title}</div>
        <div class="popup-item-key">${command.searchParts[0]}</div>
      </div>`)
                .join("")}
  </div>
</div>`),
        ]);
        this.popup.layoutPopup(this);
        // Focus the input
        const input = this.popup.container.querySelector(".popup-input");
        input.focus();
        // Handle input
        input.addEventListener("input", (event) => {
            var _a;
            const target = event.target;
            const value = target.value;
            let numIndex = 0;
            let itemIndex;
            for (const [id, command] of Object.entries(this.commands)) {
                const item = this.popup.container.querySelector(`.popup-item[data-command-id="${id}"]`);
                if (!value) {
                    item.hidden = false;
                    continue;
                }
                const matchedIndex = command
                    .title.toLowerCase()
                    .indexOf(value.toLowerCase());
                if (matchedIndex < 0 &&
                    // Try to match the search parts
                    !((_a = command.searchParts) === null || _a === void 0 ? void 0 : _a.some((part) => part.toLowerCase().includes(value.toLowerCase())))) {
                    item.hidden = true;
                }
                else {
                    item.hidden = false;
                    if (command.searchParts &&
                        command.searchParts[0].toLowerCase() === value.toLowerCase()) {
                        itemIndex = numIndex;
                    }
                }
                numIndex += 1;
                if (matchedIndex >= 0) {
                    // Change the matched part to bold
                    const title = command.title;
                    item.querySelector(".popup-item-title").innerHTML =
                        title.slice(0, matchedIndex) +
                            `<b>${title.slice(matchedIndex, matchedIndex + value.length)}</b>` +
                            title.slice(matchedIndex + value.length);
                }
            }
            this._selectCommand(itemIndex);
        });
        input.addEventListener("keydown", (event) => {
            if (event.key === "ArrowUp") {
                this._selectCommand(this.selectedCommandIndex - 1, "up");
                event.preventDefault();
            }
            else if (event.key === "ArrowDown") {
                this._selectCommand(this.selectedCommandIndex + 1, "down");
                event.preventDefault();
            }
            else if (event.key === "ArrowLeft") {
                // Select the first command
                this._selectCommand(this.commands.length, "up");
                event.preventDefault();
            }
            else if (event.key === "ArrowRight") {
                // Select the last command
                this._selectCommand(-1, "down");
                event.preventDefault();
            }
            else if (event.key === "Tab") {
                // If has input, autocomplete the selected command to the first space
                const command = this.commands[this.selectedCommandIndex];
                if (!command) {
                    return;
                }
                if (!input.value) {
                    return;
                }
                const title = command.title;
                // Compute after the matched part
                const matchedIndex = title
                    .toLowerCase()
                    .indexOf(input.value.toLowerCase());
                const spaceIndex = title.indexOf(" ", matchedIndex + input.value.length);
                if (spaceIndex >= 0) {
                    input.value = title.slice(0, spaceIndex);
                }
                else {
                    input.value = title;
                }
                event.preventDefault();
            }
            else if (event.key === "Enter") {
                event.preventDefault();
                const command = this.commands[this.selectedCommandIndex];
                if (!command) {
                    this._closePopup();
                    return;
                }
                this._executeCommand(this.selectedCommandIndex, state);
            }
            else if (event.key === "Escape") {
                event.preventDefault();
                this._closePopup();
            }
            else if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
                this._closePopup();
                if (this.options.enable) {
                    this.removeInputSlash(state);
                }
            }
        });
        this.popup.container.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const target = event.target;
            // Find the command
            const item = target.closest(".popup-item");
            if (!item) {
                return;
            }
            const index = parseInt(item.dataset.commandId || "-1", 10);
            this._executeCommand(index, state);
        });
        this._selectCommand(0);
    }
    _closePopup() {
        if (!this._hasPopup()) {
            return;
        }
        document
            .querySelectorAll(`.${this.popupClass}`)
            .forEach((el) => el.remove());
        this.popup = null;
        window.ObsidianBridgeEditorAPI.refocusEditor();
    }
    _hasPopup() {
        return !!document.querySelector(`.${this.popupClass}`);
    }
    _selectCommand(index, direction = "down") {
        var _a;
        if (typeof index === "undefined") {
            index = this.selectedCommandIndex;
        }
        // Unselect the previous command
        this.popup.container.querySelectorAll(".popup-item.selected").forEach((el) => {
            el.classList.remove("selected");
        });
        if (!this._hasPopup()) {
            return;
        }
        const items = this.popup.container.querySelectorAll(".popup-item");
        if ((_a = items[index]) === null || _a === void 0 ? void 0 : _a.hidden) {
            // Will find the next visible item in the specified direction
            if (direction === "up") {
                for (let i = index - 1; i >= 0; i--) {
                    if (!items[i].hidden) {
                        index = i;
                        break;
                    }
                }
            }
            else if (direction === "down") {
                for (let i = index + 1; i < items.length; i++) {
                    if (!items[i].hidden) {
                        index = i;
                        break;
                    }
                }
            }
        }
        if (index >= items.length) {
            // Find the first visible item with :first-of-type
            const item = this.popup.container.querySelector(".popup-item:not([hidden])");
            index = parseInt((item === null || item === void 0 ? void 0 : item.dataset.commandId) || "-1", 10);
        }
        else if (index < 0) {
            // Find the last visible item with :last-of-type
            const visibleItems = this.popup.container.querySelectorAll(".popup-item:not([hidden])");
            const item = visibleItems[visibleItems.length - 1];
            index = parseInt((item === null || item === void 0 ? void 0 : item.dataset.commandId) || "-1", 10);
        }
        if (index < 0) {
            this.selectedCommandIndex = -1;
            return;
        }
        this.selectedCommandIndex = index;
        items[index].classList.add("selected");
        // Record the scroll position of the top document
        const scrollTop = document.querySelector(".editor-core").scrollTop;
        items[index].scrollIntoView({
            block: "center",
        });
        // Restore the scroll position
        document.querySelector(".editor-core").scrollTop = scrollTop;
    }
    _executeCommand(index, state) {
        const command = this.commands[index];
        if (!command) {
            return;
        }
        if (this.options.enable) {
            // Remove the current input `/`
            this.removeInputSlash(state);
        }
        const newState = _currentEditorInstance._editorCore.view.state;
        // Apply the command
        try {
            const mightBeTr = command.command(newState);
            if (mightBeTr) {
                _currentEditorInstance._editorCore.view.dispatch(mightBeTr);
            }
        }
        catch (error) {
            console.error("Error applying command", error);
        }
        this._closePopup();
    }
    removeInputSlash(state) {
        const { $from } = state.selection;
        const { pos } = $from;
        const textBeforeCursor = getTextBeforeCursor($from);
        if (textBeforeCursor.endsWith("/") && !textBeforeCursor.endsWith("//")) {
            const tr = state.tr.delete(pos - 1, pos);
            _currentEditorInstance._editorCore.view.dispatch(tr);
        }
    }
}
function initMagicKeyPlugin(plugins, options) {
    console.log("Init BN Magic Key Plugin");
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
                    keydown: (view, event) => {
                        const pluginState = key.getState(view.state);
                        pluginState.handleKeydown(event);
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
function getPlugin(key = "menu") {
    return _currentEditorInstance._editorCore.pluginState[key];
}
function getTextBeforeCursor(from) {
    const cursorPosInNode = from.parentOffset;
    return from.parent.textContent.slice(0, cursorPosInNode);
}
