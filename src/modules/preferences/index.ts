import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import {
  attachPreferencesWindow,
  detachPreferencesWindow,
  getPreferencesWindow,
  ensureSectionRuntime,
  setSectionContainer,
  hasSectionRendered,
  setSectionRendered,
  hasSectionBound,
  setSectionBound,
  getSectionContainerFromState,
} from "./state";
import {
  getRegisteredSections,
  getSectionById,
  getSectionContainer,
  createSectionContext,
} from "./sections";

type PrefsEventPayload = {
  window?: Window;
};

const refreshQueue = new Set<string>();
let flushingRefreshQueue = false;

export function registerPreferencesPane() {
  Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    scripts: [rootURI + "chrome/content/preferencesPane.js"],
    label: getString("pref-title"),
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
  });
}

export function handlePrefsEvent(
  type: string,
  payload: PrefsEventPayload = {},
) {
  switch (type) {
    case "load":
      if (payload.window) {
        hydratePreferenceWindow(payload.window);
      }
      break;
    case "unload":
      if (payload.window) {
        detachPreferencesWindow(payload.window);
      }
      break;
    case "refresh":
      refresh();
      break;
    default:
      break;
  }
}

export function refresh(sectionId?: string) {
  if (sectionId) {
    refreshQueue.add(sectionId);
  } else {
    getRegisteredSections().forEach((section) =>
      refreshQueue.add(section.id),
    );
  }
  void flushRefreshQueue();
}

export function getPrefsWindow(): Window | null {
  return getPreferencesWindow();
}

function hydratePreferenceWindow(win: Window) {
  attachPreferencesWindow(win);
  ensurePreferencesL10n(win);
  const doc = win.document;
  ensurePreferencesStyles(doc);
  getRegisteredSections().forEach((section) => {
    ensureSectionRuntime(section.id);
    const container = getSectionContainer(doc, section);
    setSectionContainer(section.id, container);
    if (!container) {
      Zotero.logError?.(
        new Error(
          `[preferences] Missing container for section "${section.id}".`,
        ),
      );
      return;
    }
    const context = createSectionContext(win, container);
    if (!hasSectionRendered(section.id)) {
      section.render(context);
      setSectionRendered(section.id);
      translateL10nElements(doc, container);
    }
    if (!hasSectionBound(section.id) && section.bind) {
      section.bind(context);
      setSectionBound(section.id);
    }
    if (section.refresh) {
      refreshQueue.add(section.id);
    }
  });
  void flushRefreshQueue();
}

async function flushRefreshQueue() {
  if (flushingRefreshQueue) {
    return;
  }
  flushingRefreshQueue = true;
  try {
    while (refreshQueue.size) {
      const [sectionId] = refreshQueue;
      refreshQueue.delete(sectionId);
      await refreshSection(sectionId);
    }
  } finally {
    flushingRefreshQueue = false;
  }
}

async function refreshSection(sectionId: string) {
  const section = getSectionById(sectionId);
  if (!section?.refresh) {
    return;
  }
  const win = getPreferencesWindow();
  if (!win) {
    return;
  }
  let container = getSectionContainerFromState(section.id);
  if (!container) {
    container = getSectionContainer(win.document, section);
    if (container) {
      setSectionContainer(section.id, container);
    }
  }
  if (!container) {
    return;
  }
  const context = createSectionContext(win, container);
  await section.refresh(context);
  translateL10nElements(win.document, container);
}

const HTML_NS = "http://www.w3.org/1999/xhtml";

function translateL10nElements(doc: Document, container: HTMLElement) {
  try {
    const l10n = (doc as any).l10n;
    if (!l10n) return;
    const elements = Array.from(
      container.querySelectorAll("[data-l10n-id]"),
    ) as Element[];
    if (!elements.length) return;

    const ids = elements.map((el) => ({
      id: el.getAttribute("data-l10n-id")!,
    }));

    // formatMessages returns the raw message data including attributes.
    // This lets us handle both plain-value keys AND .label-only keys
    // (the latter are XUL-style and won't automatically set textContent on
    // HTML <span> elements via translateElements, so we do it manually).
    Promise.resolve(l10n.formatMessages?.(ids))
      .then((messages: any[] | undefined) => {
        if (!Array.isArray(messages)) return;
        elements.forEach((el, i) => {
          const msg = messages[i];
          if (!msg) return;
          if (msg.value) {
            el.textContent = msg.value;
          } else {
            // Fall back to the first attribute value (typically .label)
            const attrVal = msg.attributes?.[0]?.value;
            if (attrVal) el.textContent = attrVal;
          }
        });
      })
      .catch(() => {});
  } catch {
    // no-op
  }
}

function ensurePreferencesStyles(doc: Document) {
  const styleId = `${config.addonRef}-preferences-style`;
  if (doc.getElementById(styleId)) {
    return;
  }
  const link = doc.createElementNS(HTML_NS, "link");
  link.id = styleId;
  link.setAttribute("rel", "stylesheet");
  link.setAttribute(
    "href",
    `chrome://${config.addonRef}/content/styles/preferences.css`,
  );
  const head =
    doc.getElementsByTagName("head")[0] ?? doc.documentElement ?? doc;
  head.appendChild(link);
}

function ensurePreferencesL10n(win: Window) {
  const mozXULElement: typeof MozXULElement | undefined =
    (win as typeof window & { MozXULElement?: typeof MozXULElement })
      .MozXULElement || MozXULElement;
  if (mozXULElement && typeof mozXULElement.insertFTLIfNeeded === "function") {
    mozXULElement.insertFTLIfNeeded(`${config.addonRef}-preferences.ftl`);
  }
}
