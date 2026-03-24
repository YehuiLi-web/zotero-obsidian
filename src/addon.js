"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hooks_1 = require("./hooks");
const api_1 = require("./api");
const ztoolkit_1 = require("./utils/ztoolkit");
class Addon {
    constructor() {
        this.data = {
            uid: Zotero.Utilities.randomString(8),
            alive: true,
            env: __env__,
            ztoolkit: (0, ztoolkit_1.createZToolkit)(),
            // ztoolkit: new ZoteroToolkit(),
            export: {
                pdf: { promise: undefined },
            },
            sync: {
                lock: false,
                manager: {
                    data: [],
                    historyData: [],
                    columnAscending: true,
                    columnIndex: 0,
                },
                diff: {},
                watcher: {
                    knownModifiedTimes: {},
                    pendingChanges: {},
                    processing: [],
                },
            },
            notify: [],
            workspace: {
                instances: {},
            },
            obsidian: {},
            imageViewer: {
                window: undefined,
                srcList: [],
                idx: -1,
                scaling: 1,
                title: "Note",
                pined: false,
                anchorPosition: undefined,
            },
            template: {
                editor: {
                    window: undefined,
                    tableHelper: undefined,
                    templates: [],
                },
                picker: {
                    mode: "insert",
                    data: {},
                },
            },
            relation: {},
            parsing: {},
            convert: {},
            imageCache: {},
            hint: {
                silent: false,
            },
        };
        this.hooks = hooks_1.default;
        this.api = api_1.default;
    }
}
exports.default = Addon;
