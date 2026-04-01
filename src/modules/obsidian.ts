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
  applyManagedObsidianFrontmatter,
  extractManagedObsidianUserMarkdown,
  getManagedObsidianFileName,
  getManagedObsidianNoteForItem,
  getManagedObsidianSourceHash,
  isManagedObsidianNote,
  renderManagedObsidianNoteMarkdown,
} from "./obsidian/managed";
export {
  openItemsInObsidian,
  repairObsidianManagedLinks,
  syncSelectedItemsToObsidian,
} from "./obsidian/sync";
