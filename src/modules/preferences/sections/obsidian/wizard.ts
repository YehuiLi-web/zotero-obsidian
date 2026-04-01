// ── Obsidian Setup Wizard ──
// Handles vault auto-detection and the guided setup wizard flow.

import { showHint } from "../../../../utils/hint";
import { getPref, setPref } from "../../../../utils/prefs";
import {
  DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
  OBSIDIAN_SETUP_WIZARD_SHOWN_PREF,
} from "../../../obsidian/constants";
import {
  deriveObsidianPathDefaults,
  isObsidianConfigured,
  writeObsidianConnectionTestFile,
  getBooleanPrefOrDefault,
} from "../../../obsidian/settings";
import { cleanInline } from "../../../obsidian/shared";
import { getLastPathSegment } from "../../../obsidian/paths";
import {
  obsidianSetupWizardPromise,
  setObsidianSetupWizardPromise,
} from "./state";
import {
  applyObsidianSetupDraft,
  buildCurrentObsidianSetupDraft,
  chooseDetectedObsidianVault,
  confirmObsidianVaultRoot,
  getObsidianPromptWindow,
  pickObsidianFolderManually,
  promptChoice,
  uiText,
} from "./helpers";

// forward declared – populated at runtime to avoid circular dep
let _refreshObsidianPrefsUI: (() => void) | null = null;
let _renderSyncSummary: (() => void) | null = null;
let _markPreviewStale: (() => void) | null = null;
let _chooseObsidianItemTemplate: ((t: string) => Promise<string>) | null = null;

export function initWizardCallbacks(cbs: {
  refreshObsidianPrefsUI: () => void;
  renderSyncSummary: () => void;
  markPreviewStale: () => void;
  chooseObsidianItemTemplate: (t: string) => Promise<string>;
}) {
  _refreshObsidianPrefsUI = cbs.refreshObsidianPrefsUI;
  _renderSyncSummary = cbs.renderSyncSummary;
  _markPreviewStale = cbs.markPreviewStale;
  _chooseObsidianItemTemplate = cbs.chooseObsidianItemTemplate;
}

export async function autoDetectObsidianVault(
  options: { promptWindow?: Window | null; allowManualFallback?: boolean } = {},
) {
  const promptWindow = getObsidianPromptWindow(options.promptWindow);
  const detectedVault = await chooseDetectedObsidianVault(promptWindow);
  if (detectedVault) {
    const defaults = deriveObsidianPathDefaults(detectedVault.path);
    applyObsidianSetupDraft(
      {
        ...buildCurrentObsidianSetupDraft(),
        vaultRoot: detectedVault.path,
        notesDir: defaults.notesDir,
        assetsDir: defaults.assetsDir,
        dashboardDir: defaults.dashboardDir,
      },
      { overwriteExisting: false },
    );
    _refreshObsidianPrefsUI?.();
    showHint(
      uiText(
        `已检测并设置 Vault：${detectedVault.name}。`,
        `Detected and set vault: ${detectedVault.name}.`,
      ),
    );
    return true;
  }

  if (!options.allowManualFallback) {
    showHint(
      uiText(
        "没有在常见位置找到 Obsidian vault。",
        "No Obsidian vault was found in common locations.",
      ),
    );
    return false;
  }

  const pickedVaultRoot = await pickObsidianFolderManually(
    uiText("手动选择 Obsidian Vault", "Choose Obsidian Vault"),
    cleanInline(String(getPref("obsidian.vaultRoot") || "")),
    promptWindow,
  );
  if (!pickedVaultRoot) {
    return false;
  }
  if (!(await confirmObsidianVaultRoot(pickedVaultRoot, promptWindow))) {
    return false;
  }

  const defaults = deriveObsidianPathDefaults(pickedVaultRoot);
  applyObsidianSetupDraft(
    {
      ...buildCurrentObsidianSetupDraft(),
      vaultRoot: pickedVaultRoot,
      notesDir: defaults.notesDir,
      assetsDir: defaults.assetsDir,
      dashboardDir: defaults.dashboardDir,
    },
    { overwriteExisting: false },
  );
  _refreshObsidianPrefsUI?.();
  showHint(
    uiText(
      `已手动设置 Vault：${getLastPathSegment(pickedVaultRoot) || pickedVaultRoot}。`,
      `Vault set to ${getLastPathSegment(pickedVaultRoot) || pickedVaultRoot}.`,
    ),
  );
  return true;
}

