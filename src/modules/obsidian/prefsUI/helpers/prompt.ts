import { getPref, setPref } from "../../../../utils/prefs";
import { formatPath } from "../../../../utils/str";
import {
  DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
  deriveObsidianPathDefaults,
  detectObsidianVaults,
  getBooleanPrefOrDefault,
  isObsidianVaultDirectory,
  type ObsidianDetectedVault,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  OBSIDIAN_DASHBOARD_DIR_PREF,
  OBSIDIAN_ITEM_TEMPLATE_PREF,
  resolveObsidianItemTemplateName,
} from "../../settings";
import { cleanInline } from "../../shared";
import { type ObsidianSetupDraft } from "../prefsUITypes";
import { uiText } from "./dom";

export function getObsidianPromptWindow(preferredWindow?: Window | null) {
  return preferredWindow || addon.data.prefs?.window || Zotero.getMainWindow();
}

function getPromptDefaultFlag(index = 0) {
  const prompt = Services.prompt as any;
  switch (index) {
    case 1:
      return prompt.BUTTON_POS_1_DEFAULT || 0;
    case 2:
      return prompt.BUTTON_POS_2_DEFAULT || 0;
    default:
      return prompt.BUTTON_POS_0_DEFAULT || 0;
  }
}

export function promptChoice(options: {
  title: string;
  text: string;
  buttons: string[];
  defaultButton?: number;
  window?: Window | null;
}) {
  const prompt = Services.prompt as any;
  const buttonFlags =
    options.buttons.reduce((flags, _label, index) => {
      const posKey = `BUTTON_POS_${index}`;
      return (
        flags + (prompt[posKey] || 0) * (prompt.BUTTON_TITLE_IS_STRING || 0)
      );
    }, 0) + getPromptDefaultFlag(options.defaultButton || 0);
  return prompt.confirmEx(
    getObsidianPromptWindow(options.window) as any,
    options.title,
    options.text,
    buttonFlags,
    options.buttons[0] || null,
    options.buttons[1] || null,
    options.buttons[2] || null,
    null,
    {},
  );
}

export function promptSelectIndex(options: {
  title: string;
  text: string;
  labels: string[];
  defaultIndex?: number;
  window?: Window | null;
}) {
  const prompt = Services.prompt as any;
  if (!options.labels.length) {
    return null;
  }
  if (options.labels.length === 1) {
    return 0;
  }
  if (typeof prompt.select !== "function") {
    return 0;
  }
  const selected = { value: options.defaultIndex || 0 };
  const accepted = prompt.select(
    getObsidianPromptWindow(options.window) as any,
    options.title,
    options.text,
    options.labels.length,
    options.labels,
    selected,
  );
  return accepted ? selected.value : null;
}

export async function pickObsidianFolderManually(
  title: string,
  currentValue = "",
  promptWindow?: Window | null,
) {
  const selection = await new ztoolkit.FilePicker(
    title,
    "folder",
    undefined,
    undefined,
    getObsidianPromptWindow(promptWindow),
    "all",
    currentValue || undefined,
  ).open();
  return selection ? formatPath(selection) : "";
}

export async function confirmObsidianVaultRoot(
  vaultRoot: string,
  promptWindow?: Window | null,
) {
  if (!vaultRoot || (await isObsidianVaultDirectory(vaultRoot))) {
    return true;
  }
  const index = promptChoice({
    title: uiText("Vault 检测提示", "Vault Check"),
    text: uiText(
      "所选目录中没有检测到 .obsidian 文件夹，看起来不像一个标准 Obsidian vault。仍然继续吗？",
      "The selected folder does not contain a .obsidian folder, so it does not look like a standard Obsidian vault. Continue anyway?",
    ),
    buttons: [uiText("仍然继续", "Continue"), uiText("取消", "Cancel")],
    defaultButton: 1,
    window: promptWindow,
  });
  return index === 0;
}

