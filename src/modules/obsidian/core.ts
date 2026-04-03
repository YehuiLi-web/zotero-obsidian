export * from "./settings";
export * from "./frontmatter";
export * from "./markdown";
export * from "./childNotes";
export {
  ensureFrontmatterIndex,
  rebuildFrontmatterIndex,
  findFrontmatterCandidates,
  refreshFrontmatterIndexEntry,
  resolveNoteByFrontmatter,
} from "./frontmatterIndex";
export {
  getManagedScopeRoot,
  rememberManagedResolvedPath,
  resolveManagedNotePath,
  resolveManagedSyncTargetPath,
} from "./pathResolver";
export {
  loadRegistry,
  rebuildRegistryIndexes,
  getManagedNoteRegistry,
  getManagedNoteRegistryEntry,
  findManagedNoteRegistryEntryByItem,
  findManagedNoteRegistryEntryByPath,
  upsertRegistryEntry,
  markEntryMissing,
  markEntryTombstoned,
  resolveRegistryEntry,
} from "./registry";
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
  buildManagedFileNameTemplateContext,
  applyManagedFileNameTemplate,
  findExistingObsidianNote,
} from "./paths";
export {
  XHTML_NS,
  getFieldSafe,
  parseExtraMap,
  updateExtraField,
  hasFrontmatterKey,
  firstValue,
  cleanInline,
  normalizeMarkdown,
  normalizeStableValue,
  stableJSONStringify,
  yamlQuote,
  isPlainObject,
  yamlListBlock,
  escapeTableValue,
  getDateYear,
  formatAbstractLines,
  getScalarJSONValue,
} from "./shared";
