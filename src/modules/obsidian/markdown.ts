import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import {
  getFieldLabel,
  getItemTypeLabel,
  getStandardFieldKeysForItemType,
} from "./settings";
import {
  getBestItemLink,
  getBestAttachmentLink,
} from "./paths";
import {
  cleanInline,
  escapeTableValue,
  firstValue,
  formatAbstractLines,
  getFieldSafe,
  getScalarJSONValue,
  normalizeMarkdown,
  parseExtraMap,
} from "./shared";

const GENERATED_BLOCK_START = `<!-- ${config.addonRef}:BEGIN GENERATED -->`;
const GENERATED_BLOCK_END = `<!-- ${config.addonRef}:END GENERATED -->`;
const USER_BLOCK_START = `<!-- ${config.addonRef}:BEGIN USER -->`;
const USER_BLOCK_END = `<!-- ${config.addonRef}:END USER -->`;
const LEGACY_USER_SECTION_MARKERS = [
  "\n## 笔记区",
  "\n## Reading Summary",
  "\n## Notes",
  "\n## Questions",
  "\n## Related",
];

function getObsidianNoteLocaleStrings() {
  return {
    metadataTitle: getString("obsidian-note-metadata-title"),
    metadataKeyLabel: getString("obsidian-note-metadata-column-key"),
    metadataValueLabel: getString("obsidian-note-metadata-column-value"),
    tagsTitle: getString("obsidian-note-tags-title"),
    abstractTitle: getString("obsidian-note-abstract-title"),
    abstractTranslationTitle: getString(
      "obsidian-note-abstractTranslation-title",
    ),
    hiddenInfoTitle: getString("obsidian-note-hiddenInfo-title"),
    emptyAbstract: getString("obsidian-note-emptyAbstract"),
    emptyAbstractTranslation: getString(
      "obsidian-note-emptyAbstractTranslation",
    ),
    workspaceHeading: `## ${getString("obsidian-note-userSection-workspace")}`,
    summaryHeading: `### ${getString("obsidian-note-userSection-summary")}`,
    problemHeading: `### ${getString("obsidian-note-userSection-problem")}`,
    methodHeading: `### ${getString("obsidian-note-userSection-method")}`,
    conclusionHeading: `### ${getString(
      "obsidian-note-userSection-conclusion",
    )}`,
    notesHeading: `## ${getString("obsidian-note-userSection-notes")}`,
    questionsHeading: `## ${getString("obsidian-note-userSection-questions")}`,
    relatedHeading: `## ${getString("obsidian-note-userSection-related")}`,
  };
}

function getUserSectionMarkers() {
  const strings = getObsidianNoteLocaleStrings();
  return Array.from(
    new Set([
      `\n${strings.workspaceHeading}`,
      `\n${strings.notesHeading}`,
      `\n${strings.questionsHeading}`,
      `\n${strings.relatedHeading}`,
      ...LEGACY_USER_SECTION_MARKERS,
    ]),
  );
}

