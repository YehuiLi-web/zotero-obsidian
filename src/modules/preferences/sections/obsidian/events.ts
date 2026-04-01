import { getPref, setPref } from "../../../../utils/prefs";
import { formatPath } from "../../../../utils/str";
import {
  DEFAULT_CHILD_NOTE_TAGS,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
  OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
  OBSIDIAN_CHILD_NOTE_TAGS_PREF,
} from "../../../obsidian/childNotes";
import { setupObsidianDashboards } from "../../../obsidian/dashboard";
import {
  repairObsidianManagedLinks,
  resyncAllManagedObsidianNotes,
  syncSelectedItemsToObsidian,
} from "../../../obsidian/sync";
import { cleanInline } from "../../../obsidian/shared";
import {
  normalizeObsidianSyncScope,
  normalizeObsidianUpdateStrategy,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
  OBSIDIAN_DASHBOARD_DIR_PREF,
  OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID,
  OBSIDIAN_INCLUDE_ABSTRACT_PREF,
  OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID,
  OBSIDIAN_INCLUDE_ANNOTATIONS_PREF,
  OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID,
  OBSIDIAN_INCLUDE_CHILD_NOTES_PREF,
  OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID,
  OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF,
  OBSIDIAN_INCLUDE_METADATA_INPUT_ID,
  OBSIDIAN_INCLUDE_METADATA_PREF,
  OBSIDIAN_SYNC_SCOPE_PREF,
  OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
  OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF,
  OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID,
  OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF,
  OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
  OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF,
  OBSIDIAN_UPDATE_STRATEGY_PREF,
} from "../../../obsidian/settings";
import { type ObsidianPrefsTab } from "./state";
import {
  OBSIDIAN_APP_PATH_INPUT_ID,
  OBSIDIAN_ASSETS_DIR_INPUT_ID,
  OBSIDIAN_AUTO_SYNC_INPUT_ID,
  OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  OBSIDIAN_NOTES_DIR_INPUT_ID,
  OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
  OBSIDIAN_PREVIEW_TRIGGER_ID,
  OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
  OBSIDIAN_SYNC_SCOPE_GROUP_NAME,
  OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME,
  OBSIDIAN_VAULT_ROOT_INPUT_ID,
  OBSIDIAN_WATCH_FILES_INPUT_ID,
} from "./uiIds";
import {
  getObsidianResolvedPaths,
  getObsidianSettingsRoot,
  getPrefElement,
  uiText,
} from "./helpers";
import {
  getObsidianTooltipText,
  ensureObsidianTooltipNode,
  positionObsidianTooltip,
} from "./render";
import { testObsidianConnection, updateConnectionDiagnostics } from "./connection";
import {
  markPreviewStale,
  renderContentSummary,
  renderSyncSummary,
  switchObsidianPrefsTab,
} from "./preview";
import { showObsidianPreviewWindow } from "./previewWindow";
import {
  showChildNoteRulesDialog,
  showFieldStudio,
} from "./fieldStudioWindow";

