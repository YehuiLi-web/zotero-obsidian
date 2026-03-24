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
const package_json_1 = require("../package.json");
const locale_1 = require("./utils/locale");
const preferenceWindow_1 = require("./modules/preferenceWindow");
const noteLink_1 = require("./modules/noteLink");
const initalize_1 = require("./modules/editor/initalize");
const controller_1 = require("./modules/template/controller");
const menu_1 = require("./modules/menu");
const content_1 = require("./modules/workspace/content");
const window_1 = require("./modules/workspace/window");
const preview_1 = require("./modules/workspace/preview");
const notify_1 = require("./modules/notify");
const annotationNote_1 = require("./modules/annotationNote");
const hooks_1 = require("./modules/sync/hooks");
const history_1 = require("./modules/sync/history");
const watcher_1 = require("./modules/sync/watcher");
const picker_1 = require("./modules/template/picker");
const imageViewer_1 = require("./modules/imageViewer");
const exportWindow_1 = require("./modules/export/exportWindow");
const diffWindow_1 = require("./modules/sync/diffWindow");
const infoWindow_1 = require("./modules/sync/infoWindow");
const managerWindow_1 = require("./modules/sync/managerWindow");
const editorWindow_1 = require("./modules/template/editorWindow");
const createNote_1 = require("./modules/createNote");
const ztoolkit_1 = require("./utils/ztoolkit");
const wait_1 = require("./utils/wait");
const api_1 = require("./modules/sync/api");
const window_2 = require("./utils/window");
const relation_1 = require("./modules/workspace/relation");
const relation_2 = require("./utils/relation");
const link_1 = require("./modules/workspace/link");
const userGuide_1 = require("./modules/userGuide");
const refresh_1 = require("./modules/template/refresh");
const parsing_1 = require("./utils/parsing");
const exportItems_1 = require("./modules/patches/exportItems");
const convert_1 = require("./utils/convert");
const noteEditor_1 = require("./modules/patches/noteEditor");
const notes_1 = require("./modules/patches/notes");
const obsidian_1 = require("./modules/obsidian");
function onStartup() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all([
            Zotero.initializationPromise,
            Zotero.unlockPromise,
            Zotero.uiReadyPromise,
        ]);
        (0, locale_1.initLocale)();
        ztoolkit.ProgressWindow.setIconURI("default", `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`);
        (0, menu_1.registerMenus)();
        (0, noteLink_1.registerNoteLinkProxyHandler)();
        (0, initalize_1.registerEditorInstanceHook)();
        (0, preferenceWindow_1.registerPrefsWindow)();
        (0, annotationNote_1.registerReaderAnnotationButton)();
        (0, relation_1.registerNoteRelation)();
        (0, link_1.registerNoteLinkSection)("inbound");
        (0, link_1.registerNoteLinkSection)("outbound");
        (0, notes_1.patchNotes)();
        yield (0, obsidian_1.initObsidianStorage)();
        (0, api_1.initSyncList)();
        (0, history_1.initSyncHistory)();
        (0, hooks_1.setSyncing)();
        (0, watcher_1.startSyncFileWatcher)();
        yield Promise.all(Zotero.getMainWindows().map(onMainWindowLoad));
        // For testing
        addon.data.initialized = true;
    });
}
function onMainWindowLoad(win) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, wait_1.waitUtilAsync)(() => win.document.readyState === "complete");
        Services.scriptloader.loadSubScript(`chrome://${package_json_1.config.addonRef}/content/scripts/customElements.js`, win);
        win.MozXULElement.insertFTLIfNeeded(`${package_json_1.config.addonRef}-mainWindow.ftl`);
        // Create ztoolkit for every window
        addon.data.ztoolkit = (0, ztoolkit_1.createZToolkit)();
        (0, notify_1.registerNotify)(["tab", "item", "item-tag", "collection-item"], win);
        (0, controller_1.initTemplates)();
        (0, exportItems_1.patchExportItems)(win);
        (0, noteEditor_1.patchNoteEditorCE)(win);
        void (0, userGuide_1.showUserGuide)(win).finally(() => {
            void (0, obsidian_1.maybeAutoRunObsidianSetupWizard)(win);
        });
    });
}
function onMainWindowUnload(win) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        (_a = win.document
            .querySelector(`[href="${package_json_1.config.addonRef}-mainWindow.ftl"]`)) === null || _a === void 0 ? void 0 : _a.remove();
        ztoolkit.unregisterAll();
    });
}
function onShutdown() {
    (0, relation_2.closeRelationServer)();
    (0, parsing_1.closeParsingServer)();
    (0, convert_1.closeConvertServer)();
    (0, watcher_1.stopSyncFileWatcher)();
    (0, initalize_1.unregisterEditorInstanceHook)();
    Zotero.getMainWindows().forEach((win) => {
        onMainWindowUnload(win);
    });
    ztoolkit.unregisterAll();
    // Remove addon object
    addon.data.alive = false;
    // @ts-ignore plugin instance
    delete Zotero[package_json_1.config.addonInstance];
}
function collectAffectedManagedNotes(items) {
    const affectedNotes = new Map();
    for (const item of items) {
        if (!item) {
            continue;
        }
        if (item.isNote()) {
            affectedNotes.set(item.id, item);
        }
        const managedNote = (0, obsidian_1.getManagedObsidianNoteForItem)(item);
        if (managedNote) {
            affectedNotes.set(managedNote.id, managedNote);
        }
    }
    return Array.from(affectedNotes.values());
}
function parseNotifierItemIDs(ids, type) {
    const itemIndex = type === "item-tag" ? 0 : 1;
    return Array.from(new Set(ids
        .map((id) => {
        if (typeof id === "number") {
            return id;
        }
        const parts = String(id).split("-");
        return Number(parts[itemIndex]);
    })
        .filter((id) => Number.isFinite(id) && id > 0)));
}
/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
function onNotify(event, type, ids, extraData) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (extraData === null || extraData === void 0 ? void 0 : extraData.skipOB) {
            return;
        }
        if (["add", "close"].includes(event) &&
            type === "tab" &&
            ((_a = extraData[ids[0]]) === null || _a === void 0 ? void 0 : _a.type) === "note") {
            Zotero.Session.debounceSave();
        }
        if (event === "modify" && type === "item") {
            const modifiedItems = Zotero.Items.get(ids).filter((item) => Boolean(item));
            const affectedNotes = collectAffectedManagedNotes(modifiedItems);
            if (affectedNotes.length) {
                const skipActive = modifiedItems.every((item) => item.isNote());
                yield addon.hooks.onSyncing(affectedNotes, {
                    quiet: true,
                    skipActive,
                    reason: "item-modify",
                });
            }
            const modifiedNotes = modifiedItems.filter((item) => item.isNote());
            if (modifiedNotes.length) {
                for (const item of modifiedNotes) {
                    yield addon.api.relation.updateNoteLinkRelation(item.id);
                }
            }
        }
        if (type === "item-tag") {
            for (const itemTagID of ids) {
                yield (0, annotationNote_1.syncAnnotationNoteTags)(Number(itemTagID.split("-")[0]), event, extraData[itemTagID]);
            }
            const taggedItems = Zotero.Items.get(parseNotifierItemIDs(ids, "item-tag")).filter((item) => Boolean(item));
            const affectedNotes = collectAffectedManagedNotes(taggedItems);
            if (affectedNotes.length) {
                const skipActive = taggedItems.every((item) => item.isNote());
                yield addon.hooks.onSyncing(affectedNotes, {
                    quiet: true,
                    skipActive,
                    reason: "item-tag",
                });
            }
        }
        if (type === "collection-item" && ["add", "remove"].includes(event)) {
            const collectionItems = Zotero.Items.get(parseNotifierItemIDs(ids, "collection-item")).filter((item) => Boolean(item));
            const affectedNotes = collectAffectedManagedNotes(collectionItems);
            if (affectedNotes.length) {
                yield addon.hooks.onSyncing(affectedNotes, {
                    quiet: true,
                    skipActive: false,
                    reason: "collection-item",
                });
            }
        }
    });
}
/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
function onPrefsEvent(type, data) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (type) {
            case "load":
                (0, preferenceWindow_1.registerPrefsScripts)(data.window);
                (0, obsidian_1.refreshObsidianPrefsUI)();
                break;
            default:
                return;
        }
    });
}
function onOpenNote(noteId_1) {
    return __awaiter(this, arguments, void 0, function* (noteId, mode = "auto", options = {}) {
        var _a, _b;
        const win = Zotero.getMainWindow();
        if (!win) {
            return;
        }
        if (!options.forceTakeover) {
            win.ZoteroPane.openNote(noteId);
            return;
        }
        let { workspaceUID } = options;
        const noteItem = Zotero.Items.get(noteId);
        if (!(noteItem === null || noteItem === void 0 ? void 0 : noteItem.isNote())) {
            ztoolkit.log(`onOpenNote: ${noteId} is not a note.`);
            return;
        }
        if (mode === "auto") {
            const currentWindow = (0, window_2.getFocusedWindow)();
            if (((_a = currentWindow === null || currentWindow === void 0 ? void 0 : currentWindow.Zotero_Tabs) === null || _a === void 0 ? void 0 : _a.selectedType) ===
                "note") {
                mode = "preview";
                workspaceUID = currentWindow.Zotero_Tabs.getTabInfo().id;
            }
            else if (currentWindow === null || currentWindow === void 0 ? void 0 : currentWindow.document.querySelector("body.workspace-window")) {
                mode = "preview";
                workspaceUID = (_b = currentWindow.document.querySelector("zob-workspace")) === null || _b === void 0 ? void 0 : _b.dataset.uid;
            }
            else {
                mode = "tab";
            }
        }
        switch (mode) {
            case "preview":
                if (!workspaceUID) {
                    throw new Error("Obsidian Bridge onOpenNote mode=preview must have workspaceUID provided.");
                }
                (0, preview_1.openNotePreview)(noteItem, workspaceUID, options);
                break;
            case "tab":
                return win.ZoteroPane.openNote(noteId, { openInWindow: false });
                break;
            case "window":
                return (yield (0, window_1.openWorkspaceWindow)(noteItem, options));
                break;
            case "builtin":
                win.ZoteroPane.openNote(noteId);
                break;
            default:
                break;
        }
    });
}
const onInitWorkspace = content_1.initWorkspace;
const onSyncing = hooks_1.callSyncing;
const onShowTemplatePicker = picker_1.showTemplatePicker;
const onImportTemplateFromClipboard = controller_1.importTemplateFromClipboard;
const onRefreshTemplatesInNote = refresh_1.refreshTemplatesInNote;
const onShowImageViewer = imageViewer_1.showImageViewer;
const onShowExportNoteOptions = exportWindow_1.showExportNoteOptions;
const onShowSyncInfo = infoWindow_1.showSyncInfo;
const onShowSyncManager = managerWindow_1.showSyncManager;
const onShowSyncDiff = diffWindow_1.showSyncDiff;
const onShowTemplateEditor = editorWindow_1.showTemplateEditor;
const onCreateNoteFromTemplate = createNote_1.createNoteFromTemplate;
const onCreateNote = createNote_1.createNote;
const onCreateNoteFromMD = createNote_1.createNoteFromMD;
const onShowUserGuide = userGuide_1.showUserGuide;
const onPickObsidianPath = obsidian_1.pickObsidianPath;
const onPickObsidianItemTemplate = obsidian_1.pickObsidianItemTemplate;
const onOpenItemsInObsidian = obsidian_1.openItemsInObsidian;
const onSyncSelectedItemsToObsidian = obsidian_1.syncSelectedItemsToObsidian;
const onSetupObsidianDashboards = obsidian_1.setupObsidianDashboards;
const onRepairObsidianManagedLinks = obsidian_1.repairObsidianManagedLinks;
const onSaveObsidianMetadataPreset = obsidian_1.saveObsidianMetadataPreset;
const onResetObsidianMetadataPreset = obsidian_1.resetObsidianMetadataPreset;
// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.
exports.default = {
    onStartup,
    onMainWindowLoad,
    onMainWindowUnload,
    onShutdown,
    onNotify,
    onPrefsEvent,
    onOpenNote,
    onInitWorkspace,
    onSyncing,
    onShowTemplatePicker,
    onImportTemplateFromClipboard,
    onRefreshTemplatesInNote,
    onShowImageViewer,
    onShowExportNoteOptions,
    onShowSyncDiff,
    onShowSyncInfo,
    onShowSyncManager,
    onShowTemplateEditor,
    onCreateNoteFromTemplate,
    onCreateNoteFromMD,
    onCreateNote,
    onShowUserGuide,
    onPickObsidianPath,
    onPickObsidianItemTemplate,
    onOpenItemsInObsidian,
    onSyncSelectedItemsToObsidian,
    onSetupObsidianDashboards,
    onRepairObsidianManagedLinks,
    onSaveObsidianMetadataPreset,
    onResetObsidianMetadataPreset,
};
