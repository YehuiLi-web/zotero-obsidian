import type { getPref, setPref, clearPref } from "../../../utils/prefs";
import type { getString } from "../../../utils/locale";

export interface PreferenceSectionContext {
  window: Window;
  document: Document;
  container: HTMLElement;
  getPref: typeof getPref;
  setPref: typeof setPref;
  clearPref: typeof clearPref;
  getString: typeof getString;
  hooks: typeof addon.hooks;
  uiText: (zh: string, en: string) => string;
}

export interface PreferenceSection {
  id: string;
  titleKey: string;
  /**
   * Slot identifier that maps to `data-bn-section="<slot>"` in the XHTML shell.
   * Falls back to `id` when omitted.
   */
  slot?: string;
  /**
   * Render DOM for this section. Executed once per preference window load.
   */
  render: (context: PreferenceSectionContext) => void;
  /**
   * Bind DOM events after rendering. Executed once per preference window load.
   */
  bind?: (context: PreferenceSectionContext) => void;
  /**
   * Optional refresh hook invoked when `preferences.refresh()` targets this section.
   */
  refresh?: (
    context: PreferenceSectionContext,
  ) => void | Promise<void>;
}
