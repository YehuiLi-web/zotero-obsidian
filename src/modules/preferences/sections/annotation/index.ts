import {
  clearContainer,
  createCheckboxLabel,
  createHtmlElement,
  createL10nSpan,
} from "../helpers";
import type { PreferenceSection } from "../types";

const PREF_KEY = "annotationNote.enableTagSync";

let annotationCheckbox: HTMLInputElement | null = null;

export const annotationSection: PreferenceSection = {
  id: "annotation",
  titleKey: "annotationNote-title",
  render({ document, container, getPref, setPref }) {
    clearContainer(container);
    const label = createCheckboxLabel(document);
    const checkbox = createHtmlElement(document, "input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(getPref(PREF_KEY));
    checkbox.addEventListener("change", () => {
      setPref(PREF_KEY, checkbox.checked);
    });
    label.appendChild(checkbox);
    label.appendChild(createL10nSpan(document, "annotationNote-enableTagSync"));
    container.appendChild(label);
    annotationCheckbox = checkbox;
  },
  refresh({ getPref }) {
    if (annotationCheckbox) {
      annotationCheckbox.checked = Boolean(getPref(PREF_KEY));
    }
  },
};