async function buildItemContext(topItem: Zotero.Item) {
  const extraMap = parseExtraMap(getFieldSafe(topItem, "extra"));
  const creators = topItem.getCreators() as Array<
    Partial<{
      name: string;
      firstName: string;
      lastName: string;
    }>
  >;
  const creatorsList = creators
    .map((creator) => {
      if (typeof creator.name === "string" && creator.name.trim()) {
        return creator.name.trim();
      }
      return [creator.firstName, creator.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
    })
    .filter(Boolean);
  const zoteroTagsList = topItem
    .getTags()
    .map((tag) => tag.tag)
    .filter(Boolean);
  const collectionResults =
    (await Zotero.Collections.getCollectionsContainingItems([topItem.id])) as
      | Array<{ name?: string }>
      | false;
  const collectionsList = (
    Array.isArray(collectionResults) ? collectionResults : []
  )
    .map((collection) => cleanInline(collection.name || ""))
    .filter(Boolean);

  const itemJSON = (
    typeof topItem.toJSON === "function" ? topItem.toJSON() : {}
  ) as Record<string, any>;
  const relations = (itemJSON.relations || {}) as Record<
    string,
    string | string[]
  >;
  const relatedList = Array.from(
    new Set(
      Object.values(relations)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => cleanInline(value))
        .filter(Boolean),
    ),
  );

  const rawFieldKeys = Array.from(
    new Set([
      "itemType",
      "title",
      "shortTitle",
      "abstractNote",
      "date",
      "dateAdded",
      "dateModified",
      "extra",
      ...getStandardFieldKeysForItemType(
        cleanInline(itemJSON.itemType || getFieldSafe(topItem, "itemType")),
      ),
      ...Object.keys(itemJSON),
      ...Object.keys(extraMap),
    ]),
  );
  const context: Record<string, string> = {};
  for (const key of rawFieldKeys) {
    context[key] = firstValue(
      getFieldSafe(topItem, key),
      getScalarJSONValue(itemJSON[key]),
      extraMap[key],
    ) as string;
  }

  const titleTranslation = firstValue(
    getFieldSafe(topItem, "titleTranslation"),
    extraMap.titleTranslation,
  ) as string;
  const abstractTranslation = firstValue(
    getFieldSafe(topItem, "abstractTranslation"),
    extraMap.abstractTranslation,
  ) as string;
  const abstract = getFieldSafe(topItem, "abstractNote");

  Object.assign(context, {
    itemType: firstValue(
      itemJSON.itemType,
      context.itemType,
      extraMap.itemType,
    ) as string,
    itemTypeZh: getItemTypeLabel(
      (firstValue(
        itemJSON.itemType,
        context.itemType,
        extraMap.itemType,
      ) as string) || "",
    ),
    title: firstValue(context.title, topItem.key) as string,
    titleTranslation,
    creators: creatorsList.join(", "),
    collection: collectionsList.join("；"),
    tags: zoteroTagsList.join("；"),
    related: relatedList.join("；"),
    // Prefer a collection-specific select URI so Zotero opens the item inside its collection.
    itemLink: await getBestItemLink(topItem),
    pdfLink: await getBestAttachmentLink(topItem),
    qnkey: topItem.key,
    dateY: cleanInline(context.date).match(/(19|20)\d{2}/)?.[0] || "",
    datetimeAdded: context.dateAdded,
    datetimeModified: context.dateModified,
    abstract,
    abstractNote: abstract,
    abstractTranslation,
  });

  return {
    context,
    creatorsList,
    zoteroTagsList,
    collectionsList,
  };
}

function getVisibleFieldValue(
  fieldKey: string,
  context: Record<string, string>,
) {
  const value = cleanInline(context[fieldKey] || "");
  if (!value) {
    return "";
  }
  if (fieldKey === "DOI") {
    return `[${value}](https://doi.org/${value})`;
  }
  if (fieldKey === "itemLink") {
    return `[My Library](${value})`;
  }
  if (fieldKey === "pdfLink") {
    return `[PDF](${value})`;
  }
  if (fieldKey === "url") {
    return `[Link](${value})`;
  }
  return escapeTableValue(value);
}

function getHiddenFieldValue(
  fieldKey: string,
  context: Record<string, string>,
) {
  const value = cleanInline(context[fieldKey] || "");
  if (!value) {
    return "";
  }
  if (fieldKey === "DOI") {
    return `[${value}](https://doi.org/${value})`;
  }
  if (fieldKey === "itemLink") {
    return `[My Library](${value})`;
  }
  if (fieldKey === "pdfLink") {
    return `[PDF](${value})`;
  }
  if (fieldKey === "url") {
    return `[Link](${value})`;
  }
  return value;
}

