/**
 * Zotero runtime type stubs for APIs not covered by zotero-types.
 *
 * These declarations supplement the existing zotero-types package with
 * Firefox/Gecko platform APIs and Zotero extension points that are only
 * available at runtime inside the Zotero sandbox.
 *
 * NOTE: Do NOT redeclare Zotero.Items / Zotero.ItemTypes here — they are
 * already provided by zotero-types and namespace redeclaration would shadow
 * the existing (richer) type definitions.
 */

// ── Zotero extension points not in zotero-types ──

declare namespace Zotero {
  /** Open a URL in the default browser (Zotero 7+). */
  const launchURL: ((uri: string) => void) | undefined;
  /** Absolute path to the active Zotero profile directory. */
  const profileDir: string | undefined;
  /** True when running inside the automated test harness. */
  const automatedTest: boolean | undefined;
  /** BCP-47 locale tag of the running Zotero instance (e.g. "en-US"). */
  const locale: string | undefined;
}

// ── Firefox / Gecko platform globals ──

declare const IOUtils: {
  exists(path: string): Promise<boolean>;
  read(
    path: string,
    options?: { decompress?: boolean; maxBytes?: number },
  ): Promise<Uint8Array>;
  readUTF8(
    path: string,
    options?: { maxBytes?: number },
  ): Promise<string>;
  write(path: string, data: Uint8Array): Promise<number>;
  writeUTF8(path: string, data: string): Promise<number>;
  stat(
    path: string,
  ): Promise<{ type: string; size: number; lastModified: number }>;
  getChildren(path: string): Promise<string[]>;
  move(from: string, to: string): Promise<void>;
  remove(path: string, options?: { recursive?: boolean }): Promise<void>;
  makeDirectory(
    path: string,
    options?: { createAncestors?: boolean },
  ): Promise<void>;
};

declare const PathUtils: {
  split(path: string): string[];
  join(...parts: string[]): string;
  parent(path: string): string | null;
  filename(path: string): string;
  isAbsolute(path: string): boolean;
  homeDir: string;
  profileDir: string;
  tempDir: string;
};

declare namespace Services {
  const dirsvc: {
    get(key: string, iface: unknown): { path: string };
  };

  const prompt: {
    BUTTON_POS_0: number;
    BUTTON_POS_1: number;
    BUTTON_POS_2: number;
    BUTTON_POS_0_DEFAULT: number;
    BUTTON_POS_1_DEFAULT: number;
    BUTTON_POS_2_DEFAULT: number;
    BUTTON_TITLE_IS_STRING: number;
    [key: string]: unknown;

    confirmEx(
      parent: Window | null,
      title: string,
      text: string,
      buttonFlags: number,
      button0Title: string | null,
      button1Title: string | null,
      button2Title: string | null,
      checkMsg: string | null,
      checkState: Record<string, unknown>,
    ): number;

    alert(parent: Window | null, title: string, text: string): void;

    confirm(parent: Window | null, title: string, text: string): boolean;

    select(
      parent: Window | null,
      title: string,
      text: string,
      count: number,
      labels: string[],
      selected: { value: number },
    ): boolean;
  };

  const locale: {
    appLocaleAsBCP47: string;
  };

  /** Script loader (Services.scriptloader). */
  const scriptloader: {
    loadSubScript(url: string, scope?: object): void;
  };

  /** Window watcher (Services.ww). */
  const ww: {
    getWindowEnumerator(): {
      hasMoreElements(): boolean;
      getNext(): Window;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    openWindow(...args: any[]): Window;
  };

  /** Window mediator (Services.wm). */
  const wm: {
    getMostRecentWindow(type: string | null): Window | null;
    getEnumerator(type: string | null): {
      hasMoreElements(): boolean;
      getNext(): Window;
    };
  };

  /** Preferences service (Services.prefs). */
  const prefs: {
    getStringPref(name: string, defaultValue?: string): string;
    setStringPref(name: string, value: string): void;
    getBoolPref(name: string, defaultValue?: boolean): boolean;
    setBoolPref(name: string, value: boolean): void;
    getIntPref(name: string, defaultValue?: number): number;
    setIntPref(name: string, value: number): void;
    clearUserPref(name: string): void;
  };
}

declare const Ci: {
  nsIFile: unknown;
  nsIProcess: unknown;
};

declare const Components: {
  classes: Record<
    string,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createInstance(iface: unknown): any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getService(iface: unknown): any;
    }
  >;
  interfaces: Record<string, unknown>;
  utils: {
    import(url: string): unknown;
    isDeadWrapper(obj: unknown): boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cloneInto(obj: unknown, scope: unknown, options?: unknown): any;
  };
};
