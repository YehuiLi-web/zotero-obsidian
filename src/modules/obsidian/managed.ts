import { fileExists, formatPath, jointPath } from "../../utils/str";
import { getString } from "../../utils/locale";
import { getPref } from "../../utils/prefs";
import {
  ensureChildNoteHeading,
  getChildNoteBridgeConfig,
  getChildNoteDisplayTitle,
  getChildNoteExcludeMap,
  normalizeChildNoteTag,
  setChildNoteExcludeMap,
} from "./childNotes";
import {
  MANAGED_FRONTMATTER_SYSTEM_TAGS,
  buildFrontmatter,
  buildManagedFrontmatterData,
  getManagedFrontmatterNonSystemTags,
  mergeFrontmatterLists,
  mergeManagedFrontmatter,
  normalizeFrontmatterObject,
  normalizeManagedRating,
  normalizeManagedTag,
  parseMarkdownFrontmatter,
} from "./frontmatter";
import {
  buildAbstractCallout,
  GENERATED_BLOCK_END,
  GENERATED_BLOCK_START,
  buildHiddenInfoCallout,
  buildItemContext,
  buildMetadataCallout,
  buildTagsCallout,
  extractManagedObsidianUserMarkdown,
  extractUserSections,
  stripFrontmatter,
  USER_BLOCK_END,
  USER_BLOCK_START,
} from "./markdown";
import {
  buildManagedObsidianFileName,
  ensureMarkdownExtension,
  findExistingObsidianNote,
  getManagedObsidianUniqueKey,
  sanitizeFileNamePart,
} from "./paths";
import {
  getConfiguredFields,
  getItemMapKey,
  getManagedFrontmatterFields,
  getManagedNoteContentConfig,
  getMetadataPreset,
  getObsidianItemNoteMap,
  OBSIDIAN_UPDATE_STRATEGY_PREF,
  normalizeObsidianUpdateStrategy,
} from "./settings";
import {
  cleanInline,
  firstValue,
  getFieldSafe,
  hasFrontmatterKey,
  normalizeStableValue,
  stableJSONStringify,
  updateExtraField,
} from "./shared";

