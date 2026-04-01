import { config } from "../../../../../package.json";
import { clearContainer, createCheckboxLabel, createHtmlElement, createL10nSpan } from "../helpers";
import type { PreferenceSection } from "../types";

const EXPORT_PREF = "exportNotes.takeover";
const EXPORT_ID = `${config.addonRef}-pref-basic-exportNotes`;

let exportNotesCheckbox: HTMLInputElement | null = null;

export const basicSection: PreferenceSection = {
  id: "basic",
  titleKey: "basic-title",
  render({ document, container, getPref, setPref }) {
    clearContainer(container);
    const label = createCheckboxLabel(document);

    const checkbox = createHtmlElement(document, "input");
    checkbox.type = "checkbox";
    checkbox.id = EXPORT_ID;
    label.appendChild(checkbox);

    const text = createL10nSpan(document, "basic-exportNotes-takeover");
    label.appendChild(text);

    container.appendChild(label);

    checkbox.checked = Boolean(getPref(EXPORT_PREF));
    checkbox.addEventListener("change", () => {
      setPref(EXPORT_PREF, checkbox.checked);
    });

    exportNotesCheckbox = checkbox;
  },
  refresh({ getPref }) {
    if (exportNotesCheckbox) {
      exportNotesCheckbox.checked = Boolean(getPref(EXPORT_PREF));
    }
  },
};