export function bindObsidianPrefsEvents(
  prefDoc: Document,
  callbacks: {
    autoDetectObsidianVault: (options?: {
      promptWindow?: Window | null;
      allowManualFallback?: boolean;
    }) => Promise<boolean>;
    pickObsidianItemTemplate: () => Promise<void>;
    pickObsidianPath: (
      prefKey: string,
      mode: "open" | "folder",
      inputId: string,
    ) => Promise<void>;
    refreshObsidianPrefsUI: () => void;
    runObsidianSetupWizard: (options?: {
      autoTriggered?: boolean;
      promptWindow?: Window | null;
    }) => Promise<boolean | null>;
  },
) {
  const root = getObsidianSettingsRoot(prefDoc);
  if (!root) {
    return;
  }

  const tooltipNode = ensureObsidianTooltipNode(prefDoc);
  let activeTooltipTarget: HTMLElement | null = null;

  const hideTooltip = () => {
    if (!tooltipNode) {
      return;
    }
    tooltipNode.dataset.show = "false";
    tooltipNode.setAttribute("aria-hidden", "true");
    if (activeTooltipTarget) {
      activeTooltipTarget.removeAttribute("aria-describedby");
    }
    activeTooltipTarget = null;
  };

  const showTooltip = (target: HTMLElement) => {
    if (!tooltipNode) {
      return;
    }
    const tooltipText = getObsidianTooltipText(target.dataset.obTooltip || "");
    if (!tooltipText) {
      hideTooltip();
      return;
    }
    tooltipNode.textContent = tooltipText;
    tooltipNode.dataset.show = "true";
    tooltipNode.setAttribute("aria-hidden", "false");
    if (activeTooltipTarget && activeTooltipTarget !== target) {
      activeTooltipTarget.removeAttribute("aria-describedby");
    }
    activeTooltipTarget = target;
    target.setAttribute("aria-describedby", tooltipNode.id);
    positionObsidianTooltip(tooltipNode, target, prefDoc);
  };

  root.querySelectorAll<HTMLElement>("[data-ob-tooltip]").forEach((target) => {
    target.addEventListener("mouseenter", () => {
      showTooltip(target);
    });
    target.addEventListener("mouseleave", hideTooltip);
  });
  if (prefDoc.documentElement.dataset.obPrefsGlobalBound !== "true") {
    prefDoc.defaultView?.addEventListener("resize", hideTooltip);
    prefDoc.addEventListener("scroll", hideTooltip, true);
    prefDoc.documentElement.dataset.obPrefsGlobalBound = "true";
  }

  const bindBooleanPref = (
    inputId: string,
    prefKey: string,
    onChange?: () => void,
  ) => {
    const input = getPrefElement<HTMLInputElement>(inputId);
    if (!input) {
      return;
    }
    input.addEventListener("change", () => {
      setPref(prefKey, input.checked);
      onChange?.();
    });
  };

  const syncTranslationOptionState = () => {
    const enabled =
      getPrefElement<HTMLInputElement>(OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID)
        ?.checked || false;
    [
      OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
      OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
    ].forEach((inputId) => {
      const input = getPrefElement<HTMLInputElement>(inputId);
      if (input) {
        input.disabled = !enabled;
      }
    });
    root
      .querySelectorAll<HTMLElement>('[data-ob-role="translation-options"]')
      .forEach((element) => {
        element.hidden = !enabled;
      });
  };

  const syncChildNoteConfigState = () => {
    const enabled =
      getPrefElement<HTMLInputElement>(OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID)
        ?.checked || false;
    root
      .querySelectorAll<HTMLElement>('[data-ob-role="child-note-config"]')
      .forEach((element) => {
        element.hidden = !enabled;
      });
  };

  const bindPathInput = (
    inputId: string,
    prefKey: string,
    getDefaultValue: () => string,
    onChange?: () => void,
  ) => {
    const input = getPrefElement<HTMLInputElement>(inputId);
    if (!input) {
      return;
    }
    const persist = () => {
      const normalized = formatPath(input.value);
      const defaultValue = getDefaultValue();
      if (!cleanInline(normalized) || normalized === defaultValue) {
        setPref(prefKey, "");
        input.value = defaultValue;
      } else {
        setPref(prefKey, normalized);
      }
      onChange?.();
    };
    input.addEventListener("change", persist);
    input.addEventListener("blur", persist);
  };

  root.querySelectorAll<HTMLElement>("[data-ob-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      switchObsidianPrefsTab(button.dataset.obTab as ObsidianPrefsTab);
    });
  });

  bindPathInput(OBSIDIAN_APP_PATH_INPUT_ID, "obsidian.appPath", () => "", () => {
    void updateConnectionDiagnostics();
  });
  bindPathInput(OBSIDIAN_VAULT_ROOT_INPUT_ID, "obsidian.vaultRoot", () => "", () => {
    void updateConnectionDiagnostics();
    markPreviewStale();
  });
  bindPathInput(
    OBSIDIAN_NOTES_DIR_INPUT_ID,
    "obsidian.notesDir",
    () => getObsidianResolvedPaths().notesDir,
    () => {
      void updateConnectionDiagnostics();
      renderSyncSummary();
      markPreviewStale();
    },
  );
  bindPathInput(
    OBSIDIAN_ASSETS_DIR_INPUT_ID,
    "obsidian.assetsDir",
    () => getObsidianResolvedPaths().assetsDir,
    () => {
      void updateConnectionDiagnostics();
      markPreviewStale();
    },
  );
  bindPathInput(
    OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
    OBSIDIAN_DASHBOARD_DIR_PREF,
    () => getObsidianResolvedPaths().dashboardDir,
    () => {
      void updateConnectionDiagnostics();
    },
  );

  root
    .querySelectorAll<HTMLInputElement>(
      `input[name="${OBSIDIAN_SYNC_SCOPE_GROUP_NAME}"]`,
    )
    .forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        setPref(
          OBSIDIAN_SYNC_SCOPE_PREF,
          normalizeObsidianSyncScope(input.value),
        );
        renderSyncSummary();
      });
    });

  root
    .querySelectorAll<HTMLInputElement>(
      `input[name="${OBSIDIAN_UPDATE_STRATEGY_GROUP_NAME}"]`,
    )
    .forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        setPref(
          OBSIDIAN_UPDATE_STRATEGY_PREF,
          normalizeObsidianUpdateStrategy(input.value),
        );
        renderSyncSummary();
        markPreviewStale();
      });
    });

  bindBooleanPref(
    OBSIDIAN_INCLUDE_METADATA_INPUT_ID,
    OBSIDIAN_INCLUDE_METADATA_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_INCLUDE_ABSTRACT_INPUT_ID,
    OBSIDIAN_INCLUDE_ABSTRACT_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_INCLUDE_ANNOTATIONS_INPUT_ID,
    OBSIDIAN_INCLUDE_ANNOTATIONS_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_INCLUDE_HIDDEN_INFO_INPUT_ID,
    OBSIDIAN_INCLUDE_HIDDEN_INFO_PREF,
    () => {
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_INCLUDE_CHILD_NOTES_INPUT_ID,
    OBSIDIAN_INCLUDE_CHILD_NOTES_PREF,
    () => {
      syncChildNoteConfigState();
      renderContentSummary();
      markPreviewStale();
    },
  );
  bindBooleanPref(
    OBSIDIAN_TRANSLATE_MISSING_METADATA_INPUT_ID,
    OBSIDIAN_TRANSLATE_MISSING_METADATA_PREF,
    () => {
      syncTranslationOptionState();
      renderSyncSummary();
    },
  );
  bindBooleanPref(
    OBSIDIAN_TRANSLATE_MISSING_TITLE_INPUT_ID,
    OBSIDIAN_TRANSLATE_MISSING_TITLE_PREF,
    () => {
      renderSyncSummary();
    },
  );
  bindBooleanPref(
    OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_INPUT_ID,
    OBSIDIAN_TRANSLATE_MISSING_ABSTRACT_PREF,
    () => {
      renderSyncSummary();
    },
  );
  bindBooleanPref(OBSIDIAN_AUTO_SYNC_INPUT_ID, "obsidian.autoSync", () => {
    renderSyncSummary();
  });
  bindBooleanPref(OBSIDIAN_WATCH_FILES_INPUT_ID, "obsidian.watchFiles", () => {
    renderSyncSummary();
  });
  bindBooleanPref(
    OBSIDIAN_OPEN_AFTER_SYNC_INPUT_ID,
    "obsidian.openAfterSync",
    () => {
      renderSyncSummary();
      void updateConnectionDiagnostics();
    },
  );
  bindBooleanPref(
    OBSIDIAN_REVEAL_AFTER_SYNC_INPUT_ID,
    "obsidian.revealAfterSync",
    () => {
      renderSyncSummary();
    },
  );
  bindBooleanPref(
    OBSIDIAN_DASHBOARD_AUTO_SETUP_INPUT_ID,
    OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  );
  bindBooleanPref(
    OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_INPUT_ID,
    OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
    () => {
      markPreviewStale();
    },
  );

  const childNoteTagsInput = getPrefElement<HTMLInputElement>(
    OBSIDIAN_CHILD_NOTE_TAGS_INPUT_ID,
  );
  if (childNoteTagsInput) {
    childNoteTagsInput.placeholder = uiText(
      "例如：ai-summary, ai-reading",
      "e.g. ai-summary, ai-reading",
    );
    childNoteTagsInput.addEventListener("change", () => {
      setPref(OBSIDIAN_CHILD_NOTE_TAGS_PREF, childNoteTagsInput.value.trim());
      markPreviewStale();
    });
  }

  root
    .querySelector<HTMLElement>('[data-ob-action="pick-app"]')
    ?.addEventListener("click", async () => {
      await callbacks.pickObsidianPath(
        "obsidian.appPath",
        "open",
        OBSIDIAN_APP_PATH_INPUT_ID,
      );
      callbacks.refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-vault"]')
    ?.addEventListener("click", async () => {
      await callbacks.pickObsidianPath(
        "obsidian.vaultRoot",
        "folder",
        OBSIDIAN_VAULT_ROOT_INPUT_ID,
      );
      callbacks.refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="detect-vault"]')
    ?.addEventListener("click", async () => {
      await callbacks.autoDetectObsidianVault({ allowManualFallback: true });
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="run-setup-wizard"]')
    ?.addEventListener("click", async () => {
      await callbacks.runObsidianSetupWizard();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-notes"]')
    ?.addEventListener("click", async () => {
      await callbacks.pickObsidianPath(
        "obsidian.notesDir",
        "folder",
        OBSIDIAN_NOTES_DIR_INPUT_ID,
      );
      callbacks.refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-assets"]')
    ?.addEventListener("click", async () => {
      await callbacks.pickObsidianPath(
        "obsidian.assetsDir",
        "folder",
        OBSIDIAN_ASSETS_DIR_INPUT_ID,
      );
      callbacks.refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-dashboard"]')
    ?.addEventListener("click", async () => {
      await callbacks.pickObsidianPath(
        OBSIDIAN_DASHBOARD_DIR_PREF,
        "folder",
        OBSIDIAN_DASHBOARD_DIR_INPUT_ID,
      );
      callbacks.refreshObsidianPrefsUI();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="pick-template"]')
    ?.addEventListener("click", async () => {
      await callbacks.pickObsidianItemTemplate();
      markPreviewStale();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="edit-template"]')
    ?.addEventListener("click", () => {
      addon.hooks.onShowTemplateEditor();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="sync-now"]')
    ?.addEventListener("click", async () => {
      await syncSelectedItemsToObsidian();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="open-note-design"]')
    ?.addEventListener("click", () => {
      switchObsidianPrefsTab("noteDesign");
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="setup-dashboard"]')
    ?.addEventListener("click", async () => {
      await setupObsidianDashboards();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="repair-links"]')
    ?.addEventListener("click", async () => {
      await repairObsidianManagedLinks();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="resync-managed"]')
    ?.addEventListener("click", async () => {
      await resyncAllManagedObsidianNotes();
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="open-field-studio-frontmatter"]')
    ?.addEventListener("click", async () => {
      await showFieldStudio({
        tab: "frontmatter",
        refreshObsidianPrefsUI: callbacks.refreshObsidianPrefsUI,
        markPreviewStale,
      });
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="open-field-studio-metadata"]')
    ?.addEventListener("click", async () => {
      await showFieldStudio({
        tab: "metadata",
        refreshObsidianPrefsUI: callbacks.refreshObsidianPrefsUI,
        markPreviewStale,
      });
    });
  root
    .querySelector<HTMLElement>('[data-ob-action="open-child-note-rules"]')
    ?.addEventListener("click", async () => {
      await showChildNoteRulesDialog({
        refreshObsidianPrefsUI: callbacks.refreshObsidianPrefsUI,
        markPreviewStale,
      });
    });

  getPrefElement<HTMLButtonElement>(
    OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  )?.addEventListener("click", async () => {
    await testObsidianConnection();
  });
  getPrefElement<HTMLButtonElement>(
    OBSIDIAN_PREVIEW_TRIGGER_ID,
  )?.addEventListener("click", async () => {
    await showObsidianPreviewWindow();
  });

  syncTranslationOptionState();
  syncChildNoteConfigState();
}
