import { logError } from "../../utils/errorUtils";
import { fileExists, formatPath } from "../../utils/str";
import {
  getManagedFrontmatterBridge,
  normalizeFrontmatterObject,
  parseMarkdownFrontmatter,
  resolveManagedFrontmatterLibraryID,
} from "./frontmatter";
import { cleanInline, firstValue } from "./shared";

type ManagedFrontmatterIdentity = {
  libraryID: number;
  zoteroKey: string;
  noteKey: string;
  citekey: string;
  bridgeManaged: boolean;
};

type ManagedFrontmatterFileMatch = ManagedFrontmatterIdentity & {
  path: string;
  mtime: number;
  meta: Record<string, any>;
};

type ManagedFrontmatterScanOptions = {
  libraryID: number;
  noteKey?: string;
  zoteroKey?: string;
  citekey?: string;
  preferredPath?: string;
};

type ManagedFrontmatterScanResult = {
  match: ManagedFrontmatterFileMatch | null;
  conflicts: ManagedFrontmatterFileMatch[];
};

const SCAN_HEAD_MAX_BYTES = 64 * 1024;
const MARKDOWN_REGEX = /\.(md|MD|Md|mD)$/;

async function readMarkdownHead(filePath: string) {
  try {
    if (typeof IOUtils.readUTF8 === "function") {
      const partial = await IOUtils.readUTF8(filePath, {
        maxBytes: SCAN_HEAD_MAX_BYTES,
      });
      if (typeof partial === "string") {
        return partial;
      }
    }
  } catch (error) {
    logError("Partial frontmatter read", error, filePath);
  }

  try {
    const raw = await Zotero.File.getContentsAsync(filePath, "utf-8");
    return String(raw || "").slice(0, SCAN_HEAD_MAX_BYTES);
  } catch (error) {
    logError("Read markdown head", error, filePath);
    return "";
  }
}

function getManagedFrontmatterIdentity(
  meta: Record<string, any> | null | undefined,
): ManagedFrontmatterIdentity | null {
  const normalizedMeta = normalizeFrontmatterObject(meta);
  const bridge = getManagedFrontmatterBridge(normalizedMeta);
  const libraryID = resolveManagedFrontmatterLibraryID(normalizedMeta, {
    zoteroKey: bridge.zoteroKey,
    noteKey: bridge.noteKey,
  });
  const citekey = cleanInline(
    String(
      firstValue(
        normalizedMeta.citekey,
        normalizedMeta.citation_key,
        normalizedMeta.citationKey,
      ) || "",
    ),
  );
  if (!libraryID || (!bridge.zoteroKey && !bridge.noteKey && !citekey)) {
    return null;
  }
  return {
    libraryID,
    zoteroKey: bridge.zoteroKey,
    noteKey: bridge.noteKey,
    citekey,
    bridgeManaged: bridge.isManaged,
  };
}

async function readManagedFrontmatterIdentity(filePath: string) {
  const normalizedPath = formatPath(filePath);
  if (!normalizedPath || !(await fileExists(normalizedPath))) {
    return null;
  }
  const head = await readMarkdownHead(normalizedPath);
  if (!head) {
    return null;
  }
  const meta = parseMarkdownFrontmatter(head);
  const identity = getManagedFrontmatterIdentity(meta);
  if (!identity) {
    return null;
  }
  try {
    const stat = await IOUtils.stat(normalizedPath);
    return {
      ...identity,
      path: normalizedPath,
      mtime: Number(stat.lastModified || Date.now()),
      meta,
    } as ManagedFrontmatterFileMatch;
  } catch (error) {
    logError("Stat markdown file", error, normalizedPath);
    return {
      ...identity,
      path: normalizedPath,
      mtime: Date.now(),
      meta,
    } as ManagedFrontmatterFileMatch;
  }
}

function getManagedFrontmatterMatchRank(
  candidate: ManagedFrontmatterFileMatch,
  options: ManagedFrontmatterScanOptions,
) {
  if (
    options.libraryID &&
    candidate.libraryID === options.libraryID &&
    options.noteKey &&
    candidate.noteKey &&
    candidate.noteKey === cleanInline(options.noteKey)
  ) {
    return 3;
  }
  if (
    options.libraryID &&
    candidate.libraryID === options.libraryID &&
    options.zoteroKey &&
    candidate.zoteroKey &&
    candidate.zoteroKey === cleanInline(options.zoteroKey)
  ) {
    return 2;
  }
  if (
    options.citekey &&
    candidate.citekey &&
    candidate.citekey.toLowerCase() === cleanInline(options.citekey).toLowerCase()
  ) {
    return 1;
  }
  return 0;
}

function chooseManagedFrontmatterMatch(
  matches: ManagedFrontmatterFileMatch[],
  options: ManagedFrontmatterScanOptions,
): ManagedFrontmatterScanResult {
  if (!matches.length) {
    return { match: null, conflicts: [] };
  }

  const rank3Matches = matches.filter(
    (candidate) => getManagedFrontmatterMatchRank(candidate, options) === 3,
  );
  const rank2Matches = matches.filter(
    (candidate) => getManagedFrontmatterMatchRank(candidate, options) === 2,
  );
  const rankedMatches = rank3Matches.length ? rank3Matches : rank2Matches;
  if (!rankedMatches.length) {
    return { match: null, conflicts: [] };
  }

  const normalizedPreferredPath = formatPath(options.preferredPath || "");
  const preferredMatch = normalizedPreferredPath
    ? rankedMatches.find(
        (candidate) => formatPath(candidate.path) === normalizedPreferredPath,
      )
    : null;
  const sortedMatches = [...rankedMatches].sort((left, right) => {
    if (right.mtime !== left.mtime) {
      return right.mtime - left.mtime;
    }
    return right.path.localeCompare(left.path);
  });
  const match = preferredMatch || sortedMatches[0] || null;
  return {
    match,
    conflicts: rankedMatches.filter((candidate) => candidate.path !== match?.path),
  };
}

async function scanManagedMarkdownScope(
  scopeRoot: string,
  options: ManagedFrontmatterScanOptions,
): Promise<ManagedFrontmatterScanResult> {
  const normalizedScopeRoot = formatPath(scopeRoot);
  if (!normalizedScopeRoot || !(await fileExists(normalizedScopeRoot))) {
    return { match: null, conflicts: [] };
  }

  const candidates: ManagedFrontmatterFileMatch[] = [];
  const scanDirectory = async (directory: string) => {
    await Zotero.File.iterateDirectory(
      directory,
      async (entry: OS.File.Entry) => {
      if (entry.isDir) {
          await scanDirectory(entry.path);
        return;
      }
      if (!MARKDOWN_REGEX.test(entry.name)) {
        return;
      }
      const identity = await readManagedFrontmatterIdentity(entry.path);
      if (!identity) {
        return;
      }
      const rank = getManagedFrontmatterMatchRank(identity, options);
      if (rank >= 2) {
        candidates.push(identity);
      }
      },
    );
  };

  await scanDirectory(normalizedScopeRoot);

  return chooseManagedFrontmatterMatch(candidates, options);
}

export {
  getManagedFrontmatterIdentity,
  getManagedFrontmatterMatchRank,
  chooseManagedFrontmatterMatch,
  readManagedFrontmatterIdentity,
  scanManagedMarkdownScope,
  ManagedFrontmatterIdentity,
  ManagedFrontmatterFileMatch,
  ManagedFrontmatterScanOptions,
  ManagedFrontmatterScanResult,
};
