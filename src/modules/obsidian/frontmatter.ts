import YAML = require("yamljs");
import {
  getManagedFrontmatterFields,
  hasManagedFrontmatterField,
} from "./settings";
import {
  cleanInline,
  firstValue,
  getDateYear,
  getFieldSafe,
  hasFrontmatterKey,
  isPlainObject,
  normalizeMarkdown,
  updateExtraField,
  yamlQuote,
} from "./shared";

const MANAGED_NOTE_SCHEMA_VERSION = 1;
const MANAGED_FRONTMATTER_SYSTEM_TAGS = new Set(["literature", "zotero"]);
const MANAGED_FRONTMATTER_RESERVED_KEYS = new Set([
  "title",
  "aliases",
  "title_translation",
  "zotero_key",
  "zotero_note_key",
  "item_type",
  "item_type_zh",
  "date",
  "year",
  "doi",
  "citation_key",
  "publication",
  "item_link",
  "pdf_link",
  "authors",
  "collections",
  "zotero_tags",
  "tags",
  "status",
  "reading_status",
  "rating",
  "bridge_managed",
  "bridge_schema",
  "$version",
  "$libraryID",
  "$itemKey",
]);

function normalizeManagedTag(value: unknown) {
  return cleanInline(value).replace(/^#+/, "");
}

function normalizeFrontmatterObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, any>) };
}

function normalizeFrontmatterList(value: unknown) {
  let values: unknown[] = [];
  if (Array.isArray(value)) {
    values = value;
  } else if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const looksLikeIndexedObject = entries.every(([key]) => /^\d+$/.test(key));
    values = looksLikeIndexedObject
      ? entries
          .sort((left, right) => Number(left[0]) - Number(right[0]))
          .map(([, item]) => item)
      : [value];
  } else if (value) {
    values = [value];
  }
  return values.map((item) => cleanInline(item)).filter(Boolean);
}

function mergeFrontmatterLists(...values: unknown[]) {
  return Array.from(
    new Set(values.flatMap((value) => normalizeFrontmatterList(value))),
  );
}

function getManagedFrontmatterTags(value: unknown) {
  return Array.from(
    new Set(
      normalizeFrontmatterList(value)
        .map((tag) => normalizeManagedTag(tag))
        .filter(Boolean),
    ),
  );
}

function getManagedFrontmatterNonSystemTags(value: unknown) {
  return getManagedFrontmatterTags(value).filter(
    (tag) => !MANAGED_FRONTMATTER_SYSTEM_TAGS.has(tag.toLowerCase()),
  );
}

function normalizeManagedRating(value: unknown) {
  const normalized = cleanInline(value);
  if (!normalized) {
    return "";
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return normalized;
  }
  const rounded = Math.round(numeric);
  if (rounded <= 0) {
    return "";
  }
  return Math.min(rounded, 5);
}

function buildFrontmatter(frontmatter: Record<string, any>) {
  const serializeScalar = (value: unknown) => {
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return yamlQuote(value);
  };

  const serializeValue = (value: unknown, indentLevel: number): string => {
    const indent = "  ".repeat(indentLevel);

    if (Array.isArray(value)) {
      if (!value.length) {
        return `${indent}[]`;
      }
      return value
        .map((item) => {
          if (Array.isArray(item) || isPlainObject(item)) {
            return `${indent}-\n${serializeValue(item, indentLevel + 1)}`;
          }
          return `${indent}- ${serializeScalar(item)}`;
        })
        .join("\n");
    }

    if (isPlainObject(value)) {
      const entries = Object.entries(value);
      if (!entries.length) {
        return `${indent}{}`;
      }
      return entries
        .map(([key, item]) => {
          if (Array.isArray(item) || isPlainObject(item)) {
            return `${indent}${key}:\n${serializeValue(item, indentLevel + 1)}`;
          }
          return `${indent}${key}: ${serializeScalar(item)}`;
        })
        .join("\n");
    }

    return `${indent}${serializeScalar(value)}`;
  };

  const lines = Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value) || isPlainObject(value)) {
      return `${key}:\n${serializeValue(value, 1)}`;
    }
    return `${key}: ${serializeScalar(value)}`;
  });
  return `---\n${lines.join("\n")}\n---`;
}

