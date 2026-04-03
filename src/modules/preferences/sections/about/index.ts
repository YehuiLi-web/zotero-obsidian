import {
  bugs,
  config,
  homepage,
  repository,
  version,
} from "../../../../../package.json";
import { clearContainer, createHtmlElement, createL10nSpan } from "../helpers";
import type { PreferenceSection } from "../types";

declare const __BUILD_TIME__: string;
const ABOUT_BUILD_TIME =
  typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "development";

const REPOSITORY_URL = String(homepage || bugs?.url || repository?.url || "")
  .replace(/^git\+/, "")
  .replace(/\.git$/, "")
  .replace(/#.*$/, "");

const LINKS = [
  {
    href: REPOSITORY_URL,
    label: "Homepage - GitHub",
  },
  {
    href: String(bugs?.url || `${REPOSITORY_URL}/issues`),
    label: "Bug Report, Feature Request",
  },
  {
    href: `${REPOSITORY_URL}/discussions/categories/q-a`,
    label: "Q&A",
  },
].filter((link) => Boolean(link.href));

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

    container.appendChild(
      createL10nSpan(
        document,
        "help",
        JSON.stringify({
          time: ABOUT_BUILD_TIME,
          name: config.addonName,
          version,
        }),
      ),
    );
  },
};