function buildMetadataCallout(
  visibleFields: string[],
  context: Record<string, string>,
) {
  const strings = getObsidianNoteLocaleStrings();
  const rows = visibleFields
    .map((fieldKey) => {
      const value = getVisibleFieldValue(fieldKey, context);
      if (!value) {
        return "";
      }
      const label = getFieldLabel(fieldKey);
      return `> |${label}|${value}|`;
    })
    .filter(Boolean);
  if (!rows.length) {
    return "";
  }
  return [
    `> [!info]+ <center>${strings.metadataTitle}</center>`,
    ">",
    `> |<div style="width: 5em">${strings.metadataKeyLabel}</div>|${strings.metadataValueLabel}|`,
    "> |--:|:--|",
    ...rows,
    "> ^Metadata",
  ].join("\n");
}

function buildTagsCallout(zoteroTagsList: string[]) {
  const { tagsTitle } = getObsidianNoteLocaleStrings();
  const lines = [
    `> [!example]- <center>${tagsTitle}</center>`,
    ">",
    "> - Obsidian: #literature #zotero",
  ];
  if (zoteroTagsList.length) {
    lines.push(`> - Zotero: ${zoteroTagsList.join("；")}`);
  }
  return lines.join("\n");
}

function buildAbstractCallout(
  title: string,
  text: string,
  type: string,
  emptyPlaceholder?: string,
) {
  const strings = getObsidianNoteLocaleStrings();
  const lines = formatAbstractLines(text);
  if (!lines.length) {
    lines.push(emptyPlaceholder || strings.emptyAbstract);
  }
  return [
    `> [!${type}]- <center>${title}</center>`,
    ">",
    ...lines.map((line) => `> ${line}`),
  ].join("\n");
}

function buildHiddenInfoCallout(
  hiddenFields: string[],
  context: Record<string, string>,
) {
  const { hiddenInfoTitle } = getObsidianNoteLocaleStrings();
  const lines = hiddenFields
    .map((fieldKey) => {
      const value = getHiddenFieldValue(fieldKey, context);
      if (!value) {
        return "";
      }
      return `> ${fieldKey}:: ${value}`;
    })
    .filter(Boolean);
  if (!lines.length) {
    return "";
  }
  return [`> [!tldr]- <center>${hiddenInfoTitle}</center>`, ">", ...lines].join(
    "\n",
  );
}

function getDefaultUserSections() {
  const strings = getObsidianNoteLocaleStrings();
  return [
    strings.workspaceHeading,
    "",
    strings.summaryHeading,
    "",
    "- ",
    "",
    strings.problemHeading,
    "",
    "- ",
    "",
    strings.methodHeading,
    "",
    "- ",
    "",
    strings.conclusionHeading,
    "",
    "- ",
    "",
    strings.notesHeading,
    "",
    "",
    strings.questionsHeading,
    "",
    "- ",
    "",
    strings.relatedHeading,
    "",
    "- ",
  ].join("\n");
}

function escapeRegex(source: string) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractHeadingSection(markdown: string, heading: string) {
  const normalized = String(markdown || "").replace(/\r\n/g, "\n");
  const headingRegex = new RegExp(
    `(?:^|\\n)${escapeRegex(heading)}\\s*(?:\\n|$)([\\s\\S]*?)(?=\\n##\\s+|$)`,
  );
  const match = normalized.match(headingRegex);
  return match?.[1]?.trim() || "";
}

function extractLegacySummaryValue(summaryBlock: string, label: string) {
  const regex = new RegExp(`^-\\s*${escapeRegex(label)}\\s*:?\\s*(.*)$`, "mi");
  const match = summaryBlock.match(regex);
  return cleanInline(match?.[1] || "");
}