async function applyManagedObsidianFrontmatter(
  noteItem: Zotero.Item,
  meta: Record<string, any> | null | undefined,
) {
  const normalizedMeta = normalizeFrontmatterObject(meta);
  const topItem =
    (await findManagedTopItemFresh(noteItem)) ||
    findManagedTopItem(noteItem) ||
    findManagedTopItemFromMeta(noteItem, normalizedMeta);
  if (!noteItem?.isNote() || !topItem || !topItem.isRegularItem() || !meta) {
    return false;
  }
  let dirty = false;

  if (
    hasFrontmatterKey(normalizedMeta, "reading_status") ||
    hasFrontmatterKey(normalizedMeta, "status")
  ) {
    const currentExtra = getFieldSafe(topItem, "extra");
    const nextExtra = updateExtraField(
      currentExtra,
      "reading_status",
      cleanInline(
        firstValue(normalizedMeta.reading_status, normalizedMeta.status),
      ),
      ["reading_status", "status"],
    );
    if (nextExtra !== currentExtra) {
      topItem.setField("extra", nextExtra);
      dirty = true;
    }
  }

  if (hasFrontmatterKey(normalizedMeta, "rating")) {
    const nextRating = normalizeManagedRating(normalizedMeta.rating);
    const currentRating = normalizeManagedRating(
      getFieldSafe(topItem, "rating"),
    );
    if (String(nextRating) !== String(currentRating)) {
      const nextRatingValue = nextRating === "" ? "" : String(nextRating);
      const currentExtra = getFieldSafe(topItem, "extra");
      const ratingFieldID =
        typeof Zotero.ItemFields?.getID === "function"
          ? Zotero.ItemFields.getID("rating")
          : 0;
      const canUseNativeRating =
        Boolean(ratingFieldID) &&
        typeof Zotero.ItemFields?.isValidForType === "function" &&
        Zotero.ItemFields.isValidForType(ratingFieldID, topItem.itemTypeID);
      try {
        if (canUseNativeRating) {
          topItem.setField("rating", nextRatingValue);
          const nextExtra = updateExtraField(currentExtra, "rating", "");
          if (nextExtra !== currentExtra) {
            topItem.setField("extra", nextExtra);
          }
          dirty = true;
        } else {
          const nextExtra = updateExtraField(
            currentExtra,
            "rating",
            nextRatingValue,
          );
          if (nextExtra !== currentExtra) {
            topItem.setField("extra", nextExtra);
            dirty = true;
          }
        }
      } catch (e) {
        const nextExtra = updateExtraField(
          currentExtra,
          "rating",
          nextRatingValue,
        );
        if (nextExtra !== currentExtra) {
          topItem.setField("extra", nextExtra);
          dirty = true;
        }
      }
    }
  }

  if (
    hasFrontmatterKey(normalizedMeta, "tags") ||
    hasFrontmatterKey(normalizedMeta, "zotero_tags")
  ) {
    const desiredTags = mergeFrontmatterLists(
      getManagedFrontmatterNonSystemTags(normalizedMeta.zotero_tags),
      getManagedFrontmatterNonSystemTags(normalizedMeta.tags),
    );
    const currentTags = topItem
      .getTags()
      .map((tag) => cleanInline(tag.tag))
      .filter(Boolean);
    const currentTagLookup = new Map(
      currentTags.map((tag) => [normalizeManagedTag(tag).toLowerCase(), tag]),
    );
    const desiredTagLookup = new Set(
      desiredTags.map((tag) => tag.toLowerCase()),
    );

    for (const currentTag of currentTags) {
      const normalizedTag = normalizeManagedTag(currentTag).toLowerCase();
      if (
        MANAGED_FRONTMATTER_SYSTEM_TAGS.has(normalizedTag) ||
        desiredTagLookup.has(normalizedTag)
      ) {
        continue;
      }
      topItem.removeTag(currentTag);
      dirty = true;
    }

    for (const desiredTag of desiredTags) {
      if (currentTagLookup.has(desiredTag.toLowerCase())) {
        continue;
      }
      topItem.addTag(desiredTag, 0);
      dirty = true;
    }
  }

  if (!dirty) {
    return false;
  }

  await topItem.saveTx({
    notifierData: {
      skipOB: true,
    },
  });
  return true;
}

function findManagedTopItemFromMeta(
  noteItem: Zotero.Item,
  meta: Record<string, any> | null | undefined,
) {
  const topItem = getManagedNoteParentItem(noteItem);
  if (!topItem) {
    return false;
  }
  const normalizedMeta = normalizeFrontmatterObject(meta);
  if (!normalizedMeta.bridge_managed) {
    return false;
  }
  const topItemKey = cleanInline(String(normalizedMeta.zotero_key || ""));
  if (topItemKey && topItemKey !== topItem.key) {
    return false;
  }
  return topItem;
}

function getManagedAnnotationItems(topItem: Zotero.Item) {
  const attachmentIDs =
    typeof topItem.getAttachments === "function"
      ? topItem.getAttachments()
      : [];
  return attachmentIDs
    .map((itemID) => Zotero.Items.get(itemID))
    .filter((item): item is Zotero.Item =>
      Boolean(
        item?.isAttachment &&
          item.isAttachment() &&
          typeof item.isPDFAttachment === "function" &&
          item.isPDFAttachment(),
      ),
    )
    .flatMap((attachmentItem) =>
      typeof attachmentItem.getAnnotations === "function"
        ? attachmentItem.getAnnotations()
        : [],
    )
    .filter((annotationItem): annotationItem is Zotero.Item =>
      Boolean(annotationItem?.isAnnotation && annotationItem.isAnnotation()),
    );
}

