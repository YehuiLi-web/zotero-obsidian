declare interface NoteNodeData {
  id: number;
  level: number;
  name: string;
  lineIndex: number;
  endIndex: number;
  link: string;
}

declare interface NoteStatus {
  meta: string;
  content: string;
  tail: string;
  lastmodify: Date;
}

declare interface SyncStatus {
  path: string;
  filename: string;
  md5: string;
  noteMd5: string;
  frontmatterMd5?: string;
  managedSourceHash?: string;
  fileLastModified?: number;
  lastsync: number;
  itemID: number;
}

declare interface SyncHistoryEntry {
  id: string;
  noteId: number;
  noteName: string;
  filePath: string;
  reason: string;
  action: "export" | "import" | "merge";
  target: "markdown" | "note";
  managed: boolean;
  timestamp: number;
  beforeText: string;
  afterText: string;
  beforeFrontmatter?: string;
  afterFrontmatter?: string;
  addedCount: number;
  removedCount: number;
}

declare interface MDStatus {
  meta: {
    $version: number;
    $libraryID?: number;
    $itemKey?: string;
    [key: string]: any;
  } | null;
  content: string;
  filedir: string;
  filename: string;
  lastmodify: Date;
}
