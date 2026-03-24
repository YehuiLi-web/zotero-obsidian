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
exports.getRelationServer = getRelationServer;
exports.closeRelationServer = closeRelationServer;
exports.updateNoteLinkRelation = updateNoteLinkRelation;
exports.getNoteLinkInboundRelation = getNoteLinkInboundRelation;
exports.getNoteLinkOutboundRelation = getNoteLinkOutboundRelation;
exports.linkAnnotationToTarget = linkAnnotationToTarget;
exports.getLinkTargetByAnnotation = getLinkTargetByAnnotation;
exports.getAnnotationByLinkTarget = getAnnotationByLinkTarget;
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const package_json_1 = require("../../package.json");
const link_1 = require("./link");
function closeRelationServer() {
    if (addon.data.relation.server) {
        addon.data.relation.server.destroy();
        addon.data.relation.server = undefined;
    }
}
function getRelationServer() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!addon.data.relation.server) {
            const worker = new Worker(`chrome://${package_json_1.config.addonRef}/content/scripts/relationWorker.js`, { name: "relationWorker" });
            const server = new zotero_plugin_toolkit_1.MessageHelper({
                canBeDestroyed: false,
                dev: __env__ === "development",
                name: "relationWorkerMain",
                target: worker,
                handlers: {},
            });
            server.start();
            yield server.exec("_ping");
            addon.data.relation.server = server;
        }
        return addon.data.relation.server;
    });
}
function updateNoteLinkRelation(noteID) {
    return __awaiter(this, void 0, void 0, function* () {
        ztoolkit.log("updateNoteLinkRelation", noteID);
        const note = Zotero.Items.get(noteID);
        const affectedNoteIDs = new Set([noteID]);
        const fromLibID = note.libraryID;
        const fromKey = note.key;
        const lines = yield addon.api.note.getLinesInNote(note);
        const linkToData = [];
        for (let i = 0; i < lines.length; i++) {
            const linkMatches = lines[i].match(/href="zotero:\/\/note\/[^"]+"/g);
            if (!linkMatches) {
                continue;
            }
            for (const match of linkMatches) {
                const link = decodeHTMLEntities(match.slice(6, -1));
                const { noteItem, libraryID, noteKey, lineIndex, sectionName } = (0, link_1.getNoteLinkParams)(link);
                if (noteItem && noteItem.isNote() && noteItem.id !== note.id) {
                    affectedNoteIDs.add(noteItem.id);
                    linkToData.push({
                        fromLibID,
                        fromKey,
                        toLibID: libraryID,
                        toKey: noteKey,
                        fromLine: i,
                        toLine: lineIndex !== null && lineIndex !== void 0 ? lineIndex : null,
                        toSection: sectionName !== null && sectionName !== void 0 ? sectionName : null,
                        url: link,
                    });
                }
            }
        }
        const result = yield (yield getRelationServer()).proxy.rebuildLinkForNote(fromLibID, fromKey, linkToData);
        for (const link of result.oldOutboundLinks) {
            const item = Zotero.Items.getByLibraryAndKey(link.toLibID, link.toKey);
            if (!item) {
                continue;
            }
            affectedNoteIDs.add(item.id);
        }
        Zotero.Notifier.trigger(
        // @ts-ignore
        "updateOBRelation", "item", Array.from(affectedNoteIDs), {}, true);
    });
}
function getNoteLinkOutboundRelation(noteID) {
    return __awaiter(this, void 0, void 0, function* () {
        const note = Zotero.Items.get(noteID);
        const fromLibID = note.libraryID;
        const fromKey = note.key;
        return yield (yield getRelationServer()).proxy.getOutboundLinks(fromLibID, fromKey);
    });
}
function getNoteLinkInboundRelation(noteID) {
    return __awaiter(this, void 0, void 0, function* () {
        const note = Zotero.Items.get(noteID);
        const toLibID = note.libraryID;
        const toKey = note.key;
        return yield (yield getRelationServer()).proxy.getInboundLinks(toLibID, toKey);
    });
}
function decodeHTMLEntities(text) {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}
function linkAnnotationToTarget(model) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (yield getRelationServer()).proxy.linkAnnotationToTarget(model);
    });
}
function getLinkTargetByAnnotation(fromLibID, fromKey) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (yield getRelationServer()).proxy.getLinkTargetByAnnotation(fromLibID, fromKey);
    });
}
function getAnnotationByLinkTarget(toLibID, toKey) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (yield getRelationServer()).proxy.getAnnotationByLinkTarget(toLibID, toKey);
    });
}
