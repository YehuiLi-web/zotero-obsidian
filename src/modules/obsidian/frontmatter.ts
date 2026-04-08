import YAML = require("yamljs");
import { logError } from "../../utils/errorUtils";
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
  parseExtraMap,
  updateExtraField,
  yamlQuote,
} from "./shared";

const MANAGED_NOTE_SCHEMA_VERSION = 1;
const MANAGED_FRONTMATTER_SYSTEM_TAGS = new Set(["literature", "zotero"]);
const MANAGED_LIBRARY_ID_CACHE = new Map<string, number>();
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
  "citekey",
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

function getManagedFrontmatterBridge(
  meta: Record<string, any> | null | undefined,
) {
  const normalizedMeta = normalizeFrontmatterObject(meta);
  const zoteroKey = cleanInline(
    String(
      firstValue(
        normalizedMeta.zotero_key,
        normalizedMeta.$itemKey,
        normalizedMeta.item_key,
      ) || "",
    ),
  );
  const noteKey = cleanInline(
    String(
      firstValue(
        normalizedMeta.zotero_note_key,
        normalizedMeta.$noteKey,
        normalizedMeta.note_key,
        normalizedMeta.$itemKey,
      ) || "",
    ),
  );
  const legacyManaged = Boolean(normalizedMeta.bridge_managed);
  const hasDualKeys = Boolean(zoteroKey && noteKey);
  return {
    zoteroKey,
    noteKey,
    legacyManaged,
    hasDualKeys,
    isManaged: hasDualKeys || legacyManaged,
  };
}

function resolveManagedFrontmatterLibraryID(
  meta: Record<string, any> | null | undefined,
  options: {
    zoteroKey?: string;
    noteKey?: string;
  } = {},
) {
  const normalizedMeta = normalizeFrontmatterObject(meta);
  const explicitLibraryID = Number(
    firstValue(
      normalizedMeta.$libraryID,
      normalizedMeta.libraryID,
      normalizedMeta.library_id,
    ) || 0,
  );
  if (Number.isFinite(explicitLibraryID) && explicitLibraryID > 0) {
    return explicitLibraryID;
  }

  const bridge = getManagedFrontmatterBridge(normalizedMeta);
  const zoteroKey = cleanInline(options.zoteroKey || bridge.zoteroKey);
  const noteKey = cleanInline(options.noteKey || bridge.noteKey);
  if (!zoteroKey && !noteKey) {
    return 0;
  }

  const cacheKey = `${zoteroKey.toLowerCase()}::${noteKey.toLowerCase()}`;
  if (MANAGED_LIBRARY_ID_CACHE.has(cacheKey)) {
    return MANAGED_LIBRARY_ID_CACHE.get(cacheKey) || 0;
  }

  const libraries =
    typeof Zotero?.Libraries?.getAll === "function" ? Zotero.Libraries.getAll() : [];
  for (const library of libraries) {
    const libraryID = Number((library as { libraryID?: number })?.libraryID || 0);
    if (!libraryID) {
      continue;
    }

    if (noteKey) {
      const noteItem = Zotero.Items.getByLibraryAndKey(
        libraryID,
        noteKey,
      ) as Zotero.Item | false;
      if (noteItem && noteItem.isNote()) {
        if (!zoteroKey) {
          MANAGED_LIBRARY_ID_CACHE.set(cacheKey, libraryID);
          return libraryID;
        }
        const parentID = Number(noteItem.parentID || 0);
        const topItem =
          noteItem.parentItem?.isRegularItem()
            ? noteItem.parentItem
            : parentID
              ? (Zotero.Items.get(parentID) as Zotero.Item | false)
              : false;
        if (topItem && topItem.isRegularItem() && cleanInline(topItem.key) === zoteroKey) {
          MANAGED_LIBRARY_ID_CACHE.set(cacheKey, libraryID);
          return libraryID;
        }
      }
    }

    if (zoteroKey) {
      const topItem = Zotero.Items.getByLibraryAndKey(
        libraryID,
        zoteroKey,
      ) as Zotero.Item | false;
      if (topItem && topItem.isRegularItem()) {
        MANAGED_LIBRARY_ID_CACHE.set(cacheKey, libraryID);
        return libraryID;
      }
    }
  }

  return 0;
}

