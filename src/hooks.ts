import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import {
  registerPrefsScripts,
  registerPrefsWindow,
} from "./modules/preferenceWindow";
import { registerNoteLinkProxyHandler } from "./modules/noteLink";
import {
  registerEditorInstanceHook,
  unregisterEditorInstanceHook,
} from "./modules/editor/initalize";
import {
  importTemplateFromClipboard,
  initTemplates,
} from "./modules/template/controller";
import { registerMenus } from "./modules/menu";
import { initWorkspace } from "./modules/workspace/content";
import { openWorkspaceWindow } from "./modules/workspace/window";
import { openNotePreview } from "./modules/workspace/preview";
import { registerNotify } from "./modules/notify";
import {
  registerReaderAnnotationButton,
  syncAnnotationNoteTags,
} from "./modules/annotationNote";
import { setSyncing, callSyncing } from "./modules/sync/hooks";
import { initSyncHistory } from "./modules/sync/history";
import {
  startSyncFileWatcher,
  stopSyncFileWatcher,
} from "./modules/sync/watcher";
import { showTemplatePicker } from "./modules/template/picker";
import { showImageViewer } from "./modules/imageViewer";
import { showExportNoteOptions } from "./modules/export/exportWindow";
import { showSyncDiff } from "./modules/sync/diffWindow";
import { showSyncInfo } from "./modules/sync/infoWindow";
import { showSyncManager } from "./modules/sync/managerWindow";
import { showTemplateEditor } from "./modules/template/editorWindow";
import {
  createNoteFromTemplate,
  createNoteFromMD,
  createNote,
} from "./modules/createNote";
import { createZToolkit } from "./utils/ztoolkit";
import { waitUtilAsync } from "./utils/wait";
import { initSyncList } from "./modules/sync/api";
import { getFocusedWindow } from "./utils/window";
import { registerNoteRelation } from "./modules/workspace/relation";
import { closeRelationServer } from "./utils/relation";
import { registerNoteLinkSection } from "./modules/workspace/link";
import { showUserGuide } from "./modules/userGuide";
import { refreshTemplatesInNote } from "./modules/template/refresh";
import { closeParsingServer } from "./utils/parsing";
import { patchExportItems } from "./modules/patches/exportItems";
import { closeConvertServer } from "./utils/convert";
import { patchNoteEditorCE } from "./modules/patches/noteEditor";
import { patchNotes } from "./modules/patches/notes";
import {
  getManagedObsidianNoteForItem,
  pickObsidianItemTemplate,
  openItemsInObsidian,
  pickObsidianPath,
  maybeAutoRunObsidianSetupWizard,
  repairObsidianManagedLinks,
  refreshObsidianPrefsUI,
  resetObsidianMetadataPreset,
  saveObsidianMetadataPreset,
  setupObsidianDashboards,
  syncSelectedItemsToObsidian,
  initObsidianStorage,
} from "./modules/obsidian";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();
  ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`,
  );

  registerMenus();

  registerNoteLinkProxyHandler();

  registerEditorInstanceHook();

  registerPrefsWindow();

  registerReaderAnnotationButton();

  registerNoteRelation();

  registerNoteLinkSection("inbound");
  registerNoteLinkSection("outbound");

  patchNotes();

  await initObsidianStorage();

  initSyncList();
  initSyncHistory();

  setSyncing();
  startSyncFileWatcher();

  await Promise.all(Zotero.getMainWindows().map(onMainWindowLoad));

  // For testing
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  await waitUtilAsync(() => win.document.readyState === "complete");

  Services.scriptloader.loadSubScript(
    `chrome://${config.addonRef}/content/scripts/customElements.js`,
    win,
  );

  win.MozXULElement.insertFTLIfNeeded(`${config.addonRef}-mainWindow.ftl`);

  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  registerNotify(["tab", "item", "item-tag", "collection-item"], win);

  initTemplates();

  patchExportItems(win);

  patchNoteEditorCE(win);

  void showUserGuide(win).finally(() => {
    void maybeAutoRunObsidianSetupWizard(win);
  });
}

async function onMainWindowUnload(win: Window): Promise<void> {
  win.document
    .querySelector(`[href="${config.addonRef}-mainWindow.ftl"]`)
    ?.remove();
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  closeRelationServer();
  closeParsingServer();
  closeConvertServer();
  stopSyncFileWatcher();

  unregisterEditorInstanceHook();

  Zotero.getMainWindows().forEach((win) => {
    onMainWindowUnload(win);
  });

  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  // @ts-ignore plugin instance
  delete Zotero[config.addonInstance];
}

function collectAffectedManagedNotes(items: Zotero.Item[]) {
  const affectedNotes = new Map<number, Zotero.Item>();
  for (const item of items) {
    if (!item) {
      continue;
    }
    if (item.isNote()) {
      affectedNotes.set(item.id, item);
    }
    const managedNote = getManagedObsidianNoteForItem(item);
    if (managedNote) {
      affectedNotes.set(managedNote.id, managedNote);
    }
  }
  return Array.from(affectedNotes.values());
}

