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
exports.md2note = md2note;
exports.note2md = note2md;
exports.note2noteDiff = note2noteDiff;
exports.note2link = note2link;
exports.link2note = link2note;
exports.link2params = link2params;
exports.link2html = link2html;
exports.md2html = md2html;
exports.html2md = html2md;
exports.annotations2html = annotations2html;
exports.note2html = note2html;
exports.note2latex = note2latex;
exports.content2diff = content2diff;
exports.closeConvertServer = closeConvertServer;
const package_json_1 = require("../../package.json");
const unified_1 = require("unified");
const rehype_parse_1 = require("rehype-parse");
const hast_util_to_html_1 = require("hast-util-to-html");
const hast_util_to_text_1 = require("hast-util-to-text");
const remark_gfm_1 = require("remark-gfm");
const remark_math_1 = require("remark-math");
// visit may push nodes twice, use new Array(...new Set(nodes))
// if the you want to process nodes outside visit
const unist_util_visit_1 = require("unist-util-visit");
const rehype_format_1 = require("rehype-format");
const hastscript_1 = require("hastscript");
const YAML = require("yamljs");
const str_1 = require("./str");
const note_1 = require("./note");
const link_1 = require("./link");
const annotation_1 = require("./annotation");
const prefs_1 = require("./prefs");
const hint_1 = require("./hint");
const zotero_plugin_toolkit_1 = require("zotero-plugin-toolkit");
function closeConvertServer() {
    if (addon.data.convert.server) {
        addon.data.convert.server.destroy();
        addon.data.convert.server = undefined;
    }
}
function getConvertServer() {
    return __awaiter(this, void 0, void 0, function* () {
        if (addon.data.convert.server) {
            return addon.data.convert.server;
        }
        const worker = new Worker(`chrome://${package_json_1.config.addonRef}/content/scripts/convertWorker.js`, { name: "convertWorker" });
        const server = new zotero_plugin_toolkit_1.MessageHelper({
            canBeDestroyed: false,
            dev: __env__ === "development",
            name: "convertWorkerMain",
            target: worker,
            handlers: {},
        });
        server.start();
        yield server.proxy._ping();
        addon.data.convert.server = server;
        return server;
    });
}
function note2rehype(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        return yield server.proxy.note2rehype(...args);
    });
}
function rehype2remark(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        return yield server.proxy.rehype2remark(...args);
    });
}
function rehype2note(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        return yield server.proxy.rehype2note(...args);
    });
}
function remark2rehype(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        return yield server.proxy.remark2rehype(...args);
    });
}
function md2remark(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        return yield server.proxy.md2remark(...args);
    });
}
function remark2md(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        return yield server.proxy.remark2md(...args);
    });
}
function remark2latex(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        return yield server.proxy.remark2latex(...args);
    });
}
function md2html(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        return yield server.proxy.md2html(...args);
    });
}
function note2md(noteItem_1, dir_1) {
    return __awaiter(this, arguments, void 0, function* (noteItem, dir, options = {}) {
        var _a;
        const noteStatus = addon.api.sync.getNoteStatus(noteItem.id);
        const rehype = yield note2rehype(noteStatus.content);
        processN2MRehypeHighlightNodes(getN2MRehypeHighlightNodes(rehype), NodeMode.direct);
        processN2MRehypeCitationNodes(getN2MRehypeCitationNodes(rehype), NodeMode.direct);
        yield processN2MRehypeNoteLinkNodes(getN2MRehypeNoteLinkNodes(rehype), dir, options.keepNoteLink ? NodeMode.default : NodeMode.direct);
        yield processN2MRehypeImageNodes(getN2MRehypeImageNodes(rehype), noteItem.libraryID, options.attachmentDir ||
            (0, str_1.jointPath)(dir, (0, prefs_1.getPref)("syncAttachmentFolder")), options.attachmentFolder || (0, prefs_1.getPref)("syncAttachmentFolder"), options.skipSavingImages, false, NodeMode.direct);
        if (!options.skipSavingImages) {
            yield processN2MRehypeInlineImageNodes(getN2MRehypeInlineImageNodes(rehype), options.attachmentDir ||
                (0, str_1.jointPath)(dir, (0, prefs_1.getPref)("syncAttachmentFolder")), options.attachmentFolder || (0, prefs_1.getPref)("syncAttachmentFolder"), NodeMode.direct);
        }
        const remark = yield rehype2remark(rehype);
        if (!remark) {
            throw new Error("Parsing Error: Rehype2Remark");
        }
        let md = yield remark2md(remark);
        try {
            md =
                (_a = (yield addon.api.template.runTemplate("[ExportMDFileContent]", "noteItem, mdContent", [noteItem, md]))) !== null && _a !== void 0 ? _a : md;
        }
        catch (e) {
            ztoolkit.log(e);
        }
        if (options.withYAMLHeader) {
            let header = {};
            try {
                header = JSON.parse(yield addon.api.template.runTemplate("[ExportMDFileHeaderV2]", "noteItem", [noteItem]));
                const cachedHeader = options.cachedYAMLHeader || {};
                for (const key in cachedHeader) {
                    if ((key === "tags" || key.startsWith("$")) && key in header) {
                        // generated header overwrites cached header
                        continue;
                    }
                    else {
                        // otherwise do not overwrite
                        header[key] = cachedHeader[key];
                    }
                }
            }
            catch (e) {
                ztoolkit.log(e);
            }
            Object.assign(header, {
                $version: noteItem.version,
                $libraryID: noteItem.libraryID,
                $itemKey: noteItem.key,
            });
            const yamlFrontMatter = `---\n${YAML.stringify(header, 10)}\n---`;
            md = `${yamlFrontMatter}\n${md}`;
        }
        return md;
    });
}
function md2note(mdStatus_1, noteItem_1) {
    return __awaiter(this, arguments, void 0, function* (mdStatus, noteItem, options = {}) {
        const remark = yield md2remark(mdStatus.content);
        const _rehype = yield remark2rehype(remark);
        const _note = yield rehype2note(_rehype);
        const rehype = yield note2rehype(_note);
        // Check if image citation already belongs to note
        processM2NRehypeMetaImageNodes(getM2NRehypeImageNodes(rehype));
        processM2NRehypeHighlightNodes(getM2NRehypeHighlightNodes(rehype));
        yield processM2NRehypeCitationNodes(getM2NRehypeCitationNodes(rehype), options.isImport);
        processM2NRehypeNoteLinkNodes(getM2NRehypeNoteLinkNodes(rehype));
        yield processM2NRehypeImageNodes(getM2NRehypeImageNodes(rehype), noteItem, mdStatus.filedir, options.isImport);
        const noteContent = yield rehype2note(rehype);
        return noteContent;
    });
}
function note2latex(noteItem_1, dir_1) {
    return __awaiter(this, arguments, void 0, function* (noteItem, dir, options = {}) {
        var _a;
        const noteStatus = addon.api.sync.getNoteStatus(noteItem.id);
        const rehype = yield note2rehype(noteStatus.content);
        const bibString = yield processN2LRehypeCitationNodes(getN2MRehypeCitationNodes(rehype));
        yield processN2LRehypeHeaderNodes(getN2LRehypeHeaderNodes(rehype));
        yield processN2LRehypeLinkNodes(getN2LRehypeLinkNodes(rehype));
        yield processN2LRehypeListNodes(getN2LRehypeListNodes(rehype));
        yield processN2LRehypeTableNodes(getN2LRehypeTableNodes(rehype));
        yield processN2LRehypeImageNodes(getN2MRehypeImageNodes(rehype), noteItem.libraryID, (0, str_1.jointPath)(dir, (0, prefs_1.getPref)("syncAttachmentFolder")), options.skipSavingImages, false, NodeMode.direct);
        if (!options.skipSavingImages) {
            yield processN2MRehypeInlineImageNodes(getN2MRehypeInlineImageNodes(rehype), (0, str_1.jointPath)(dir, (0, prefs_1.getPref)("syncAttachmentFolder")), (0, prefs_1.getPref)("syncAttachmentFolder"), NodeMode.direct);
        }
        const remark = yield rehype2remark(rehype);
        if (!remark) {
            throw new Error("Parsing Error: Rehype2Remark");
        }
        let latex = yield remark2latex(remark);
        try {
            latex =
                (_a = (yield addon.api.template.runTemplate("[ExportLatexFileContent]", "noteItem, latexContent", [noteItem, latex]))) !== null && _a !== void 0 ? _a : latex;
        }
        catch (e) {
            ztoolkit.log(e);
        }
        return [latex, bibString];
    });
}
function note2noteDiff(noteItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const noteStatus = addon.api.sync.getNoteStatus(noteItem.id);
        const rehype = yield note2rehype(noteStatus.content);
        yield processM2NRehypeCitationNodes(getM2NRehypeCitationNodes(rehype), true);
        // Parse content like citations
        return yield rehype2note(rehype);
    });
}
function content2diff(oldStr, newStr) {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getConvertServer();
        const diff = yield server.proxy.content2diff(oldStr, newStr);
        return diff;
    });
}
function note2link(noteItem, options = {}) {
    return (0, link_1.getNoteLink)(noteItem, options);
}
function link2note(link) {
    return (0, link_1.getNoteLinkParams)(link).noteItem;
}
function link2params(link) {
    return (0, link_1.getNoteLinkParams)(link);
}
function link2html(link_2) {
    return __awaiter(this, arguments, void 0, function* (link, options = {}) {
        var _a, _b;
        ztoolkit.log("link2html", link, (_a = options.noteItem) === null || _a === void 0 ? void 0 : _a.id, options.dryRun, options.usePosition);
        const linkParams = (0, link_1.getNoteLinkParams)(link);
        if (!linkParams.noteItem) {
            return "";
        }
        const refIds = (0, link_1.getLinkedNotesRecursively)(link);
        const refNotes = options.noteItem ? Zotero.Items.get(refIds) : [];
        ztoolkit.log(refIds);
        let html;
        if (options.usePosition) {
            const item = linkParams.noteItem;
            let lineIndex = linkParams.lineIndex;
            if (typeof linkParams.sectionName === "string") {
                const sectionTree = yield addon.api.note.getNoteTreeFlattened(item);
                const sectionNode = sectionTree.find((node) => node.model.name.trim() === linkParams.sectionName.trim());
                lineIndex = sectionNode === null || sectionNode === void 0 ? void 0 : sectionNode.model.lineIndex;
            }
            html = (yield addon.api.note.getLinesInNote(item))
                .slice(lineIndex)
                .join("\n");
        }
        else {
            html = ((_b = addon.api.sync.getNoteStatus(linkParams.noteItem.id)) === null || _b === void 0 ? void 0 : _b.content) || "";
        }
        if (options.dryRun) {
            return yield (0, note_1.renderNoteHTML)(html, refNotes);
        }
        else {
            return yield (0, note_1.copyEmbeddedImagesInHTML)(
            // Only embed the note content
            html, options.noteItem, refNotes);
        }
    });
}
function html2md(html) {
    return __awaiter(this, void 0, void 0, function* () {
        const rehype = yield note2rehype(html);
        const remark = yield rehype2remark(rehype);
        if (!remark) {
            throw new Error("Parsing Error: HTML2MD");
        }
        const md = yield remark2md(remark);
        return md;
    });
}
function annotations2html(annotations, options = {}) {
    return (0, annotation_1.parseAnnotationHTML)(annotations, options);
}
function note2html(noteItems_1) {
    return __awaiter(this, arguments, void 0, function* (noteItems, options = {}) {
        if (!Array.isArray(noteItems)) {
            noteItems = [noteItems];
        }
        const { targetNoteItem, dryRun } = options;
        let html = options.html;
        if (!html) {
            html = noteItems.map((item) => item.getNote()).join("\n");
        }
        if (!dryRun && (targetNoteItem === null || targetNoteItem === void 0 ? void 0 : targetNoteItem.isNote())) {
            const str = yield (0, note_1.copyEmbeddedImagesInHTML)(html, targetNoteItem, noteItems);
            return str;
        }
        return yield (0, note_1.renderNoteHTML)(html, noteItems);
    });
}
function rehype2rehype(rehype) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, unified_1.unified)()
            .use(rehype_format_1.default)
            .run(rehype);
    });
}
function replace(targetNode, sourceNode) {
    targetNode.type = sourceNode.type;
    targetNode.tagName = sourceNode.tagName;
    targetNode.properties = sourceNode.properties;
    targetNode.value = sourceNode.value;
    targetNode.children = sourceNode.children;
}
function getN2MRehypeHighlightNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => {
        var _a, _b;
        return node.type === "element" &&
            ((_b = (_a = node.properties) === null || _a === void 0 ? void 0 : _a.className) === null || _b === void 0 ? void 0 : _b.includes("highlight"));
    }, (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function getN2MRehypeCitationNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => {
        var _a, _b;
        return node.type === "element" &&
            ((_b = (_a = node.properties) === null || _a === void 0 ? void 0 : _a.className) === null || _b === void 0 ? void 0 : _b.includes("citation"));
    }, (node) => {
        nodes.push(node);
    });
    return new Array(...new Set(nodes));
}
function getN2MRehypeNoteLinkNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => {
        var _a, _b;
        return node.type === "element" &&
            node.tagName === "a" &&
            ((_a = node.properties) === null || _a === void 0 ? void 0 : _a.href) &&
            /zotero:\/\/note\/\w+\/\w+\//.test((_b = node.properties) === null || _b === void 0 ? void 0 : _b.href);
    }, (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function getN2MRehypeImageNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => {
        var _a;
        return node.type === "element" &&
            node.tagName === "img" &&
            ((_a = node.properties) === null || _a === void 0 ? void 0 : _a.dataAttachmentKey);
    }, (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function getN2MRehypeInlineImageNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => {
        var _a, _b;
        return node.type === "element" &&
            node.tagName === "img" &&
            !((_a = node.properties) === null || _a === void 0 ? void 0 : _a.dataAttachmentKey) &&
            ((_b = node.properties) === null || _b === void 0 ? void 0 : _b.src) &&
            typeof node.properties.src === "string" &&
            node.properties.src.startsWith("data:image/");
    }, (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function processN2MRehypeHighlightNodes(nodes, mode = NodeMode.default) {
    if (!nodes.length) {
        return;
    }
    for (const node of nodes) {
        let annotation;
        try {
            annotation = JSON.parse(decodeURIComponent(node.properties.dataAnnotation));
        }
        catch (e) {
            continue;
        }
        if (!annotation) {
            continue;
        }
        // annotation.uri was used before note-editor v4
        const uri = annotation.attachmentURI || annotation.uri;
        const position = annotation.position;
        if (typeof uri === "string" && typeof position === "object") {
            let openURI;
            const uriParts = uri.split("/");
            const libraryType = uriParts[3];
            const key = uriParts[uriParts.length - 1];
            if (libraryType === "users") {
                openURI = "zotero://open/library/items/" + key;
            }
            // groups
            else {
                const groupID = uriParts[4];
                openURI = "zotero://open/groups/" + groupID + "/items/" + key;
            }
            openURI +=
                "?page=" +
                    (position.pageIndex + 1) +
                    (annotation.annotationKey
                        ? "&annotation=" + annotation.annotationKey
                        : "");
            let newNode = (0, hastscript_1.h)("span", [
                (0, hastscript_1.h)(node.tagName, node.properties, node.children),
                (0, hastscript_1.h)("span", " ("),
                (0, hastscript_1.h)("a", { href: openURI }, ["pdf"]),
                (0, hastscript_1.h)("span", ") "),
            ]);
            const annotKey = annotation.annotationKey ||
                (0, str_1.randomString)(8, Zotero.Utilities.Internal.md5(node.properties.dataAnnotation), Zotero.Utilities.allowedKeyChars);
            if (mode === NodeMode.wrap) {
                newNode.children.splice(0, 0, (0, hastscript_1.h)("wrapperleft", `annot:${annotKey}`));
                newNode.children.push((0, hastscript_1.h)("wrapperright", `annot:${annotKey}`));
            }
            else if (mode === NodeMode.replace) {
                newNode = (0, hastscript_1.h)("placeholder", `annot:${annotKey}`);
            }
            else if (mode === NodeMode.direct) {
                const newChild = (0, hastscript_1.h)("span");
                replace(newChild, node);
                newChild.children = [(0, hastscript_1.h)("a", { href: openURI }, node.children)];
                newChild.properties.ztype = "zhighlight";
                newNode = (0, hastscript_1.h)("zhighlight", [newChild]);
            }
            replace(node, newNode);
        }
    }
}
function processN2MRehypeCitationNodes(nodes, mode = NodeMode.default) {
    var _a;
    if (!nodes.length) {
        return;
    }
    for (const node of nodes) {
        let citation;
        try {
            citation = JSON.parse(decodeURIComponent(node.properties.dataCitation));
        }
        catch (e) {
            continue;
        }
        if (!((_a = citation === null || citation === void 0 ? void 0 : citation.citationItems) === null || _a === void 0 ? void 0 : _a.length)) {
            continue;
        }
        const uris = [];
        for (const citationItem of citation.citationItems) {
            const uri = citationItem.uris[0];
            if (typeof uri === "string") {
                const uriParts = uri.split("/");
                const libraryType = uriParts[3];
                const key = uriParts[uriParts.length - 1];
                if (libraryType === "users") {
                    uris.push("zotero://select/library/items/" + key);
                }
                // groups
                else {
                    const groupID = uriParts[4];
                    uris.push("zotero://select/groups/" + groupID + "/items/" + key);
                }
            }
        }
        let childNodes = [];
        (0, unist_util_visit_1.visit)(node, (_n) => { var _a, _b; return (_b = (_a = _n.properties) === null || _a === void 0 ? void 0 : _a.className) === null || _b === void 0 ? void 0 : _b.includes("citation-item"); }, (_n) => {
            return childNodes === null || childNodes === void 0 ? void 0 : childNodes.push(_n);
        });
        // For unknown reasons, the element will be duplicated. Remove them.
        childNodes = new Array(...new Set(childNodes));
        // Fallback to pre v5 note-editor schema that was serializing citations as plain text i.e.:
        // <span class="citation" data-citation="...">(Jang et al., 2005, p. 14; Kongsgaard et al., 2009, p. 790)</span>
        if (!childNodes.length) {
            childNodes = (0, hast_util_to_text_1.toText)(node).slice(1, -1).split("; ");
        }
        let newNode = (0, hastscript_1.h)("span", node.properties, [
            { type: "text", value: "(" },
            ...childNodes.map((child, i) => {
                if (!child) {
                    return (0, hastscript_1.h)("text", "");
                }
                const newNode = (0, hastscript_1.h)("span");
                replace(newNode, child);
                newNode.children = [(0, hastscript_1.h)("a", { href: uris[i] }, child.children)];
                return newNode;
            }),
            { type: "text", value: ")" },
        ]);
        const citationKey = (0, str_1.randomString)(8, Zotero.Utilities.Internal.md5(node.properties.dataCitation), Zotero.Utilities.allowedKeyChars);
        if (mode === NodeMode.wrap) {
            newNode.children.splice(0, 0, (0, hastscript_1.h)("wrapperleft", `cite:${citationKey}`));
            newNode.children.push((0, hastscript_1.h)("wrapperright", `cite:${citationKey}`));
        }
        else if (mode === NodeMode.replace) {
            newNode = (0, hastscript_1.h)("placeholder", `cite:${citationKey}`);
        }
        else if (mode === NodeMode.direct) {
            const newChild = (0, hastscript_1.h)("span");
            replace(newChild, newNode);
            newChild.properties.ztype = "zcitation";
            newNode = (0, hastscript_1.h)("zcitation", [newChild]);
        }
        replace(node, newNode);
    }
}
function processN2MRehypeNoteLinkNodes(nodes_1, dir_1) {
    return __awaiter(this, arguments, void 0, function* (nodes, dir, mode = NodeMode.default) {
        var _a;
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            const linkParam = (0, link_1.getNoteLinkParams)(node.properties.href);
            if (!linkParam.noteItem) {
                continue;
            }
            const link = mode === NodeMode.default ||
                !addon.api.sync.isSyncNote(linkParam.noteItem.id)
                ? node.properties.href
                : `./${yield addon.api.sync.getMDFileName(linkParam.noteItem.id, dir)}`;
            const linkKey = (0, str_1.randomString)(8, Zotero.Utilities.Internal.md5(node.properties.href), Zotero.Utilities.allowedKeyChars);
            if (mode === NodeMode.wrap) {
                const newNode = (0, hastscript_1.h)("span", [
                    (0, hastscript_1.h)("wrapperleft", `note:${linkKey}`),
                    (0, hastscript_1.h)(node.tagName, Object.assign(node.properties, { href: link }), node.children),
                    (0, hastscript_1.h)("wrapperright", `note:${linkKey}`),
                ]);
                replace(node, newNode);
            }
            else if (mode === NodeMode.replace) {
                const newNode = (0, hastscript_1.h)("placeholder", `note:${linkKey}`);
                replace(node, newNode);
            }
            else if (mode === NodeMode.direct || mode === NodeMode.default) {
                const newChild = (0, hastscript_1.h)("a", node.properties, node.children);
                newChild.properties.zhref = node.properties.href;
                newChild.properties.href = link;
                newChild.properties.ztype = "znotelink";
                // required for obsidian compatibility
                if (!((_a = newChild.properties.className) === null || _a === void 0 ? void 0 : _a.includes("internal-link"))) {
                    if (!newChild.properties.className) {
                        newChild.properties.className = [];
                    }
                    newChild.properties.className.push("internal-link");
                }
                const newNode = (0, hastscript_1.h)("znotelink", [newChild]);
                replace(node, newNode);
            }
        }
    });
}
function processN2MRehypeImageNodes(nodes_1, libraryID_1, dir_1) {
    return __awaiter(this, arguments, void 0, function* (nodes, libraryID, dir, relativeDir = (0, prefs_1.getPref)("syncAttachmentFolder"), skipSavingImages = false, absolutePath = false, mode = NodeMode.default) {
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            const imgKey = node.properties.dataAttachmentKey;
            const width = node.properties.width;
            const attachmentItem = (yield Zotero.Items.getByLibraryAndKeyAsync(libraryID, imgKey));
            if (!attachmentItem) {
                continue;
            }
            const oldFile = String(yield attachmentItem.getFilePathAsync());
            const ext = oldFile.split(".").pop();
            const newAbsPath = (0, str_1.formatPath)(`${dir}/${imgKey}.${ext}`);
            let newFile = oldFile;
            try {
                // Don't overwrite
                if (skipSavingImages || (yield (0, str_1.fileExists)(newAbsPath))) {
                    newFile = newAbsPath;
                }
                else {
                    newFile = (yield Zotero.File.copyToUnique(oldFile, newAbsPath)).path;
                }
                newFile = (0, str_1.formatPath)(absolutePath
                    ? newFile
                    : (0, str_1.jointPath)(relativeDir || "", PathUtils.split(newFile).pop() || ""));
            }
            catch (e) {
                ztoolkit.log(e);
            }
            node.properties.src = newFile ? newFile : oldFile;
            // If on Windows, convert path to Unix style
            if (Zotero.isWin) {
                node.properties.src = Zotero.File.normalizeToUnix(node.properties.src);
            }
            if (mode === NodeMode.direct) {
                const newChild = (0, hastscript_1.h)("span");
                replace(newChild, node);
                newChild.properties.ztype = "zimage";
                // const newNode = h("zimage", [newChild]);
                // replace(node, newNode);
                node.properties.alt = (0, hast_util_to_html_1.toHtml)(newChild);
                if (width) {
                    node.properties.alt = `${node.properties.alt} | ${width}`;
                }
            }
        }
    });
}
function processN2MRehypeInlineImageNodes(nodes_1, dir_1) {
    return __awaiter(this, arguments, void 0, function* (nodes, dir, relativeDir = "", mode = NodeMode.default) {
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            const src = node.properties.src;
            const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!match) {
                continue;
            }
            const ext = match[1] === "jpeg" ? "jpg" : match[1];
            const hash = Zotero.Utilities.Internal.md5(match[2], false).slice(0, 12);
            const fileName = `inline-${hash}.${ext}`;
            const absPath = (0, str_1.formatPath)(`${dir}/${fileName}`);
            try {
                if (!(yield (0, str_1.fileExists)(absPath))) {
                    const binaryStr = atob(match[2]);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    yield Zotero.File.createDirectoryIfMissingAsync(dir);
                    yield IOUtils.write(absPath, bytes);
                }
                let newFile = (0, str_1.formatPath)((0, str_1.jointPath)(relativeDir || "", fileName));
                if (Zotero.isWin) {
                    newFile = Zotero.File.normalizeToUnix(newFile);
                }
                node.properties.src = newFile;
                if (mode === NodeMode.direct) {
                    const newChild = (0, hastscript_1.h)("span");
                    replace(newChild, node);
                    newChild.properties.ztype = "zimage";
                    node.properties.alt = (0, hast_util_to_html_1.toHtml)(newChild);
                    const width = node.properties.width;
                    if (width) {
                        node.properties.alt = `${node.properties.alt} | ${width}`;
                    }
                }
            }
            catch (e) {
                ztoolkit.log("[note2md] processN2MRehypeInlineImageNodes failed", e);
            }
        }
    });
}
function getM2NRehypeAnnotationNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => { var _a; return node.type === "element" && ((_a = node.properties) === null || _a === void 0 ? void 0 : _a.dataAnnotation); }, (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function getM2NRehypeHighlightNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => { var _a; return node.type === "element" && ((_a = node.properties) === null || _a === void 0 ? void 0 : _a.ztype) === "zhighlight"; }, (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function getM2NRehypeCitationNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => {
        var _a, _b;
        return node.type === "element" &&
            (((_a = node.properties) === null || _a === void 0 ? void 0 : _a.ztype) === "zcitation" || ((_b = node.properties) === null || _b === void 0 ? void 0 : _b.dataCitation));
    }, (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function getM2NRehypeNoteLinkNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => { var _a; return node.type === "element" && ((_a = node.properties) === null || _a === void 0 ? void 0 : _a.ztype) === "znotelink"; }, (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function getM2NRehypeImageNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" && node.tagName === "img", (node) => nodes.push(node));
    return new Array(...new Set(nodes));
}
function processM2NRehypeMetaImageNodes(nodes) {
    if (!nodes.length) {
        return;
    }
    for (const node of nodes) {
        const alt = node.properties.alt;
        if (/zimage/.test(alt)) {
            // If alt.split("|")[last] can be parsed to number, it's width
            const width = Number(alt.split("|").pop() || "");
            let nodeRaw = alt;
            if (width > 0) {
                nodeRaw = alt.split("|").slice(0, -1).join("|");
            }
            const newNode = (0, unified_1.unified)()
                .use(remark_gfm_1.default)
                .use(remark_math_1.default)
                .use(rehype_parse_1.default, { fragment: true })
                .parse(nodeRaw).children[0];
            if (!newNode) {
                continue;
            }
            newNode.properties.src = node.properties.src;
            if (width > 0) {
                newNode.properties.width = width;
            }
            replace(node, newNode);
        }
    }
}
function processM2NRehypeHighlightNodes(nodes) {
    if (!nodes.length) {
        return;
    }
    for (const node of nodes) {
        // node.children[0] is <a>, its children is the real children
        node.children = node.children[0].children;
        delete node.properties.ztype;
    }
}
function processM2NRehypeCitationNodes(nodes_1) {
    return __awaiter(this, arguments, void 0, function* (nodes, isImport = false) {
        var _a;
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            let importFailed = false;
            if (isImport) {
                try {
                    // {
                    //   "citationItems": [
                    //     {
                    //       "uris": [
                    //         "http://zotero.org/users/uid/items/itemkey"
                    //       ]
                    //     }
                    //   ],
                    //   "properties": {}
                    // }
                    const dataCitation = JSON.parse(decodeURIComponent(node.properties.dataCitation));
                    const ids = dataCitation.citationItems.map((c) => Zotero.URI.getURIItemID(c.uris[0]));
                    const html = yield addon.api.convert.item2citation(ids, dataCitation);
                    if (html) {
                        const newNode = yield note2rehype(html);
                        // root -> p -> span(cite, this is what we actually want)
                        replace(node, newNode.children[0].children[0]);
                    }
                    else {
                        importFailed = true;
                    }
                }
                catch (e) {
                    ztoolkit.log(e);
                }
            }
            if (importFailed || !isImport) {
                (0, unist_util_visit_1.visit)(node, (_n) => { var _a, _b; return (_b = (_a = _n.properties) === null || _a === void 0 ? void 0 : _a.className) === null || _b === void 0 ? void 0 : _b.includes("citation-item"); }, (_n) => {
                    _n.children = [{ type: "text", value: (0, hast_util_to_text_1.toText)(_n) }];
                });
                (_a = node.properties) === null || _a === void 0 ? true : delete _a.ztype;
            }
        }
    });
}
function processM2NRehypeNoteLinkNodes(nodes) {
    if (!nodes.length) {
        return;
    }
    for (const node of nodes) {
        node.properties.href = node.properties.zhref;
        delete node.properties.class;
        delete node.properties.zhref;
        delete node.properties.ztype;
    }
}
function resolveImagePath(rawSrc, fileDir) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Try relative to the markdown file directory
        let resolved = PathUtils.isAbsolute(rawSrc)
            ? rawSrc
            : (0, str_1.jointPath)(fileDir, rawSrc);
        if (yield (0, str_1.fileExists)(resolved)) {
            return resolved;
        }
        // 2. Try additional search directories from Obsidian Bridge settings
        const vaultRoot = String((0, prefs_1.getPref)("obsidian.vaultRoot") || "").trim();
        const assetsDir = String((0, prefs_1.getPref)("obsidian.assetsDir") || "").trim();
        const fileName = rawSrc.replace(/\\/g, "/").split("/").pop() || "";
        if (!fileName) {
            return "";
        }
        const searchDirs = [
            // vault root (Obsidian default paste location)
            vaultRoot,
            // assetsDir (plugin's configured resource directory)
            assetsDir,
            // common Obsidian attachment folder patterns
            vaultRoot ? (0, str_1.jointPath)(vaultRoot, "attachments") : "",
            vaultRoot ? (0, str_1.jointPath)(vaultRoot, "assets") : "",
        ].filter(Boolean);
        for (const dir of searchDirs) {
            const candidate = (0, str_1.jointPath)(dir, fileName);
            if (yield (0, str_1.fileExists)(candidate)) {
                return candidate;
            }
        }
        return "";
    });
}
function processM2NRehypeImageNodes(nodes_1, noteItem_1, fileDir_1) {
    return __awaiter(this, arguments, void 0, function* (nodes, noteItem, fileDir, isImport = false) {
        if (!nodes.length || (isImport && !noteItem)) {
            return;
        }
        let attKeys = [];
        if (isImport) {
            attKeys = Zotero.Items.get(noteItem.getAttachments()).map((item) => item.key);
        }
        for (const node of nodes) {
            if (isImport) {
                // If image is already an attachment of note, skip import
                if (!attKeys.includes(node.properties.dataAttachmentKey)) {
                    // We encode the src in md2remark and decode it here.
                    let src = (0, str_1.formatPath)(decodeURIComponent(node.properties.src));
                    const srcType = src.startsWith("data:")
                        ? "b64"
                        : src.startsWith("http")
                            ? "url"
                            : "file";
                    if (srcType === "file") {
                        const resolvedSrc = yield resolveImagePath(src, fileDir);
                        if (!resolvedSrc) {
                            ztoolkit.log("parse image, path invalid", src);
                            continue;
                        }
                        src = resolvedSrc;
                    }
                    const key = yield (0, note_1.importImageToNote)(noteItem, src, srcType);
                    node.properties.dataAttachmentKey = key;
                }
                delete node.properties.src;
                node.properties.ztype && delete node.properties.ztype;
            }
            else {
                delete node.properties.src;
                node.properties.ztype && delete node.properties.ztype;
            }
        }
    });
}
function getN2LRehypeHeaderNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" &&
        ["h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "span"].includes(node.tagName), (node) => {
        nodes.push(node);
    });
    return new Array(...new Set(nodes));
}
function getN2LRehypeLinkNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" && node.tagName === "a", (node) => {
        nodes.push(node);
    });
    return new Array(...new Set(nodes));
}
function getN2LRehypeListNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" &&
        (node.tagName === "ul" || node.tagName === "ol"), (node) => {
        nodes.push(node);
    });
    return new Array(...new Set(nodes));
}
function getN2LRehypeTableNodes(rehype) {
    const nodes = [];
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" && node.tagName === "table", (node) => {
        nodes.push(node);
    });
    return new Array(...new Set(nodes));
}
function processN2LRehypeCitationNodes(nodes) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!nodes.length) {
            return "";
        }
        const items = [];
        const libIdAndCitationKeys = new Map();
        for (const node of nodes) {
            let citation;
            try {
                citation = JSON.parse(decodeURIComponent(node.properties.dataCitation));
            }
            catch (e) {
                ztoolkit.log("citation parse error: " + e);
                continue;
            }
            if (!((_a = citation === null || citation === void 0 ? void 0 : citation.citationItems) === null || _a === void 0 ? void 0 : _a.length)) {
                ztoolkit.log(citation === null || citation === void 0 ? void 0 : citation.citationItems);
                continue;
            }
            const citationKeys = [];
            for (const citationItem of citation.citationItems) {
                const uri = citationItem.uris[0];
                if (typeof uri === "string") {
                    const uriParts = uri.split("/");
                    let libID;
                    if (uriParts[3] === "groups") {
                        libID = Zotero.Groups.getLibraryIDFromGroupID(Number(uriParts[4]));
                    }
                    else {
                        libID = Zotero.Libraries.userLibraryID;
                    }
                    if (!libID) {
                        ztoolkit.log("[Bid Export] Library not found, groups ID = " + uriParts[4]);
                        continue;
                    }
                    const key = uriParts[uriParts.length - 1];
                    const item_ = Zotero.Items.getByLibraryAndKey(libID, key);
                    if (!item_) {
                        ztoolkit.log("[Bid Export] Item not found, key = " + key);
                        continue;
                    }
                    items.push(item_);
                    const citationKey = item_.getField("citationKey");
                    if (citationKey === "") {
                        ztoolkit.log("[Bid Export] Detect empty citationKey.");
                        continue;
                    }
                    if (!libIdAndCitationKeys.has(libID)) {
                        libIdAndCitationKeys.set(libID, new Set());
                    }
                    const existingKeys = libIdAndCitationKeys.get(libID) || new Set();
                    existingKeys.add(citationKey);
                    libIdAndCitationKeys.set(libID, existingKeys);
                    citationKeys.push(citationKey);
                }
            }
            node.type = "text";
            node.value = "\\cite{" + citationKeys.join(",") + "}";
        }
        // convert the citation into string using Better BibTex for Zotero
        const bibString = yield convertToBibString(libIdAndCitationKeys);
        return bibString;
    });
}
function convertToBibString(libIdAndCitationKeys) {
    return __awaiter(this, void 0, void 0, function* () {
        const BBT = "Better BibTex for Zotero";
        const installedExtensions = yield Zotero.getInstalledExtensions();
        const installedAndEnabled = installedExtensions.some((item) => item.includes(BBT) && !item.includes("disabled"));
        if (!installedAndEnabled) {
            ztoolkit.log("Better BibTex for Zotero is not installed.");
            (0, hint_1.showHint)("Export Error: Better BibTex for Zotero is needed for exporting the .bib file. Please install and enable it first.");
            return "";
        }
        const res = yield exportToBibtex(libIdAndCitationKeys);
        return res;
    });
}
function exportToBibtex(libCitationMap) {
    return __awaiter(this, void 0, void 0, function* () {
        const port = Services.prefs.getIntPref("extensions.zotero.httpServer.port");
        const promises = [];
        libCitationMap.forEach((citationKeys, libId) => {
            const citationKeysArray = Array.from(citationKeys);
            const data = {
                jsonrpc: "2.0",
                method: "item.export",
                params: [citationKeysArray, "bibtex", libId],
            };
            const promise = fetch(`http://localhost:${port}/better-bibtex/json-rpc`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(data),
            })
                .then((response) => {
                if (!response.ok) {
                    ztoolkit.log(`[Bib Export] Network response was not ok for libId ${libId}`);
                    throw new Error(`Network response was not ok for libId ${libId}`);
                }
                return response.json();
            })
                .then((result) => {
                ztoolkit.log(`[Bib Export] Response data for libId ${libId}: ` +
                    JSON.stringify(result));
                return "result" in result ? result.result : "";
            });
            promises.push(promise);
        });
        return Promise.all(promises)
            .then((results) => results.join("\n"))
            .catch((error) => {
            ztoolkit.log("[Bib Export] Fetch error: " + error.message);
            return "[Bib Export] Fetch error: " + error.message;
        });
    });
}
function processN2LRehypeHeaderNodes(nodes) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            let hx = "";
            if (node.tagName === "h1") {
                hx = "\\section{" + getTextFromNode(node) + "}\n";
            }
            else if (node.tagName === "h2") {
                hx = "\\subsection{" + getTextFromNode(node) + "}\n";
            }
            else if (node.tagName === "h3") {
                hx = "\\subsubsection{" + getTextFromNode(node) + "}\n";
            }
            else if (["h4", "h5", "h6"].includes(node.tagName)) {
                hx = "\\textbf{" + getTextFromNode(node) + "}\n";
            }
            else if (node.tagName === "strong") {
                hx = "\\textbf{" + getTextFromNode(node) + "}";
            }
            else if (node.tagName === "em") {
                hx = "\\textit{" + getTextFromNode(node) + "}";
            }
            else if (node.tagName === "span") {
                hx = getTextFromNode(node);
            }
            else {
                hx = getTextFromNode(node);
            }
            node.type = "text";
            node.value = hx;
        }
    });
}
function processN2LRehypeLinkNodes(nodes) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            node.type = "text";
            node.value = `\\href{${node.properties.href}}{${getTextFromNode(node)}}`;
        }
    });
}
function processN2LRehypeListNodes(nodes) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            const item_str = [];
            for (const itemKey in node.children) {
                const itemNode = node.children[itemKey];
                if (itemNode.type === "element" && itemNode.tagName === "li") {
                    item_str.push(getTextFromNode(itemNode));
                }
            }
            const join_str = item_str.join("\n\\item");
            let listStr;
            if (node.tagName === "ul") {
                const ulStr = `\\begin{itemize}\n\\item ${join_str} \n\\end{itemize}`;
                listStr = ulStr;
            }
            else if (node.tagName === "ol") {
                const olStr = `\\begin{enumerate}\n\\item ${join_str} \n\\end{enumerate}`;
                listStr = olStr;
            }
            node.type = "text";
            node.value = listStr;
        }
    });
}
function processN2LRehypeTableNodes(nodes) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            if (node.type === "element" && node.tagName === "table") {
                const latexTable = convertHtmlTableToLatex(node.children[1]);
                node.type = "text";
                node.value = latexTable;
            }
        }
    });
}
function convertHtmlTableToLatex(tableNode) {
    let colCount = 0;
    let rowCount = 0;
    const tableData = [];
    for (const child of tableNode.children) {
        if (child.type === "element" && child.tagName === "tr") {
            rowCount++;
            const rowData = [];
            for (const td of child.children) {
                if (td.type === "element" &&
                    (td.tagName === "td" || td.tagName === "th")) {
                    colCount = Math.max(colCount, rowData.length + 1);
                    rowData.push(getTextFromNode(td));
                }
            }
            tableData.push(rowData);
        }
    }
    let columnFormat = "|";
    for (let i = 0; i < colCount; i++) {
        columnFormat += "l|"; // Assuming left alignment for all columns
    }
    const latexRows = [];
    latexRows.push("\\hline");
    for (const row of tableData) {
        const rowContent = row
            .map((cell) => cell.replace(/_/g, "\\_").replace(/&/g, "\\&"))
            .join(" & ");
        latexRows.push(rowContent + " \\\\");
        latexRows.push("\\hline");
    }
    const latexTableStr = `\\begin{table}[htbp]\n\\centering\n\\caption{Caption}\n\\label{tab:simple_table}\n\\begin{tabular}{${columnFormat}}
${latexRows.join("\n")}
\\end{tabular}\n\\end{table}`;
    return latexTableStr;
}
function getTextFromNode(node) {
    let text = "";
    for (const child of node.children) {
        if (child.type === "text") {
            text += child.value === "\n " ? "" : child.value;
        }
        else if (child.children) {
            text += getTextFromNode(child);
        }
    }
    return text;
}
function processN2LRehypeImageNodes(nodes_1, libraryID_1, dir_1) {
    return __awaiter(this, arguments, void 0, function* (nodes, libraryID, dir, skipSavingImages = false, absolutePath = false, mode = NodeMode.default) {
        if (!nodes.length) {
            return;
        }
        for (const node of nodes) {
            const imgKey = node.properties.dataAttachmentKey;
            const attachmentItem = (yield Zotero.Items.getByLibraryAndKeyAsync(libraryID, imgKey));
            if (!attachmentItem) {
                continue;
            }
            const oldFile = String(yield attachmentItem.getFilePathAsync());
            const ext = oldFile.split(".").pop();
            const newAbsPath = (0, str_1.formatPath)(`${dir}/${imgKey}.${ext}`);
            let newFile = oldFile;
            try {
                // Don't overwrite
                if (skipSavingImages || (yield (0, str_1.fileExists)(newAbsPath))) {
                    newFile = newAbsPath;
                }
                else {
                    newFile = (yield Zotero.File.copyToUnique(oldFile, newAbsPath)).path;
                }
                newFile = (0, str_1.formatPath)(absolutePath
                    ? newFile
                    : (0, str_1.jointPath)((0, prefs_1.getPref)("syncAttachmentFolder"), PathUtils.split(newFile).pop() || ""));
            }
            catch (e) {
                ztoolkit.log(e);
            }
            let filename = newFile ? newFile : oldFile;
            // If on Windows, convert path to Unix style
            if (Zotero.isWin) {
                filename = Zotero.File.normalizeToUnix(filename);
            }
            const imgStr = `\\begin{figure}[!t]
\\centering
\\includegraphics[width=4.5in]{{./${filename}}}
\\caption{}
\\label{${imgKey}}
\\end{figure}`;
            node.type = "text";
            node.value = imgStr;
        }
    });
}
var NodeMode;
(function (NodeMode) {
    NodeMode[NodeMode["default"] = 0] = "default";
    NodeMode[NodeMode["wrap"] = 1] = "wrap";
    NodeMode[NodeMode["replace"] = 2] = "replace";
    NodeMode[NodeMode["direct"] = 3] = "direct";
})(NodeMode || (NodeMode = {}));
