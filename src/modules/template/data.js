"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TEMPLATES = exports.SYSTEM_TEMPLATE_NAMES = void 0;
const package_json_1 = require("../../../package.json");
const SYSTEM_TEMPLATE_NAMES = [
    "[QuickInsertV3]",
    "[QuickImportV2]",
    "[QuickNoteV5]",
    "[ExportMDFileNameV2]",
    "[ExportMDFileHeaderV2]",
    "[ExportMDFileContent]",
    "[ExportLatexFileContent]",
];
exports.SYSTEM_TEMPLATE_NAMES = SYSTEM_TEMPLATE_NAMES;
// Non-system templates are removed from default templates
const DEFAULT_TEMPLATES = [
    {
        name: "[QuickInsertV3]",
        text: `// @use-markdown
[\${linkText}](\${link})`,
    },
    {
        name: "[QuickImportV2]",
        text: `<blockquote>
\${{
  return await Zotero.${package_json_1.config.addonInstance}.api.convert.link2html(link, {noteItem, dryRun: _env.dryRun});
}}$
</blockquote>`,
    },
    {
        name: "[QuickNoteV5]",
        text: `\${{
  let res = "";
  if (annotationItem.annotationComment) {
    res += await Zotero.${package_json_1.config.addonInstance}.api.convert.md2html(
      annotationItem.annotationComment
    );
  }
  res += await Zotero.${package_json_1.config.addonInstance}.api.convert.annotations2html([annotationItem], {noteItem, ignoreComment: true});
  return res;
}}$`,
    },
    {
        name: "[ExportMDFileNameV2]",
        text: '${(noteItem.getNoteTitle ? noteItem.getNoteTitle().replace(/[/\\\\?%*:|"<> ]/g, "-") + "-" : "")}${noteItem.key}.md',
    },
    {
        name: "[ExportMDFileHeaderV2]",
        text: `\${{
  let header = {};
  header.tags = noteItem.getTags().map((_t) => _t.tag);
  header.parent = noteItem.parentItem
    ? noteItem.parentItem.getField("title")
    : "";
  header.collections = (
    await Zotero.Collections.getCollectionsContainingItems([
      (noteItem.parentItem || noteItem).id,
    ])
  ).map((c) => c.name);
  return JSON.stringify(header);
}}$`,
    },
    {
        name: "[ExportMDFileContent]",
        text: `\${{
  return mdContent;
}}$`,
    },
    {
        name: "[ExportLatexFileContent]",
        text: `\${{
  return latexContent;
}}$`,
    },
    {
        name: "[Item] Obsidian Literature Workbench",
        text: `// @use-markdown
# \${topItem.getField("title") || topItem.key}

## 笔记区

### 一句话总结

- 

### 研究问题

- 

### 核心方法

- 

### 主要结论

- 

## Notes


## Questions

- 

## Related

- `,
    },
    {
        name: "[Item] Obsidian Literature Note",
        text: `// @use-markdown
> [!warning]
> Legacy example template.
> The managed Obsidian literature workflow is rendered by the plugin from \`[Item] Obsidian Literature Workbench\`.

\${{
  const parseExtraMap = (extraText) => {
    const map = {};
    for (const rawLine of String(extraText || "").split(/\\r?\\n/)) {
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
      if (key && !Object.prototype.hasOwnProperty.call(map, key)) {
        map[key] = value;
      }
    }
    return map;
  };
  const getFieldSafe = (key) => {
    try {
      return topItem.getField(key) || "";
    } catch (e) {
      return "";
    }
  };
  const firstValue = (...values) =>
    values.find((value) => value !== "" && value !== null && value !== undefined) || "";
  const cleanInline = (value) =>
    String(value || "")
      .replace(/\\r?\\n/g, " ")
      .replace(/\\s+/g, " ")
      .trim();
  const yamlQuote = (value) =>
    '"' +
    cleanInline(value)
      .replace(/\\\\/g, "\\\\\\\\")
      .replace(/"/g, '\\\\"') +
    '"';
  const yamlListBlock = (key, values) => {
    const items = values.filter(Boolean).map((value) => cleanInline(value));
    if (!items.length) {
      return key + ": []";
    }
    return [key + ":", ...items.map((value) => "  - " + yamlQuote(value))].join("\\n");
  };
  const buildLibraryURI = (action, item) => {
    if (!item?.key) {
      return "";
    }
    if (item.libraryID === 1) {
      return "zotero://" + action + "/library/items/" + item.key;
    }
    const groupID = Zotero.Libraries.get(item.libraryID).id;
    return "zotero://" + action + "/groups/" + groupID + "/items/" + item.key;
  };
  const makeItemLink = (item) => {
    return buildLibraryURI("select", item);
  };
  const buildCollectionItemLink = (item, collection) => {
    const collectionKey = cleanInline(collection?.key || "");
    if (!item?.key || !collectionKey) {
      return makeItemLink(item);
    }
    if (item.libraryID === 1) {
      return "zotero://select/library/collections/" + collectionKey + "/items/" + item.key;
    }
    const groupID = Zotero.Libraries.get(item.libraryID).id;
    return "zotero://select/groups/" + groupID + "/collections/" + collectionKey + "/items/" + item.key;
  };
  const getBestItemLink = async (item) => {
    if (!item?.id) {
      return makeItemLink(item);
    }
    const collections = await Zotero.Collections.getCollectionsContainingItems([item.id]);
    return buildCollectionItemLink(item, Array.isArray(collections) ? collections[0] : null);
  };
  const makeAttachmentLink = (item) => {
    return buildLibraryURI("open", item);
  };
  const getBestAttachmentLink = async (item) => {
    if (!item || typeof item.getBestAttachment !== "function") {
      return "";
    }
    const attachment = await item.getBestAttachment();
    if (!attachment) {
      return "";
    }
    return makeAttachmentLink(attachment);
  };
  const extraMap = parseExtraMap(getFieldSafe("extra"));
  const title = firstValue(getFieldSafe("title"), topItem.key);
  const titleTranslation = firstValue(
    getFieldSafe("titleTranslation"),
    extraMap.titleTranslation,
  );
  const abstractNote = firstValue(getFieldSafe("abstractNote"));
  const abstractTranslation = firstValue(
    getFieldSafe("abstractTranslation"),
    extraMap.abstractTranslation,
  );
  const creators = topItem
    .getCreators()
    .map((creator) => {
      if (creator.name) {
        return creator.name;
      }
      return [creator.firstName, creator.lastName].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean);
  const zoteroTags = topItem.getTags().map((tag) => tag.tag).filter(Boolean);
  const collections = (
    await Zotero.Collections.getCollectionsContainingItems([topItem.id])
  ).map((collection) => collection.name);
  const date = getFieldSafe("date");
  const yearMatch = cleanInline(date).match(/(19|20)\\d{2}/);
  const year = yearMatch ? yearMatch[0] : "";
  const doi = getFieldSafe("DOI");
  const publication = firstValue(
    getFieldSafe("publicationTitle"),
    getFieldSafe("journalAbbreviation"),
    getFieldSafe("bookTitle"),
  );
  const volume = getFieldSafe("volume");
  const issue = getFieldSafe("issue");
  const pages = getFieldSafe("pages");
  const url = getFieldSafe("url");
  const citationKey = firstValue(
    getFieldSafe("citationKey"),
    extraMap.citationKey,
  );
  const itemLink = await getBestItemLink(topItem);
  const pdfLink = await getBestAttachmentLink(topItem);
  const firstAuthor = creators.length ? creators[0] : "";
  const citationLabel = [firstAuthor, year].filter(Boolean).join(", ");
  const lines = [
    "---",
    "title: " + yamlQuote(title),
    "title_translation: " + yamlQuote(titleTranslation),
    "zotero_key: " + yamlQuote(topItem.key),
    "item_type: " + yamlQuote(getFieldSafe("itemType")),
    "year: " + yamlQuote(year),
    "date: " + yamlQuote(date),
    "doi: " + yamlQuote(doi),
    "citation_key: " + yamlQuote(citationKey),
    "publication: " + yamlQuote(publication),
    "volume: " + yamlQuote(volume),
    "issue: " + yamlQuote(issue),
    "pages: " + yamlQuote(pages),
    "url: " + yamlQuote(url),
    "item_link: " + yamlQuote(itemLink),
    "pdf_link: " + yamlQuote(pdfLink),
    yamlListBlock("authors", creators),
    yamlListBlock("zotero_tags", zoteroTags),
    yamlListBlock("collections", collections),
    "tags:",
    '  - "literature"',
    '  - "zotero"',
    "---",
    "",
    "# " + title,
    "",
    titleTranslation
      ? "> [!note]- 中文标题\\n> " + titleTranslation.replace(/\\r?\\n/g, "<br>")
      : "",
    "> [!info]- Metadata",
    "> - Authors: " + (creators.join("; ") || "N/A"),
    "> - Year: " + (year || "N/A"),
    "> - Publication: " + (publication || "N/A"),
    doi ? "> - DOI: [" + doi + "](https://doi.org/" + doi + ")" : "> - DOI: N/A",
    "> - Collections: " + (collections.join("; ") || "N/A"),
    "> - Tags: " + (zoteroTags.join("; ") || "N/A"),
    "> - Zotero: [Item](" + itemLink + ")" + (pdfLink ? " | [PDF](" + pdfLink + ")" : ""),
    "",
    "## Abstract",
    "",
    abstractNote || "_No abstract available._",
    "",
    "## 摘要翻译",
    "",
    abstractTranslation || "_无摘要翻译_",
    "",
    "## Reading Summary",
    "",
    "- Citation: " + (citationLabel || "N/A"),
    "- One-sentence summary: ",
    "- Core problem: ",
    "- Main method: ",
    "- Key result: ",
    "",
    "## Notes",
    "",
    "",
    "## Questions",
    "",
    "- ",
    "",
    "## Related",
    "",
    "- Obsidian links: ",
    "- Follow-up papers: ",
  ];
  return lines
    .filter((line) => line !== null && line !== undefined && line !== false)
    .join("\\n");
}}$`,
    },
    {
        name: "[Item] Field Probe",
        text: `// @use-markdown
\${{
  const defaultCustomProbeKeys = [
    "titleTranslation",
    "abstractTranslation",
    "citationKey",
    "JCRQ",
  ];

  const exprPrefix = "$" + "{";
  const fence = "\`\`\`";
  const itemJSON =
    typeof topItem.toJSON === "function" ? topItem.toJSON() : {};
  const itemTypeID =
    typeof topItem.itemTypeID === "number" ? topItem.itemTypeID : -1;
  const itemTypeName = itemJSON.itemType || "";
  const creators =
    typeof topItem.getCreators === "function" ? topItem.getCreators() : [];
  const tags = typeof topItem.getTags === "function" ? topItem.getTags() : [];
  const collections = (
    await Zotero.Collections.getCollectionsContainingItems([topItem.id])
  ).map((collection) => collection.name);
  const attachmentItems = Zotero.Items.get(
    typeof topItem.getAttachments === "function" ? topItem.getAttachments() : [],
  );
  const noteItems = Zotero.Items.get(
    typeof topItem.getNotes === "function" ? topItem.getNotes() : [],
  );

  const attachments = attachmentItems.map((attachment) => ({
    id: attachment.id,
    key: attachment.key,
    title: attachment.getField("title"),
    contentType: attachment.attachmentContentType || "",
    linkMode: attachment.attachmentLinkMode,
  }));
  const childNotes = noteItems.map((note) => ({
    id: note.id,
    key: note.key,
    title:
      typeof note.getNoteTitle === "function" ? note.getNoteTitle() || "" : "",
    noteLength:
      typeof note.getNote === "function" ? (note.getNote() || "").length : 0,
  }));

  const isMeaningfulValue = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (value && typeof value === "object") {
      return Object.keys(value).length > 0;
    }
    return value !== "" && value !== null && value !== undefined;
  };
  const parseExtraEntries = (extraText) =>
    String(extraText || "")
      .split(/\\r?\\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const dividerIndex = line.indexOf(":");
        if (dividerIndex < 0) {
          return {
            key: "",
            value: line,
          };
        }
        return {
          key: line.slice(0, dividerIndex).trim(),
          value: line.slice(dividerIndex + 1).trim(),
        };
      });
  const extraText =
    typeof itemJSON.extra === "string"
      ? itemJSON.extra
      : typeof topItem.getField === "function"
        ? topItem.getField("extra") || ""
        : "";
  const extraEntries = parseExtraEntries(extraText);
  const extraValueMap = {};
  for (const entry of extraEntries) {
    if (entry.key && !Object.prototype.hasOwnProperty.call(extraValueMap, entry.key)) {
      extraValueMap[entry.key] = entry.value;
    }
  }
  const primitiveJSONEntries = Object.entries(itemJSON)
    .filter(([, value]) => {
      return (
        value !== "" &&
        value !== null &&
        value !== undefined &&
        !Array.isArray(value) &&
        typeof value !== "object"
      );
    })
    .sort(([left], [right]) => left.localeCompare(right));
  const standardFieldIDs =
    typeof Zotero !== "undefined" &&
    Zotero.ItemFields &&
    typeof Zotero.ItemFields.getItemTypeFields === "function" &&
    itemTypeID >= 0
      ? Zotero.ItemFields.getItemTypeFields(itemTypeID) || []
      : [];
  const standardFieldEntries = standardFieldIDs
    .map((fieldID) => {
      const fieldName =
        typeof Zotero.ItemFields.getName === "function"
          ? Zotero.ItemFields.getName(fieldID) || String(fieldID)
          : String(fieldID);
      let value;
      let hasValue = false;
      let error = "";
      let baseFieldName = "";
      try {
        value = topItem.getField(fieldName);
        hasValue = isMeaningfulValue(value);
      } catch (e) {
        error = String(e);
      }
      try {
        if (typeof Zotero.ItemFields.getBaseIDFromTypeAndField === "function") {
          const baseFieldID = Zotero.ItemFields.getBaseIDFromTypeAndField(
            itemTypeID,
            fieldID,
          );
          if (baseFieldID && typeof Zotero.ItemFields.getName === "function") {
            baseFieldName = Zotero.ItemFields.getName(baseFieldID) || "";
          }
        }
      } catch (e) {}
      return {
        fieldID,
        fieldName,
        baseFieldName,
        value,
        hasValue,
        error,
      };
    })
    .filter((entry) => entry.fieldName)
    .sort((left, right) => left.fieldName.localeCompare(right.fieldName));
  const standardFieldNames = new Set(
    standardFieldEntries.map((entry) => entry.fieldName),
  );
  const standardFieldValueMap = {};
  for (const entry of standardFieldEntries) {
    if (entry.hasValue) {
      standardFieldValueMap[entry.fieldName] = entry.value;
    }
  }
  const nonStandardScalarEntries = primitiveJSONEntries
    .filter(([key]) => !standardFieldNames.has(key))
    .map(([key, value]) => ({
      key,
      value,
    }));
  const customProbeKeys = Array.from(
    new Set([
      ...defaultCustomProbeKeys,
      ...extraEntries.map((entry) => entry.key).filter(Boolean),
    ]),
  ).sort((left, right) => left.localeCompare(right));
  const customFieldEntries = customProbeKeys.map((key) => {
    let getFieldValue;
    let getFieldError = "";
    try {
      getFieldValue = topItem.getField(key);
    } catch (e) {
      getFieldError = String(e);
    }
    const extraValue = Object.prototype.hasOwnProperty.call(extraValueMap, key)
      ? extraValueMap[key]
      : undefined;
    return {
      key,
      getFieldValue,
      extraValue,
      hasGetFieldValue: isMeaningfulValue(getFieldValue),
      hasExtraValue: isMeaningfulValue(extraValue),
      getFieldError,
    };
  });
  const customFieldValueMap = {};
  for (const entry of customFieldEntries) {
    if (entry.hasGetFieldValue || entry.hasExtraValue) {
      customFieldValueMap[entry.key] = {
        getField: entry.hasGetFieldValue ? entry.getFieldValue : "",
        extra: entry.hasExtraValue ? entry.extraValue : "",
      };
    }
  }
  const filledStandardEntries = standardFieldEntries.filter(
    (entry) => entry.hasValue,
  );
  const emptyStandardEntries = standardFieldEntries.filter(
    (entry) => !entry.hasValue,
  );
  const fieldExpression = (fieldName) =>
    "\`" + exprPrefix + 'topItem.getField("' + fieldName + '")}\`';
  const formatInline = (value) => {
    const raw =
      typeof value === "string" ? value : JSON.stringify(value) || String(value);
    const normalized = String(raw)
      .replaceAll("\\r\\n", "\\n")
      .replaceAll("\\n", "<br>");
    const short =
      normalized.length > 140 ? normalized.slice(0, 140) + "..." : normalized;
    return short.replaceAll("|", "\\\\|");
  };
  const formatJSON = (value) => JSON.stringify(value, null, 2);
  const formatCodeBlock = (value) =>
    fence + "json\\n" + formatJSON(value) + "\\n" + fence;
  const standardCoverageRows = standardFieldEntries
    .map(
      (entry) =>
        "| " +
        entry.fieldName +
        " | " +
        (entry.hasValue ? "yes" : "no") +
        " | " +
        (entry.baseFieldName || "") +
        " | " +
        fieldExpression(entry.fieldName) +
        " |",
    )
    .join("\\n");
  const filledStandardRows = filledStandardEntries
    .map(
      (entry) =>
        "| " +
        entry.fieldName +
        " | " +
        formatInline(entry.value) +
        " | " +
        fieldExpression(entry.fieldName) +
        " |",
    )
    .join("\\n");
  const emptyStandardLines = emptyStandardEntries
    .map(
      (entry) =>
        "- \`" +
        entry.fieldName +
        "\`: " +
        fieldExpression(entry.fieldName),
    )
    .join("\\n");
  const nonStandardScalarRows = nonStandardScalarEntries
    .map(
      (entry) =>
        "| " +
        entry.key +
        " | " +
        formatInline(entry.value) +
        " | \`item.toJSON()." +
        entry.key +
        "\` |",
    )
    .join("\\n");
  const extraRows = extraEntries
    .map(
      (entry) =>
        "| " +
        formatInline(entry.key || "(raw)") +
        " | " +
        formatInline(entry.value) +
        " |",
    )
    .join("\\n");
  const customRows = customFieldEntries
    .map(
      (entry) =>
        "| " +
        formatInline(entry.key) +
        " | " +
        (entry.hasGetFieldValue ? formatInline(entry.getFieldValue) : "") +
        " | " +
        (entry.hasExtraValue ? formatInline(entry.extraValue) : "") +
        " | " +
        fieldExpression(entry.key) +
        " |",
    )
    .join("\\n");
  const structuredExpressions = [
    "- \`creators\`: \`" + exprPrefix + "topItem.getCreators()}\`",
    "- \`tags\`: \`" + exprPrefix + "topItem.getTags()}\`",
    "- \`attachments\`: \`" + exprPrefix + "topItem.getAttachments()}\`",
    "- \`notes\`: \`" + exprPrefix + "topItem.getNotes()}\`",
  ].join("\\n");

  return [
    "# Field Probe: " + (topItem.getField("title") || topItem.key),
    "",
    "> [!info]",
    "> This probe shows what Obsidian Bridge can read from the current Zotero item.",
    "> It now includes schema-level standard fields, current values, and plugin/custom field probing.",
    "",
    "## Summary",
    "",
    "- itemKey: \`" + topItem.key + "\`",
    "- itemType: \`" + itemTypeName + "\`",
    "- itemTypeID: \`" + itemTypeID + "\`",
    "- libraryID: \`" + topItem.libraryID + "\`",
    "- standardFieldCount: \`" + standardFieldEntries.length + "\`",
    "- filledStandardFieldCount: \`" + filledStandardEntries.length + "\`",
    "- emptyStandardFieldCount: \`" + emptyStandardEntries.length + "\`",
    "- parsedExtraKeyCount: \`" + extraEntries.filter((entry) => entry.key).length + "\`",
    "",
    "## How To Read Data",
    "",
    "- Standard field schema: \`Zotero.ItemFields.getItemTypeFields(topItem.itemTypeID)\`",
    "- Scalar field: \`" + exprPrefix + 'topItem.getField("FIELD_KEY")}\`',
    "- Authors: \`" + exprPrefix + "topItem.getCreators()}\`",
    "- Tags: \`" + exprPrefix + "topItem.getTags()}\`",
    "- Child notes: \`" + exprPrefix + "topItem.getNotes()}\`",
    "- Attachments: \`" + exprPrefix + "topItem.getAttachments()}\`",
    "",
    "## All Standard Fields For This Item Type",
    "",
    "| Field | Has Value | Base Field | Expression |",
    "| --- | --- | --- | --- |",
    standardCoverageRows || "| (none) | | | |",
    "",
    "## Filled Standard Fields",
    "",
    "| Field | Preview | Expression |",
    "| --- | --- | --- |",
    filledStandardRows || "| (none) | | |",
    "",
    "## Empty Standard Fields",
    "",
    emptyStandardLines || "- No empty standard fields.",
    "",
    "## Full Standard Field Value Map",
    "",
    formatCodeBlock(standardFieldValueMap),
    "",
    "## Non-Standard Scalar Keys From item.toJSON()",
    "",
    "| Key | Preview | Source |",
    "| --- | --- | --- |",
    nonStandardScalarRows || "| (none) | | |",
    "",
    "## Parsed Extra Field",
    "",
    "| Key | Value |",
    "| --- | --- |",
    extraRows || "| (none) | |",
    "",
    "## Custom / Plugin Field Probe",
    "",
    "- Probe keys come from the built-in list plus any keys parsed from \`extra\`.",
    "| Key | topItem.getField() | extra | Expression |",
    "| --- | --- | --- | --- |",
    customRows || "| (none) | | | |",
    "",
    "## Resolved Custom / Plugin Values",
    "",
    formatCodeBlock(customFieldValueMap),
    "",
    "## Structured Expressions",
    "",
    structuredExpressions,
    "",
    "## Creators",
    "",
    formatCodeBlock(creators),
    "",
    "## Tags",
    "",
    formatCodeBlock(tags),
    "",
    "## Collections",
    "",
    formatCodeBlock(collections),
    "",
    "## Attachments",
    "",
    formatCodeBlock(attachments),
    "",
    "## Child Notes",
    "",
    formatCodeBlock(childNotes),
    "",
    "## Raw item.toJSON()",
    "",
    formatCodeBlock(itemJSON),
  ].join("\\n");
}}$`,
    },
];
exports.DEFAULT_TEMPLATES = DEFAULT_TEMPLATES;