export function buildCurrentObsidianSetupDraft(): ObsidianSetupDraft {
  const vaultRoot = cleanInline(String(getPref("obsidian.vaultRoot") || ""));
  const defaults = deriveObsidianPathDefaults(vaultRoot);
  return {
    vaultRoot,
    notesDir:
      cleanInline(String(getPref("obsidian.notesDir") || "")) ||
      defaults.notesDir,
    assetsDir:
      cleanInline(String(getPref("obsidian.assetsDir") || "")) ||
      defaults.assetsDir,
    dashboardDir:
      cleanInline(String(getPref(OBSIDIAN_DASHBOARD_DIR_PREF) || "")) ||
      defaults.dashboardDir,
    dashboardAutoSetup: getBooleanPrefOrDefault(
      OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
      true,
    ),
    itemTemplate: resolveObsidianItemTemplateName(),
  };
}

export function setPathPrefWithDefault(
  prefKey: string,
  value: string,
  defaultValue: string,
) {
  const normalizedValue = formatPath(cleanInline(value));
  const normalizedDefault = formatPath(cleanInline(defaultValue));
  setPref(
    prefKey,
    normalizedValue && normalizedValue !== normalizedDefault
      ? normalizedValue
      : "",
  );
}

export function applyObsidianSetupDraft(
  draft: ObsidianSetupDraft,
  options: { overwriteExisting?: boolean } = {},
) {
  const overwriteExisting = options.overwriteExisting ?? true;
  const defaults = deriveObsidianPathDefaults(draft.vaultRoot);
  const currentNotesPref = cleanInline(
    String(getPref("obsidian.notesDir") || ""),
  );
  const currentAssetsPref = cleanInline(
    String(getPref("obsidian.assetsDir") || ""),
  );
  const currentDashboardPref = cleanInline(
    String(getPref(OBSIDIAN_DASHBOARD_DIR_PREF) || ""),
  );
  const nextNotesDir =
    formatPath(cleanInline(draft.notesDir)) ||
    (overwriteExisting || !currentNotesPref
      ? defaults.notesDir
      : currentNotesPref);
  const nextAssetsDir =
    formatPath(cleanInline(draft.assetsDir)) ||
    (overwriteExisting || !currentAssetsPref
      ? defaults.assetsDir
      : currentAssetsPref);
  const nextDashboardDir =
    formatPath(cleanInline(draft.dashboardDir)) ||
    (overwriteExisting || !currentDashboardPref
      ? defaults.dashboardDir
      : currentDashboardPref);

  setPref("obsidian.vaultRoot", defaults.vaultRoot);
  setPref("obsidian.vaultName", defaults.vaultName);
  setPathPrefWithDefault("obsidian.notesDir", nextNotesDir, defaults.notesDir);
  setPathPrefWithDefault(
    "obsidian.assetsDir",
    nextAssetsDir,
    defaults.assetsDir,
  );
  setPathPrefWithDefault(
    OBSIDIAN_DASHBOARD_DIR_PREF,
    nextDashboardDir,
    defaults.dashboardDir,
  );
  setPref(
    OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
    Boolean(draft.dashboardAutoSetup),
  );
  setPref(
    OBSIDIAN_ITEM_TEMPLATE_PREF,
    cleanInline(draft.itemTemplate) || DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
  );
}

export async function chooseDetectedObsidianVault(
  promptWindow?: Window | null,
): Promise<ObsidianDetectedVault | null> {
  const detectedVaults = await detectObsidianVaults();
  if (!detectedVaults.length) {
    return null;
  }
  const selectedIndex = promptSelectIndex({
    title: uiText("选择 Obsidian Vault", "Choose an Obsidian Vault"),
    text: uiText(
      "已在常见位置扫描到以下 vault，请选择要连接的工作区。",
      "The following vaults were found in common locations. Choose the workspace to connect.",
    ),
    labels: detectedVaults.map((vault) => `${vault.name} - ${vault.path}`),
    window: promptWindow,
  });
  if (selectedIndex == null) {
    return null;
  }
  return detectedVaults[selectedIndex] || null;
}
