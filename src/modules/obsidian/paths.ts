import { getPref } from "../../utils/prefs";
import { formatPath, jointPath } from "../../utils/str";
import {
  cleanInline,
  firstValue,
  getDateYear,
  getFieldSafe,
  parseExtraMap,
} from "./shared";
import {
  getObsidianItemNoteMap,
  setObsidianItemNoteMap,
  getItemMapKey,
  DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
  OBSIDIAN_FILE_NAME_TEMPLATE_PREF,
} from "./settings";
import {
  FrontmatterIndexEntry,
  resolveNoteByFrontmatter,
} from "./frontmatterIndex";

function getDefaultDashboardDir(vaultRoot: string, notesDir = "") {
  const normalizedVaultRoot = formatPath(vaultRoot);
  if (normalizedVaultRoot) {
    return jointPath(normalizedVaultRoot, "dashboards", "zotero");
  }
  const normalizedNotesDir = formatPath(notesDir);
  const fallbackRoot = normalizedNotesDir
    ? PathUtils.parent(normalizedNotesDir) || normalizedNotesDir
    : "";
  return fallbackRoot ? jointPath(fallbackRoot, "dashboards", "zotero") : "";
}

function splitComparablePath(path: string) {
  return PathUtils.split(formatPath(path)).filter(Boolean);
}

