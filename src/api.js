"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const convert_1 = require("./utils/convert");
const api_1 = require("./modules/export/api");
const docx_1 = require("./modules/export/docx");
const freemind_1 = require("./modules/export/freemind");
const markdown_1 = require("./modules/export/markdown");
const pdf_1 = require("./modules/export/pdf");
const latex_1 = require("./modules/export/latex");
const markdown_2 = require("./modules/import/markdown");
const api_2 = require("./modules/sync/api");
const history_1 = require("./modules/sync/history");
const api_3 = require("./modules/template/api");
const controller_1 = require("./modules/template/controller");
const data_1 = require("./modules/template/data");
const preview_1 = require("./modules/template/preview");
const citation_1 = require("./utils/citation");
const editor_1 = require("./utils/editor");
const note_1 = require("./utils/note");
const relation_1 = require("./utils/relation");
const workspace_1 = require("./utils/workspace");
const locale_1 = require("./utils/locale");
const hint_1 = require("./utils/hint");
const obsidian_1 = require("./modules/obsidian");
const workspace = {
    getWorkspaceByUID: workspace_1.getWorkspaceByUID,
};
const sync = {
    isSyncNote: api_2.isSyncNote,
    getSyncNoteIds: api_2.getSyncNoteIds,
    addSyncNote: api_2.addSyncNote,
    updateSyncStatus: api_2.updateSyncStatus,
    removeSyncNote: api_2.removeSyncNote,
    getSyncStatus: api_2.getSyncStatus,
    getNoteStatus: api_2.getNoteStatus,
    getMDStatus: api_2.getMDStatus,
    getMDStatusFromContent: api_2.getMDStatusFromContent,
    getMDFileName: api_2.getMDFileName,
    findAllSyncedFiles: api_2.findAllSyncedFiles,
    addHistory: history_1.addSyncHistory,
    getHistory: history_1.getSyncHistory,
    clearHistory: history_1.clearSyncHistory,
    recordMarkdownHistory: history_1.recordMarkdownSyncHistory,
    recordNoteHistory: history_1.recordNoteSyncHistory,
    formatHistoryPreview: history_1.formatSyncHistoryPreview,
    getHistoryActionLabel: history_1.getSyncHistoryActionLabel,
};
const convert = {
    md2note: convert_1.md2note,
    note2md: convert_1.note2md,
    note2noteDiff: convert_1.note2noteDiff,
    note2link: convert_1.note2link,
    link2note: convert_1.link2note,
    link2params: convert_1.link2params,
    link2html: convert_1.link2html,
    md2html: convert_1.md2html,
    html2md: convert_1.html2md,
    annotations2html: convert_1.annotations2html,
    note2html: convert_1.note2html,
    item2citation: citation_1.parseCitationHTML,
    note2latex: convert_1.note2latex,
    content2diff: convert_1.content2diff,
};
const template = {
    SYSTEM_TEMPLATE_NAMES: data_1.SYSTEM_TEMPLATE_NAMES,
    DEFAULT_TEMPLATES: data_1.DEFAULT_TEMPLATES,
    runTemplate: api_3.runTemplate,
    runTextTemplate: api_3.runTextTemplate,
    runItemTemplate: api_3.runItemTemplate,
    runQuickInsertTemplate: api_3.runQuickInsertTemplate,
    getTemplateKeys: controller_1.getTemplateKeys,
    getTemplateText: controller_1.getTemplateText,
    setTemplate: controller_1.setTemplate,
    removeTemplate: controller_1.removeTemplate,
    renderTemplatePreview: preview_1.renderTemplatePreview,
};
const $export = {
    exportNotes: api_1.exportNotes,
    saveMD: markdown_1.saveMD,
    syncMDBatch: markdown_1.syncMDBatch,
    saveFreeMind: freemind_1.saveFreeMind,
    saveDocx: docx_1.saveDocx,
    savePDF: pdf_1.savePDF,
    saveLatex: latex_1.saveLatex,
    saveMergedLatex: latex_1.saveMergedLatex,
};
const $import = {
    fromMD: markdown_2.fromMD,
};
const editor = {
    getEditorInstance: editor_1.getEditorInstance,
    insert: editor_1.insert,
    del: editor_1.del,
    move: editor_1.move,
    replace: editor_1.replace,
    scroll: editor_1.scroll,
    scrollToSection: editor_1.scrollToSection,
    getRangeAtCursor: editor_1.getRangeAtCursor,
    getLineAtCursor: editor_1.getLineAtCursor,
    getSectionAtCursor: editor_1.getSectionAtCursor,
    getPositionAtLine: editor_1.getPositionAtLine,
    getLineCount: editor_1.getLineCount,
    getTextBetween: editor_1.getTextBetween,
    getTextBetweenLines: editor_1.getTextBetweenLines,
    moveHeading: editor_1.moveHeading,
    updateHeadingTextAtLine: editor_1.updateHeadingTextAtLine,
};
const note = {
    insert: note_1.addLineToNote,
    getLinesInNote: note_1.getLinesInNote,
    getNoteTree: note_1.getNoteTree,
    getNoteTreeFlattened: note_1.getNoteTreeFlattened,
    getNoteTreeNodeById: note_1.getNoteTreeNodeById,
};
const relation = {
    getNoteLinkInboundRelation: relation_1.getNoteLinkInboundRelation,
    getNoteLinkOutboundRelation: relation_1.getNoteLinkOutboundRelation,
    updateNoteLinkRelation: relation_1.updateNoteLinkRelation,
    linkAnnotationToTarget: relation_1.linkAnnotationToTarget,
    getLinkTargetByAnnotation: relation_1.getLinkTargetByAnnotation,
    getAnnotationByLinkTarget: relation_1.getAnnotationByLinkTarget,
};
const utils = {
    getString: locale_1.getString,
    requireRestart: hint_1.showRestartHint,
};
const obsidian = {
    pickPath: obsidian_1.pickObsidianPath,
    syncSelectedItems: obsidian_1.syncSelectedItemsToObsidian,
    isManagedNote: obsidian_1.isManagedObsidianNote,
    getManagedSourceHash: obsidian_1.getManagedObsidianSourceHash,
    repairManagedLinks: obsidian_1.repairObsidianManagedLinks,
    renderMarkdown: obsidian_1.renderManagedObsidianNoteMarkdown,
    extractUserMarkdown: obsidian_1.extractManagedObsidianUserMarkdown,
    applyManagedFrontmatter: obsidian_1.applyManagedObsidianFrontmatter,
    getManagedFileName: obsidian_1.getManagedObsidianFileName,
    setupDashboards: obsidian_1.setupObsidianDashboards,
    writeConnectionTestFile: obsidian_1.writeObsidianConnectionTestFile,
    refreshPrefsUI: obsidian_1.refreshObsidianPrefsUI,
    saveMetadataPreset: obsidian_1.saveObsidianMetadataPreset,
    resetMetadataPreset: obsidian_1.resetObsidianMetadataPreset,
};
exports.default = {
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
