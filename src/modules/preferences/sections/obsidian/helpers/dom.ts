import { getPref } from "../../../../../utils/prefs";
import { formatPath, jointPath } from "../../../../../utils/str";
import {
  deriveObsidianPathDefaults,
  OBSIDIAN_DASHBOARD_DIR_PREF,
} from "../../../../obsidian/settings";
import { getDefaultDashboardDir } from "../../../../obsidian/paths";
import { cleanInline, XHTML_NS } from "../../../../obsidian/shared";
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

function clonePrefNode(
  targetDoc: Document,
  sourceNode: Node | null,
): Node | null {
  if (!sourceNode) {
    return null;
  }
  switch (sourceNode.nodeType) {
    case 1: {
      const sourceElement = sourceNode as HTMLElement;
      const localName = cleanInline(sourceElement.localName || "").toLowerCase();
      if (!localName) {
        return null;
      }
      const nextElement = targetDoc.createElementNS(XHTML_NS, localName);
      for (const attr of Array.from(sourceElement.attributes || [])) {
        nextElement.setAttribute(attr.name, attr.value);
      }
      for (const childNode of Array.from(sourceElement.childNodes)) {
        const nextChild = clonePrefNode(targetDoc, childNode);
        if (nextChild) {
          nextElement.appendChild(nextChild);
        }
      }
      return nextElement;
    }
    case 3:
      return targetDoc.createTextNode(sourceNode.textContent || "");
    case 8:
      return targetDoc.createComment(sourceNode.textContent || "");
    default:
      return null;
  }
}

function parsePrefHTMLFragment(targetDoc: Document, markup: string) {
  const DOMParserCtor = targetDoc.defaultView?.DOMParser;
  if (!DOMParserCtor) {
    throw new Error("DOMParser is not available in the preference window.");
  }
  const parser = new DOMParserCtor();
  const htmlDoc = parser.parseFromString(
    String(markup || "").trim(),
    "text/html",
  );
  const sourceRoot = htmlDoc.body || htmlDoc.documentElement;
  if (!sourceRoot) {
    throw new Error("Failed to create preference DOM from HTML markup.");
  }
  const fragment = targetDoc.createDocumentFragment();
  for (const node of Array.from(sourceRoot.childNodes)) {
    const nextNode = clonePrefNode(targetDoc, node);
    if (nextNode) {
      fragment.appendChild(nextNode);
    }
  }
  return fragment;
}

function parsePrefXMLFragment(targetDoc: Document, markup: string) {
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
  return fragment;
}

export function replacePrefHTML(target: Element, markup: string) {
  const targetDoc = target.ownerDocument;
  const normalizedMarkup = String(markup || "").trim();
  try {
    target.replaceChildren(parsePrefHTMLFragment(targetDoc, normalizedMarkup));
    return;
  } catch (htmlError) {
    try {
      target.replaceChildren(parsePrefXMLFragment(targetDoc, normalizedMarkup));
      return;
    } catch (xmlError) {
      const errorMessage =
        cleanInline((xmlError as Error)?.message || "") ||
        cleanInline((htmlError as Error)?.message || "") ||
        "Failed to parse preference markup.";
      throw new Error(errorMessage);
    }
  }
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
  void doc;
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
