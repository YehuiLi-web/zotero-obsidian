(function () {
  let initialized = false;

  function getSettingsRoot() {
    return document.getElementById("__addonRef__-obsidian-settingsRoot");
  }

  function renderError(message) {
    try {
      const root = getSettingsRoot();
      if (root) {
        root.textContent = message;
      }
    } catch (error) {}
  }

  async function init() {
    if (initialized) {
      return;
    }
    initialized = true;
    try {
      const plugin = Zotero.__addonInstance__;
      if (
        !plugin ||
        !plugin.hooks ||
        typeof plugin.hooks.onPrefsEvent !== "function"
      ) {
        renderError("Obsidian Bridge settings failed to initialize.");
        return;
      }
      await plugin.hooks.onPrefsEvent("load", { window });
    } catch (error) {
      try {
        if (typeof Zotero.logError === "function") {
          Zotero.logError(error);
        }
      } catch (logError) {}
      renderError(
        (error && error.message) ||
          "Obsidian Bridge settings failed to initialize.",
      );
    }
  }

  window.__addonRef__PrefsPane = {
    init,
  };

  if (
    document.readyState === "interactive" ||
    document.readyState === "complete"
  ) {
    window.setTimeout(() => {
      void init();
    }, 0);
  } else {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        void init();
      },
      { once: true },
    );
    window.addEventListener(
      "load",
      () => {
        void init();
      },
      { once: true },
    );
  }
})();
