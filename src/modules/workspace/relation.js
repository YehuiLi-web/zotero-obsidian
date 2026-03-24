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
exports.registerNoteRelation = registerNoteRelation;
const package_json_1 = require("../../../package.json");
const str_1 = require("../../utils/str");
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const workspace_1 = require("../../utils/workspace");
function registerNoteRelation() {
    const key = Zotero.ItemPaneManager.registerSection({
        paneID: `zob-note-relation`,
        pluginID: package_json_1.config.addonID,
        header: {
            icon: `chrome://${package_json_1.config.addonRef}/content/icons/relation-16.svg`,
            l10nID: `${package_json_1.config.addonRef}-note-relation-header`,
        },
        sidenav: {
            icon: `chrome://${package_json_1.config.addonRef}/content/icons/relation-20.svg`,
            l10nID: `${package_json_1.config.addonRef}-note-relation-sidenav`,
        },
        bodyXHTML: `
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/workspace/relation.css"
  ></html:link>
</linkset>`,
        sectionButtons: [
            {
                type: "refreshGraph",
                icon: "chrome://zotero/skin/16/universal/sync.svg",
                l10nID: `${package_json_1.config.addonRef}-note-relation-refresh`,
                onClick: ({ body, item }) => {
                    renderGraph(body, item);
                },
            },
        ],
        onInit({ body, refresh }) {
            const notifierKey = Zotero.Notifier.registerObserver({
                notify: (event, type, ids, extraData) => {
                    const item = Zotero.Items.get(body.dataset.itemID || "");
                    if (item &&
                        // @ts-ignore
                        event === "updateOBRelation" &&
                        type === "item" &&
                        ids.includes(item.id)) {
                        ztoolkit.log("relation notify refresh graph", item.id);
                        refresh();
                    }
                },
            }, ["item"]);
            body.dataset.notifierKey = notifierKey;
        },
        onDestroy({ body }) {
            const notifierKey = body.dataset.notifierKey;
            if (notifierKey) {
                Zotero.Notifier.unregisterObserver(notifierKey);
            }
        },
        onItemChange: ({ body, item, tabType, setEnabled }) => {
            if ((0, workspace_1.getWorkspaceUID)(body)) {
                setEnabled(true);
                body.dataset.itemID = String(item.id);
                return;
            }
            setEnabled(false);
        },
        onRender: () => { },
        onAsyncRender: (_a) => __awaiter(this, [_a], void 0, function* ({ body, item }) {
            var _b;
            if (!(item === null || item === void 0 ? void 0 : item.isNote()))
                return;
            if (!body.querySelector("#zob-relation-graph")) {
                const iframe = body.ownerDocument.createXULElement("iframe");
                iframe.src = `chrome://${package_json_1.config.addonRef}/content/relationGraph.html`;
                iframe.id = "zob-relation-graph";
                body.appendChild(iframe);
                (_b = iframe.contentWindow) === null || _b === void 0 ? void 0 : _b.addEventListener("message", (ev) => {
                    if (ev.data.type === "openNote") {
                        addon.hooks.onOpenNote(ev.data.id, ev.data.isShift ? "window" : "tab", {
                            forceTakeover: true,
                        });
                    }
                });
            }
            yield renderGraph(body, item);
        }),
    });
}
function renderGraph(body, item) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const data = yield getRelationData(item);
        yield zotero_plugin_toolkit_1.wait.waitUtilAsync(() => { var _a; return ((_a = body.querySelector("iframe").contentDocument) === null || _a === void 0 ? void 0 : _a.readyState) === "complete"; });
        (_a = body.querySelector("iframe").contentWindow) === null || _a === void 0 ? void 0 : _a.postMessage({
            type: "render",
            graph: data,
        }, "*");
    });
}
function getRelationData(note) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!note)
            return;
        const inLink = yield addon.api.relation.getNoteLinkInboundRelation(note.id);
        const outLink = yield addon.api.relation.getNoteLinkOutboundRelation(note.id);
        const noteSet = new Set();
        const linkModels = {};
        for (const linkData of inLink) {
            const noteItem = yield Zotero.Items.getByLibraryAndKeyAsync(linkData.fromLibID, linkData.fromKey);
            if (!noteItem)
                continue;
            noteSet.add(noteItem.id);
            let noteLinks = linkModels[noteItem.id];
            if (!noteLinks) {
                noteLinks = {
                    source: noteItem.id,
                    target: note.id,
                    value: 1,
                    type: "in",
                };
                linkModels[noteItem.id] = noteLinks;
            }
            else {
                noteLinks.value++;
            }
        }
        for (const linkData of outLink) {
            const noteItem = yield Zotero.Items.getByLibraryAndKeyAsync(linkData.toLibID, linkData.toKey);
            if (!noteItem)
                continue;
            noteSet.add(noteItem.id);
            let noteLinks = linkModels[noteItem.id];
            if (!noteLinks) {
                noteLinks = {
                    source: note.id,
                    target: noteItem.id,
                    value: 1,
                    type: "out",
                };
                linkModels[noteItem.id] = noteLinks;
            }
            else {
                noteLinks.value++;
                if (noteLinks.type === "in") {
                    noteLinks.type = "both";
                }
            }
        }
        noteSet.delete(note.id);
        const nodes = Array.from(noteSet).map((id) => {
            const item = Zotero.Items.get(id);
            const title = item.getNoteTitle();
            return {
                id: item.id,
                title,
                shortTitle: (0, str_1.slice)(title, 15),
                group: 2,
            };
        });
        const title = note.getNoteTitle();
        nodes.push({
            id: note.id,
            title,
            shortTitle: (0, str_1.slice)(title, 15),
            group: 1,
        });
        return {
            nodes,
            links: Object.values(linkModels),
        };
    });
}