function isSamePathSegment(left: string, right: string) {
  return Zotero.isWin
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function getRelativePath(fromDir: string, toDir: string) {
  const fromParts = splitComparablePath(fromDir);
  const toParts = splitComparablePath(toDir);
  if (!fromParts.length || !toParts.length) {
    return formatPath(toDir);
  }

  if (!isSamePathSegment(fromParts[0], toParts[0])) {
    return formatPath(toDir);
  }

  let commonIndex = 0;
  const maxLength = Math.min(fromParts.length, toParts.length);
  while (
    commonIndex < maxLength &&
    isSamePathSegment(fromParts[commonIndex], toParts[commonIndex])
  ) {
    commonIndex += 1;
  }

  const upSegments = new Array(fromParts.length - commonIndex).fill("..");
  const downSegments = toParts.slice(commonIndex);
  const relativePath = [...upSegments, ...downSegments].join("/");
  return relativePath || "";
}

function looksLikeAbsolutePath(path: string) {
  return (
    /^[a-zA-Z]:[\\/]/.test(path) || /^\\\\/.test(path) || path.startsWith("/")
  );
}

function getAttachmentRelativeDir(noteDir: string, attachmentDir: string) {
  const relativeDir = getRelativePath(noteDir, attachmentDir);
  return relativeDir === "." ? "" : formatPath(relativeDir);
}

function getLastPathSegment(path: string) {
  const parts = PathUtils.split(formatPath(path));
  return parts.pop() || "";
}

function buildObsidianOpenURI(targetPath: string) {
  const normalizedTargetPath = formatPath(targetPath);
  const vaultRoot = String(getPref("obsidian.vaultRoot") || "").trim();
  const configuredVaultName = String(
    getPref("obsidian.vaultName") || "",
  ).trim();
  const vaultName = configuredVaultName || getLastPathSegment(vaultRoot);

  if (vaultRoot && vaultName) {
    const relativePath = getRelativePath(vaultRoot, normalizedTargetPath)
      .replace(/\\/g, "/")
      .replace(/^\.\/+/, "");
    if (relativePath && !looksLikeAbsolutePath(relativePath)) {
      return `obsidian://open?vault=${encodeURIComponent(
        vaultName,
      )}&file=${encodeURIComponent(relativePath)}`;
    }
  }

  return `obsidian://open?path=${encodeURIComponent(normalizedTargetPath)}`;
}

function openObsidianNote(targetPath: string) {
  const uri = buildObsidianOpenURI(targetPath);
  const appPath = String(getPref("obsidian.appPath") || "").trim();
  if (appPath) {
    try {
      const classes = Components.classes as any;
      const interfaces = Components.interfaces as any;
      const process = classes["@mozilla.org/process/util;1"].createInstance(
        interfaces.nsIProcess,
      );
      process.init(Zotero.File.pathToFile(appPath));
      process.runw(false, [uri], 1);
      return true;
    } catch (e) {
      ztoolkit.log("[ObsidianBridge] failed to open uri via app process", e);
    }
  }

  try {
    if (typeof (Zotero as any).launchURL === "function") {
      (Zotero as any).launchURL(uri);
      return true;
    }
  } catch (e) {
    ztoolkit.log("[ObsidianBridge] failed to open uri via launchURL", e);
  }

  return false;
}

function buildLibraryURI(action: "open" | "select", item: Zotero.Item) {
  if (!item?.key) {
    return "";
  }
  if (item.libraryID === 1) {
    return `zotero://${action}/library/items/${item.key}`;
  }
  const library = Zotero.Libraries.get(item.libraryID) as
    | { id?: number; libraryType?: string }
    | false;
  const groupID = library && typeof library.id === "number" ? library.id : 0;
  if (!groupID) {
    return `zotero://${action}/library/items/${item.key}`;
  }
  return `zotero://${action}/groups/${groupID}/items/${item.key}`;
}

function makeLibrarySelectLink(item: Zotero.Item) {
  return buildLibraryURI("select", item);
}

function makeLibraryOpenLink(item: Zotero.Item) {
  return buildLibraryURI("open", item);
}

function makeLibraryLink(item: Zotero.Item) {
  return makeLibraryOpenLink(item);
}

function buildCollectionItemSelectURI(
  item: Zotero.Item,
  collection:
    | Partial<{
        key: string;
      }>
    | false
    | null
    | undefined,
) {
  const collectionKey = cleanInline(
    collection && typeof collection === "object" ? collection.key || "" : "",
  );
  if (!item?.key || !collectionKey) {
    return makeLibrarySelectLink(item);
  }
  if (item.libraryID === 1) {
    return `zotero://select/library/collections/${collectionKey}/items/${item.key}`;
  }
  const library = Zotero.Libraries.get(item.libraryID) as
    | { id?: number; libraryType?: string }
    | false;
  const groupID = library && typeof library.id === "number" ? library.id : 0;
  if (!groupID) {
    return `zotero://select/library/collections/${collectionKey}/items/${item.key}`;
  }
  return `zotero://select/groups/${groupID}/collections/${collectionKey}/items/${item.key}`;
}

async function getItemCollections(item: Zotero.Item) {
  if (!item?.id) {
    return [] as Array<Partial<{ key: string; name: string }>>;
  }
  const collectionResults =
    (await Zotero.Collections.getCollectionsContainingItems([item.id])) as
      | Array<Partial<{ key: string; name: string }>>
      | false;
  return Array.isArray(collectionResults) ? collectionResults : [];
}

async function getBestItemLink(item: Zotero.Item) {
  const collections = await getItemCollections(item);
  return buildCollectionItemSelectURI(item, collections[0]);
}

async function getBestAttachmentLink(item: Zotero.Item) {
  if (!item || typeof item.getBestAttachment !== "function") {
    return "";
  }
  const attachment = await item.getBestAttachment();
  if (!attachment) {
    return "";
  }
  return makeLibraryOpenLink(attachment);
}

function escapeForDoubleQuotedString(value: string) {
  return formatPath(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getVaultRelativeFolder(vaultRoot: string, targetDir: string) {
  const normalizedVaultRoot = formatPath(vaultRoot);
  const normalizedTargetDir = formatPath(targetDir);
  if (!normalizedVaultRoot || !normalizedTargetDir) {
    return "";
  }
  const relativePath = getRelativePath(normalizedVaultRoot, normalizedTargetDir)
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "");
  return looksLikeAbsolutePath(relativePath) ? "" : relativePath;
}

function sanitizeFileNamePart(value: string) {
  return cleanInline(value)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function sanitizeFileNameToken(value: string) {
  return cleanInline(value)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 120);
}

function ensureMarkdownExtension(fileName: string) {
  const normalized = cleanInline(fileName).replace(/[.\s]+$/g, "");
  if (!normalized) {
    return "";
  }
  return /\.md$/i.test(normalized) ? normalized : `${normalized}.md`;
}

function buildManagedIdentityHash(value: string) {
  const normalized = cleanInline(value);
  if (!normalized) {
    return "";
  }

  const md5 = (globalThis as any)?.Zotero?.Utilities?.Internal?.md5;
  if (typeof md5 === "function") {
    const digest = cleanInline(String(md5(normalized, false) || ""));
    if (digest) {
      return digest.slice(0, 10).toUpperCase();
    }
  }

  let hashA = 0x811c9dc5;
  let hashB = 0x85ebca6b;
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193) >>> 0;
    hashB ^= code;
    hashB = Math.imul(hashB, 0xc2b2ae35) >>> 0;
    hashB ^= hashB >>> 13;
    hashB >>>= 0;
  }

  return `${hashA.toString(36)}${hashB.toString(36)}`
    .toUpperCase()
    .padStart(10, "0")
    .slice(0, 10);
}

