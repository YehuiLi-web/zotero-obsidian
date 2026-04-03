import { VirtualizedTableHelper } from "zotero-plugin-toolkit";
import { LargePrefHelper } from "zotero-plugin-toolkit";

import {
  SyncDataType,
  SyncHistoryDataType,
} from "./modules/sync/managerWindow";
import type { TemplateStore } from "./modules/template/store";
import hooks from "./hooks";
import api from "./api";
import { createZToolkit } from "./utils/ztoolkit";
import { MessageHelper } from "zotero-plugin-toolkit/dist/helpers/message";
import type { handlers as parsingHandlers } from "./extras/parsingWorker";
import type { handlers as relationHandlers } from "./extras/relationWorker";
import type { handlers as convertHandlers } from "./extras/convertWorker/main";

class Addon {
  public data: {
    uid: string;
    alive: boolean;
    env: "development" | "production" | "test";
    initialized?: boolean;
    ztoolkit: ZToolkit;
    // ztoolkit: ZoteroToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
    };
    export: {
      pdf: { promise?: _ZoteroTypes.Promise.PromiseObject };
    };
    sync: {
      data?: LargePrefHelper;
      historyData?: LargePrefHelper;
      lock: boolean;
      manager: {
        window?: Window;
        tableHelper?: VirtualizedTableHelper;
        historyTableHelper?: VirtualizedTableHelper;
        data: SyncDataType[];
        historyData: SyncHistoryDataType[];
        columnIndex: number;
        columnAscending: boolean;
      };
      diff: {
        window?: Window;
      };
      watcher: {
        timer?: ReturnType<typeof setInterval>;
        knownModifiedTimes: Record<number, number>;
        pendingChanges: Record<number, number>;
        processing: number[];
      };
    };
    notify: Array<Parameters<_ZoteroTypes.Notifier.Notify>>;
    workspace: {
      instances: Record<string, WeakRef<HTMLElement>>;
    };
    obsidian: {
      itemNoteMap?: Record<string, string>;
      managedPathRegistry?: Record<
        string,
        import("./modules/obsidian/types").ManagedPathRegistryEntry
      >;
      managedNoteRegistry?: Record<
        string,
        import("./modules/obsidian/types").ManagedNoteRegistryEntry
      >;
      metadataPresetLibrary?: any;
    };
    imageViewer: {
      window?: Window;
      srcList: string[];
      idx: number;
      scaling: number;
      title: string;
      pined: boolean;
      anchorPosition?: {
        left: number;
        top: number;
      };
    };
    template: {
      data?: TemplateStore;
      editor: {
        window?: Window;
        tableHelper?: VirtualizedTableHelper;
        editor?: any;
        monaco?: any;
        templates: string[];
      };
      picker: {
        mode: "insert" | "create" | "export" | "pick";
        data: Record<string, any>;
      };
    };
    relation: {
      worker?: Worker;
      server?: MessageHelper<typeof relationHandlers>;
    };
    parsing: {
      server?: MessageHelper<typeof parsingHandlers>;
    };
    convert: {
      server?: MessageHelper<typeof convertHandlers>;
    };
    imageCache: Record<number, string>;
    hint: {
      silent: boolean;
    };
  } = {
    uid: Zotero.Utilities.randomString(8),
    alive: true,
    env: __env__,
    ztoolkit: createZToolkit(),
    // ztoolkit: new ZoteroToolkit(),
    export: {
      pdf: { promise: undefined },
    },
    sync: {
      lock: false,
      manager: {
        data: [],
        historyData: [],
        columnAscending: true,
        columnIndex: 0,
      },
      diff: {},
      watcher: {
        knownModifiedTimes: {},
        pendingChanges: {},
        processing: [],
      },
    },
    notify: [],
    workspace: {
      instances: {},
    },
    obsidian: {},
    imageViewer: {
      window: undefined,
      srcList: [],
      idx: -1,
      scaling: 1,
      title: "Note",
      pined: false,
      anchorPosition: undefined,
    },
    template: {
      editor: {
        window: undefined,
        tableHelper: undefined,
        templates: [],
      },
      picker: {
        mode: "insert",
        data: {},
      },
    },
    relation: {},
    parsing: {},
    convert: {},
    imageCache: {},
    hint: {
      silent: false,
    },
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: typeof api;

  constructor() {
    this.hooks = hooks;
    this.api = api;
  }
}

export default Addon;