function isManagedFrontmatterBridge(
  meta: Record<string, any> | null | undefined,
  options: {
    zoteroKey?: string;
    noteKey?: string;
  } = {},
) {
  const bridge = getManagedFrontmatterBridge(meta);
  if (!bridge.isManaged) {
    return false;
  }
  const expectedZoteroKey = cleanInline(options.zoteroKey);
  if (
    expectedZoteroKey &&
    bridge.zoteroKey &&
    bridge.zoteroKey !== expectedZoteroKey
  ) {
    return false;
  }
  const expectedNoteKey = cleanInline(options.noteKey);
  if (expectedNoteKey && bridge.noteKey && bridge.noteKey !== expectedNoteKey) {
    return false;
  }
  return true;
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
  const extraMap = parseExtraMap(getFieldSafe(topItem, "extra"));
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
    zotero_key: cleanInline(context.qnkey),
    zotero_note_key: cleanInline(noteItem.key),
  };
  if (selectedFields.has("libraryId")) {
    frontmatter.$libraryID = noteItem.libraryID;
  }
  if (selectedFields.has("noteVersion")) {
    frontmatter.$version = noteItem.version;
  }
  if (selectedFields.has("title")) {
    const title = cleanInline(context.title);
    if (title) {
      frontmatter.title = title;
    }
  }
  if (selectedFields.has("readingStatus")) {
    frontmatter.reading_status = status || "inbox";
  }
  if (selectedFields.has("obsidianTags") && tags.length) {
    frontmatter.tags = tags;
  }
  let citationKeyValue = cleanInline(
    String(
      firstValue(
        context.citationKey,
        context.citekey,
        getFieldSafe(topItem, "citationKey"),
        extraMap.citationKey,
      ) || "",
    ),
  );
  if (!citationKeyValue) {
    citationKeyValue = cleanInline(
      context.uniqueKey ||
        context.qnkey ||
        context.key ||
        getFieldSafe(topItem, "key"),
    );
  }
  if (citationKeyValue && selectedFields.has("citationKey")) {
    frontmatter.citation_key = citationKeyValue;
  }
  const titleTranslation = cleanInline(context.titleTranslation);
  if (titleTranslation) {
    if (selectedFields.has("aliases")) {
      frontmatter.aliases = [titleTranslation];
    }
    if (selectedFields.has("titleTranslation")) {
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
    logError("Parse managed frontmatter", e);
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
    hasManagedFrontmatterField("aliases")
      ? preservedFrontmatter.aliases
      : [],
    hasManagedFrontmatterField("aliases")
      ? generatedFrontmatter.aliases
      : [],
  );
  if (!merged.aliases.length) {
    delete merged.aliases;
  }
  // Preserve only user-added tags from Obsidian (not from Zotero or system).
  // This ensures that when a tag is deleted in Zotero, it is also removed
  // from the merged `tags` field, while user-only tags are kept.
  if (hasManagedFrontmatterField("obsidianTags")) {
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
  } else {
    delete merged.tags;
  }
  if (!Array.isArray(merged.tags) || !merged.tags.length) {
    delete merged.tags;
  }
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
  getManagedFrontmatterBridge,
  resolveManagedFrontmatterLibraryID,
  isManagedFrontmatterBridge,
  buildFrontmatter,
  buildManagedFrontmatterData,
  normalizeFrontmatterObject,
  normalizeFrontmatterList,
  mergeFrontmatterLists,
  parseMarkdownFrontmatter,
  mergeManagedFrontmatter,
};
