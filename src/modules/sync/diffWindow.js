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
exports.showSyncDiff = showSyncDiff;
const package_json_1 = require("../../../package.json");
const str_1 = require("../../utils/str");
const window_1 = require("../../utils/window");
const wait_1 = require("../../utils/wait");
function showSyncDiff(noteId, mdPath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const noteItem = Zotero.Items.get(noteId);
        const syncStatus = addon.api.sync.getSyncStatus(noteId);
        const noteStatus = addon.api.sync.getNoteStatus(noteId);
        mdPath = (0, str_1.formatPath)(mdPath);
        if (!noteItem || !noteItem.isNote() || !(yield (0, str_1.fileExists)(mdPath))) {
            return;
        }
        const mdStatus = yield addon.api.sync.getMDStatus(mdPath);
        if (!mdStatus.meta) {
            return;
        }
        const mdNoteContent = yield addon.api.convert.md2note(mdStatus, noteItem, {
            isImport: true,
        });
        const noteContent = yield addon.api.convert.note2noteDiff(noteItem);
        ztoolkit.log(mdNoteContent, noteContent);
        const changes = (yield addon.api.convert.content2diff(noteContent, mdNoteContent)) || [];
        ztoolkit.log("changes", changes);
        const syncDate = new Date(syncStatus.lastsync);
        const io = {
            defer: Zotero.Promise.defer(),
            result: "",
            type: "skip",
            syncInfo: {},
            diffData: [],
            imageData: {},
        };
        if (!(noteStatus.lastmodify > syncDate && mdStatus.lastmodify > syncDate)) {
            // If only one kind of changes, merge automatically
            if (noteStatus.lastmodify >= mdStatus.lastmodify) {
                // refuse all, keep note
                io.result = changes
                    .filter((diff) => (!diff.added && !diff.removed) || diff.removed)
                    .map((diff) => diff.value)
                    .join("");
            }
            else {
                // accept all, keep md
                io.result = changes
                    .filter((diff) => (!diff.added && !diff.removed) || diff.added)
                    .map((diff) => diff.value)
                    .join("");
            }
            io.type = "finish";
        }
        else {
            // Otherwise, merge manually
            const imageAttachemnts = Zotero.Items.get(noteItem.getAttachments()).filter((attch) => attch.isEmbeddedImageAttachment());
            const imageData = {};
            for (const image of imageAttachemnts) {
                try {
                    const b64 = yield (0, str_1.getItemDataURL)(image);
                    imageData[image.key] = b64;
                }
                catch (e) {
                    ztoolkit.log(e);
                }
            }
            io.syncInfo = {
                noteName: noteItem.getNoteTitle(),
                noteModify: noteStatus.lastmodify && noteStatus.lastmodify.toISOString(),
                mdName: mdPath,
                mdModify: mdStatus.lastmodify && mdStatus.lastmodify.toISOString(),
                syncTime: syncDate.toISOString(),
            };
            io.diffData = changes.map((change, id) => Object.assign(change, {
                id: id,
                text: change.value,
            }));
            io.imageData = imageData;
            if (!(0, window_1.isWindowAlive)(addon.data.sync.diff.window)) {
                addon.data.sync.diff.window = Services.ww.openWindow(
                // @ts-ignore
                null, `chrome://${package_json_1.config.addonRef}/content/syncDiff.xhtml`, `${package_json_1.config.addonRef}-syncDiff`, `chrome,centerscreen,resizable,status,width=900,height=550`, io);
                yield (0, wait_1.waitUtilAsync)(() => { var _a; return ((_a = addon.data.sync.diff.window) === null || _a === void 0 ? void 0 : _a.document.readyState) === "complete"; });
            }
            yield io.defer.promise;
        }
        switch (io.type) {
            case "skip":
                ((_a = addon.data.sync.diff.window) === null || _a === void 0 ? void 0 : _a.closed) ||
                    ((_b = addon.data.sync.diff.window) === null || _b === void 0 ? void 0 : _b.close());
                break;
            case "unsync":
                ztoolkit.log("remove sync", noteItem.getNote());
                yield addon.api.sync.removeSyncNote(noteItem.id);
                break;
            case "finish":
                ztoolkit.log("Diff result:", io.result);
                // return io.result;
                noteItem.setNote(noteStatus.meta + io.result + noteStatus.tail);
                yield noteItem.saveTx({
                    notifierData: {
                        autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
                    },
                });
                yield addon.api.$export.syncMDBatch(mdStatus.filedir, [noteItem.id], [mdStatus.meta]);
                break;
            default:
                break;
        }
    });
}
