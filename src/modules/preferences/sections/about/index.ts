import { clearContainer, createHtmlElement } from "../helpers";
import type { PreferenceSection } from "../types";

const LINKS = [
  {
    href: "https://github.com/windingwind/zotero-better-notes",
    label: "Homepage - GitHub",
  },
  {
    href: "https://github.com/windingwind/zotero-better-notes/issues",
    label: "Bug Report, Feature Request",
  },
  {
    href: "https://github.com/windingwind/zotero-better-notes/discussions/categories/q-a",
    label: "Q&A",
  },
];

export const aboutSection: PreferenceSection = {
  id: "about",
  titleKey: "about-title",
  render({ document, container }) {
    clearContainer(container);
    const linkRow = createHtmlElement(document, "div");
    linkRow.classList.add("bn-pref-row");

    LINKS.forEach((link, index) => {
      const element = createHtmlElement(document, "label");
      element.classList.add("zotero-text-link", "keyboard-clickable");
      element.setAttribute("is", "zotero-text-link");
      element.setAttribute("role", "link");
      element.setAttribute("href", link.href);
      element.textContent = link.label;
      linkRow.appendChild(element);
      if (index < LINKS.length - 1) {
        const divider = createHtmlElement(document, "label");
        divider.textContent = "|";
        linkRow.appendChild(divider);
      }
    });
    container.appendChild(linkRow);

    const helpLabel = createHtmlElement(document, "label");
    helpLabel.setAttribute("data-l10n-id", "help");
    helpLabel.setAttribute(
      "data-l10n-args",
      JSON.stringify({
        time: "__buildTime__",
        name: "__addonName__",
        version: "__buildVersion__",
      }),
    );
    container.appendChild(helpLabel);
  },
};
