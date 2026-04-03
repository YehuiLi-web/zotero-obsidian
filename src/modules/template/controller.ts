import YAML = require("yamljs");
import { getPref } from "../../utils/prefs";
import { showHint } from "../../utils/hint";
import { config } from "../../../package.json";

export {
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  removeTemplate,
  initTemplates,
  importTemplateFromClipboard,
  normalizeTemplateName,
};

function initTemplates() {
  addon.data.template.data = new ztoolkit.LargePref(
    `${config.prefsPrefix}.templateKeys`,
    `${config.prefsPrefix}.template.`,
    "parser",
  );
  // Convert old template keys to new format
  const raw = getPref("templateKeys") as string;
  let keys: Array<{ name: string } | string> = raw ? JSON.parse(raw) : [];
  if (keys.length > 0) {
    const legacyKeys = keys.map((t: { name: string } | string) => {
      if (typeof t === "string") {
        return t;
      }
      return t.name;
    });
    setTemplateKeys(
      Array.from(
        new Set(
          legacyKeys
            .map((key) => normalizeTemplateName(key))
            .filter(Boolean),
        ),
      ),
    );
  }
  normalizeTemplateStorage();
  // Add default templates
  const templateKeys = getTemplateKeys();
  for (const defaultTemplate of addon.api.template.DEFAULT_TEMPLATES) {
    if (!templateKeys.includes(defaultTemplate.name)) {
      setTemplate(defaultTemplate);
    }
  }
}

function getTemplateKeys(): string[] {
  normalizeTemplateStorage();
  return addon.data.template.data?.getKeys() || [];
}

function setTemplateKeys(templateKeys: string[]): void {
  addon.data.template.data?.setKeys(templateKeys);
}

function getTemplateText(keyName: string): string {
  const normalized = normalizeTemplateName(keyName);
  if (!normalized) {
    return "";
  }
  return (
    addon.data.template.data?.getValue(normalized) ||
    addon.data.template.data?.getValue(keyName) ||
    ""
  );
}

function setTemplate(template: NoteTemplate): void {
  const normalized = normalizeTemplateName(template.name);
  if (!normalized) {
    return;
  }
  addon.data.template.data?.setValue(normalized, template.text);
  if (template.name !== normalized) {
    addon.data.template.data?.deleteKey(template.name);
  }
}

function removeTemplate(keyName: string | undefined): void {
  if (!keyName) {
    return;
  }
  const normalized = normalizeTemplateName(keyName);
  if (normalized) {
    addon.data.template.data?.deleteKey(normalized);
  }
  if (keyName !== normalized) {
    addon.data.template.data?.deleteKey(keyName);
  }
}

function importTemplateFromClipboard(
  text?: string,
  options: {
    quiet?: boolean;
  } = {},
) {
  if (!text) {
    text = Zotero.Utilities.Internal.getClipboard("text/plain") || "";
  }
  if (!text) {
    return;
  }
  let template: Record<string, string>;
  try {
    template = YAML.parse(text);
  } catch (e) {
    try {
      template = JSON.parse(text);
    } catch (e) {
      template = { name: "", text: "" };
    }
  }
  if (!template.name) {
    showHint("The copied template is invalid");
    return;
  }
  if (
    !options.quiet &&
    !window.confirm(`Import template "${template.name}"?`)
  ) {
    return;
  }
  const normalizedName = normalizeTemplateName(template.name);
  if (!normalizedName) {
    showHint("The copied template is invalid");
    return;
  }
  setTemplate({ name: normalizedName, text: template.content });
  showHint(`Template ${normalizedName} saved.`);
  if (addon.data.template.editor.window) {
    addon.data.template.editor.window.refresh();
  }
  return normalizedName;
}

function normalizeTemplateName(name: string): string {
  const normalized = String(name || "").trim();
  if (!normalized) {
    return "";
  }
  const match = normalized.match(/^\[(item|text)\]\s*(.*)$/i);
  if (!match) {
    return normalized;
  }
  const templateBody = match[2].trim();
  if (!templateBody) {
    return "";
  }
  const templateType = match[1].toLowerCase() === "item" ? "Item" : "Text";
  return `[${templateType}]${templateBody}`;
}

function normalizeTemplateStorage() {
  const keys = addon.data.template.data?.getKeys() || [];
  if (!keys.length) {
    return;
  }
  const normalizedKeys = Array.from(
    new Set(keys.map((key) => normalizeTemplateName(key)).filter(Boolean)),
  );
  const isSame =
    keys.length === normalizedKeys.length &&
    keys.every((key, index) => key === normalizedKeys[index]);
  if (isSame) {
    return;
  }

  for (const key of keys) {
    const normalized = normalizeTemplateName(key);
    if (!normalized || normalized === key) {
      continue;
    }
    const sourceValue = addon.data.template.data?.getValue(key);
    const targetValue = addon.data.template.data?.getValue(normalized);
    if (typeof sourceValue !== "undefined" && typeof targetValue === "undefined") {
      addon.data.template.data?.setValue(normalized, sourceValue);
    }
    addon.data.template.data?.deleteKey(key);
  }

  setTemplateKeys(normalizedKeys);
}