export async function runObsidianSetupWizard(
  options: { autoTriggered?: boolean; promptWindow?: Window | null } = {},
) {
  if (obsidianSetupWizardPromise) {
    return obsidianSetupWizardPromise;
  }

  setObsidianSetupWizardPromise((async () => {
    const promptWindow = getObsidianPromptWindow(options.promptWindow);
    const currentDraft = buildCurrentObsidianSetupDraft();
    let vaultRoot = currentDraft.vaultRoot;

    const detectedVault = await chooseDetectedObsidianVault(promptWindow);
    if (detectedVault) {
      vaultRoot = detectedVault.path;
    } else {
      const pickedVaultRoot = await pickObsidianFolderManually(
        uiText("选择 Obsidian Vault", "Choose Obsidian Vault"),
        currentDraft.vaultRoot,
        promptWindow,
      );
      if (!pickedVaultRoot) {
        return false;
      }
      if (!(await confirmObsidianVaultRoot(pickedVaultRoot, promptWindow))) {
        return false;
      }
      vaultRoot = pickedVaultRoot;
    }

    const defaults = deriveObsidianPathDefaults(vaultRoot);
    let notesDir = defaults.notesDir;
    let dashboardDir = defaults.dashboardDir;
    let dashboardAutoSetup = true;
    let selectedTemplate =
      currentDraft.itemTemplate || DEFAULT_OBSIDIAN_ITEM_TEMPLATE;

    const notesChoice = promptChoice({
      title: uiText("配置文献笔记目录", "Choose Literature Notes Folder"),
      text: uiText(
        `推荐把文献笔记放在：\n${defaults.notesDir}\n\n是否使用这个推荐位置？`,
        `Recommended literature notes folder:\n${defaults.notesDir}\n\nUse this recommended location?`,
      ),
      buttons: [
        uiText("使用推荐位置", "Use Recommended"),
        uiText("自定义目录", "Choose Custom"),
        uiText("取消向导", "Cancel Wizard"),
      ],
      window: promptWindow,
    });
    if (notesChoice === 2) {
      return false;
    }
    if (notesChoice === 1) {
      notesDir =
        (await pickObsidianFolderManually(
          uiText("选择文献笔记目录", "Choose Literature Notes Folder"),
          defaults.notesDir,
          promptWindow,
        )) || defaults.notesDir;
    }

    const templateChoice = promptChoice({
      title: uiText("配置文献模板", "Choose Literature Template"),
      text: uiText(
        `推荐模板：${DEFAULT_OBSIDIAN_ITEM_TEMPLATE}\n当前模板：${currentDraft.itemTemplate || DEFAULT_OBSIDIAN_ITEM_TEMPLATE}`,
        `Recommended template: ${DEFAULT_OBSIDIAN_ITEM_TEMPLATE}\nCurrent template: ${currentDraft.itemTemplate || DEFAULT_OBSIDIAN_ITEM_TEMPLATE}`,
      ),
      buttons: [
        uiText("使用推荐模板", "Use Recommended"),
        uiText("选择其他模板", "Choose Another"),
        uiText("保留当前", "Keep Current"),
      ],
      window: promptWindow,
    });
    if (templateChoice === 0) {
      selectedTemplate = DEFAULT_OBSIDIAN_ITEM_TEMPLATE;
    } else if (templateChoice === 1) {
      selectedTemplate =
        (await _chooseObsidianItemTemplate?.(selectedTemplate)) ||
        selectedTemplate;
    }

    const dashboardChoice = promptChoice({
      title: uiText("配置 Dashboard", "Choose Dashboard Setup"),
      text: uiText(
        `推荐 Dashboard 目录：\n${defaults.dashboardDir}\n\n是否启用并自动生成 Dashboard？`,
        `Recommended dashboard folder:\n${defaults.dashboardDir}\n\nEnable and auto-generate dashboards?`,
      ),
      buttons: [
        uiText("启用推荐目录", "Enable Recommended"),
        uiText("自定义目录", "Choose Custom"),
        uiText("暂不启用", "Skip for Now"),
      ],
      window: promptWindow,
    });
    if (dashboardChoice === 1) {
      dashboardDir =
        (await pickObsidianFolderManually(
          uiText("选择 Dashboard 目录", "Choose Dashboard Folder"),
          defaults.dashboardDir,
          promptWindow,
        )) || defaults.dashboardDir;
      dashboardAutoSetup = true;
    } else if (dashboardChoice === 2) {
      dashboardDir = defaults.dashboardDir;
      dashboardAutoSetup = false;
    }

    applyObsidianSetupDraft(
      {
        vaultRoot,
        notesDir,
        assetsDir: defaults.assetsDir,
        dashboardDir,
        dashboardAutoSetup,
        itemTemplate: selectedTemplate,
      },
      { overwriteExisting: true },
    );
    setPref(OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, true);
    _refreshObsidianPrefsUI?.();
    _renderSyncSummary?.();
    _markPreviewStale?.();

    try {
      const result = await writeObsidianConnectionTestFile();
      showHint(
        uiText(
          `配置完成，已写入测试文件 ${result.fileName}。`,
          `Setup completed and wrote test file ${result.fileName}.`,
        ),
      );
    } catch (error) {
      showHint(
        cleanInline((error as Error)?.message || "") ||
          uiText(
            "配置已保存，但连接测试失败，请检查路径和权限。",
            "Setup was saved, but the connection test failed. Check the paths and permissions.",
          ),
      );
    }

    return true;
  })().finally(() => {
    setObsidianSetupWizardPromise(null);
  }));

  return obsidianSetupWizardPromise;
}

export async function maybeAutoRunObsidianSetupWizard(
  win?: _ZoteroTypes.MainWindow | null,
) {
  const normalizedProfileDir = cleanInline(
    String((Zotero as any).profileDir || ""),
  )
    .replace(/\\/g, "/")
    .toLowerCase();
  if (
    (Zotero as any).automatedTest ||
    normalizedProfileDir.includes("/.scaffold/test/profile")
  ) {
    return false;
  }
  const prefsWindow = addon.data.prefs?.window || null;
  if (win && win !== Zotero.getMainWindow() && win !== prefsWindow) {
    return false;
  }
  if (
    isObsidianConfigured() ||
    getBooleanPrefOrDefault(OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, false)
  ) {
    return false;
  }

  setPref(OBSIDIAN_SETUP_WIZARD_SHOWN_PREF, true);
  const index = promptChoice({
    title: uiText("首次配置 Obsidian", "Set Up Obsidian"),
    text: uiText(
      "检测到你还没有配置 Obsidian Vault。是否现在启动快速配置向导？",
      "It looks like Obsidian has not been configured yet. Start the quick setup wizard now?",
    ),
    buttons: [uiText("开始配置", "Start Setup"), uiText("稍后再说", "Later")],
    window: win || null,
  });
  if (index !== 0) {
    return false;
  }

  return runObsidianSetupWizard({
    autoTriggered: true,
    promptWindow: win || null,
  });
}
