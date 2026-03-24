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
exports.showSyncInfo = showSyncInfo;
const hint_1 = require("../../utils/hint");
const locale_1 = require("../../utils/locale");
const str_1 = require("../../utils/str");
function showSyncInfo(noteId) {
    return __awaiter(this, void 0, void 0, function* () {
        const status = addon.api.sync.getSyncStatus(noteId);
        const data = {};
        const dialog = new ztoolkit.Dialog(4, 1)
            .setDialogData(data)
            .addCell(0, 0, {
            tag: "h3",
            properties: {
                innerHTML: (0, locale_1.getString)("syncInfo-syncTo"),
            },
        })
            .addCell(1, 0, {
            tag: "label",
            properties: {
                innerHTML: (0, str_1.formatPath)(`${(0, str_1.slice)(status.path, 30)}${status.filename}`),
            },
        })
            .addCell(2, 0, {
            tag: "h3",
            properties: {
                innerHTML: (0, locale_1.getString)("syncInfo-lastSync"),
            },
        })
            .addCell(3, 0, {
            tag: "label",
            properties: {
                innerHTML: new Date(status.lastsync).toLocaleString(),
            },
        })
            .addButton((0, locale_1.getString)("syncInfo-sync"), "sync", {
            noClose: true,
            callback: (ev) => {
                addon.hooks.onSyncing(undefined, {
                    quiet: false,
                    skipActive: false,
                    reason: "manual-info",
                });
            },
        })
            .addButton((0, locale_1.getString)("syncInfo-unSync"), "unSync", {
            callback: (ev) => __awaiter(this, void 0, void 0, function* () {
                const outLink = yield addon.api.relation.getNoteLinkOutboundRelation(noteId);
                for (const linkData of outLink) {
                    const noteItem = yield Zotero.Items.getByLibraryAndKeyAsync(linkData.toLibID, linkData.toKey);
                    if (!noteItem)
                        continue;
                    addon.api.sync.removeSyncNote(noteItem.id);
                }
                (0, hint_1.showHint)(`Cancel sync of ${outLink.length} notes.`);
            }),
        })
            .addButton((0, locale_1.getString)("syncInfo-reveal"), "reveal", {
            noClose: true,
            callback: (ev) => {
                Zotero.File.reveal((0, str_1.jointPath)(status.path, status.filename));
            },
        })
            .addButton((0, locale_1.getString)("syncInfo-manager"), "manager", {
            noClose: true,
            callback: (ev) => {
                addon.hooks.onShowSyncManager();
            },
        })
            .addButton((0, locale_1.getString)("syncInfo-export"), "export", {
            callback: (ev) => {
                addon.hooks.onShowExportNoteOptions([noteId]);
            },
        })
            .addButton((0, locale_1.getString)("syncInfo-cancel"), "cancel")
            .open((0, locale_1.getString)("export-title"), {
            resizable: true,
            centerscreen: true,
            fitContent: true,
        });
    });
}
