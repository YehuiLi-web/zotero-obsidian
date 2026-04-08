import { formatPath, jointPath } from "../../utils/str";
import { cleanInline } from "./shared";
import type { ObsidianCollectionFolderMode } from "./types";

type ZoteroCollectionLike = Partial<{
  id: number;
  key: string;
  name: string;
  libraryID: number;
  parentID: number;
  parentKey: string;
}>;

function getCollectionCacheKey(
  libraryID: number,
  collectionKey: string,
) {
  const normalizedKey = cleanInline(collectionKey);
  return libraryID && normalizedKey ? `${libraryID}/${normalizedKey}` : "";
}

function sanitizeCollectionFolderSegment(value: string) {
  return cleanInline(value)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 80);
}

function normalizeCollectionFolderSegments(segments: string[]) {
  return segments.map(sanitizeCollectionFolderSegment).filter(Boolean);
}

function compareCollectionFolderPaths(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return right.length - left.length;
  }
  return left.join("/").localeCompare(right.join("/"), undefined, {
    sensitivity: "base",
  });
}

async function getCollectionsContainingItem(item: Zotero.Item) {
  if (!item?.id) {
    return [] as ZoteroCollectionLike[];
  }
  const collections = (await Zotero.Collections.getCollectionsContainingItems([
    item.id,
  ])) as ZoteroCollectionLike[] | false;
  return Array.isArray(collections) ? collections : [];
}

async function getParentCollection(
  collection: ZoteroCollectionLike,
  libraryID: number,
  cache: Map<string, ZoteroCollectionLike>,
) {
  const parentKey = cleanInline(String(collection.parentKey || ""));
  if (parentKey) {
    const cacheKey = getCollectionCacheKey(libraryID, parentKey);
    const cachedCollection = cacheKey ? cache.get(cacheKey) : null;
    if (cachedCollection) {
      return cachedCollection;
    }

    const getByLibraryAndKey =
      (Zotero.Collections as any)?.getByLibraryAndKey ||
      (Zotero.Collections as any)?.getByLibraryAndKeyAsync;
    if (typeof getByLibraryAndKey === "function") {
      const parentCollection = (await getByLibraryAndKey.call(
        Zotero.Collections,
        libraryID,
        parentKey,
      )) as ZoteroCollectionLike | false;
      if (parentCollection) {
        const resolvedKey = getCollectionCacheKey(
          libraryID,
          cleanInline(String(parentCollection.key || parentKey)),
        );
        if (resolvedKey) {
          cache.set(resolvedKey, parentCollection);
        }
        return parentCollection;
      }
    }
  }

  const parentID = Number(collection.parentID || 0);
  if (!parentID || typeof Zotero.Collections.get !== "function") {
    return null;
  }
  const parentCollection = Zotero.Collections.get(parentID) as
    | ZoteroCollectionLike
    | false;
  if (!parentCollection) {
    return null;
  }
  const cacheKey = getCollectionCacheKey(
    libraryID,
    cleanInline(String(parentCollection.key || "")),
  );
  if (cacheKey) {
    cache.set(cacheKey, parentCollection);
  }
  return parentCollection;
}

export async function getItemCollectionFolderPaths(item: Zotero.Item) {
  if (!item?.isRegularItem?.()) {
    return [] as string[][];
  }

  const collections = await getCollectionsContainingItem(item);
  const cache = new Map<string, ZoteroCollectionLike>();
  for (const collection of collections) {
    const cacheKey = getCollectionCacheKey(
      Number(collection.libraryID || item.libraryID || 0),
      cleanInline(String(collection.key || "")),
    );
    if (cacheKey) {
      cache.set(cacheKey, collection);
    }
  }

  const hierarchyPaths = new Map<string, string[]>();
  for (const collection of collections) {
    const segments: string[] = [];
    const visitedKeys = new Set<string>();
    let currentCollection: ZoteroCollectionLike | null = collection;
    let depth = 0;
    while (currentCollection && depth < 24) {
      const currentKey = getCollectionCacheKey(
        Number(currentCollection.libraryID || item.libraryID || 0),
        cleanInline(String(currentCollection.key || "")),
      );
      if (currentKey) {
        if (visitedKeys.has(currentKey)) {
          break;
        }
        visitedKeys.add(currentKey);
      }

      const segment = sanitizeCollectionFolderSegment(
        String(currentCollection.name || ""),
      );
      if (segment) {
        segments.unshift(segment);
      }

      currentCollection = await getParentCollection(
        currentCollection,
        item.libraryID,
        cache,
      );
      depth += 1;
    }

    const normalizedSegments = normalizeCollectionFolderSegments(segments);
    if (!normalizedSegments.length) {
      continue;
    }
    hierarchyPaths.set(normalizedSegments.join("/"), normalizedSegments);
  }

  return Array.from(hierarchyPaths.values()).sort(compareCollectionFolderPaths);
}

export async function getPreferredCollectionFolderSegments(
  item: Zotero.Item,
  mode: ObsidianCollectionFolderMode,
) {
  if (mode === "none") {
    return [] as string[];
  }
  const hierarchyPaths = await getItemCollectionFolderPaths(item);
  return hierarchyPaths[0] ? [...hierarchyPaths[0]] : [];
}

export async function resolveManagedNotesDirForItem(
  item: Zotero.Item,
  notesDir: string,
  mode: ObsidianCollectionFolderMode,
) {
  const normalizedNotesDir = formatPath(notesDir);
  if (!normalizedNotesDir || mode === "none" || !item?.isRegularItem?.()) {
    return normalizedNotesDir;
  }
  const preferredSegments = await getPreferredCollectionFolderSegments(
    item,
    mode,
  );
  if (!preferredSegments.length) {
    return normalizedNotesDir;
  }
  return formatPath(jointPath(normalizedNotesDir, ...preferredSegments));
}

export async function getCollectionFolderRoutingState(
  item: Zotero.Item,
  mode: ObsidianCollectionFolderMode,
) {
  if (!item?.isRegularItem?.()) {
    return {
      mode,
      preferredPath: "",
      candidatePaths: [] as string[],
    };
  }
  const hierarchyPaths =
    mode === "none" ? [] : await getItemCollectionFolderPaths(item);
  return {
    mode,
    preferredPath: hierarchyPaths[0]?.join("/") || "",
    candidatePaths: hierarchyPaths.map((segments) => segments.join("/")),
  };
}