function buildManagedAnnotationSourceSnapshot(topItem: Zotero.Item) {
  return getManagedAnnotationItems(topItem)
    .map((annotationItem) => ({
      id: annotationItem.id,
      key: annotationItem.key,
      version: annotationItem.version,
      dateModified: cleanInline(annotationItem.dateModified),
      type: cleanInline(annotationItem.annotationType),
      pageLabel: cleanInline(annotationItem.annotationPageLabel),
      color: cleanInline(annotationItem.annotationColor),
      sortIndex: cleanInline(annotationItem.annotationSortIndex),
      text: cleanInline(annotationItem.annotationText),
      comment: cleanInline(annotationItem.annotationComment),
      tags: annotationItem
        .getTags()
        .map((tag) => cleanInline(tag.tag))
        .filter(Boolean)
        .sort(),
    }))
    .sort((left, right) => {
      const leftSort = `${left.pageLabel} ${left.sortIndex} ${left.key}`;
      const rightSort = `${right.pageLabel} ${right.sortIndex} ${right.key}`;
      return leftSort.localeCompare(rightSort);
    });
}

async function saveAnnotationImageToAssets(
  annotationItem: Zotero.Item,
  attachmentDir: string,
  attachmentFolder: string,
): Promise<string> {
  try {
    const annotationJSON = await Zotero.Annotations.toJSON(annotationItem);
    const imageData = annotationJSON?.image;
    if (!imageData || typeof imageData !== "string") {
      return "";
    }
    const match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      return "";
    }
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const fileName = `annotation-${annotationItem.key}.${ext}`;
    const absPath = formatPath(jointPath(attachmentDir, fileName));
    if (!(await fileExists(absPath))) {
      const binaryStr = atob(match[2]);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      await Zotero.File.createDirectoryIfMissingAsync(attachmentDir);
      await IOUtils.write(absPath, bytes);
    }
    const relativePath = attachmentFolder
      ? `${attachmentFolder}/${fileName}`
      : fileName;
    return Zotero.isWin
      ? Zotero.File.normalizeToUnix(relativePath)
      : relativePath;
  } catch (e) {
    ztoolkit.log("[ObsidianBridge] saveAnnotationImageToAssets failed", e);
    return "";
  }
}

