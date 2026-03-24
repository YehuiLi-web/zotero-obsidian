import { getString } from "../../../utils/locale";
import { getPref, setPref } from "../../../utils/prefs";
import { fileExists, formatPath, jointPath } from "../../../utils/str";
import {
  deriveObsidianPathDefaults,
  isObsidianVaultDirectory,
  getBooleanPrefOrDefault,
  resolveObsidianItemTemplateName,
  OBSIDIAN_DASHBOARD_DIR_PREF,
  OBSIDIAN_DASHBOARD_AUTO_SETUP_PREF,
  OBSIDIAN_ITEM_TEMPLATE_PREF,
  DEFAULT_OBSIDIAN_ITEM_TEMPLATE,
  ObsidianDetectedVault,
  detectObsidianVaults,
} from "../settings";
import { cleanInline, XHTML_NS } from "../shared";
import { getDefaultDashboardDir } from "../paths";
import {
  OBSIDIAN_SETTINGS_ROOT_ID,
  type ObsidianSetupDraft,
} from "./state";

const PREF_XHTML_TAGS = [
  "aside",
  "button",
  "code",
  "details",
  "div",
  "h3",
  "input",
  "label",
  "option",
  "p",
  "pre",
  "section",
  "select",
  "span",
  "summary",
] as const;

export function getPrefWindowDocument() {
  const prefWindow = addon.data.prefs?.window;
  if (!prefWindow || prefWindow.closed) {
    return null;
  }
  return prefWindow.document;
}

export function setPrefElementValue(inputId: string, value: string) {
  const doc = getPrefWindowDocument();
  if (!doc) {
    return;
  }
  const input = doc.getElementById(inputId) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | XULMenuListElement
    | null;
  if (input) {
    input.value = value;
  }
}

export function setPrefElementChecked(inputId: string, checked: boolean) {
  const doc = getPrefWindowDocument();
  if (!doc) {
    return;
  }
  const input = doc.getElementById(inputId) as
    | HTMLInputElement
    | { checked?: boolean }
    | null;
  if (input && "checked" in input) {
    input.checked = checked;
  }
}

export function getPrefElement<T extends Element>(inputId: string) {
  const doc = getPrefWindowDocument();
  if (!doc) {
    return null;
  }
  return doc.getElementById(inputId) as T | null;
}

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

export function toPrefXHTMLMarkup(markup: string) {
  let nextMarkup = String(markup || "").trim();
  for (const tagName of PREF_XHTML_TAGS) {
    const openOrCloseTag = new RegExp(`<(/?)${tagName}(?=[\\s>/])`, "g");
    nextMarkup = nextMarkup.replace(openOrCloseTag, `<$1html:${tagName}`);
  }
  return nextMarkup;
}

export function createPrefHTMLElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tagName: K,
) {
  return doc.createElementNS(XHTML_NS, tagName) as HTMLElementTagNameMap[K];
}

export function replacePrefHTML(target: Element, markup: string) {
  const targetDoc = target.ownerDocument;
  const DOMParserCtor = targetDoc.defaultView?.DOMParser;
  if (!DOMParserCtor) {
    throw new Error("DOMParser is not available in the preference window.");
  }
  const parser = new DOMParserCtor();
  const xmlDoc = parser.parseFromString(
    `<root xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" xmlns:html="${XHTML_NS}">${toPrefXHTMLMarkup(
      markup,
    )}</root>`,
    "application/xml",
  );
  const parserError = xmlDoc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error(
      cleanInline(parserError.textContent || "") ||
        "Failed to parse preference markup.",
    );
  }
  const fragment = targetDoc.createDocumentFragment();
  const nodes = Array.from(xmlDoc.documentElement.childNodes);
  for (const node of nodes) {
    if (!node) {
      continue;
    }
    fragment.appendChild(targetDoc.importNode(node, true));
  }
  target.replaceChildren(fragment);
}

export function setPrefRadioValue(name: string, value: string) {
  const doc = getPrefWindowDocument();
  if (!doc) {
    return;
  }
  doc
    .querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)
    .forEach((input) => {
      input.checked = input.value === value;
    });
}

export function uiText(zh: string, en: string) {
  const prefDoc = getPrefWindowDocument();
  const locale =
    [
      cleanInline(prefDoc?.documentElement?.getAttribute("lang") || ""),
      cleanInline(String(prefDoc?.defaultView?.navigator?.language || "")),
      cleanInline(
        String((globalThis as any).Services?.locale?.appLocaleAsBCP47 || ""),
      ),
      cleanInline(String((globalThis as any).navigator?.language || "")),
      cleanInline(String(Zotero.getMainWindow?.()?.navigator?.language || "")),
      cleanInline(String((Zotero as any).locale || "")),
    ]
      .find(Boolean)
      ?.toLowerCase() || "";
  return locale.startsWith("zh") ? zh : en;
}

export function escapePrefHTML(doc: Document, value: string) {
  const span = createPrefHTMLElement(doc, "span");
  span.textContent = value;
  return span.innerHTML;
}

export function getObsidianResolvedPaths() {
  const appPath = cleanInline(String(getPref("obsidian.appPath") || ""));
  const vaultRoot = cleanInline(String(getPref("obsidian.vaultRoot") || ""));
  const defaults = deriveObsidianPathDefaults(vaultRoot);
  const notesDirPref = cleanInline(String(getPref("obsidian.notesDir") || ""));
  const assetsDirPref = cleanInline(
    String(getPref("obsidian.assetsDir") || ""),
  );
  const dashboardDirPref = cleanInline(
    String(getPref(OBSIDIAN_DASHBOARD_DIR_PREF) || ""),
  );
  const notesDir = formatPath(notesDirPref || defaults.notesDir);
  const assetsDir = formatPath(
    assetsDirPref ||
      defaults.assetsDir ||
      (notesDir
        ? jointPath(PathUtils.parent(notesDir) || notesDir, "assets", "zotero")
        : ""),
  );
  const dashboardDir = formatPath(
    dashboardDirPref ||
      defaults.dashboardDir ||
      getDefaultDashboardDir(vaultRoot, notesDir),
  );
  return {
    appPath,
    vaultRoot,
    notesDirPref,
    notesDir,
    assetsDirPref,
    assetsDir,
    dashboardDirPref,
    dashboardDir,
  };
}

export function getObsidianSettingsRoot(doc: Document) {
  return doc.getElementById(
    OBSIDIAN_SETTINGS_ROOT_ID,
  ) as HTMLDivElement | null;
}
