import { config } from "../../package.json";
import { getManagedObsidianNoteForItem } from "./obsidian";

export function registerMenus() {
  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuTools`,
    pluginID: config.addonID,
    target: "main/menubar/tools",
    menus: [
      {
        menuType: "separator",
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-syncManager`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onShowSyncManager();
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-templateEditor`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onShowTemplateEditor();
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-importTemplateFromClipboard`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onImportTemplateFromClipboard();
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-syncSelectedToObsidian`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onSyncSelectedItemsToObsidian();
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-setupObsidianDashboards`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onSetupObsidianDashboards();
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-repairObsidianManagedLinks`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onRepairObsidianManagedLinks();
        },
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuFile`,
    pluginID: config.addonID,
    target: "main/menubar/file",
    menus: [
      {
        menuType: "separator",
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuFile-exportTemplate`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onShowTemplatePicker("export");
        },
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuNewNote`,
    pluginID: config.addonID,
    target: "main/library/addNote",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-importMD`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateNoteFromMD(),
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-newTemplateItemNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () =>
          addon.hooks.onCreateNoteFromTemplate("item", "library"),
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-newTemplateStandaloneNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateNoteFromTemplate("standalone"),
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuHelp`,
    pluginID: config.addonID,
    target: "main/menubar/help",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuHelp-openUserGuide`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () =>
          addon.hooks.onShowUserGuide(Zotero.getMainWindow(), true),
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuAddNotesPaneStandaloneNote`,
    pluginID: config.addonID,
    target: "notesPane/addStandaloneNote",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-newTemplateStandaloneNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateNoteFromTemplate("standalone"),
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuAddNotesPaneItemNote`,
    pluginID: config.addonID,
    target: "notesPane/addItemNote",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-newTemplateItemNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateNoteFromTemplate("item", "reader"),
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuTabMoveNewWindow`,
    pluginID: config.addonID,
    target: "main/tab",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTab-moveNewWindow`,
        onShowing(_, context) {
          context.setVisible(context.tabType.startsWith("note"));
        },
        onCommand: (_, context) => {
          addon.hooks.onOpenNote(context.items[0].id, "window", {
            forceTakeover: true,
          });
          (
            context.menuElem.ownerGlobal as _ZoteroTypes.MainWindow
          ).Zotero_Tabs.close(context.tabID);
        },
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-openNoteAsBNWindow`,
    pluginID: config.addonID,
    target: "main/library/item",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menu-openNoteAsBNWindow`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onShowing: (_, context) => {
          context.setVisible(!!context.items?.every((item) => item.isNote()));
        },
        onCommand: (_, context) => {
          if (!context.items?.length) {
            return;
          }
          addon.hooks.onOpenNote(context.items[0].id, "window", {
            forceTakeover: true,
          });
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuItem-openInObsidian`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onShowing: (_, context) => {
          context.setVisible(
            context.items?.length === 1 &&
              context.items[0].isRegularItem() &&
              Boolean(getManagedObsidianNoteForItem(context.items[0])),
          );
        },
        onCommand: (_, context) => {
          if (!context.items?.length) {
            return;
          }
          void addon.hooks.onOpenItemsInObsidian(context.items as Zotero.Item[]);
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuItem-syncSelectedToObsidian`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onShowing: (_, context) => {
          context.setVisible(
            !!context.items?.length &&
              context.items.every((item) => item.isRegularItem()),
          );
        },
        onCommand: () => {
          addon.hooks.onSyncSelectedItemsToObsidian();
        },
      },
    ],
  });
}