function normalizeLegacyUserSections(markdown: string) {
  if (
    !/^##\s+Reading Summary/m.test(markdown) ||
    !/^\s*-\s*One-sentence summary\s*:/m.test(markdown)
  ) {
    return markdown;
  }

  const strings = getObsidianNoteLocaleStrings();
  const summaryBlock = extractHeadingSection(markdown, "## Reading Summary");
  const notesBlock = extractHeadingSection(markdown, "## Notes");
  const questionsBlock = extractHeadingSection(markdown, "## Questions");
  const relatedBlock = extractHeadingSection(markdown, "## Related");

  return [
    strings.workspaceHeading,
    "",
    strings.summaryHeading,
    "",
    `- ${extractLegacySummaryValue(summaryBlock, "One-sentence summary")}`,
    "",
    strings.problemHeading,
    "",
    `- ${extractLegacySummaryValue(summaryBlock, "Core problem")}`,
    "",
    strings.methodHeading,
    "",
    `- ${extractLegacySummaryValue(summaryBlock, "Main method")}`,
    "",
    strings.conclusionHeading,
    "",
    `- ${extractLegacySummaryValue(summaryBlock, "Key result")}`,
    "",
    strings.notesHeading,
    "",
    notesBlock,
    "",
    strings.questionsHeading,
    "",
    questionsBlock || "- ",
    "",
    strings.relatedHeading,
    "",
    relatedBlock || "- ",
  ].join("\n");
}

function stripFrontmatter(markdown: string) {
  return normalizeMarkdown(markdown)
    .replace(/^---\n[\s\S]*?\n---\n*/m, "")
    .trim();
}

function extractMarkedBlock(
  markdown: string,
  startMarker: string,
  endMarker: string,
) {
  const normalized = normalizeMarkdown(markdown);
  const startIndex = normalized.indexOf(startMarker);
  if (startIndex < 0) {
    return null;
  }
  const contentStart = startIndex + startMarker.length;
  const endIndex = normalized.indexOf(endMarker, contentStart);
  return normalized.slice(contentStart, endIndex >= 0 ? endIndex : undefined);
}

function extractUserSections(markdown: string) {
  const normalized = stripFrontmatter(markdown);
  if (!normalized) {
    return getDefaultUserSections();
  }
  const markedUserSections = extractMarkedBlock(
    normalized,
    USER_BLOCK_START,
    USER_BLOCK_END,
  );
  if (markedUserSections !== null) {
    return (
      normalizeLegacyUserSections(markedUserSections.trim()) ||
      getDefaultUserSections()
    );
  }
  const indices = getUserSectionMarkers()
    .map((marker) =>
    normalized.indexOf(marker),
    )
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);
  if (!indices.length) {
    const strings = getObsidianNoteLocaleStrings();
    const looksLikeGeneratedLayout =
      /^---\n[\s\S]*?\n---/.test(normalized) ||
      /^#\s+/m.test(normalized) ||
      /> \[!info\].*<\/center>/i.test(normalized) ||
      new RegExp(
        `^##\\s+(${escapeRegex(strings.abstractTitle)}|Abstract)`,
        "m",
      ).test(normalized);
    return looksLikeGeneratedLayout ? getDefaultUserSections() : normalized;
  }
  const extracted = normalized.slice(indices[0] + 1).trim();
  return normalizeLegacyUserSections(extracted) || getDefaultUserSections();
}

function extractManagedObsidianUserMarkdown(markdown: string) {
  const normalized = stripFrontmatter(markdown);
  const hasUserStart = normalized.includes(USER_BLOCK_START);
  const hasUserEnd = normalized.includes(USER_BLOCK_END);
  if (hasUserStart !== hasUserEnd) {
    return null;
  }
  if (hasUserStart && hasUserEnd) {
    return extractUserSections(markdown);
  }
  const hasLegacyUserSections = getUserSectionMarkers().some((marker) =>
    normalized.includes(marker),
  );
  if (hasLegacyUserSections) {
    return extractUserSections(markdown);
  }
  return null;
}

export {
  GENERATED_BLOCK_START,
  GENERATED_BLOCK_END,
  USER_BLOCK_START,
  USER_BLOCK_END,
  buildItemContext,
  getVisibleFieldValue,
  getHiddenFieldValue,
  buildMetadataCallout,
  buildTagsCallout,
  buildAbstractCallout,
  buildHiddenInfoCallout,
  getDefaultUserSections,
  escapeRegex,
  extractHeadingSection,
  extractLegacySummaryValue,
  normalizeLegacyUserSections,
  extractUserSections,
  stripFrontmatter,
  extractMarkedBlock,
  extractManagedObsidianUserMarkdown,
};
