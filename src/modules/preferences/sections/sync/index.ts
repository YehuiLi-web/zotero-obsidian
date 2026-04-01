import {
  clearContainer,
  createHtmlElement,
  createL10nSpan,
} from "../helpers";
import type { PreferenceSection } from "../types";
import { config } from "../../../../../package.json";

const IDS = {
  period: `${config.addonRef}-sync-period`,
  attachmentFolder: `${config.addonRef}-sync-attachmentFolder`,
};

const PREFS = {
  period: "syncPeriodSeconds",
  attachmentFolder: "syncAttachmentFolder",
};

let periodInput: HTMLInputElement | null = null;
let attachmentFolderInput: HTMLInputElement | null = null;

function requireRestart() {
  addon.api?.utils?.requireRestart?.();
}

export const syncSection: PreferenceSection = {
  id: "sync",
  titleKey: "sync-title",
  render({ document, container, getPref, setPref, hooks }) {
    clearContainer(container);

    const periodRow = createHtmlElement(document, "div");
    periodRow.classList.add("bn-pref-row");
    const periodLabel = createHtmlElement(document, "label");
    periodLabel.htmlFor = IDS.period;
    periodLabel.appendChild(
      createL10nSpan(document, "sync-period-label"),
    );
    periodRow.appendChild(periodLabel);

    const period = createHtmlElement(document, "input");
    period.type = "number";
    period.id = IDS.period;
    period.min = "-1";
    period.max = "3600";
    period.step = "1";
    period.placeholder = "-1 for disable";
    period.value = String(getPref(PREFS.period) ?? -1);
    period.addEventListener("change", () => {
      const value = Math.min(
        3600,
        Math.max(-1, Number(period.value) || -1),
      );
      period.value = String(value);
      setPref(PREFS.period, value);
      requireRestart();
    });
    periodRow.appendChild(period);
    container.appendChild(periodRow);
    periodInput = period;

    const folderRow = createHtmlElement(document, "div");
    folderRow.classList.add("bn-pref-row");
    const folderLabel = createHtmlElement(document, "label");
    folderLabel.htmlFor = IDS.attachmentFolder;
    folderLabel.appendChild(
      createL10nSpan(document, "sync-attachmentFolder-label"),
    );
    folderRow.appendChild(folderLabel);

    const folderInput = createHtmlElement(document, "input");
    folderInput.type = "text";
    folderInput.id = IDS.attachmentFolder;
    folderInput.value = String(getPref(PREFS.attachmentFolder) ?? "");
    folderInput.addEventListener("change", () => {
      setPref(PREFS.attachmentFolder, folderInput.value);
    });
    folderRow.appendChild(folderInput);
    container.appendChild(folderRow);
    attachmentFolderInput = folderInput;

    const buttonRow = createHtmlElement(document, "div");
    buttonRow.classList.add("bn-pref-row");
    const manageButton = createHtmlElement(document, "button");
    manageButton.appendChild(createL10nSpan(document, "sync-manager"));
    manageButton.addEventListener("click", () => {
      hooks.onShowSyncManager?.();
    });
    buttonRow.appendChild(manageButton);
    container.appendChild(buttonRow);
  },
  refresh({ getPref }) {
    if (periodInput) {
      periodInput.value = String(getPref(PREFS.period) ?? -1);
    }
    if (attachmentFolderInput) {
      attachmentFolderInput.value = String(
        getPref(PREFS.attachmentFolder) ?? "",
      );
    }
  },
};
