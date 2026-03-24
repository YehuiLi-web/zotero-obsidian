"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPlugins = initPlugins;
const linkPreview_1 = require("./linkPreview");
const magicKey_1 = require("./magicKey");
const markdownPaste_1 = require("./markdownPaste");
// Use custom column resizing plugin, since the original one breaks
const columnResizing_1 = require("./columnResizing");
const nodeViews_1 = require("./nodeViews");
function initPlugins(options) {
    const core = _currentEditorInstance._editorCore;
    let plugins = core.view.state.plugins;
    if (options.linkPreview.previewType !== "disable")
        plugins = (0, linkPreview_1.initLinkPreviewPlugin)(plugins, options.linkPreview);
    if (options.markdownPaste.enable)
        plugins = (0, markdownPaste_1.initMarkdownPastePlugin)(plugins);
    plugins = (0, magicKey_1.initMagicKeyPlugin)(plugins, options.magicKey);
    // Collect all plugins and reconfigure the state only once
    const newState = core.view.state.reconfigure({
        plugins: [
            ...plugins,
            (0, columnResizing_1.columnResizing)({
                cellMinWidth: 80,
                handleWidth: 5,
            }),
        ],
    });
    (0, nodeViews_1.initNodeViews)(core.view);
    core.view.updateState(newState);
}
