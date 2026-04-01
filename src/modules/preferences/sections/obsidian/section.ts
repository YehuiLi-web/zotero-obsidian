import type { PreferenceSection } from "../types";
import { config } from "../../../../../package.json";
import { clearContainer, createHtmlElement } from "../helpers";
import { refreshObsidianPrefsUI } from "./index";

export const obsidianSection: PreferenceSection = {
  id: "obsidian",
  titleKey: "obsidian-title",
  slot: "obsidian",
  render({ container, uiText, document }) {
    if (!container.id) {
      container.id = `${config.addonRef}-obsidian-settingsRoot`;
    }
    container.classList.add("ob-prefs-root");
    clearContainer(container);
    const placeholder = createHtmlElement(document, "div");
    placeholder.classList.add("ob-prefs-loading");
    placeholder.textContent = uiText(
      "正在加载 Obsidian 设置…",
      "Loading Obsidian preferences…",
    );
    container.appendChild(placeholder);
  },
  refresh() {
    refreshObsidianPrefsUI();
  },
};
