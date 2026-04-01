import {
  clearContainer,
  createHtmlElement,
  createL10nSpan,
} from "../helpers";
import type { PreferenceSection } from "../types";

export const templateSection: PreferenceSection = {
  id: "template",
  titleKey: "template-title",
  render({ document, container, hooks }) {
    clearContainer(container);
    const buttonRow = createHtmlElement(document, "div");
    buttonRow.classList.add("bn-pref-row");
    const button = createHtmlElement(document, "button");
    button.appendChild(createL10nSpan(document, "template-editor"));
    button.addEventListener("click", () => {
      hooks.onShowTemplateEditor?.();
    });
    buttonRow.appendChild(button);
    container.appendChild(buttonRow);
  },
};