async function renderManagedAnnotationsMarkdown(
  topItem: Zotero.Item,
  options?: {
    attachmentDir?: string;
    attachmentFolder?: string;
  },
) {
  const snapshot = buildManagedAnnotationSourceSnapshot(topItem);
  const annotationItems = getManagedAnnotationItems(topItem);
  const annotationMap = new Map<string, Zotero.Item>();
  for (const item of annotationItems) {
    annotationMap.set(item.key, item);
  }

  const blocks: string[] = [];
  for (const annotation of snapshot) {
    const titleParts = [
      annotation.pageLabel ? `p.${annotation.pageLabel}` : "",
      annotation.type ? cleanInline(annotation.type) : "",
    ].filter(Boolean);
    const heading = `### ${titleParts.join(" · ") || annotation.key}`;
    const sectionBlocks: string[] = [heading];
    if (annotation.text) {
      sectionBlocks.push(
        annotation.text
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => `> ${line}`)
          .join("\n"),
      );
    } else if (
      annotation.type === "image" &&
      options?.attachmentDir
    ) {
      const annotationItem = annotationMap.get(annotation.key);
      if (annotationItem) {
        const imagePath = await saveAnnotationImageToAssets(
          annotationItem,
          options.attachmentDir,
          options.attachmentFolder || "",
        );
        if (imagePath) {
          sectionBlocks.push(`![p.${annotation.pageLabel || annotation.key}](${imagePath})`);
        } else {
          sectionBlocks.push("> [Image annotation]");
        }
      } else {
        sectionBlocks.push("> [Image annotation]");
      }
    } else if (annotation.type === "image") {
      sectionBlocks.push("> [Image annotation]");
    }
    if (annotation.comment) {
      sectionBlocks.push(annotation.comment);
    }
    if (annotation.tags.length) {
      sectionBlocks.push(
        `Tags: ${annotation.tags.map((tag) => `\`${tag}\``).join(", ")}`,
      );
    }
    blocks.push(sectionBlocks.join("\n\n").trim());
  }

  if (!blocks.length) {
    return "";
  }

  return ["## Annotations", ...blocks].join("\n\n");
}

function getChildNoteTags(noteItem: Zotero.Item) {
  return noteItem
    .getTags()
    .map((tag) => cleanInline(tag.tag))
    .filter(Boolean)
    .sort();
}

function getManagedNoteParentItem(noteItem: Zotero.Item) {
  if (!noteItem?.isNote()) {
    return false;
  }
  if (noteItem.parentItem?.isRegularItem()) {
    return noteItem.parentItem;
  }
  if (!noteItem.parentID) {
    return false;
  }
  const parentItem = Zotero.Items.get(noteItem.parentID);
  return parentItem?.isRegularItem() ? parentItem : false;
}

function getMatchedChildNotes(
  topItem: Zotero.Item,
  managedNoteItem?: Zotero.Item | false | null,
  config = getChildNoteBridgeConfig(),
) {
  if (!config.matchTags.length) {
    return [] as Zotero.Item[];
  }
  const managedNoteId = managedNoteItem ? managedNoteItem.id : 0;
  const targetTags = new Set(config.matchTags);
  return topItem
    .getNotes()
    .filter(
      (noteID) => Number(noteID) && Number(noteID) !== Number(managedNoteId),
    )
    .map((noteID) => Zotero.Items.get(noteID))
    .filter((item): item is Zotero.Item =>
      Boolean(item?.isNote && item.isNote()),
    )
    .filter((noteItem) =>
      getChildNoteTags(noteItem).some((tag) =>
        targetTags.has(normalizeChildNoteTag(tag)),
      ),
    );
}

function getBridgedChildNotes(
  topItem: Zotero.Item,
  managedNoteItem: Zotero.Item,
  options: {
    selectedNoteKeys?: string[] | null;
  } = {},
) {
  const matchedNotes = getMatchedChildNotes(topItem, managedNoteItem);
  if (matchedNotes.length <= 1) {
    return matchedNotes;
  }

  if (Array.isArray(options.selectedNoteKeys)) {
    const selectedNoteKeys = new Set(
      options.selectedNoteKeys.map((noteKey) => cleanInline(noteKey)),
    );
    return matchedNotes.filter((noteItem) =>
      selectedNoteKeys.has(noteItem.key),
    );
  }

  const excludedKeys = new Set(
    getChildNoteExcludeMap()[getItemMapKey(topItem)] || [],
  );
  return matchedNotes.filter((noteItem) => !excludedKeys.has(noteItem.key));
}

function persistChildNoteExclusions(
  topItem: Zotero.Item,
  matchedNotes: Zotero.Item[],
  selectedNoteKeys: string[],
) {
  const itemMapKey = getItemMapKey(topItem);
  const excludeMap = getChildNoteExcludeMap();
  if (matchedNotes.length <= 1) {
    delete excludeMap[itemMapKey];
    setChildNoteExcludeMap(excludeMap);
    return;
  }

  const selectedKeys = new Set(
    selectedNoteKeys.map((noteKey) => cleanInline(noteKey)),
  );
  const excludedKeys = matchedNotes
    .map((noteItem) => noteItem.key)
    .filter((noteKey) => !selectedKeys.has(noteKey));

  if (excludedKeys.length) {
    excludeMap[itemMapKey] = excludedKeys;
  } else {
    delete excludeMap[itemMapKey];
  }
  setChildNoteExcludeMap(excludeMap);
}

function buildManagedChildNoteSourceSnapshot(
  topItem: Zotero.Item,
  managedNoteItem: Zotero.Item,
) {
  return getBridgedChildNotes(topItem, managedNoteItem).map((noteItem) => ({
    id: noteItem.id,
    key: noteItem.key,
    version: noteItem.version,
    dateModified: cleanInline(noteItem.dateModified),
    title: getChildNoteDisplayTitle(noteItem, topItem),
    tags: getChildNoteTags(noteItem),
    noteHash: Zotero.Utilities.Internal.md5(noteItem.getNote() || "", false),
  }));
}

async function renderBridgedChildNotesMarkdown(
  topItem: Zotero.Item,
  managedNoteItem: Zotero.Item,
  options: {
    noteDir: string;
    attachmentDir?: string;
    attachmentFolder?: string;
  },
) {
  const bridgedNotes = getBridgedChildNotes(topItem, managedNoteItem);
  if (!bridgedNotes.length) {
    return "";
  }

  const renderedBlocks: string[] = [];
  for (const childNote of bridgedNotes) {
    const rendered = await addon.api.convert.note2md(
      childNote,
      options.noteDir,
      {
        keepNoteLink: false,
        withYAMLHeader: false,
        attachmentDir: options.attachmentDir,
        attachmentFolder: options.attachmentFolder,
      },
    );
    const cleaned = stripFrontmatter(rendered);
    if (!cleaned) {
      continue;
    }
    const normalized = ensureChildNoteHeading(childNote, topItem, cleaned);
    renderedBlocks.push(normalized);
  }

  if (!renderedBlocks.length) {
    return "";
  }

  return ["---", ...renderedBlocks].join("\n\n");
}

function findManagedTopItem(noteItem: Zotero.Item) {
  const topItem = getManagedNoteParentItem(noteItem);
  if (!topItem) {
    return false;
  }
  const itemNoteMap = getObsidianItemNoteMap();
  return itemNoteMap[getItemMapKey(topItem)] === noteItem.key ? topItem : false;
}

async function findManagedTopItemFresh(noteItem: Zotero.Item) {
  if (!noteItem?.isNote() || !noteItem.parentID) {
    return false;
  }
  const topItem = (await (Zotero.Items as any).getAsync(noteItem.parentID, {
    noCache: true,
  })) as Zotero.Item | false;
  if (!topItem || !topItem.isRegularItem()) {
    return false;
  }
  const itemNoteMap = getObsidianItemNoteMap();
  return itemNoteMap[getItemMapKey(topItem)] === noteItem.key ? topItem : false;
}

function getManagedTopItemForRelatedItem(
  item: Zotero.Item | false | null | undefined,
) {
  if (!item) {
    return false;
  }
  if (item.isRegularItem()) {
    return item;
  }
  if (item.isNote() && item.parentItem?.isRegularItem()) {
    return item.parentItem;
  }
  if (
    typeof item.isAttachment === "function" &&
    item.isAttachment() &&
    item.parentItem?.isRegularItem()
  ) {
    return item.parentItem;
  }
  if (
    typeof item.isAnnotation === "function" &&
    item.isAnnotation() &&
    item.parentItem?.parentItem?.isRegularItem()
  ) {
    return item.parentItem.parentItem;
  }
  return false;
}

function isManagedObsidianNote(noteItem: Zotero.Item) {
  return Boolean(findManagedTopItem(noteItem));
}

function getManagedObsidianNoteForItem(
  item: Zotero.Item | false | null | undefined,
) {
  if (item && item.isNote && item.isNote() && isManagedObsidianNote(item)) {
    return item;
  }
  const topItem = getManagedTopItemForRelatedItem(item);
  return topItem ? findExistingObsidianNote(topItem) : false;
}

function getManagedObsidianFileName(noteItem: Zotero.Item) {
  const topItem = findManagedTopItem(noteItem);
  if (!topItem) {
    return "";
  }
  return (
    buildManagedObsidianFileName(topItem, noteItem) ||
    ensureMarkdownExtension(
      `${
        sanitizeFileNamePart(getFieldSafe(topItem, "title") || topItem.key) ||
        topItem.key
      } -- ${getManagedObsidianUniqueKey(topItem) || topItem.key}`,
    )
  );
}

async function getManagedObsidianFileNameFresh(noteItem: Zotero.Item) {
  const topItem = await findManagedTopItemFresh(noteItem);
  if (!topItem) {
    return "";
  }
  return (
    buildManagedObsidianFileName(topItem, noteItem) ||
    ensureMarkdownExtension(
      `${
        sanitizeFileNamePart(getFieldSafe(topItem, "title") || topItem.key) ||
        topItem.key
      } -- ${getManagedObsidianUniqueKey(topItem) || topItem.key}`,
    )
  );
}

async function getManagedObsidianSourceHash(noteItem: Zotero.Item) {
  const topItem =
    (await findManagedTopItemFresh(noteItem)) ||
    findManagedTopItem(noteItem) ||
    getManagedNoteParentItem(noteItem);
  if (!topItem) {
    return "";
  }

  const { context, creatorsList, zoteroTagsList, collectionsList } =
    await buildItemContext(topItem);
  const metadataPreset = getMetadataPreset();
  const contentConfig = getManagedNoteContentConfig();
  const updateStrategy = normalizeObsidianUpdateStrategy(
    String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
  );
  const payload = {
    topItem: {
      id: topItem.id,
      key: topItem.key,
      libraryID: topItem.libraryID,
      version: topItem.version,
      dateModified: cleanInline(topItem.dateModified),
    },
    context,
    creatorsList: [...creatorsList].sort(),
    zoteroTagsList: [...zoteroTagsList].map((tag) => cleanInline(tag)).sort(),
    collectionsList: [...collectionsList]
      .map((name) => cleanInline(name))
      .sort(),
    metadataPreset,
    frontmatterFields: getManagedFrontmatterFields(),
    visibleFields: getConfiguredFields(
      metadataPreset.visible,
      context.itemType,
    ),
    hiddenFields: getConfiguredFields(metadataPreset.hidden, context.itemType),
    contentConfig,
    updateStrategy,
    annotations: contentConfig.includeAnnotations
      ? buildManagedAnnotationSourceSnapshot(topItem)
      : [],
    childNoteTags: getChildNoteBridgeConfig().matchTags,
    bridgedChildNotes: buildManagedChildNoteSourceSnapshot(topItem, noteItem),
  };
  return Zotero.Utilities.Internal.md5(stableJSONStringify(payload), false);
}

async function renderManagedObsidianNoteMarkdown(
  noteItem: Zotero.Item,
  options: {
    noteDir: string;
    attachmentDir?: string;
    attachmentFolder?: string;
    targetPath?: string;
    cachedYAMLHeader?: Record<string, any> | null;
  },
) {
  const topItem =
    (await findManagedTopItemFresh(noteItem)) ||
    findManagedTopItem(noteItem) ||
    getManagedNoteParentItem(noteItem);
  if (!topItem) {
    return "";
  }

  const { context, creatorsList, zoteroTagsList, collectionsList } =
    await buildItemContext(topItem);
  const metadataPreset = getMetadataPreset();
  const contentConfig = getManagedNoteContentConfig();
  const updateStrategy = normalizeObsidianUpdateStrategy(
    String(getPref(OBSIDIAN_UPDATE_STRATEGY_PREF) || ""),
  );
  const visibleFields = getConfiguredFields(
    metadataPreset.visible,
    context.itemType,
  );
  const hiddenFields = getConfiguredFields(
    metadataPreset.hidden,
    context.itemType,
  );

  const existingMarkdown =
    updateStrategy !== "overwrite" &&
    options.targetPath &&
    (await fileExists(options.targetPath))
      ? ((await Zotero.File.getContentsAsync(
          options.targetPath,
          "utf-8",
        )) as string)
      : "";
  const existingFrontmatter =
    updateStrategy === "overwrite"
      ? {}
      : options.cachedYAMLHeader || parseMarkdownFrontmatter(existingMarkdown);

  const noteMarkdown = await addon.api.convert.note2md(
    noteItem,
    options.noteDir,
    {
      keepNoteLink: false,
      withYAMLHeader: false,
      attachmentDir: options.attachmentDir,
      attachmentFolder: options.attachmentFolder,
    },
  );
  const noteUserSections = extractUserSections(noteMarkdown);
  const existingUserSections = existingMarkdown
    ? extractManagedObsidianUserMarkdown(existingMarkdown)
    : null;
  const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
  const currentNoteMd5 = Zotero.Utilities.Internal.md5(noteItem.getNote(), false);
  const shouldPreferNoteUserSections =
    updateStrategy === "overwrite" ||
    !existingMarkdown ||
    !existingUserSections ||
    (addon.api.sync.isSyncNote(noteItem.id) &&
      Boolean(syncStatus.noteMd5) &&
      currentNoteMd5 !== syncStatus.noteMd5);
  const userSections = shouldPreferNoteUserSections
    ? noteUserSections
    : existingUserSections;
  const annotationsMarkdown = contentConfig.includeAnnotations
    ? await renderManagedAnnotationsMarkdown(topItem, {
        attachmentDir: options.attachmentDir,
        attachmentFolder: options.attachmentFolder,
      })
    : "";
  const aiChildNotesMarkdown = await renderBridgedChildNotesMarkdown(
    topItem,
    noteItem,
    options,
  );
  const managedFrontmatter = mergeManagedFrontmatter(
    existingFrontmatter,
    buildManagedFrontmatterData(
      context,
      creatorsList,
      zoteroTagsList,
      collectionsList,
      topItem,
      noteItem,
      existingFrontmatter,
    ),
  );
  const generatedBlock = [
    `# ${context.title}`,
    contentConfig.includeMetadata
      ? buildMetadataCallout(visibleFields, context)
      : "",
    contentConfig.includeMetadata ? buildTagsCallout(zoteroTagsList) : "",
    contentConfig.includeAbstract
      ? buildAbstractCallout(
          getString("obsidian-note-abstract-title"),
          context.abstract,
          "quote",
          getString("obsidian-note-emptyAbstract"),
        )
      : "",
    contentConfig.includeAbstract
      ? buildAbstractCallout(
          getString("obsidian-note-abstractTranslation-title"),
          context.abstractTranslation,
          "note",
          getString("obsidian-note-emptyAbstractTranslation"),
        )
      : "",
    annotationsMarkdown,
    contentConfig.includeHiddenInfo
      ? buildHiddenInfoCallout(hiddenFields, context)
      : "",
    contentConfig.includeChildNotes ? aiChildNotesMarkdown : "",
  ]
    .map((block) => String(block || "").trim())
    .filter(Boolean)
    .join("\n\n");

  const blocks = [
    buildFrontmatter(managedFrontmatter),
    GENERATED_BLOCK_START,
    generatedBlock,
    GENERATED_BLOCK_END,
    USER_BLOCK_START,
    userSections,
    USER_BLOCK_END,
  ];

  return blocks
    .map((block) => String(block || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

export {
  applyManagedObsidianFrontmatter,
  extractManagedObsidianUserMarkdown,
  getChildNoteTags,
  getManagedObsidianFileNameFresh,
  getMatchedChildNotes,
  getManagedObsidianFileName,
  getManagedObsidianNoteForItem,
  getManagedObsidianSourceHash,
  isManagedObsidianNote,
  persistChildNoteExclusions,
  renderManagedObsidianNoteMarkdown,
};
