export {
  maybeAutoRunObsidianSetupWizard,
  pickObsidianItemTemplate,
  pickObsidianPath,
  refreshObsidianPrefsUI,
  resetObsidianMetadataPreset,
  runObsidianSetupWizard,
  saveObsidianMetadataPreset,
} from "./preferences/compat/obsidian";
export { setupObsidianDashboards } from "./obsidian/dashboard";
export {
  writeObsidianConnectionTestFile,
  initObsidianStorage,
} from "./obsidian/settings";
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
} from "./obsidian/registry";
export {
  applyManagedObsidianFrontmatter,
  extractManagedObsidianUserMarkdown,
  getManagedObsidianFileName,
  getManagedObsidianNoteForItem,
  getManagedObsidianSourceHash,
  isManagedObsidianNote,
  renderManagedObsidianNoteMarkdown,
} from "./obsidian/managed";
export { resolveManagedNotePath } from "./obsidian/pathResolver";
export {
  getManagedNotePresenceState,
  openItemsInObsidian,
  repairObsidianManagedLinks,
  rebindManagedObsidianNotes,
  restoreManagedObsidianNotes,
  syncSelectedItemsToObsidian,
  unlinkManagedObsidianNotes,
} from "./obsidian/sync";