function parseNotifierItemIDs(
  ids: Parameters<_ZoteroTypes.Notifier.Notify>["2"],
  type: "item-tag" | "collection-item",
) {
  const itemIndex = type === "item-tag" ? 0 : 1;
  return Array.from(
    new Set(
      ids
        .map((id) => {
          if (typeof id === "number") {
            return id;
          }
          const parts = String(id).split("-");
          return Number(parts[itemIndex]);
        })
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: Parameters<_ZoteroTypes.Notifier.Notify>["0"],
  type: Parameters<_ZoteroTypes.Notifier.Notify>["1"],
  ids: Parameters<_ZoteroTypes.Notifier.Notify>["2"],
  extraData: Parameters<_ZoteroTypes.Notifier.Notify>["3"],
) {
  if (extraData?.skipOB) {
    return;
  }
  if (
    ["add", "close"].includes(event) &&
    type === "tab" &&
    extraData[ids[0]]?.type === "note"
  ) {
    Zotero.Session.debounceSave();
  }
  if (event === "modify" && type === "item") {
    const modifiedItems = Zotero.Items.get(ids).filter(
      (item): item is Zotero.Item => Boolean(item),
    );
    const affectedNotes = collectAffectedManagedNotes(modifiedItems);
    if (affectedNotes.length) {
      const skipActive = modifiedItems.every((item) => item.isNote());
      await addon.hooks.onSyncing(affectedNotes, {
        quiet: true,
        skipActive,
        reason: "item-modify",
      });
    }
    const modifiedNotes = modifiedItems.filter((item) => item.isNote());
    if (modifiedNotes.length) {
      for (const item of modifiedNotes) {
        await addon.api.relation.updateNoteLinkRelation(item.id);
      }
    }
  }
  if (type === "item-tag") {
    for (const itemTagID of ids) {
      await syncAnnotationNoteTags(
        Number((itemTagID as string).split("-")[0]),
        event as "add" | "remove",
        extraData[itemTagID],
      );
    }
    const taggedItems = Zotero.Items.get(
      parseNotifierItemIDs(ids, "item-tag"),
    ).filter((item): item is Zotero.Item => Boolean(item));
    const affectedNotes = collectAffectedManagedNotes(taggedItems);
    if (affectedNotes.length) {
      const skipActive = taggedItems.every((item) => item.isNote());
      await addon.hooks.onSyncing(affectedNotes, {
        quiet: true,
        skipActive,
        reason: "item-tag",
      });
    }
  }
  if (type === "collection-item" && ["add", "remove"].includes(event)) {
    const collectionItems = Zotero.Items.get(
      parseNotifierItemIDs(ids, "collection-item"),
    ).filter((item): item is Zotero.Item => Boolean(item));
    const affectedNotes = collectAffectedManagedNotes(collectionItems);
    if (affectedNotes.length) {
      await addon.hooks.onSyncing(affectedNotes, {
        quiet: true,
        skipActive: false,
        reason: "collection-item",
      });
    }
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      refreshObsidianPrefsUI();
      break;
    default:
      return;
  }
}

interface OpenNoteReturns {
  auto: Window | string | void;
  preview: void;
  tab: string | void;
  window: Window | void;
  builtin: void;
}

async function onOpenNote<K extends keyof OpenNoteReturns>(
  noteId: number,
  mode: K = "auto" as K,
  options: {
    workspaceUID?: string;
    lineIndex?: number;
    sectionName?: string;
    forceTakeover?: boolean;
  } = {},
): Promise<OpenNoteReturns[K]> {
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
  if (!noteItem?.isNote()) {
    ztoolkit.log(`onOpenNote: ${noteId} is not a note.`);
    return;
  }
  if (mode === "auto") {
    const currentWindow = getFocusedWindow();

    if (
      (currentWindow as _ZoteroTypes.MainWindow)?.Zotero_Tabs?.selectedType ===
      "note"
    ) {
      mode = "preview" as K;
      workspaceUID = (
        currentWindow as _ZoteroTypes.MainWindow
      ).Zotero_Tabs.getTabInfo().id;
    } else if (currentWindow?.document.querySelector("body.workspace-window")) {
      mode = "preview" as K;
      workspaceUID = (
        currentWindow.document.querySelector("zob-workspace") as
          | HTMLElement
          | undefined
      )?.dataset.uid;
    } else {
      mode = "tab" as K;
    }
  }
  switch (mode) {
    case "preview":
      if (!workspaceUID) {
        throw new Error(
          "Obsidian Bridge onOpenNote mode=preview must have workspaceUID provided.",
        );
      }
      openNotePreview(noteItem, workspaceUID, options);
      break;
    case "tab":
      return win.ZoteroPane.openNote(noteId, { openInWindow: false }) as any;
      break;
    case "window":
      return (await openWorkspaceWindow(noteItem, options)) as any;
      break;
    case "builtin":
      win.ZoteroPane.openNote(noteId);
      break;
    default:
      break;
  }
}

const onInitWorkspace = initWorkspace;

const onSyncing = callSyncing;

const onShowTemplatePicker = showTemplatePicker;

const onImportTemplateFromClipboard = importTemplateFromClipboard;

const onRefreshTemplatesInNote = refreshTemplatesInNote;

const onShowImageViewer = showImageViewer;

const onShowExportNoteOptions = showExportNoteOptions;

const onShowSyncInfo = showSyncInfo;

const onShowSyncManager = showSyncManager;

const onShowSyncDiff = showSyncDiff;

const onShowTemplateEditor = showTemplateEditor;

const onCreateNoteFromTemplate = createNoteFromTemplate;

const onCreateNote = createNote;

const onCreateNoteFromMD = createNoteFromMD;

const onShowUserGuide = showUserGuide;

const onPickObsidianPath = pickObsidianPath;

const onPickObsidianItemTemplate = pickObsidianItemTemplate;

const onOpenItemsInObsidian = openItemsInObsidian;

const onSyncSelectedItemsToObsidian = syncSelectedItemsToObsidian;

const onSetupObsidianDashboards = setupObsidianDashboards;

const onRepairObsidianManagedLinks = repairObsidianManagedLinks;

const onSaveObsidianMetadataPreset = saveObsidianMetadataPreset;

const onResetObsidianMetadataPreset = resetObsidianMetadataPreset;

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
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
