import { getPref, setPref, clearPref } from "../../../utils/prefs";
import { getString } from "../../../utils/locale";
import type {
  PreferenceSection,
  PreferenceSectionContext,
} from "./types";
import { obsidianSection } from "./obsidian/section";

const registeredSections: PreferenceSection[] = [obsidianSection];

export function getRegisteredSections(): PreferenceSection[] {
  return registeredSections;
}

export function getSectionById(
  id: string,
): PreferenceSection | undefined {
  return registeredSections.find((section) => section.id === id);
}

export function getSectionContainer(
  doc: Document,
  section: PreferenceSection,
): HTMLElement | null {
  const slot = section.slot ?? section.id;
  return doc.querySelector<HTMLElement>(`[data-bn-section="${slot}"]`);
}

export function createSectionContext(
  win: Window,
  container: HTMLElement,
): PreferenceSectionContext {
  return {
    window: win,
    document: win.document,
    container,
    getPref,
    setPref,
    clearPref,
    getString,
    hooks: addon.hooks,
    uiText,
  };
}

function uiText(zh: string, en: string): string {
  const locale = Zotero.locale || "en";
  if (locale.toLowerCase().startsWith("zh")) {
    return zh || en;
  }
  return en || zh;
}
