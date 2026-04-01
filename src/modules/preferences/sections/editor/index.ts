import {
  clearContainer,
  createCheckboxLabel,
  createHtmlElement,
  createL10nSpan,
} from "../helpers";
import type { PreferenceSection } from "../types";
import { config } from "../../../../../package.json";

const IDS = {
  expandLevel: `${config.addonRef}-editor-expandLevel`,
  noteLinkPreviewGroup: `${config.addonRef}-editor-noteLinkPreviewType`,
  pinLeft: `${config.addonRef}-editor-pinTableLeft`,
  pinTop: `${config.addonRef}-editor-pinTableTop`,
};

const PREFS = {
  expandLevel: "workspace.outline.expandLevel",
  keepLinks: "workspace.outline.keepLinks",
  noteLinkPreview: "editor.noteLinkPreviewType",
  useMagicKey: "editor.useMagicKey",
  useMagicKeyShortcut: "editor.useMagicKeyShortcut",
  useMarkdownPaste: "editor.useMarkdownPaste",
  pinLeft: "editor.pinTableLeft",
  pinTop: "editor.pinTableTop",
};

let expandLevelInput: HTMLInputElement | null = null;
let keepLinksCheckbox: HTMLInputElement | null = null;
let previewRadios: HTMLInputElement[] = [];
let useMagicKeyCheckbox: HTMLInputElement | null = null;
let useMagicKeyShortcutCheckbox: HTMLInputElement | null = null;
let useMarkdownPasteCheckbox: HTMLInputElement | null = null;
let pinLeftCheckbox: HTMLInputElement | null = null;
let pinTopCheckbox: HTMLInputElement | null = null;

const previewOptions: Array<{ value: string; l10nId: string }> = [
  { value: "hover", l10nId: "editor-noteLinkPreview-hover" },
  { value: "ctrl", l10nId: "editor-noteLinkPreview-ctrl" },
  { value: "disable", l10nId: "editor-noteLinkPreview-disable" },
];

function requireRestart() {
  addon.api?.utils?.requireRestart?.();
}

