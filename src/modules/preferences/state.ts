interface SectionRuntimeState {
  container: HTMLElement | null;
  rendered: boolean;
  bound: boolean;
}

interface PreferencesRuntimeState {
  window: Window | null;
  document: Document | null;
  sections: Map<string, SectionRuntimeState>;
}

const runtimeState: PreferencesRuntimeState = {
  window: null,
  document: null,
  sections: new Map(),
};

type AddonPrefsStore = {
  window: Window | null;
};

function ensureAddonPrefs(): AddonPrefsStore {
  const data = addon.data as Record<string, any>;
  if (!data.prefs) {
    data.prefs = {
      window: null,
    } satisfies AddonPrefsStore;
  }
  return data.prefs as AddonPrefsStore;
}

export function attachPreferencesWindow(win: Window) {
  runtimeState.window = win;
  runtimeState.document = win.document;
  runtimeState.sections.clear();
  ensureAddonPrefs().window = win;
}

export function detachPreferencesWindow(win: Window) {
  if (runtimeState.window !== win) {
    return;
  }
  runtimeState.window = null;
  runtimeState.document = null;
  runtimeState.sections.clear();
  ensureAddonPrefs().window = null;
}

export function getPreferencesWindow(): Window | null {
  return runtimeState.window;
}

export function getPreferencesDocument(): Document | null {
  return runtimeState.document;
}

export function ensureSectionRuntime(
  id: string,
): SectionRuntimeState {
  let state = runtimeState.sections.get(id);
  if (!state) {
    state = {
      container: null,
      rendered: false,
      bound: false,
    };
    runtimeState.sections.set(id, state);
  }
  return state;
}

export function setSectionContainer(
  id: string,
  container: HTMLElement | null,
) {
  const state = ensureSectionRuntime(id);
  state.container = container;
}

export function getSectionContainerFromState(
  id: string,
): HTMLElement | null {
  return runtimeState.sections.get(id)?.container ?? null;
}

export function setSectionRendered(id: string) {
  const state = ensureSectionRuntime(id);
  state.rendered = true;
}

export function hasSectionRendered(id: string): boolean {
  return runtimeState.sections.get(id)?.rendered === true;
}

export function setSectionBound(id: string) {
  const state = ensureSectionRuntime(id);
  state.bound = true;
}

export function hasSectionBound(id: string): boolean {
  return runtimeState.sections.get(id)?.bound === true;
}
