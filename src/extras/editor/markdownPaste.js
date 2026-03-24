"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMarkdownPastePlugin = initMarkdownPastePlugin;
const prosemirror_state_1 = require("prosemirror-state");
const convert_1 = require("../convert");
function initMarkdownPastePlugin(plugins) {
    const core = _currentEditorInstance._editorCore;
    console.log("Init BN Markdown Paste Plugin");
    const key = new prosemirror_state_1.PluginKey("pasteDropPlugin");
    const oldPastePluginIndex = plugins.findIndex((plugin) => plugin.props.handlePaste && plugin.props.handleDrop);
    if (oldPastePluginIndex === -1) {
        console.error("Paste plugin not found");
        return plugins;
    }
    const oldPastePlugin = plugins[oldPastePluginIndex];
    return [
        ...plugins.slice(0, oldPastePluginIndex),
        new prosemirror_state_1.Plugin({
            key,
            props: {
                handlePaste: (view, event, slice) => {
                    var _a;
                    if (!event.clipboardData) {
                        return false;
                    }
                    const markdown = getMarkdown(event.clipboardData);
                    if (!markdown) {
                        // Try the old paste plugin
                        return (_a = oldPastePlugin.props.handlePaste) === null || _a === void 0 ? void 0 : _a.apply(oldPastePlugin, [
                            view,
                            event,
                            slice,
                        ]);
                    }
                    (0, convert_1.md2html)(markdown).then((html) => {
                        const slice = window.ObsidianBridgeEditorAPI.getSliceFromHTML(view.state, html);
                        const tr = view.state.tr.replaceSelection(slice);
                        view.dispatch(tr);
                    });
                    return true;
                },
                handleDrop: (view, event, slice, moved) => {
                    var _a;
                    if (!event.dataTransfer) {
                        return false;
                    }
                    const markdown = getMarkdown(event.dataTransfer);
                    if (!markdown) {
                        // Try the old drop plugin first
                        return (_a = oldPastePlugin.props.handleDrop) === null || _a === void 0 ? void 0 : _a.apply(oldPastePlugin, [
                            view,
                            event,
                            slice,
                            moved,
                        ]);
                    }
                    (0, convert_1.md2html)(markdown).then((html) => {
                        const slice = window.ObsidianBridgeEditorAPI.getSliceFromHTML(view.state, html);
                        const pos = view.posAtCoords({
                            left: event.clientX,
                            top: event.clientY,
                        });
                        if (!pos) {
                            return;
                        }
                        // Insert the slice to the current position
                        const tr = view.state.tr.insert(pos.pos, slice);
                        view.dispatch(tr);
                    });
                    return true;
                },
            },
            view: (editorView) => {
                return {
                    destroy() { },
                };
            },
        }),
        ...plugins.slice(oldPastePluginIndex + 1),
    ];
}
function getMarkdown(clipboardData) {
    // Skip Zotero internal data
    if (clipboardData.types.some((type) => type.startsWith("zotero/"))) {
        return false;
    }
    if (clipboardData.types.includes("text/markdown")) {
        return clipboardData.getData("text/markdown");
    }
    // For Typora
    if (clipboardData.types.includes("text/x-markdown")) {
        return clipboardData.getData("text/x-markdown");
    }
    const html = clipboardData.getData("text/html");
    if (html) {
        // https://github.com/windingwind/zotero-better-notes/issues/1342
        if (
        // From ProseMirror
        html.includes("data-pm-slice") ||
            // From Zotero annotations or citations
            html.includes("data-annotation") ||
            html.includes("data-citation")) {
            return false;
        }
        return html;
    }
    const text = clipboardData.getData("text/plain");
    if (text) {
        // Match markdown patterns
        const markdownPatterns = [
            /^#/m, // Headers: Lines starting with #
            /^\s*[-+*]\s/m, // Unordered lists: Lines starting with -, +, or *
            /^\d+\.\s/m, // Ordered lists: Lines starting with numbers followed by a dot
            /\[.*\]\(.*\)/, // Links: [text](url)
            /`[^`]+`/, // Inline code: `code`
            /^> /m, // Blockquotes: Lines starting with >
            /```/, // Code blocks: Triple backticks
            /\*\*[^*]+\*\*/, // Bold: **text**
            /\*[^*]+\*/, // Italic: *text*
            /__[^_]+__/, // Bold: __text__
            /_[^_]+_/, // Italic: _text_
            /~~[^~]+~~/, // Strikethrough: ~~text~~
            /\^[^^]+\^/, // Superscript: ^text^
            /~[^~]+~/, // Subscript: ~text~
            /\$\$[\s\S]*?\$\$/, // Block math: $$...$$
            /\$[^$\n]+\$/, // Inline math: $...$
        ];
        for (const pattern of markdownPatterns) {
            if (pattern.test(text)) {
                return text;
            }
        }
    }
    return false;
}
