import { config } from "../../../../package.json";

export {};

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

// Load FTL immediately so Zotero's translateFragment() can resolve l10n IDs
// before init() is called. preferencesPane.js is loaded at preferences window
// open time (via the `scripts` option), which is before any pane is activated.
try {
  const MozXULEl = (window as any).MozXULElement;
  if (typeof MozXULEl?.insertFTLIfNeeded === "function") {
    MozXULEl.insertFTLIfNeeded(`${config.addonRef}-preferences.ftl`);
  }
} catch {
  // no-op
}

let initialized = false;

function renderError(message: string) {
  try {
    const root = document.getElementById(
      `${config.addonRef}-obsidian-settingsRoot`,
    );
    if (root) {
      root.textContent = message;
    }
  } catch {
    // no-op
  }
}

async function init() {
  if (initialized) {
    return;
  }
  initialized = true;
  try {
    const plugin = (Zotero as any)[config.addonInstance];
    if (
      !plugin ||
      !plugin.hooks ||
      typeof plugin.hooks.onPrefsEvent !== "function"
    ) {
      renderError("Preference window failed to initialize.");
      return;
    }
    await plugin.hooks.onPrefsEvent("load", { window });
  } catch (error) {
    try {
      Zotero.logError?.(error as Error);
    } catch {
      // ignore logging errors
    }
    renderError(
      (error as Error)?.message ||
        "Preference window failed to initialize.",
    );
  }
}

window[`${config.addonRef}PrefsPane`] = {
  init,
};

// Zotero may or may not call init() at the right time depending on the version.
// Use a MutationObserver to call init() ourselves as soon as our pane content
// (identified by data-bn-section="basic") appears in the document.
(function setupAutoInit() {
  const PANE_SELECTOR = '[data-bn-section="basic"]';

  function tryInit(): boolean {
    if (document.querySelector(PANE_SELECTOR)) {
      void init();
      return true;
    }
    return false;
  }

  if (tryInit()) return;

  const observer = new MutationObserver(() => {
    if (tryInit()) {
      observer.disconnect();
    }
  });

  const root = document.documentElement || document.body;
  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  }
})();