export const editorSection: PreferenceSection = {
  id: "editor",
  titleKey: "editor-title",
  render({ document, container, getPref, setPref }) {
    clearContainer(container);
    const fragment = document.createDocumentFragment();

    // Expand level
    const expandRow = createHtmlElement(document, "div");
    expandRow.classList.add("bn-pref-row");
    const expandLabel = createHtmlElement(document, "label");
    expandLabel.htmlFor = IDS.expandLevel;
    expandLabel.appendChild(
      createL10nSpan(document, "editor-expandLevel-label"),
    );
    expandRow.appendChild(expandLabel);

    const expandInputEl = createHtmlElement(document, "input");
    expandInputEl.type = "number";
    expandInputEl.id = IDS.expandLevel;
    expandInputEl.min = "1";
    expandInputEl.max = "6";
    expandInputEl.step = "1";
    expandInputEl.value = String(getPref(PREFS.expandLevel) ?? 3);
    expandInputEl.addEventListener("change", () => {
      const next = Math.min(
        6,
        Math.max(1, Number(expandInputEl.value) || 1),
      );
      expandInputEl.value = String(next);
      setPref(PREFS.expandLevel, next);
      requireRestart();
    });
    expandRow.appendChild(expandInputEl);
    fragment.appendChild(expandRow);
    expandLevelInput = expandInputEl;

    // Keep links checkbox
    const keepLinksLabel = createCheckboxLabel(document);
    const keepLinksInput = createHtmlElement(document, "input");
    keepLinksInput.type = "checkbox";
    keepLinksInput.checked = Boolean(getPref(PREFS.keepLinks));
    keepLinksInput.addEventListener("change", () => {
      setPref(PREFS.keepLinks, keepLinksInput.checked);
    });
    keepLinksLabel.appendChild(keepLinksInput);
    keepLinksLabel.appendChild(createL10nSpan(document, "editor-keepLinks"));
    fragment.appendChild(keepLinksLabel);
    keepLinksCheckbox = keepLinksInput;

    // Preview type
    const previewRow = createHtmlElement(document, "div");
    previewRow.classList.add("bn-pref-row");
    const previewLabel = createHtmlElement(document, "label");
    previewLabel.htmlFor = IDS.noteLinkPreviewGroup;
    previewLabel.appendChild(
      createL10nSpan(document, "editor-noteLinkPreviewType"),
    );
    previewRow.appendChild(previewLabel);

    const previewGroup = createHtmlElement(document, "div");
    previewGroup.id = IDS.noteLinkPreviewGroup;
    previewGroup.classList.add("bn-pref-radio-group");
    const currentPreview = String(getPref(PREFS.noteLinkPreview) ?? "hover");
    previewRadios = previewOptions.map(({ value, l10nId }) => {
      const optionLabel = createCheckboxLabel(document);
      optionLabel.classList.add("bn-pref-radio");
      const radio = createHtmlElement(document, "input");
      radio.type = "radio";
      radio.name = IDS.noteLinkPreviewGroup;
      radio.value = value;
      radio.checked = currentPreview === value;
      radio.addEventListener("change", () => {
        if (radio.checked) {
          setPref(PREFS.noteLinkPreview, value);
          requireRestart();
        }
      });
      optionLabel.appendChild(radio);
      optionLabel.appendChild(createL10nSpan(document, l10nId));
      previewGroup.appendChild(optionLabel);
      return radio;
    });
    previewRow.appendChild(previewGroup);
    fragment.appendChild(previewRow);

    const makeCheckbox = (l10nId: string, pref: string) => {
      const label = createCheckboxLabel(document);
      const input = createHtmlElement(document, "input");
      input.type = "checkbox";
      input.checked = Boolean(getPref(pref));
      input.addEventListener("change", () => {
        setPref(pref, input.checked);
      });
      label.appendChild(input);
      label.appendChild(createL10nSpan(document, l10nId));
      fragment.appendChild(label);
      return input;
    };

    useMagicKeyCheckbox = makeCheckbox(
      "editor-useMagicKey",
      PREFS.useMagicKey,
    );
    useMagicKeyShortcutCheckbox = makeCheckbox(
      "editor-useMagicKeyShortcut",
      PREFS.useMagicKeyShortcut,
    );
    useMarkdownPasteCheckbox = makeCheckbox(
      "editor-useMarkdownPaste",
      PREFS.useMarkdownPaste,
    );

    const pinRow = createHtmlElement(document, "div");
    pinRow.classList.add("bn-pref-row");
    const pinLabel = createHtmlElement(document, "label");
    pinLabel.appendChild(createL10nSpan(document, "editor-pinTable-label"));
    pinRow.appendChild(pinLabel);

    const pinControls = createHtmlElement(document, "div");
    pinControls.classList.add("bn-pref-checkboxes-inline");
    pinLeftCheckbox = createHtmlElement(document, "input");
    pinLeftCheckbox.type = "checkbox";
    pinLeftCheckbox.id = IDS.pinLeft;
    pinLeftCheckbox.checked = Boolean(getPref(PREFS.pinLeft));
    pinLeftCheckbox.addEventListener("change", () => {
      setPref(PREFS.pinLeft, pinLeftCheckbox!.checked);
    });
    const pinLeftLabel = createCheckboxLabel(document);
    pinLeftLabel.appendChild(pinLeftCheckbox);
    pinLeftLabel.appendChild(
      createL10nSpan(document, `${config.addonRef}-editor-pinTableLeft`),
    );

    pinTopCheckbox = createHtmlElement(document, "input");
    pinTopCheckbox.type = "checkbox";
    pinTopCheckbox.id = IDS.pinTop;
    pinTopCheckbox.checked = Boolean(getPref(PREFS.pinTop));
    pinTopCheckbox.addEventListener("change", () => {
      setPref(PREFS.pinTop, pinTopCheckbox!.checked);
    });
    const pinTopLabel = createCheckboxLabel(document);
    pinTopLabel.appendChild(pinTopCheckbox);
    pinTopLabel.appendChild(
      createL10nSpan(document, `${config.addonRef}-editor-pinTableTop`),
    );

    pinControls.appendChild(pinLeftLabel);
    pinControls.appendChild(pinTopLabel);
    pinRow.appendChild(pinControls);
    fragment.appendChild(pinRow);

    container.appendChild(fragment);
  },
  refresh({ getPref }) {
    if (expandLevelInput) {
      expandLevelInput.value = String(getPref(PREFS.expandLevel) ?? 3);
    }
    if (keepLinksCheckbox) {
      keepLinksCheckbox.checked = Boolean(getPref(PREFS.keepLinks));
    }
    if (useMagicKeyCheckbox) {
      useMagicKeyCheckbox.checked = Boolean(getPref(PREFS.useMagicKey));
    }
    if (useMagicKeyShortcutCheckbox) {
      useMagicKeyShortcutCheckbox.checked = Boolean(
        getPref(PREFS.useMagicKeyShortcut),
      );
    }
    if (useMarkdownPasteCheckbox) {
      useMarkdownPasteCheckbox.checked = Boolean(
        getPref(PREFS.useMarkdownPaste),
      );
    }
    if (pinLeftCheckbox) {
      pinLeftCheckbox.checked = Boolean(getPref(PREFS.pinLeft));
    }
    if (pinTopCheckbox) {
      pinTopCheckbox.checked = Boolean(getPref(PREFS.pinTop));
    }
    const currentPreview = String(getPref(PREFS.noteLinkPreview) ?? "hover");
    previewRadios.forEach((radio) => {
      radio.checked = radio.value === currentPreview;
    });
  },
};
