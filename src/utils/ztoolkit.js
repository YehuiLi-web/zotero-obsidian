"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createZToolkit = createZToolkit;
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const package_json_1 = require("../../package.json");
function createZToolkit() {
    const _ztoolkit = new MyToolkit();
    /**
     * Alternatively, import toolkit modules you use to minify the plugin size.
     * You can add the modules under the `MyToolkit` class below and uncomment the following line.
     */
    // const _ztoolkit = new MyToolkit();
    initZToolkit(_ztoolkit);
    return _ztoolkit;
}
function initZToolkit(_ztoolkit) {
    const env = __env__;
    _ztoolkit.basicOptions.log.prefix = `[${package_json_1.config.addonName}]`;
    _ztoolkit.basicOptions.log.disableConsole = env === "production";
    _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = env === "development";
    _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = env === "development";
    _ztoolkit.basicOptions.debug.disableDebugBridgePassword =
        env === "development";
    _ztoolkit.ProgressWindow.setIconURI("default", `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`);
}
class MyToolkit extends zotero_plugin_toolkit_1.BasicTool {
    constructor() {
        super();
        this.UI = new zotero_plugin_toolkit_1.UITool(this);
        this.Menu = new zotero_plugin_toolkit_1.MenuManager(this);
        this.Clipboard = zotero_plugin_toolkit_1.ClipboardHelper;
        this.FilePicker = zotero_plugin_toolkit_1.FilePickerHelper;
        this.ProgressWindow = zotero_plugin_toolkit_1.ProgressWindowHelper;
        this.VirtualizedTable = zotero_plugin_toolkit_1.VirtualizedTableHelper;
        this.Dialog = zotero_plugin_toolkit_1.DialogHelper;
        this.LargePref = zotero_plugin_toolkit_1.LargePrefHelper;
        this.Guide = zotero_plugin_toolkit_1.GuideHelper;
    }
    unregisterAll() {
        (0, zotero_plugin_toolkit_1.unregister)(this);
    }
}
