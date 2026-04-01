export const HTML_NS = "http://www.w3.org/1999/xhtml";

import { config } from "../../../../package.json";

export function clearContainer(container: HTMLElement) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

export function createHtmlElement<T extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tagName: T,
): HTMLElementTagNameMap[T] {
  return doc.createElementNS(HTML_NS, tagName) as HTMLElementTagNameMap[T];
}

export function createL10nSpan(
  doc: Document,
  l10nId: string,
  args?: string,
) {
  const span = createHtmlElement(doc, "span");
  // Auto-prepend addonRef prefix if caller passed a bare key (without prefix)
  const fullId = l10nId.startsWith(`${config.addonRef}-`)
    ? l10nId
    : `${config.addonRef}-${l10nId}`;
  span.setAttribute("data-l10n-id", fullId);
  if (args) {
    span.setAttribute("data-l10n-args", args);
  }
  return span;
}

export function createCheckboxLabel(doc: Document) {
  const label = createHtmlElement(doc, "label");
  label.classList.add("bn-pref-checkbox");
  return label;
}

export function bindPrefCheckbox(
  checkbox: HTMLInputElement,
  prefKey: string,
  getPref: (key: string) => any,
  setPref: (key: string, value: any) => void,
) {
  checkbox.checked = Boolean(getPref(prefKey));
  checkbox.addEventListener("change", () => {
    setPref(prefKey, checkbox.checked);
  });
}

export function createDivider(doc: Document) {
  const divider = doc.createElement("hr");
  divider.classList.add("bn-pref-divider");
  return divider;
}
