import { getPref } from "../../../../utils/prefs";
import { formatPath, jointPath } from "../../../../utils/str";
import {
  deriveObsidianPathDefaults,
  OBSIDIAN_DASHBOARD_DIR_PREF,
} from "../../settings";
import { getDefaultDashboardDir } from "../../paths";
import { cleanInline, XHTML_NS } from "../../shared";
import { OBSIDIAN_SETTINGS_ROOT_ID } from "../uiIds";

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
