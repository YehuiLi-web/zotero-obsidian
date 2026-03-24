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
exports.registerNoteLinkSection = registerNoteLinkSection;
const package_json_1 = require("../../../package.json");
const workspace_1 = require("../../utils/workspace");
function registerNoteLinkSection(type) {
    const key = Zotero.ItemPaneManager.registerSection({
        paneID: `zob-note-${type}-link`,
        pluginID: package_json_1.config.addonID,
        bodyXHTML: `
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/workspace/related.css"
  ></html:link>
  <html:link
    rel="localization"
    href="${package_json_1.config.addonRef}-noteRelation.ftl"
  ></html:link>
</linkset>`,
        header: {
            icon: `chrome://${package_json_1.config.addonRef}/content/icons/${type}-link-16.svg`,
            l10nID: `${package_json_1.config.addonRef}-note-${type}-header`,
        },
        sidenav: {
            icon: `chrome://${package_json_1.config.addonRef}/content/icons/${type}-link-20.svg`,
            l10nID: `${package_json_1.config.addonRef}-note-${type}-sidenav`,
        },
        sectionButtons: [
            {
                type: "refreshGraph",
                icon: "chrome://zotero/skin/16/universal/sync.svg",
                l10nID: `${package_json_1.config.addonRef}-note-${type}-refresh`,
                onClick: ({ body, item, setL10nArgs }) => {
                    renderSection(type, {
                        body,
                        item,
                        setCount: makeSetCount(setL10nArgs),
                    });
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
                        ztoolkit.log(`relation notify refresh link ${type}`, ids, item.id);
                        refresh();
                    }
                },
            }, ["item"]);
            body.classList.add("zob-link-body");
            body.dataset.notifierKey = notifierKey;
        },
        onDestroy({ body }) {
            const notifierKey = body.dataset.notifierKey;
            if (notifierKey) {
                Zotero.Notifier.unregisterObserver(notifierKey);
            }
        },
        onItemChange: ({ body, item, tabType, setEnabled }) => {
            if (body.closest("zob-workspace") ||
                tabType === "note") {
                setEnabled(true);
                body.dataset.itemID = String(item.id);
                return;
            }
            setEnabled(false);
        },
        onRender: () => { },
        onAsyncRender: (_a) => __awaiter(this, [_a], void 0, function* ({ body, item, setL10nArgs, tabType }) {
            if (!(item === null || item === void 0 ? void 0 : item.isNote()))
                return;
            yield renderSection(type, {
                body,
                item,
                setCount: makeSetCount(setL10nArgs),
            });
        }),
    });
}
function renderSection(type_1, _a) {
    return __awaiter(this, arguments, void 0, function* (type, { body, item, setCount, }) {
        var _b, _c;
        body.querySelectorAll(".row").forEach((elem) => elem.remove());
        const doc = body.ownerDocument;
        const api = {
            inbound: addon.api.relation.getNoteLinkInboundRelation,
            outbound: addon.api.relation.getNoteLinkOutboundRelation,
        };
        const inLinks = yield api[type](item.id);
        let count = 0;
        for (const linkData of inLinks) {
            const targetItem = (yield Zotero.Items.getByLibraryAndKeyAsync(linkData[{ inbound: "fromLibID", outbound: "toLibID" }[type]], linkData[{ inbound: "fromKey", outbound: "toKey" }[type]]));
            if (!targetItem) {
                continue;
            }
            count++;
            const linkParams = {
                workspaceUID: (0, workspace_1.getWorkspaceUID)(body),
                lineIndex: (_b = linkData.toLine) !== null && _b !== void 0 ? _b : undefined,
                sectionName: (_c = linkData.toSection) !== null && _c !== void 0 ? _c : undefined,
                forceTakeover: true,
            };
            const row = doc.createElement("div");
            row.className = "row";
            const icon = ztoolkit
                .getGlobal("require")("components/icons")
                .getCSSItemTypeIcon("note");
            const label = doc.createElement("div");
            label.className = "label";
            const title = doc.createElement("span");
            title.textContent = targetItem.getNoteTitle();
            const position = doc.createElement("span");
            position.className = "position-label";
            if (typeof linkData.toLine === "number") {
                position.textContent = `>Line ${linkData.toLine}`;
            }
            if (typeof linkData.toSection === "string") {
                position.textContent = `#${linkData.toSection}`;
            }
            label.append(title, position);
            label.title = linkData.url;
            const box = doc.createElement("div");
            box.addEventListener("click", () => addon.hooks.onOpenNote(targetItem.id, "preview", linkParams));
            box.className = "box keyboard-clickable";
            box.setAttribute("tabindex", "0");
            box.append(icon, label);
            row.append(box);
            const note = doc.createXULElement("toolbarbutton");
            note.addEventListener("command", (event) => {
                const position = event.shiftKey ? "window" : "tab";
                addon.hooks.onOpenNote(targetItem.id, position, linkParams);
            });
            note.className = "zotero-clicky zotero-clicky-open-link";
            note.setAttribute("tabindex", "0");
            note.setAttribute("tooltiptext", "Open in new tab (Click) or Obsidian Bridge window (Shift+Click)");
            row.append(note);
            body.append(row);
        }
        setCount(count);
    });
}
function makeSetCount(setL10nArgs) {
    return (count) => {
        setL10nArgs(`{"count": "${count}"}`);
    };
}