function getManagedObsidianUniqueKey(topItem: Zotero.Item) {
  const identityHash = buildManagedIdentityHash(
    `${topItem.libraryID || 0}:${cleanInline(topItem.key)}`,
  );
  if (identityHash) {
    return sanitizeFileNameToken(identityHash);
  }
  return (
    sanitizeFileNameToken(`${topItem.libraryID}-${topItem.key}`) ||
    sanitizeFileNameToken(topItem.key)
  );
}

function buildManagedFileNameTemplateContext(
  topItem: Zotero.Item,
  noteItem: Zotero.Item,
) {
  const extraMap = parseExtraMap(getFieldSafe(topItem, "extra"));
  const creators = topItem.getCreators() as Array<
    Partial<{
      name: string;
      firstName: string;
      lastName: string;
    }>
  >;
  const creatorNames = creators
    .map((creator) => {
      if (creator.name) {
        return creator.name;
      }
      return [creator.firstName, creator.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
    })
    .map((value) => sanitizeFileNameToken(value))
    .filter(Boolean);
  return {
    title: sanitizeFileNameToken(getFieldSafe(topItem, "title") || topItem.key),
    libraryID: sanitizeFileNameToken(String(topItem.libraryID || "")),
    key: sanitizeFileNameToken(topItem.key),
    uniqueKey: getManagedObsidianUniqueKey(topItem),
    noteKey: sanitizeFileNameToken(noteItem.key),
    year: sanitizeFileNameToken(getDateYear(getFieldSafe(topItem, "date"))),
    firstCreator: creatorNames[0] || "",
    creators: creatorNames.join(", "),
    citationKey: sanitizeFileNameToken(
      getFieldSafe(topItem, "citationKey") || extraMap.citationKey || "",
    ),
    publication: sanitizeFileNameToken(
      firstValue(
        getFieldSafe(topItem, "publicationTitle"),
        getFieldSafe(topItem, "proceedingsTitle"),
        getFieldSafe(topItem, "bookTitle"),
        getFieldSafe(topItem, "publisher"),
      ) as string,
    ),
    itemType: sanitizeFileNameToken(getFieldSafe(topItem, "itemType")),
  };
}

function applyManagedFileNameTemplate(
  template: string,
  context: Record<string, string>,
) {
  const normalizedTemplate = cleanInline(
    template || DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
  )
    .replace(/\.md$/i, "")
    .trim();
  const rendered = normalizedTemplate.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, token: string) => sanitizeFileNameToken(context[token] || ""),
  );
  return rendered
    .replace(/\s+/g, " ")
    .replace(/\s*([(){}\[\]])\s*/g, "$1")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .trim();
}

function getManagedFileNamePattern() {
  const userTemplate = String(
    getPref(OBSIDIAN_FILE_NAME_TEMPLATE_PREF) || "",
  ).trim();
  return userTemplate || DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE;
}

function buildManagedObsidianFileName(
  topItem: Zotero.Item,
  noteItem: Zotero.Item,
) {
  const context = buildManagedFileNameTemplateContext(topItem, noteItem);
  const fallbackBaseName = `${
    sanitizeFileNamePart(getFieldSafe(topItem, "title") || topItem.key) ||
    topItem.key
  }--${context.uniqueKey || context.key}`;
  const fileName = applyManagedFileNameTemplate(
    getManagedFileNamePattern(),
    context,
  );
  return ensureMarkdownExtension(fileName || fallbackBaseName);
}

