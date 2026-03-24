const XHTML_NS = "http://www.w3.org/1999/xhtml";

function getFieldSafe(item: Zotero.Item, key: string) {
  try {
    return String(item.getField(key) || "");
  } catch (e) {
    return "";
  }
}

function parseExtraMap(extraText: string) {
  const result: Record<string, string> = {};
  for (const rawLine of String(extraText || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const dividerIndex = line.indexOf(":");
    if (dividerIndex < 0) {
      continue;
    }
    const key = line.slice(0, dividerIndex).trim();
    const value = line.slice(dividerIndex + 1).trim();
    if (key && !(key in result)) {
      result[key] = value;
    }
  }
  return result;
}

function updateExtraField(
  extraText: string,
  key: string,
  value: string,
  aliases: string[] = [key],
) {
  const normalizedValue = cleanInline(value);
  const aliasSet = new Set(aliases.map((alias) => cleanInline(alias)));
  const nextLines: string[] = [];
  let replaced = false;

  for (const rawLine of String(extraText || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const dividerIndex = line.indexOf(":");
    const currentKey =
      dividerIndex >= 0 ? cleanInline(line.slice(0, dividerIndex)) : "";
    if (!currentKey || !aliasSet.has(currentKey)) {
      nextLines.push(line);
      continue;
    }
    if (!replaced && normalizedValue) {
      nextLines.push(`${key}: ${normalizedValue}`);
      replaced = true;
    }
  }

  if (!replaced && normalizedValue) {
    nextLines.push(`${key}: ${normalizedValue}`);
  }

  return nextLines.join("\n");
}

function hasFrontmatterKey(meta: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(meta, key);
}

function firstValue(...values: unknown[]) {
  for (const value of values) {
    if (value !== "" && value !== null && value !== undefined) {
      return value;
    }
  }
  return "";
}

function cleanInline(value: unknown) {
  return String(value || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMarkdown(markdown: string) {
  return String(markdown || "").replace(/\r\n/g, "\n");
}

function normalizeStableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeStableValue(item));
  }
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeStableValue(
          (value as Record<string, unknown>)[key],
        );
        return result;
      }, {});
  }
  return value;
}

function stableJSONStringify(value: unknown) {
  return JSON.stringify(normalizeStableValue(value));
}

function yamlQuote(value: unknown) {
  return `"${cleanInline(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function yamlListBlock(key: string, values: string[]) {
  const items = values.map((value) => cleanInline(value)).filter(Boolean);
  if (!items.length) {
    return `${key}: []`;
  }
  return [key + ":", ...items.map((value) => `  - ${yamlQuote(value)}`)].join(
    "\n",
  );
}

function escapeTableValue(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function getDateYear(date: string) {
  const match = cleanInline(date).match(/(19|20)\d{2}/);
  return match ? match[0] : "";
}

function formatAbstractLines(text: string) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim());
  return lines.filter((line, index, all) => line || index < all.length - 1);
}

function getScalarJSONValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (
    Array.isArray(value) &&
    value.every((item) => ["string", "number", "boolean"].includes(typeof item))
  ) {
    return value
      .map((item) => cleanInline(item))
      .filter(Boolean)
      .join("；");
  }
  return "";
}

export {
  XHTML_NS,
  getFieldSafe,
  parseExtraMap,
  updateExtraField,
  hasFrontmatterKey,
  firstValue,
  cleanInline,
  normalizeMarkdown,
  normalizeStableValue,
  stableJSONStringify,
  yamlQuote,
  isPlainObject,
  yamlListBlock,
  escapeTableValue,
  getDateYear,
  formatAbstractLines,
  getScalarJSONValue,
};
