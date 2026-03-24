import {
  md2note,
  note2md,
  note2noteDiff,
  note2link,
  link2note,
  link2html,
  md2html,
  html2md,
  annotations2html,
  note2html,
  link2params,
  note2latex,
  content2diff,
} from "./utils/convert";
import { exportNotes } from "./modules/export/api";
import { saveDocx } from "./modules/export/docx";
import { saveFreeMind } from "./modules/export/freemind";
import { saveMD, syncMDBatch } from "./modules/export/markdown";
import { savePDF } from "./modules/export/pdf";
import { saveLatex, saveMergedLatex } from "./modules/export/latex";
import { fromMD } from "./modules/import/markdown";
import {
  isSyncNote,
  getSyncNoteIds,
  addSyncNote,
  updateSyncStatus,
  removeSyncNote,
  getSyncStatus,
  getNoteStatus,
  getMDStatus,
  getMDStatusFromContent,
  getMDFileName,
  findAllSyncedFiles,
} from "./modules/sync/api";
import {
  addSyncHistory,
  clearSyncHistory,
  formatSyncHistoryPreview,
  getSyncHistory,
  getSyncHistoryActionLabel,
  recordMarkdownSyncHistory,
  recordNoteSyncHistory,
} from "./modules/sync/history";
import {
  runTemplate,
  runTextTemplate,
  runItemTemplate,
  runQuickInsertTemplate,
} from "./modules/template/api";
import {
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  removeTemplate,
} from "./modules/template/controller";
import {
  SYSTEM_TEMPLATE_NAMES,
  DEFAULT_TEMPLATES,
} from "./modules/template/data";
import { renderTemplatePreview } from "./modules/template/preview";
import { parseCitationHTML } from "./utils/citation";
import {
  getEditorInstance,
  insert,
  del,
  scroll,
  scrollToSection,
  getTextBetweenLines,
  getLineAtCursor,
  getSectionAtCursor,
  getPositionAtLine,
  getTextBetween,
  getRangeAtCursor,
  move,
  replace,
  moveHeading,
  updateHeadingTextAtLine,
  getLineCount,
} from "./utils/editor";
import {
  addLineToNote,
  getNoteTree,
  getNoteTreeFlattened,
  getNoteTreeNodeById,
  getLinesInNote,
} from "./utils/note";
import {
  getAnnotationByLinkTarget,
  getLinkTargetByAnnotation,
  getNoteLinkInboundRelation,
  getNoteLinkOutboundRelation,
  linkAnnotationToTarget,
  updateNoteLinkRelation,
} from "./utils/relation";
import { getWorkspaceByUID } from "./utils/workspace";
import { getString } from "./utils/locale";
import { showRestartHint } from "./utils/hint";
import {
  applyManagedObsidianFrontmatter,
  getManagedObsidianFileName,
  getManagedObsidianSourceHash,
  isManagedObsidianNote,
  pickObsidianPath,
  repairObsidianManagedLinks,
  refreshObsidianPrefsUI,
  extractManagedObsidianUserMarkdown,
  renderManagedObsidianNoteMarkdown,
  resetObsidianMetadataPreset,
  saveObsidianMetadataPreset,
  setupObsidianDashboards,
  syncSelectedItemsToObsidian,
  writeObsidianConnectionTestFile,
} from "./modules/obsidian";

const workspace = {
  getWorkspaceByUID,
};

const sync = {
  isSyncNote,
  getSyncNoteIds,
  addSyncNote,
  updateSyncStatus,
  removeSyncNote,
  getSyncStatus,
  getNoteStatus,
  getMDStatus,
  getMDStatusFromContent,
  getMDFileName,
  findAllSyncedFiles,
  addHistory: addSyncHistory,
  getHistory: getSyncHistory,
  clearHistory: clearSyncHistory,
  recordMarkdownHistory: recordMarkdownSyncHistory,
  recordNoteHistory: recordNoteSyncHistory,
  formatHistoryPreview: formatSyncHistoryPreview,
  getHistoryActionLabel: getSyncHistoryActionLabel,
};

const convert = {
  md2note,
  note2md,
  note2noteDiff,
  note2link,
  link2note,
  link2params,
  link2html,
  md2html,
  html2md,
  annotations2html,
  note2html,
  item2citation: parseCitationHTML,
  note2latex,
  content2diff,
};

const template = {
  SYSTEM_TEMPLATE_NAMES,
  DEFAULT_TEMPLATES,
  runTemplate,
  runTextTemplate,
  runItemTemplate,
  runQuickInsertTemplate,
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  removeTemplate,
  renderTemplatePreview,
};

const $export = {
  exportNotes,
  saveMD,
  syncMDBatch,
  saveFreeMind,
  saveDocx,
  savePDF,
  saveLatex,
  saveMergedLatex,
};

const $import = {
  fromMD,
};

const editor = {
  getEditorInstance,
  insert,
  del,
  move,
  replace,
  scroll,
  scrollToSection,
  getRangeAtCursor,
  getLineAtCursor,
  getSectionAtCursor,
  getPositionAtLine,
  getLineCount,
  getTextBetween,
  getTextBetweenLines,
  moveHeading,
  updateHeadingTextAtLine,
};

const note = {
  insert: addLineToNote,
  getLinesInNote,
  getNoteTree,
  getNoteTreeFlattened,
  getNoteTreeNodeById,
};

const relation = {
  getNoteLinkInboundRelation,
  getNoteLinkOutboundRelation,
  updateNoteLinkRelation,
  linkAnnotationToTarget,
  getLinkTargetByAnnotation,
  getAnnotationByLinkTarget,
};

const utils = {
  getString,
  requireRestart: showRestartHint,
};

const obsidian = {
  pickPath: pickObsidianPath,
  syncSelectedItems: syncSelectedItemsToObsidian,
  isManagedNote: isManagedObsidianNote,
  getManagedSourceHash: getManagedObsidianSourceHash,
  repairManagedLinks: repairObsidianManagedLinks,
  renderMarkdown: renderManagedObsidianNoteMarkdown,
  extractUserMarkdown: extractManagedObsidianUserMarkdown,
  applyManagedFrontmatter: applyManagedObsidianFrontmatter,
  getManagedFileName: getManagedObsidianFileName,
  setupDashboards: setupObsidianDashboards,
  writeConnectionTestFile: writeObsidianConnectionTestFile,
  refreshPrefsUI: refreshObsidianPrefsUI,
  saveMetadataPreset: saveObsidianMetadataPreset,
  resetMetadataPreset: resetObsidianMetadataPreset,
};

export default {
  workspace,
  sync,
  convert,
  template,
  $export,
  $import,
  editor,
  note,
  relation,
  utils,
  obsidian,
};
