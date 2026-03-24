"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insert = insert;
exports.del = del;
exports.move = move;
exports.replace = replace;
exports.scroll = scroll;
exports.scrollToSection = scrollToSection;
exports.getEditorInstance = getEditorInstance;
exports.copyNoteLink = copyNoteLink;
exports.moveHeading = moveHeading;
exports.updateHeadingTextAtLine = updateHeadingTextAtLine;
exports.getEditorCore = getEditorCore;
exports.getRangeAtCursor = getRangeAtCursor;
exports.getLineAtCursor = getLineAtCursor;
exports.getSectionAtCursor = getSectionAtCursor;
exports.getPositionAtLine = getPositionAtLine;
exports.getPositionAtCursor = getPositionAtCursor;
exports.getLineCount = getLineCount;
exports.getURLAtCursor = getURLAtCursor;
exports.updateImageDimensionsAtCursor = updateImageDimensionsAtCursor;
exports.updateURLAtCursor = updateURLAtCursor;
exports.getTextBetween = getTextBetween;
exports.getTextBetweenLines = getTextBetweenLines;
exports.isImageAtCursor = isImageAtCursor;
exports.initEditorPlugins = initEditorPlugins;
const prosemirror_model_1 = require("prosemirror-model");
const prosemirror_state_1 = require("prosemirror-state");
const note_1 = require("./note");
const prefs_1 = require("./prefs");
const linkCreator_1 = require("./linkCreator");
const hint_1 = require("./hint");
function getSliceFromHTMLFallback(editor, content) {
    const container = editor._iframeWindow.document.createElement("div");
    container.innerHTML = content;
    const fragment = editor._iframeWindow.document.createDocumentFragment();
    while (container.firstChild) {
        fragment.appendChild(container.firstChild);
    }
    return prosemirror_model_1.DOMParser.fromSchema(getEditorCore(editor).view.state.schema).parseSlice(fragment);
}
function insert(editor, content = "", position = "cursor", select) {
    const core = getEditorCore(editor);
    const EditorAPI = getEditorAPI(editor);
    if (position === "cursor") {
        position = getPositionAtCursor(editor);
    }
    else if (position === "end") {
        position = core.view.state.doc.content.size;
    }
    else if (position === "start") {
        position = 0;
    }
    position = Math.max(0, Math.min(position, core.view.state.doc.content.size));
    const slice = (EditorAPI === null || EditorAPI === void 0 ? void 0 : EditorAPI.getSliceFromHTML(core.view.state, content)) ||
        getSliceFromHTMLFallback(editor, content);
    core.view.dispatch(core.view.state.tr.insert(position, slice.content));
    if (select) {
        const from = position;
        const to = from + slice.content.size;
        if (EditorAPI) {
            EditorAPI.refocusEditor(() => {
                EditorAPI.setSelection(to, from)(core.view.state, core.view.dispatch);
            });
            return;
        }
        core.view.dispatch(core.view.state.tr.setSelection(prosemirror_state_1.TextSelection.create(core.view.state.tr.doc, to, from)));
    }
}
function del(editor, from, to) {
    const core = getEditorCore(editor);
    const EditorAPI = getEditorAPI(editor);
    if (EditorAPI) {
        EditorAPI.deleteRange(from, to)(core.view.state, core.view.dispatch);
        return;
    }
    core.view.dispatch(core.view.state.tr.delete(from, to));
}
function move(editor, from, to, delta) {
    const core = getEditorCore(editor);
    const EditorAPI = getEditorAPI(editor);
    EditorAPI.moveRange(from, to, delta)(core.view.state, core.view.dispatch);
}
function replace(editor, from, to, text, nodeTypeName, nodeAttrs, markTypeName, markAttrs, select) {
    const core = getEditorCore(editor);
    const EditorAPI = getEditorAPI(editor);
    const schema = core.view.state.schema;
    EditorAPI.replaceRangeNode(from, to, text, schema.nodes[nodeTypeName], JSON.stringify(nodeAttrs), schema.marks[markTypeName], JSON.stringify(markAttrs), select)(core.view.state, core.view.dispatch);
}
function scroll(editor, lineIndex) {
    var _a;
    const core = getEditorCore(editor);
    const dom = getDOMAtLine(editor, lineIndex);
    const offset = dom.offsetTop;
    (_a = core.view.dom.parentElement) === null || _a === void 0 ? void 0 : _a.scrollTo(0, offset);
}
function scrollToSection(editor, sectionName) {
    return __awaiter(this, void 0, void 0, function* () {
        const item = editor._item;
        const sectionTree = yield (0, note_1.getNoteTreeFlattened)(item);
        const sectionNode = sectionTree.find((node) => node.model.name.trim() === sectionName.trim());
        if (!sectionNode)
            return;
        scroll(editor, sectionNode.model.lineIndex);
    });
}
function getEditorInstance(noteId) {
    const editor = Zotero.Notes._editorInstances.find((e) => e._item.id === noteId && !Components.utils.isDeadWrapper(e._iframeWindow));
    return editor;
}
function getEditorCore(editor) {
    return editor._iframeWindow.wrappedJSObject._currentEditorInstance
        ._editorCore;
}
function getEditorAPI(editor) {
    return editor._iframeWindow.wrappedJSObject
        .ObsidianBridgeEditorAPI;
}
function getPositionAtCursor(editor) {
    const selection = getEditorCore(editor).view.state.selection;
    try {
        return selection.$anchor.after(selection.$anchor.depth);
    }
    catch (e) {
        return -1;
    }
}
function getRangeAtCursor(editor) {
    const selection = getEditorCore(editor).view.state.selection;
    return {
        from: selection.from,
        to: selection.to,
    };
}
function getLineAtCursor(editor) {
    const position = getPositionAtCursor(editor);
    if (position < 0) {
        return -1;
    }
    const lastPos = getEditorCore(editor).view.state.tr.doc.content.size;
    let i = 0;
    let currentPos = getPositionAtLine(editor, 0);
    while (currentPos <= lastPos) {
        if (position <= currentPos) {
            break;
        }
        i += 1;
        currentPos = getPositionAtLine(editor, i);
    }
    return i;
}
function getSectionAtCursor(editor) {
    return __awaiter(this, void 0, void 0, function* () {
        const lineIndex = getLineAtCursor(editor);
        if (lineIndex < 0)
            return undefined;
        const item = editor._item;
        const sectionTree = yield (0, note_1.getNoteTreeFlattened)(item);
        let sectionNode;
        for (let i = 0; i < sectionTree.length; i++) {
            if (
            // Is before cursor
            sectionTree[i].model.lineIndex <= lineIndex &&
                // Is last node, or next node is after cursor
                (i === sectionTree.length - 1 ||
                    sectionTree[i + 1].model.lineIndex > lineIndex)) {
                sectionNode = sectionTree[i];
                break;
            }
        }
        return sectionNode === null || sectionNode === void 0 ? void 0 : sectionNode.model.name;
    });
}
function getDOMAtLine(editor, lineIndex) {
    const core = getEditorCore(editor);
    const lineNodeDesc = core.view.docView.children[Math.max(0, Math.min(core.view.docView.children.length - 1, lineIndex))];
    return lineNodeDesc === null || lineNodeDesc === void 0 ? void 0 : lineNodeDesc.dom;
}
function getPositionAtLine(editor, lineIndex, type = "end") {
    const core = getEditorCore(editor);
    const lineCount = getLineCount(editor);
    if (lineIndex < 0) {
        return 0;
    }
    if (lineIndex >= lineCount) {
        return core.view.state.doc.content.size;
    }
    const lineNodeDesc = core.view.docView.children[Math.max(0, Math.min(core.view.docView.children.length - 1, lineIndex))];
    const linePos = lineNodeDesc ? core.view.posAtDOM(lineNodeDesc.dom, 0) : 0;
    return Math.max(0, Math.min(type === "end" ? linePos + lineNodeDesc.size - 1 : linePos - 1, core.view.state.tr.doc.content.size));
}
function getLineCount(editor) {
    return getEditorCore(editor).view.docView.children.length;
}
function getURLAtCursor(editor) {
    const core = getEditorCore(editor);
    return core.pluginState.link.getHref(core.view.state);
}
function updateURLAtCursor(editor, text, url) {
    const core = getEditorCore(editor);
    const EditorAPI = getEditorAPI(editor);
    const from = core.view.state.selection.from;
    const to = core.view.state.selection.to;
    const schema = core.view.state.schema;
    if (!url) {
        return;
    }
    EditorAPI.replaceRangeAtCursor(text, schema.marks.link, JSON.stringify({ href: url }), schema.marks.link)(core.view.state, core.view.dispatch);
    EditorAPI.refocusEditor(() => {
        core.view.dispatch(core.view.state.tr.setSelection(prosemirror_state_1.TextSelection.create(core.view.state.tr.doc, from, to)));
    });
}
function updateHeadingTextAtLine(editor, lineIndex, text) {
    const core = getEditorCore(editor);
    const schema = core.view.state.schema;
    const EditorAPI = getEditorAPI(editor);
    const from = getPositionAtLine(editor, lineIndex, "start");
    const to = getPositionAtLine(editor, lineIndex, "end");
    const level = EditorAPI.getHeadingLevelInRange(from, to)(core.view.state);
    EditorAPI.replaceRangeNode(from, to, text, schema.nodes.heading, JSON.stringify({ level }))(core.view.state, core.view.dispatch);
    EditorAPI.refocusEditor(() => {
        core.view.dispatch(core.view.state.tr.setSelection(prosemirror_state_1.TextSelection.create(core.view.state.tr.doc, from, from + text.length)));
    });
}
function isImageAtCursor(editor) {
    var _a, _b;
    return (
    // @ts-ignore
    ((_b = (_a = getEditorCore(editor).view.state.selection.node) === null || _a === void 0 ? void 0 : _a.type) === null || _b === void 0 ? void 0 : _b.name) === "image");
}
function updateImageDimensionsAtCursor(editor, width) {
    const core = getEditorCore(editor);
    const EditorAPI = getEditorAPI(editor);
    EditorAPI.updateImageDimensions(
    // @ts-ignore
    core.view.state.selection.node.attrs.nodeID, width, undefined, core.view.state, core.view.dispatch);
}
function moveLines(editor, fromIndex, toIndex, targetIndex) {
    const core = getEditorCore(editor);
    const EditorAPI = getEditorAPI(editor);
    const from = getPositionAtLine(editor, fromIndex, "start");
    const to = getPositionAtLine(editor, toIndex, "end");
    const target = getPositionAtLine(editor, targetIndex, "start");
    let delta = 0;
    if (target < from) {
        delta = target - from;
    }
    else if (target > to) {
        delta = target - to;
    }
    else {
        throw new Error("Invalid move");
    }
    EditorAPI.moveRange(from, to, delta)(core.view.state, core.view.dispatch);
    EditorAPI.refocusEditor(() => {
        core.view.dispatch(core.view.state.tr.setSelection(prosemirror_state_1.TextSelection.create(core.view.state.tr.doc, target, target + to - from)));
    });
}
function moveHeading(editor, currentNode, targetNode, as) {
    if (!editor || targetNode.getPath().indexOf(currentNode) >= 0) {
        return;
    }
    let targetIndex = 0;
    let targetLevel = 1;
    if (as === "child") {
        targetIndex = targetNode.model.endIndex + 1;
        targetLevel = targetNode.model.level === 6 ? 6 : targetNode.model.level + 1;
    }
    else if (as === "before") {
        targetIndex = targetNode.model.lineIndex;
        targetLevel =
            targetNode.model.level === 7
                ? targetNode.parent.model.level === 6
                    ? 6
                    : targetNode.parent.model.level + 1
                : targetNode.model.level;
    }
    else if (as === "after") {
        targetIndex = targetNode.model.endIndex + 1;
        targetLevel =
            targetNode.model.level === 7
                ? targetNode.parent.model.level === 6
                    ? 6
                    : targetNode.parent.model.level + 1
                : targetNode.model.level;
    }
    const fromIndex = currentNode.model.lineIndex;
    const toIndex = currentNode.model.endIndex;
    const levelChange = targetLevel - currentNode.model.level;
    const core = getEditorCore(editor);
    const EditorAPI = getEditorAPI(editor);
    EditorAPI.updateHeadingsInRange(getPositionAtLine(editor, fromIndex, "start"), getPositionAtLine(editor, toIndex, "end"), levelChange)(core.view.state, core.view.dispatch);
    moveLines(editor, fromIndex, toIndex, targetIndex);
}
function getTextBetween(editor, from, to) {
    const core = getEditorCore(editor);
    return core.view.state.doc.textBetween(from, to);
}
function getTextBetweenLines(editor, fromIndex, toIndex) {
    const core = getEditorCore(editor);
    const from = getPositionAtLine(editor, fromIndex, "start");
    const to = getPositionAtLine(editor, toIndex, "end");
    return core.view.state.doc.textBetween(from, to);
}
function copyNoteLink(editor, mode) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentLine = getLineAtCursor(editor);
        const currentSection = (yield getSectionAtCursor(editor)) || "";
        const sectionName = mode === "section" ? currentSection : undefined;
        const lineIndex = mode === "line" ? currentLine : undefined;
        // Hack to get the link
        const _internal = {
            link: "",
        };
        const html = yield addon.api.template.runQuickInsertTemplate(editor._item, undefined, {
            lineIndex,
            sectionName,
            dryRun: false,
            _internal,
        });
        const link = _internal.link;
        if (!link) {
            (0, hint_1.showHint)("No note link found");
            return;
        }
        new ztoolkit.Clipboard()
            .addText(link, "text/plain")
            .addText(html, "text/html")
            .copy();
        (0, hint_1.showHint)(`Link ${link} copied`);
    });
}
function initEditorPlugins(editor) {
    if (editor._disableUI) {
        return;
    }
    const previewType = (0, prefs_1.getPref)("editor.noteLinkPreviewType");
    if (!["hover", "ctrl"].includes(previewType)) {
        return;
    }
    const EditorAPI = getEditorAPI(editor);
    safeCall(() => EditorAPI.initPlugins(Components.utils.cloneInto({
        linkPreview: {
            setPreviewContent: (link, setContent) => {
                const note = addon.api.convert.link2note(link);
                if (!note) {
                    setContent(`<p style="color: red;">Invalid note link: ${link}</p>`);
                    return;
                }
                addon.api.convert
                    .link2html(link, {
                    noteItem: note,
                    dryRun: true,
                    usePosition: true,
                })
                    .then((content) => setContent(content));
            },
            openURL: (url) => {
                Zotero.getActiveZoteroPane().loadURI(url);
            },
            previewType,
        },
        magicKey: {
            insertTemplate: () => {
                addon.hooks.onShowTemplatePicker("insert", {
                    noteId: editor._item.id,
                    lineIndex: getLineAtCursor(editor),
                });
            },
            refreshTemplates: () => {
                addon.hooks.onRefreshTemplatesInNote(editor);
            },
            insertLink: (mode) => {
                (0, linkCreator_1.openLinkCreator)(editor._item, {
                    lineIndex: getLineAtCursor(editor),
                    mode,
                });
            },
            copyLink: (mode) => {
                copyNoteLink(editor, mode);
            },
            openAttachment: () => {
                var _a;
                (_a = editor._item.parentItem) === null || _a === void 0 ? void 0 : _a.getBestAttachment().then((attachment) => {
                    if (!attachment) {
                        return;
                    }
                    Zotero.getActiveZoteroPane().viewAttachment([attachment.id]);
                    Zotero.Notifier.trigger("open", "file", attachment.id);
                });
            },
            canOpenAttachment: () => {
                const parentItem = editor._item.parentItem;
                if (!parentItem) {
                    return false;
                }
                return (editor._item.parentItem.numAttachments() > 0);
            },
            enable: (0, prefs_1.getPref)("editor.useMagicKey"),
            enableShortcut: (0, prefs_1.getPref)("editor.useMagicKeyShortcut"),
        },
        markdownPaste: {
            enable: (0, prefs_1.getPref)("editor.useMarkdownPaste"),
        },
    }, editor._iframeWindow, { wrapReflectors: true, cloneFunctions: true })));
    EditorAPI.updateTableSize((0, prefs_1.getPref)("editor.pinTableLeft"), (0, prefs_1.getPref)("editor.pinTableTop"));
}
function safeCall(callback) {
    try {
        callback();
    }
    catch (e) {
        ztoolkit.log(e);
    }
}