function getCitationKeyForItem(topItem: Zotero.Item) {
  if (!topItem?.isRegularItem()) {
    return "";
  }
  const direct = cleanInline(String(getFieldSafe(topItem, "citationKey") || ""));
  if (direct) {
    return direct;
  }
  const extraMap = parseExtraMap(getFieldSafe(topItem, "extra"));
  return cleanInline(String(extraMap.citationKey || ""));
}

async function resolveManagedNoteBinding(topItem: Zotero.Item) {
  if (!topItem?.isRegularItem()) {
    return { noteItem: null, entry: null } as {
      noteItem: Zotero.Item | null;
      entry: FrontmatterIndexEntry | null;
    };
  }
  const notesDir = String(getPref("obsidian.notesDir") || "").trim();
  const citekey = getCitationKeyForItem(topItem);
  const resolution = await resolveNoteByFrontmatter({
    citekey,
    zoteroKey: topItem.key,
    libraryID: topItem.libraryID,
    notesDir,
  });
  if (!resolution) {
    return { noteItem: null, entry: null };
  }
  const entry = resolution.entry;
  let noteItem: Zotero.Item | null = null;
  if (entry.noteKey) {
    const candidate = Zotero.Items.getByLibraryAndKey(
      entry.libraryID || topItem.libraryID,
      entry.noteKey,
    ) as Zotero.Item | false;
    if (
      candidate &&
      candidate.isNote() &&
      !candidate.deleted &&
      candidate.parentID === topItem.id
    ) {
      noteItem = candidate;
      const itemNoteMap = getObsidianItemNoteMap();
      const itemMapKey = getItemMapKey(topItem);
      if (itemNoteMap[itemMapKey] !== noteItem.key) {
        itemNoteMap[itemMapKey] = noteItem.key;
        setObsidianItemNoteMap(itemNoteMap);
      }
    }
  }
  return { noteItem, entry };
}

async function resolveManagedNote(topItem: Zotero.Item) {
  const mappedNote = findExistingObsidianNote(topItem);
  if (mappedNote) {
    return mappedNote;
  }
  const { noteItem } = await resolveManagedNoteBinding(topItem);
  return noteItem || false;
}

function findExistingObsidianNote(topItem: Zotero.Item) {
  const itemNoteMap = getObsidianItemNoteMap();
  const itemMapKey = getItemMapKey(topItem);
  const mappedNoteKey = itemNoteMap[itemMapKey];
  if (!mappedNoteKey) {
    return false;
  }
  const mappedNote = Zotero.Items.getByLibraryAndKey(
    topItem.libraryID,
    mappedNoteKey,
  ) as Zotero.Item | false;
  if (
    mappedNote &&
    mappedNote.isNote() &&
    !mappedNote.deleted &&
    mappedNote.parentID === topItem.id
  ) {
    return mappedNote;
  }
  // Clean up stale map entry so recovery or creation can proceed
  if (!mappedNote || mappedNote.deleted) {
    delete itemNoteMap[itemMapKey];
    setObsidianItemNoteMap(itemNoteMap);
  }
  return false;
}

export {
  getDefaultDashboardDir,
  splitComparablePath,
  isSamePathSegment,
  getRelativePath,
  looksLikeAbsolutePath,
  getAttachmentRelativeDir,
  buildObsidianOpenURI,
  openObsidianNote,
  getLastPathSegment,
  makeLibrarySelectLink,
  makeLibraryOpenLink,
  buildCollectionItemSelectURI,
  getItemCollections,
  getBestItemLink,
  makeLibraryLink,
  getBestAttachmentLink,
  escapeForDoubleQuotedString,
  getVaultRelativeFolder,
  sanitizeFileNamePart,
  sanitizeFileNameToken,
  ensureMarkdownExtension,
  getManagedObsidianUniqueKey,
  buildManagedFileNameTemplateContext,
  applyManagedFileNameTemplate,
  getManagedFileNamePattern,
  buildManagedObsidianFileName,
  getCitationKeyForItem,
  resolveManagedNoteBinding,
  resolveManagedNote,
  findExistingObsidianNote,
};
