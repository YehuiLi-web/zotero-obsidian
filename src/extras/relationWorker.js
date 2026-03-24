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
exports.handlers = void 0;
const dexie_1 = require("dexie");
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
const db = new dexie_1.default("BN_Two_Way_Relation");
db.version(2).stores({
    link: "++id, fromLibID, fromKey, toLibID, toKey, fromLine, toLine, toSection, url",
    annotation: "++id, fromLibID, fromKey, toLibID, toKey, url",
});
log("Using Dexie v" + dexie_1.default.semVer, db);
const handlers = {
    addLink,
    bulkAddLink,
    rebuildLinkForNote,
    getOutboundLinks,
    getInboundLinks,
    linkAnnotationToTarget,
    getLinkTargetByAnnotation,
    getAnnotationByLinkTarget,
};
exports.handlers = handlers;
const messageServer = new zotero_plugin_toolkit_1.MessageHelper({
    canBeDestroyed: true,
    dev: true,
    name: "parsingWorker",
    target: self,
    handlers,
});
messageServer.start();
function addLink(model) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.link.add(model);
        log("addLink", model);
    });
}
function bulkAddLink(models) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.link.bulkAdd(models);
        log("bulkAddLink", models);
    });
}
function rebuildLinkForNote(fromLibID, fromKey, links) {
    return __awaiter(this, void 0, void 0, function* () {
        log("rebuildLinkForNote", fromLibID, fromKey, links);
        return db.transaction("rw", db.link, () => __awaiter(this, void 0, void 0, function* () {
            const collection = db.link.where({ fromLibID, fromKey });
            const oldOutboundLinks = yield collection.toArray();
            yield collection.delete().then((deleteCount) => {
                log("Deleted " + deleteCount + " objects");
                return bulkAddLink(links);
            });
            return {
                oldOutboundLinks,
            };
        }));
    });
}
function getOutboundLinks(fromLibID, fromKey) {
    return __awaiter(this, void 0, void 0, function* () {
        log("getOutboundLinks", fromLibID, fromKey);
        return db.link.where({ fromLibID, fromKey }).toArray();
    });
}
function getInboundLinks(toLibID, toKey) {
    return __awaiter(this, void 0, void 0, function* () {
        log("getInboundLinks", toLibID, toKey);
        return db.link.where({ toLibID, toKey }).toArray();
    });
}
function linkAnnotationToTarget(model) {
    return __awaiter(this, void 0, void 0, function* () {
        log("linkAnnotationToTarget", model);
        const collection = db.annotation.where({
            fromLibID: model.fromLibID,
            fromKey: model.fromKey,
        });
        yield collection.delete().then(() => {
            return db.annotation.add(model);
        });
    });
}
function getLinkTargetByAnnotation(fromLibID, fromKey) {
    return __awaiter(this, void 0, void 0, function* () {
        log("getLinkTargetByAnnotation", fromLibID, fromKey);
        return db.annotation.get({ fromLibID, fromKey });
    });
}
function getAnnotationByLinkTarget(toLibID, toKey) {
    return __awaiter(this, void 0, void 0, function* () {
        log("getAnnotationByLinkTarget", toLibID, toKey);
        return db.annotation.get({ toLibID, toKey });
    });
}
function log(...args) {
    if (__env__ === "development")
        console.log("[relationWorker]", ...args);
}
