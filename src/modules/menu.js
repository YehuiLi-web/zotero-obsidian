"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMenus = registerMenus;
const package_json_1 = require("../../package.json");
const obsidian_1 = require("./obsidian");
function registerMenus() {
    Zotero.MenuManager.registerMenu({
        menuID: `${package_json_1.config.addonRef}-menuTools`,
        pluginID: package_json_1.config.addonID,
        target: "main/menubar/tools",
        menus: [
            {
                menuType: "separator",
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuTools-syncManager`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => {
                    addon.hooks.onShowSyncManager();
                },
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuTools-templateEditor`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => {
                    addon.hooks.onShowTemplateEditor();
                },
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuTools-importTemplateFromClipboard`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => {
                    addon.hooks.onImportTemplateFromClipboard();
                },
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuTools-syncSelectedToObsidian`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => {
                    addon.hooks.onSyncSelectedItemsToObsidian();
                },
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuTools-setupObsidianDashboards`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => {
                    addon.hooks.onSetupObsidianDashboards();
                },
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuTools-repairObsidianManagedLinks`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => {
                    addon.hooks.onRepairObsidianManagedLinks();
                },
            },
        ],
    });
    Zotero.MenuManager.registerMenu({
        menuID: `${package_json_1.config.addonRef}-menuFile`,
        pluginID: package_json_1.config.addonID,
        target: "main/menubar/file",
        menus: [
            {
                menuType: "separator",
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuFile-exportTemplate`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => {
                    addon.hooks.onShowTemplatePicker("export");
                },
            },
        ],
    });
    Zotero.MenuManager.registerMenu({
        menuID: `${package_json_1.config.addonRef}-menuNewNote`,
        pluginID: package_json_1.config.addonID,
        target: "main/library/addNote",
        menus: [
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuAddNote-importMD`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => addon.hooks.onCreateNoteFromMD(),
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuAddNote-newTemplateItemNote`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => addon.hooks.onCreateNoteFromTemplate("item", "library"),
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuAddNote-newTemplateStandaloneNote`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => addon.hooks.onCreateNoteFromTemplate("standalone"),
            },
        ],
    });
    Zotero.MenuManager.registerMenu({
        menuID: `${package_json_1.config.addonRef}-menuHelp`,
        pluginID: package_json_1.config.addonID,
        target: "main/menubar/help",
        menus: [
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuHelp-openUserGuide`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => addon.hooks.onShowUserGuide(Zotero.getMainWindow(), true),
            },
        ],
    });
    Zotero.MenuManager.registerMenu({
        menuID: `${package_json_1.config.addonRef}-menuAddNotesPaneStandaloneNote`,
        pluginID: package_json_1.config.addonID,
        target: "notesPane/addStandaloneNote",
        menus: [
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuAddNote-newTemplateStandaloneNote`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => addon.hooks.onCreateNoteFromTemplate("standalone"),
            },
        ],
    });
    Zotero.MenuManager.registerMenu({
        menuID: `${package_json_1.config.addonRef}-menuAddNotesPaneItemNote`,
        pluginID: package_json_1.config.addonID,
        target: "notesPane/addItemNote",
        menus: [
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuAddNote-newTemplateItemNote`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onCommand: () => addon.hooks.onCreateNoteFromTemplate("item", "reader"),
            },
        ],
    });
    Zotero.MenuManager.registerMenu({
        menuID: `${package_json_1.config.addonRef}-menuTabMoveNewWindow`,
        pluginID: package_json_1.config.addonID,
        target: "main/tab",
        menus: [
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuTab-moveNewWindow`,
                onShowing(_, context) {
                    context.setVisible(context.tabType.startsWith("note"));
                },
                onCommand: (_, context) => {
                    addon.hooks.onOpenNote(context.items[0].id, "window", {
                        forceTakeover: true,
                    });
                    context.menuElem.ownerGlobal.Zotero_Tabs.close(context.tabID);
                },
            },
        ],
    });
    Zotero.MenuManager.registerMenu({
        menuID: `${package_json_1.config.addonRef}-openNoteAsBNWindow`,
        pluginID: package_json_1.config.addonID,
        target: "main/library/item",
        menus: [
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menu-openNoteAsBNWindow`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onShowing: (_, context) => {
                    var _a;
                    context.setVisible(!!((_a = context.items) === null || _a === void 0 ? void 0 : _a.every((item) => item.isNote())));
                },
                onCommand: (_, context) => {
                    var _a;
                    if (!((_a = context.items) === null || _a === void 0 ? void 0 : _a.length)) {
                        return;
                    }
                    addon.hooks.onOpenNote(context.items[0].id, "window", {
                        forceTakeover: true,
                    });
                },
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuItem-openInObsidian`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onShowing: (_, context) => {
                    var _a;
                    context.setVisible(((_a = context.items) === null || _a === void 0 ? void 0 : _a.length) === 1 &&
                        context.items[0].isRegularItem() &&
                        Boolean((0, obsidian_1.getManagedObsidianNoteForItem)(context.items[0])));
                },
                onCommand: (_, context) => {
                    var _a;
                    if (!((_a = context.items) === null || _a === void 0 ? void 0 : _a.length)) {
                        return;
                    }
                    void addon.hooks.onOpenItemsInObsidian(context.items);
                },
            },
            {
                menuType: "menuitem",
                l10nID: `${package_json_1.config.addonRef}-menuItem-syncSelectedToObsidian`,
                icon: `chrome://${package_json_1.config.addonRef}/content/icons/favicon.png`,
                onShowing: (_, context) => {
                    var _a;
                    context.setVisible(!!((_a = context.items) === null || _a === void 0 ? void 0 : _a.length) &&
                        context.items.every((item) => item.isRegularItem()));
                },
                onCommand: () => {
                    addon.hooks.onSyncSelectedItemsToObsidian();
                },
            },
        ],
    });
}
