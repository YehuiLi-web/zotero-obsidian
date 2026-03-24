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
exports.openItemsInObsidian = openItemsInObsidian;
exports.repairObsidianManagedLinks = repairObsidianManagedLinks;
exports.resyncAllManagedObsidianNotes = resyncAllManagedObsidianNotes;
exports.syncSelectedItemsToObsidian = syncSelectedItemsToObsidian;
const hint_1 = require("../../utils/hint");
const locale_1 = require("../../utils/locale");
const prefs_1 = require("../../utils/prefs");
const str_1 = require("../../utils/str");
const dashboard_1 = require("./dashboard");
const settings_1 = require("./settings");
const childNotes_1 = require("./childNotes");
const frontmatter_1 = require("./frontmatter");
const paths_1 = require("./paths");
const settings_2 = require("./settings");
const shared_1 = require("./shared");
const managed_1 = require("./managed");
const translation_1 = require("./translation");
function createObsidianNote(topItem_1) {
    return __awaiter(this, arguments, void 0, function* (topItem, options = {}) {
        const noteItem = new Zotero.Item("note");
        noteItem.libraryID = topItem.libraryID;
        noteItem.parentID = topItem.id;
        yield noteItem.saveTx({
            notifierData: options.skipNotifierSync
                ? {
                    skipOB: true,
                }
                : undefined,
        });
        const templateName = (0, settings_2.resolveObsidianItemTemplateName)();
        const renderedTemplate = yield addon.api.template.runItemTemplate(templateName, {
            itemIds: [topItem.id],
            targetNoteId: noteItem.id,
        });
        noteItem.setNote(renderedTemplate);
        yield noteItem.saveTx({
            notifierData: options.skipNotifierSync
                ? {
                    skipOB: true,
                }
                : undefined,
        });
        const itemNoteMap = (0, settings_2.getObsidianItemNoteMap)();
        itemNoteMap[(0, settings_2.getItemMapKey)(topItem)] = noteItem.key;
        (0, settings_2.setObsidianItemNoteMap)(itemNoteMap);
        return noteItem;
    });
}
function shouldReplaceManagedRecoveryCandidate(currentCandidate, nextCandidate) {
    const currentModified = currentCandidate.mdStatus.lastmodify.getTime() || 0;
    const nextModified = nextCandidate.mdStatus.lastmodify.getTime() || 0;
    if (nextModified !== currentModified) {
        return nextModified > currentModified;
    }
    return nextCandidate.filepath.localeCompare(currentCandidate.filepath) > 0;
}
function findManagedRecoveryCandidates(notesDir, topItems) {
    return __awaiter(this, void 0, void 0, function* () {
        const candidates = new Map();
        const allowedItemMapKeys = (topItems === null || topItems === void 0 ? void 0 : topItems.length)
            ? new Set(topItems.map((topItem) => (0, settings_2.getItemMapKey)(topItem)))
            : null;
        const mdRegex = /\.(md|MD|Md|mD)$/;
        yield Zotero.File.iterateDirectory(notesDir, (entry) => __awaiter(this, void 0, void 0, function* () {
            if (entry.isDir) {
                const subDirCandidates = yield findManagedRecoveryCandidates(entry.path, topItems);
                for (const [itemMapKey, candidate] of subDirCandidates.entries()) {
                    const currentCandidate = candidates.get(itemMapKey);
                    if (!currentCandidate ||
                        shouldReplaceManagedRecoveryCandidate(currentCandidate, candidate)) {
                        candidates.set(itemMapKey, candidate);
                    }
                }
                return;
            }
            if (!mdRegex.test(entry.name)) {
                return;
            }
            const mdStatus = yield addon.api.sync.getMDStatus(entry.path);
            const meta = (0, frontmatter_1.normalizeFrontmatterObject)(mdStatus.meta);
            if (!meta.bridge_managed) {
                return;
            }
            const libraryID = Number(meta.$libraryID || 0);
            const topItemKey = (0, shared_1.cleanInline)(String(meta.zotero_key || ""));
            if (!libraryID || !topItemKey) {
                return;
            }
            const topItem = (yield Zotero.Items.getByLibraryAndKeyAsync(libraryID, topItemKey));
            if (!topItem || !topItem.isRegularItem()) {
                return;
            }
            const itemMapKey = (0, settings_2.getItemMapKey)(topItem);
            if (allowedItemMapKeys && !allowedItemMapKeys.has(itemMapKey)) {
                return;
            }
            const referencedNoteKey = (0, shared_1.cleanInline)(String(meta.zotero_note_key || meta.$itemKey || ""));
            if (referencedNoteKey) {
                const referencedNote = Zotero.Items.getByLibraryAndKey(libraryID, referencedNoteKey);
                if (referencedNote &&
                    referencedNote.isNote() &&
                    !referencedNote.deleted &&
                    referencedNote.parentID === topItem.id) {
                    return;
                }
            }
            if ((0, paths_1.findExistingObsidianNote)(topItem)) {
                return;
            }
            const nextCandidate = {
                topItem,
                filepath: entry.path,
                mdStatus,
            };
            const currentCandidate = candidates.get(itemMapKey);
            if (!currentCandidate ||
                shouldReplaceManagedRecoveryCandidate(currentCandidate, nextCandidate)) {
                candidates.set(itemMapKey, nextCandidate);
            }
        }));
        return candidates;
    });
}
function recoverManagedObsidianNoteFromFile(candidate, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        const existingNote = (0, paths_1.findExistingObsidianNote)(candidate.topItem);
        if (existingNote) {
            return existingNote;
        }
        // Try to restore a trashed note instead of creating a new one
        const meta = (0, frontmatter_1.normalizeFrontmatterObject)(candidate.mdStatus.meta);
        const referencedNoteKey = (0, shared_1.cleanInline)(String(meta.zotero_note_key || meta.$itemKey || ""));
        let noteItem;
        if (referencedNoteKey) {
            const trashedNote = Zotero.Items.getByLibraryAndKey(candidate.topItem.libraryID, referencedNoteKey);
            if (trashedNote &&
                trashedNote.isNote() &&
                trashedNote.deleted &&
                trashedNote.parentID === candidate.topItem.id) {
                trashedNote.deleted = false;
                yield trashedNote.saveTx({
                    notifierData: { skipOB: true },
                });
                noteItem = trashedNote;
            }
        }
        if (!noteItem) {
            noteItem = yield createObsidianNote(candidate.topItem, {
                skipNotifierSync: true,
            });
        }
        // Update the item-note map to point to the recovered/created note
        const itemNoteMap = (0, settings_2.getObsidianItemNoteMap)();
        itemNoteMap[(0, settings_2.getItemMapKey)(candidate.topItem)] = noteItem.key;
        (0, settings_2.setObsidianItemNoteMap)(itemNoteMap);
        yield addon.api.$import.fromMD(candidate.filepath, {
            noteId: noteItem.id,
            ignoreVersion: true,
            skipNotifierSync: true,
            historyReason: "managed-recovery",
            historyAction: "import",
        });
        yield addon.api.$export.saveMD(candidate.filepath, noteItem.id, {
            keepNoteLink: false,
            withYAMLHeader: true,
            attachmentDir: settings.assetsDir,
            attachmentFolder: settings.attachmentFolder,
            recordHistory: false,
            historyReason: "managed-recovery-refresh",
        });
        return noteItem;
    });
}
function ensureManagedObsidianNote(topItem, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        const existingNote = (0, paths_1.findExistingObsidianNote)(topItem);
        if (existingNote) {
            return existingNote;
        }
        if (settings.notesDir && (yield (0, str_1.fileExists)(settings.notesDir))) {
            const recoveryCandidate = (yield findManagedRecoveryCandidates(settings.notesDir, [topItem])).get((0, settings_2.getItemMapKey)(topItem));
            if (recoveryCandidate) {
                return recoverManagedObsidianNoteFromFile(recoveryCandidate, settings);
            }
        }
        return createObsidianNote(topItem);
    });
}
function maybeRenameLegacySyncedFile(noteItem, targetDir, desiredFilename) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!desiredFilename) {
            return desiredFilename;
        }
        const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
        const currentFilename = syncStatus.filename || "";
        if (syncStatus.path !== targetDir ||
            !currentFilename ||
            currentFilename === desiredFilename) {
            return desiredFilename;
        }
        const currentPath = (0, str_1.jointPath)(syncStatus.path, currentFilename);
        const desiredPath = (0, str_1.jointPath)(targetDir, desiredFilename);
        if (!(yield (0, str_1.fileExists)(currentPath)) || (yield (0, str_1.fileExists)(desiredPath))) {
            return desiredFilename;
        }
        yield Zotero.File.rename(currentPath, desiredFilename, {
            overwrite: false,
            unique: false,
        });
        return desiredFilename;
    });
}
function getManagedTargetPath(noteItem, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        let filename = (yield (0, managed_1.getManagedObsidianFileNameFresh)(noteItem)) ||
            (0, managed_1.getManagedObsidianFileName)(noteItem) ||
            (yield addon.api.sync.getMDFileName(noteItem.id, settings.notesDir));
        filename = yield maybeRenameLegacySyncedFile(noteItem, settings.notesDir, filename);
        return (0, str_1.jointPath)(settings.notesDir, filename);
    });
}
function resolveManagedObsidianTargetPath(noteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
        const syncedTargetPath = syncStatus.path && syncStatus.filename
            ? (0, str_1.jointPath)(syncStatus.path, syncStatus.filename)
            : "";
        if (syncedTargetPath && (yield (0, str_1.fileExists)(syncedTargetPath))) {
            return syncedTargetPath;
        }
        const notesDir = String((0, prefs_1.getPref)("obsidian.notesDir") || "").trim();
        if (!notesDir) {
            return "";
        }
        const managedFileName = (yield (0, managed_1.getManagedObsidianFileNameFresh)(noteItem)) ||
            (0, managed_1.getManagedObsidianFileName)(noteItem) ||
            syncStatus.filename;
        if (!managedFileName) {
            return "";
        }
        const managedTargetPath = (0, str_1.jointPath)(notesDir, managedFileName);
        return (yield (0, str_1.fileExists)(managedTargetPath)) ? managedTargetPath : "";
    });
}
function exportManagedObsidianNotes(noteItems, targetFiles, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        if (settings.autoSync) {
            yield addon.api.$export.syncMDBatch(settings.notesDir, noteItems.map((noteItem) => noteItem.id), undefined, {
                attachmentDir: settings.assetsDir,
                attachmentFolder: settings.attachmentFolder,
                historyReason: "obsidian-sync",
            });
        }
        else {
            for (const [index, noteItem] of noteItems.entries()) {
                yield addon.api.$export.saveMD(targetFiles[index], noteItem.id, {
                    keepNoteLink: false,
                    withYAMLHeader: true,
                    attachmentDir: settings.assetsDir,
                    attachmentFolder: settings.attachmentFolder,
                    historyReason: "obsidian-sync",
                });
            }
        }
        if (settings.dashboardAutoSetup && settings.dashboardDir) {
            yield (0, dashboard_1.setupObsidianDashboards)({
                settings,
                quiet: true,
                openAfterSetup: false,
            });
        }
    });
}
function getManagedMappedNoteItems() {
    const itemNoteMap = (0, settings_2.getObsidianItemNoteMap)();
    const normalizedMap = {};
    const noteItems = [];
    for (const [itemMapKey, noteKey] of Object.entries(itemNoteMap)) {
        const [libraryIDText] = itemMapKey.split("/");
        const libraryID = Number(libraryIDText);
        if (!libraryID || !noteKey) {
            continue;
        }
        const noteItem = Zotero.Items.getByLibraryAndKey(libraryID, noteKey);
        if (!noteItem ||
            !noteItem.isNote() ||
            !noteItem.parentItem ||
            !noteItem.parentItem.isRegularItem()) {
            continue;
        }
        normalizedMap[itemMapKey] = noteKey;
        noteItems.push(noteItem);
    }
    if (JSON.stringify(normalizedMap) !== JSON.stringify(itemNoteMap)) {
        (0, settings_2.setObsidianItemNoteMap)(normalizedMap);
    }
    return noteItems;
}
function isManagedRepairCandidate(noteItem, mdStatus) {
    var _a;
    if (!(noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote()) || !((_a = noteItem.parentItem) === null || _a === void 0 ? void 0 : _a.isRegularItem())) {
        return false;
    }
    const meta = (0, frontmatter_1.normalizeFrontmatterObject)(mdStatus.meta);
    if (!meta.bridge_managed) {
        return false;
    }
    const noteKey = (0, shared_1.cleanInline)(String(meta.zotero_note_key || ""));
    const topItemKey = (0, shared_1.cleanInline)(String(meta.zotero_key || ""));
    if (noteKey && noteKey !== noteItem.key) {
        return false;
    }
    if (topItemKey && topItemKey !== noteItem.parentItem.key) {
        return false;
    }
    return true;
}
function shouldReplaceManagedRepairCandidate(currentCandidate, nextCandidate) {
    if ((nextCandidate.syncStatus.lastsync || 0) !==
        (currentCandidate.syncStatus.lastsync || 0)) {
        return ((nextCandidate.syncStatus.lastsync || 0) >
            (currentCandidate.syncStatus.lastsync || 0));
    }
    if (nextCandidate.noteItem.version !== currentCandidate.noteItem.version) {
        return nextCandidate.noteItem.version > currentCandidate.noteItem.version;
    }
    return nextCandidate.noteItem.id > currentCandidate.noteItem.id;
}
function repairObsidianManagedLinks() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        var _a;
        const previousMap = Object.assign({}, (0, settings_2.getObsidianItemNoteMap)());
        let existingManagedNotes = getManagedMappedNoteItems();
        const notesDir = String((0, prefs_1.getPref)("obsidian.notesDir") || "").trim();
        const settings = notesDir && (yield (0, str_1.fileExists)(notesDir))
            ? yield (0, settings_1.ensureObsidianSettings)()
            : null;
        let restoredSyncStatuses = 0;
        let scannedSyncFiles = 0;
        const recoveredStatuses = [];
        let recreatedNotes = 0;
        if (notesDir && (yield (0, str_1.fileExists)(notesDir))) {
            const foundStatuses = yield addon.api.sync.findAllSyncedFiles(notesDir);
            scannedSyncFiles = foundStatuses.length;
            for (const status of foundStatuses) {
                const currentStatus = addon.api.sync.getSyncStatus(status.itemID);
                const changed = currentStatus.path !== status.path ||
                    currentStatus.filename !== status.filename ||
                    currentStatus.md5 !== status.md5 ||
                    currentStatus.noteMd5 !== status.noteMd5 ||
                    currentStatus.managedSourceHash !== status.managedSourceHash ||
                    currentStatus.itemID !== status.itemID;
                addon.api.sync.updateSyncStatus(status.itemID, status);
                recoveredStatuses.push(status);
                if (changed) {
                    restoredSyncStatuses += 1;
                }
            }
        }
        if ((settings === null || settings === void 0 ? void 0 : settings.notesDir) && (yield (0, str_1.fileExists)(settings.notesDir))) {
            const recoveryCandidates = yield findManagedRecoveryCandidates(settings.notesDir);
            for (const candidate of recoveryCandidates.values()) {
                if ((0, paths_1.findExistingObsidianNote)(candidate.topItem)) {
                    continue;
                }
                const recoveredNote = yield recoverManagedObsidianNoteFromFile(candidate, settings);
                existingManagedNotes = [...existingManagedNotes, recoveredNote];
                recoveredStatuses.push(addon.api.sync.getSyncStatus(recoveredNote.id));
                restoredSyncStatuses += 1;
                recreatedNotes += 1;
            }
        }
        const candidateMap = new Map();
        for (const noteItem of existingManagedNotes) {
            const topItem = noteItem.parentItem;
            if (!(topItem === null || topItem === void 0 ? void 0 : topItem.isRegularItem())) {
                continue;
            }
            candidateMap.set((0, settings_2.getItemMapKey)(topItem), {
                noteItem,
                syncStatus: addon.api.sync.getSyncStatus(noteItem.id),
                mdStatus: yield addon.api.sync.getMDStatus(noteItem.id),
            });
        }
        const candidateNoteIDs = new Set([
            ...(yield addon.api.sync.getSyncNoteIds()),
            ...recoveredStatuses.map((status) => status.itemID),
            ...existingManagedNotes.map((noteItem) => noteItem.id),
        ]);
        let conflicts = 0;
        for (const noteID of candidateNoteIDs) {
            const noteItem = Zotero.Items.get(noteID);
            if (!(noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote()) || !((_a = noteItem.parentItem) === null || _a === void 0 ? void 0 : _a.isRegularItem())) {
                continue;
            }
            const mdStatus = yield addon.api.sync.getMDStatus(noteItem.id);
            if (!isManagedRepairCandidate(noteItem, mdStatus)) {
                continue;
            }
            const topItemKey = (0, settings_2.getItemMapKey)(noteItem.parentItem);
            const nextCandidate = {
                noteItem,
                syncStatus: addon.api.sync.getSyncStatus(noteItem.id),
                mdStatus,
            };
            const currentCandidate = candidateMap.get(topItemKey);
            if (!currentCandidate) {
                candidateMap.set(topItemKey, nextCandidate);
                continue;
            }
            if (currentCandidate.noteItem.key === nextCandidate.noteItem.key) {
                continue;
            }
            conflicts += 1;
            if (shouldReplaceManagedRepairCandidate(currentCandidate, nextCandidate)) {
                candidateMap.set(topItemKey, nextCandidate);
            }
        }
        const repairedMap = Array.from(candidateMap.entries()).reduce((result, [itemMapKey, candidate]) => {
            result[itemMapKey] = candidate.noteItem.key;
            return result;
        }, {});
        (0, settings_2.setObsidianItemNoteMap)(repairedMap);
        for (const candidate of candidateMap.values()) {
            const syncStatus = addon.api.sync.getSyncStatus(candidate.noteItem.id);
            addon.api.sync.updateSyncStatus(candidate.noteItem.id, Object.assign(Object.assign({}, syncStatus), { managedSourceHash: yield (0, managed_1.getManagedObsidianSourceHash)(candidate.noteItem) }));
        }
        const restoredMappings = Array.from(new Set([...Object.keys(previousMap), ...Object.keys(repairedMap)])).filter((itemMapKey) => previousMap[itemMapKey] !== repairedMap[itemMapKey]).length;
        const result = {
            restoredMappings,
            restoredSyncStatuses,
            conflicts,
            scannedSyncFiles,
            candidateNotes: candidateMap.size,
            recreatedNotes,
        };
        if (!options.quiet) {
            if (!result.restoredMappings &&
                !result.restoredSyncStatuses &&
                !result.candidateNotes) {
                (0, hint_1.showHint)((0, locale_1.getString)("obsidian-repairManagedLinks-none"));
            }
            else {
                (0, hint_1.showHint)((0, locale_1.getString)("obsidian-repairManagedLinks-finished", {
                    args: {
                        mappings: result.restoredMappings,
                        records: result.restoredSyncStatuses,
                        conflicts: result.conflicts,
                    },
                }));
            }
        }
        return result;
    });
}
function resyncAllManagedObsidianNotes(successMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const settings = yield (0, settings_1.ensureObsidianSettings)();
            let noteItems = getManagedMappedNoteItems();
            if (settings.notesDir && (yield (0, str_1.fileExists)(settings.notesDir))) {
                const recoveryCandidates = yield findManagedRecoveryCandidates(settings.notesDir);
                for (const candidate of recoveryCandidates.values()) {
                    if ((0, paths_1.findExistingObsidianNote)(candidate.topItem)) {
                        continue;
                    }
                    noteItems = [
                        ...noteItems,
                        yield recoverManagedObsidianNoteFromFile(candidate, settings),
                    ];
                }
            }
            if (!noteItems.length) {
                (0, hint_1.showHint)((0, locale_1.getString)("obsidian-sync-noManagedNotes"));
                return;
            }
            const targetFiles = [];
            for (const noteItem of noteItems) {
                targetFiles.push(yield getManagedTargetPath(noteItem, settings));
            }
            yield exportManagedObsidianNotes(noteItems, targetFiles, settings);
            (0, hint_1.showHint)(successMessage ||
                (0, locale_1.getString)("obsidian-sync-managedNotesResynced", {
                    args: {
                        count: noteItems.length,
                    },
                }));
        }
        catch (e) {
            const message = (e === null || e === void 0 ? void 0 : e.message) || String(e);
            ztoolkit.log("[ObsidianBridge] resync failed", e);
            (0, hint_1.showHint)((0, locale_1.getString)("obsidian-sync-error", { args: { detail: message } }));
        }
    });
}
function dedupeRegularItems(items) {
    const itemMap = new Map();
    for (const item of items) {
        if (item === null || item === void 0 ? void 0 : item.isRegularItem()) {
            itemMap.set(item.id, item);
        }
    }
    return Array.from(itemMap.values());
}
function getRegularItemsForSyncScope(scope) {
    return __awaiter(this, void 0, void 0, function* () {
        const ZoteroPane = Zotero.getMainWindow().ZoteroPane;
        if (scope === "library") {
            const libraryID = ZoteroPane.getSelectedLibraryID();
            if (!libraryID) {
                return [];
            }
            return dedupeRegularItems(yield Zotero.Items.getAll(libraryID, true, false));
        }
        if (scope === "currentList") {
            const collectionTree = ZoteroPane.collectionsView;
            const collectionTreeRow = collectionTree && collectionTree.selectedTreeRow;
            if (!collectionTreeRow) {
                return [];
            }
            return dedupeRegularItems((yield collectionTreeRow.getItems()).filter((item) => { var _a; return Boolean((_a = item === null || item === void 0 ? void 0 : item.isRegularItem) === null || _a === void 0 ? void 0 : _a.call(item)); }));
        }
        return dedupeRegularItems(ZoteroPane.getSelectedItems().filter((item) => item.isRegularItem()));
    });
}
function promptChildNotesForSingleItemSync(topItem, managedNoteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const childNoteConfig = (0, childNotes_1.getChildNoteBridgeConfig)();
        const matchedNotes = (0, managed_1.getMatchedChildNotes)(topItem, managedNoteItem, childNoteConfig);
        if (!childNoteConfig.promptSelect || matchedNotes.length <= 1) {
            return true;
        }
        const excludedKeys = new Set((0, childNotes_1.getChildNoteExcludeMap)()[(0, settings_2.getItemMapKey)(topItem)] || []);
        const matchedTagSet = new Set(childNoteConfig.matchTags);
        const checkboxIDs = new Map();
        const dialogData = {
            accepted: false,
            selectedKeys: [],
        };
        const dialog = new ztoolkit.Dialog(1, 1)
            .setDialogData(dialogData)
            .addCell(0, 0, {
            tag: "vbox",
            attributes: { flex: 1 },
            styles: {
                gap: "14px",
                padding: "10px 8px 2px",
                minWidth: "0",
            },
            children: [
                {
                    tag: "vbox",
                    attributes: { flex: 0 },
                    styles: {
                        gap: "8px",
                    },
                    children: [
                        {
                            tag: "label",
                            properties: {
                                textContent: (0, childNotes_1.getTopItemPreferredTitle)(topItem),
                            },
                            styles: {
                                fontSize: "18px",
                                fontWeight: "700",
                                lineHeight: "1.35",
                                wordBreak: "break-word",
                            },
                        },
                        {
                            tag: "description",
                            properties: {
                                textContent: (0, locale_1.getString)("obsidian-childNotePicker-help"),
                            },
                            styles: {
                                color: "var(--text-color-deemphasized)",
                                lineHeight: "1.55",
                                whiteSpace: "normal",
                            },
                        },
                    ],
                },
                {
                    tag: "div",
                    namespace: "html",
                    styles: {
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        alignItems: "stretch",
                        gap: "10px",
                        minHeight: "280px",
                        maxHeight: "340px",
                        overflowY: "auto",
                        padding: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.03)",
                        boxSizing: "border-box",
                    },
                    children: matchedNotes.map((noteItem) => {
                        const checkboxID = `obsidian-child-note-${noteItem.key}`;
                        checkboxIDs.set(noteItem.key, checkboxID);
                        const matchedTags = (0, managed_1.getChildNoteTags)(noteItem).filter((tag) => matchedTagSet.has((0, childNotes_1.normalizeChildNoteTag)(tag)));
                        const cardChildren = [
                            {
                                tag: "div",
                                namespace: "html",
                                styles: {
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "12px",
                                },
                                children: [
                                    {
                                        tag: "input",
                                        namespace: "html",
                                        id: checkboxID,
                                        properties: {
                                            type: "checkbox",
                                            checked: !excludedKeys.has(noteItem.key),
                                        },
                                        styles: {
                                            marginTop: "3px",
                                            accentColor: "var(--accent-blue)",
                                            flexShrink: "0",
                                        },
                                    },
                                    {
                                        tag: "div",
                                        namespace: "html",
                                        styles: {
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                            minWidth: "0",
                                            flex: "1",
                                        },
                                        children: [
                                            {
                                                tag: "div",
                                                namespace: "html",
                                                properties: {
                                                    textContent: (0, childNotes_1.getChildNoteDisplayTitle)(noteItem, topItem),
                                                },
                                                styles: {
                                                    fontSize: "15px",
                                                    fontWeight: "700",
                                                    lineHeight: "1.45",
                                                    wordBreak: "break-word",
                                                },
                                            },
                                            {
                                                tag: "div",
                                                namespace: "html",
                                                styles: {
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "6px",
                                                },
                                                children: matchedTags.map((tag) => ({
                                                    tag: "span",
                                                    namespace: "html",
                                                    properties: {
                                                        textContent: tag,
                                                    },
                                                    styles: {
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        padding: "3px 8px",
                                                        borderRadius: "999px",
                                                        background: "rgba(64, 156, 255, 0.16)",
                                                        color: "var(--accent-blue)",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        lineHeight: "1.3",
                                                    },
                                                })),
                                            },
                                        ],
                                    },
                                ],
                            },
                        ];
                        return {
                            tag: "label",
                            namespace: "html",
                            attributes: {
                                for: checkboxID,
                            },
                            styles: {
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                padding: "12px 14px",
                                borderRadius: "10px",
                                border: "1px solid rgba(255, 255, 255, 0.05)",
                                background: "rgba(0, 0, 0, 0.16)",
                                cursor: "pointer",
                                boxSizing: "border-box",
                            },
                            children: cardChildren,
                        };
                    }),
                },
            ],
        })
            .addButton((0, locale_1.getString)("obsidian-childNotePicker-confirm"), "accept", {
            callback: () => {
                dialogData.accepted = true;
                dialogData.selectedKeys = matchedNotes
                    .filter((noteItem) => {
                    var _a;
                    const checkbox = (_a = dialog.window) === null || _a === void 0 ? void 0 : _a.document.getElementById(checkboxIDs.get(noteItem.key) || "");
                    return Boolean(checkbox === null || checkbox === void 0 ? void 0 : checkbox.checked);
                })
                    .map((noteItem) => noteItem.key);
            },
        })
            .addButton((0, locale_1.getString)("obsidian-childNotePicker-cancel"), "cancel")
            .open((0, locale_1.getString)("obsidian-childNotePicker-title"), {
            width: 620,
            height: 520,
            centerscreen: true,
            resizable: true,
            fitContent: false,
        });
        yield ((_a = dialog.dialogData.loadLock) === null || _a === void 0 ? void 0 : _a.promise);
        const acceptButton = (_b = dialog.window) === null || _b === void 0 ? void 0 : _b.document.getElementById("accept");
        const cancelButton = (_c = dialog.window) === null || _c === void 0 ? void 0 : _c.document.getElementById("cancel");
        for (const button of [acceptButton, cancelButton]) {
            if (!button)
                continue;
            button.style.minWidth = "140px";
            button.style.height = "38px";
            button.style.borderRadius = "10px";
            button.style.fontWeight = "600";
            button.style.padding = "0 18px";
        }
        if (acceptButton) {
            acceptButton.style.background = "var(--accent-blue)";
            acceptButton.style.color = "#fff";
            acceptButton.style.border = "none";
            acceptButton.focus();
        }
        if (cancelButton) {
            cancelButton.style.background = "rgba(255, 255, 255, 0.06)";
            cancelButton.style.color = "var(--text-color)";
            cancelButton.style.border = "1px solid rgba(255, 255, 255, 0.08)";
        }
        yield ((_d = dialog.dialogData.unloadLock) === null || _d === void 0 ? void 0 : _d.promise);
        if (!dialogData.accepted) {
            return false;
        }
        (0, managed_1.persistChildNoteExclusions)(topItem, matchedNotes, dialogData.selectedKeys);
        return true;
    });
}
function syncSelectedItemsToObsidian() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const settings = yield (0, settings_1.ensureObsidianSettings)();
            const selectedItems = yield getRegularItemsForSyncScope(settings.syncScope);
            if (!selectedItems.length) {
                (0, hint_1.showHint)(settings.syncScope === "selection"
                    ? (0, locale_1.getString)("obsidian-sync-noSelection")
                    : (0, locale_1.getString)("obsidian-sync-noItemsInScope"));
                return;
            }
            if (selectedItems.length === 1) {
                const topItem = selectedItems[0];
                const confirmed = yield promptChildNotesForSingleItemSync(topItem, (0, paths_1.findExistingObsidianNote)(topItem));
                if (!confirmed) {
                    return;
                }
            }
            const translationReport = yield (0, translation_1.autofillMissingMetadataTranslations)(selectedItems, settings.translation);
            for (const warning of translationReport.warnings) {
                (0, hint_1.showHint)(warning.message);
            }
            const noteItems = [];
            const targetFiles = [];
            for (const topItem of selectedItems) {
                const noteItem = yield ensureManagedObsidianNote(topItem, settings);
                noteItems.push(noteItem);
                targetFiles.push(yield getManagedTargetPath(noteItem, settings));
            }
            yield exportManagedObsidianNotes(noteItems, targetFiles, settings);
            if (targetFiles[0]) {
                yield (0, hint_1.showHintWithLink)((0, locale_1.getString)("obsidian-sync-finished", {
                    args: { count: selectedItems.length },
                }), (0, locale_1.getString)("obsidian-sync-showInFolder"), () => {
                    Zotero.File.reveal(targetFiles[0]);
                });
            }
            if (settings.revealAfterSync && targetFiles[0]) {
                Zotero.File.reveal(targetFiles[0]);
            }
            if (settings.openAfterSync && targetFiles[0]) {
                (0, paths_1.openObsidianNote)(targetFiles[0]);
            }
        }
        catch (e) {
            const message = (e === null || e === void 0 ? void 0 : e.message) || String(e);
            ztoolkit.log("[ObsidianBridge] sync failed", e);
            (0, hint_1.showHint)((0, locale_1.getString)("obsidian-sync-error", { args: { detail: message } }));
        }
    });
}
function openItemsInObsidian(items) {
    return __awaiter(this, void 0, void 0, function* () {
        const [topItem] = dedupeRegularItems(items);
        if (!topItem) {
            (0, hint_1.showHint)((0, locale_1.getString)("obsidian-sync-noSelection"));
            return;
        }
        const noteItem = (0, paths_1.findExistingObsidianNote)(topItem);
        const targetPath = noteItem
            ? yield resolveManagedObsidianTargetPath(noteItem)
            : "";
        if (!targetPath || !(0, paths_1.openObsidianNote)(targetPath)) {
            (0, hint_1.showHint)((0, locale_1.getString)("obsidian-open-failed"));
        }
    });
}
