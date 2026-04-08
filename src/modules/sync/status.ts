export type SyncComparisonCache = {
  managedSourceHashes: Record<number, string>;
  noteSnapshotMd5s: Record<number, string>;
};

export enum SyncCode {
  UpToDate = 0,
  NoteAhead,
  MDAhead,
  NeedDiff,
}

export async function getSyncComparisonCode(
  noteItem: Zotero.Item,
  mdStatus: MDStatus,
  cache?: SyncComparisonCache,
): Promise<SyncCode> {
  const syncStatus = addon.api.sync.getSyncStatus(noteItem.id);
  // No file found
  if (!mdStatus.meta) {
    return SyncCode.NoteAhead;
  }
  const mdVersion = Number(mdStatus.meta.$version);
  // File meta is unavailable
  if (Number.isFinite(mdVersion) && mdVersion < 0) {
    return SyncCode.NeedDiff;
  }
  let MDAhead = false;
  let noteAhead = false;
  const md5 = Zotero.Utilities.Internal.md5(mdStatus.content, false);
  const noteStatus = addon.api.sync.getNoteStatus(noteItem.id);
  const noteSnapshot = noteStatus
    ? `${noteStatus.meta}${noteStatus.content}${noteStatus.tail}`
    : noteItem.getNote();
  const noteSnapshotMd5 = noteSnapshot
    ? Zotero.Utilities.Internal.md5(noteSnapshot, false)
    : "";
  if (noteSnapshotMd5) {
    cache?.noteSnapshotMd5s &&
      (cache.noteSnapshotMd5s[noteItem.id] = noteSnapshotMd5);
  }
  const noteMd5Candidates = Array.from(
    new Set(
      [
        Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
        noteSnapshotMd5,
      ].filter(Boolean),
    ),
  );
  const frontmatterMd5 = mdStatus.meta
    ? Zotero.Utilities.Internal.md5(JSON.stringify(mdStatus.meta), false)
    : "";
  const managedSourceHash = addon.api.obsidian.isManagedNote(noteItem)
    ? cache?.managedSourceHashes?.[noteItem.id] ||
      (await addon.api.obsidian.getManagedSourceHash(noteItem))
    : "";
  if (managedSourceHash) {
    cache?.managedSourceHashes &&
      (cache.managedSourceHashes[noteItem.id] = managedSourceHash);
  }
  // MD5 doesn't match (md side change)
  if (md5 !== syncStatus.md5) {
    MDAhead = true;
  }
  // Frontmatter changed (md side change, e.g. tags/status/rating edits)
  if (
    frontmatterMd5 &&
    syncStatus.frontmatterMd5 &&
    frontmatterMd5 !== syncStatus.frontmatterMd5
  ) {
    MDAhead = true;
  }
  // MD5 doesn't match (note side change)
  if (
    noteMd5Candidates.length &&
    !noteMd5Candidates.includes(syncStatus.noteMd5)
  ) {
    noteAhead = true;
  }
  // Note version doesn't match (note side change)
  // This might be unreliable when Zotero account is not login
  const currentNoteVersion = Math.max(
    Number(noteItem.version || 0),
    Number(
      (Zotero.Items.get(noteItem.id) as Zotero.Item | undefined)?.version || 0,
    ),
  );
  if (Number.isFinite(mdVersion) && mdVersion !== currentNoteVersion) {
    noteAhead = true;
  }
  if (managedSourceHash && managedSourceHash !== syncStatus.managedSourceHash) {
    noteAhead = true;
  }
  if (noteAhead && MDAhead) {
    return SyncCode.NeedDiff;
  } else if (noteAhead) {
    return SyncCode.NoteAhead;
  } else if (MDAhead) {
    return SyncCode.MDAhead;
  } else {
    return SyncCode.UpToDate;
  }
}