function buildManagedFrontmatterData(
  context: Record<string, string>,
  creatorsList: string[],
  zoteroTagsList: string[],
  collectionsList: string[],
  topItem: Zotero.Item,
  noteItem: Zotero.Item,
  existingFrontmatter: Record<string, any> = {},
) {
  const year = Number.parseInt(cleanInline(context.dateY), 10);
  const selectedFields = new Set(getManagedFrontmatterFields());
  const status = cleanInline(
    firstValue(
      context.reading_status,
      context.status,
      existingFrontmatter.reading_status,
      existingFrontmatter.status,
      "inbox",
    ),
  );
  const rating = normalizeManagedRating(
    firstValue(
      getFieldSafe(topItem, "rating"),
      context.rating,
      existingFrontmatter.rating,
    ),
  );
  const tags = mergeFrontmatterLists(
    ["literature", "zotero"],
    getManagedFrontmatterNonSystemTags(zoteroTagsList),
  );
  const frontmatter: Record<string, any> = {
    title: cleanInline(context.title),
    zotero_key: cleanInline(context.qnkey),
    zotero_note_key: cleanInline(noteItem.key),
    tags,
    reading_status: status || "inbox",
    bridge_managed: true,
    bridge_schema: MANAGED_NOTE_SCHEMA_VERSION,
    $version: noteItem.version,
    $libraryID: noteItem.libraryID,
  };
  if (selectedFields.has("titleTranslation")) {
    const titleTranslation = cleanInline(context.titleTranslation);
    if (titleTranslation) {
      frontmatter.aliases = [titleTranslation];
      frontmatter.title_translation = titleTranslation;
    }
  }
  if (selectedFields.has("itemType")) {
    const itemType = cleanInline(context.itemType);
    const itemTypeZh = cleanInline(context.itemTypeZh);
    if (itemType) {
      frontmatter.item_type = itemType;
    }
    if (itemTypeZh) {
      frontmatter.item_type_zh = itemTypeZh;
    }
  }
  if (selectedFields.has("date")) {
    const date = cleanInline(context.date);
    const normalizedYear = Number.isFinite(year)
      ? year
      : cleanInline(context.dateY);
    if (date) {
      frontmatter.date = date;
    }
    if (normalizedYear !== "") {
      frontmatter.year = normalizedYear;
    }
  }
  if (selectedFields.has("doi")) {
    const doi = cleanInline(context.DOI);
    if (doi) {
      frontmatter.doi = doi;
    }
  }
  if (selectedFields.has("citationKey")) {
    const citationKey = cleanInline(context.citationKey);
    if (citationKey) {
      frontmatter.citation_key = citationKey;
    }
  }
  if (selectedFields.has("publication")) {
    const publication = cleanInline(
      firstValue(
        context.publicationTitle,
        context.proceedingsTitle,
        context.bookTitle,
        context.publisher,
      ),
    );
    if (publication) {
      frontmatter.publication = publication;
    }
  }
  if (selectedFields.has("itemLink")) {
    const itemLink = cleanInline(context.itemLink);
    if (itemLink) {
      frontmatter.item_link = itemLink;
    }
  }
  if (selectedFields.has("pdfLink")) {
    const pdfLink = cleanInline(context.pdfLink);
    if (pdfLink) {
      frontmatter.pdf_link = pdfLink;
    }
  }
  if (selectedFields.has("authors")) {
    const authors = creatorsList
      .map((value) => cleanInline(value))
      .filter(Boolean);
    if (authors.length) {
      frontmatter.authors = authors;
    }
  }
  if (selectedFields.has("collections")) {
    const collections = collectionsList
      .map((value) => cleanInline(value))
      .filter(Boolean);
    if (collections.length) {
      frontmatter.collections = collections;
    }
  }
  if (selectedFields.has("zoteroTags")) {
    const zoteroTags = zoteroTagsList
      .map((value) => cleanInline(value))
      .filter(Boolean);
    if (zoteroTags.length) {
      frontmatter.zotero_tags = zoteroTags;
    }
  }
  if (rating !== "" && selectedFields.has("rating")) {
    frontmatter.rating = rating;
  }
  return frontmatter;
}

function parseMarkdownFrontmatter(markdown: string) {
  const normalized = normalizeMarkdown(markdown);
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    return {};
  }
  try {
    return normalizeFrontmatterObject(YAML.parse(match[1]));
  } catch (e) {
    const toolkit = (globalThis as any).ztoolkit;
    if (toolkit && typeof toolkit.log === "function") {
      toolkit.log("[ObsidianBridge] failed to parse managed frontmatter", e);
    }
    return {};
  }
}

function mergeManagedFrontmatter(
  existingFrontmatter: unknown,
  generatedFrontmatter: Record<string, any>,
) {
  const merged = { ...generatedFrontmatter };
  const preservedFrontmatter = normalizeFrontmatterObject(existingFrontmatter);
  for (const [key, value] of Object.entries(preservedFrontmatter)) {
    if (!MANAGED_FRONTMATTER_RESERVED_KEYS.has(key)) {
      merged[key] = value;
    }
  }
  merged.aliases = mergeFrontmatterLists(
    hasManagedFrontmatterField("titleTranslation")
      ? preservedFrontmatter.aliases
      : [],
    hasManagedFrontmatterField("titleTranslation")
      ? generatedFrontmatter.aliases
      : [],
  );
  if (!merged.aliases.length) {
    delete merged.aliases;
  }
  // Preserve only user-added tags from Obsidian (not from Zotero or system).
  // This ensures that when a tag is deleted in Zotero, it is also removed
  // from the merged `tags` field, while user-only tags are kept.
  const existingTags = getManagedFrontmatterTags(preservedFrontmatter.tags);
  const zoteroSourceTags = new Set(
    getManagedFrontmatterTags(preservedFrontmatter.zotero_tags),
  );
  const userOnlyTags = existingTags.filter(
    (tag) =>
      !MANAGED_FRONTMATTER_SYSTEM_TAGS.has(tag.toLowerCase()) &&
      !zoteroSourceTags.has(tag),
  );
  merged.tags = mergeFrontmatterLists(generatedFrontmatter.tags, userOnlyTags);
  return merged;
}

export {
  MANAGED_NOTE_SCHEMA_VERSION,
  MANAGED_FRONTMATTER_SYSTEM_TAGS,
  MANAGED_FRONTMATTER_RESERVED_KEYS,
  normalizeManagedTag,
  getManagedFrontmatterTags,
  getManagedFrontmatterNonSystemTags,
  normalizeManagedRating,
  buildFrontmatter,
  buildManagedFrontmatterData,
  normalizeFrontmatterObject,
  normalizeFrontmatterList,
  mergeFrontmatterLists,
  parseMarkdownFrontmatter,
  mergeManagedFrontmatter,
};
