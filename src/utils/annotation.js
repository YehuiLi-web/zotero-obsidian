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
exports.importAnnotationImagesToNote = importAnnotationImagesToNote;
exports.parseAnnotationHTML = parseAnnotationHTML;
const note_1 = require("./note");
function parseAnnotationJSON(annotationItem) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            if (!annotationItem || !annotationItem.isAnnotation()) {
                return null;
            }
            const annotationJSON = yield Zotero.Annotations.toJSON(annotationItem);
            const annotationObj = Object.assign({}, annotationJSON);
            annotationObj.id = annotationItem.key;
            annotationObj.attachmentItemID = (_a = annotationItem.parentItem) === null || _a === void 0 ? void 0 : _a.id;
            delete annotationObj.key;
            for (const key in annotationObj) {
                annotationObj[key] =
                    annotationObj[key] || "";
            }
            annotationObj.tags = annotationObj.tags || [];
            return annotationObj;
        }
        catch (e) {
            Zotero.logError(e);
            return null;
        }
    });
}
// Zotero.EditorInstanceUtilities.serializeAnnotations
function serializeAnnotations(annotations, skipEmbeddingItemData = false, skipCitation = false) {
    const storedCitationItems = [];
    let html = "";
    for (const annotation of annotations) {
        const attachmentItem = Zotero.Items.get(annotation.attachmentItemID);
        if (!attachmentItem) {
            continue;
        }
        if ((!annotation.text &&
            !annotation.comment &&
            !annotation.imageAttachmentKey &&
            !annotation.image) ||
            annotation.type === "ink") {
            continue;
        }
        let citationHTML = "";
        let imageHTML = "";
        let highlightHTML = "";
        let quotedHighlightHTML = "";
        let commentHTML = "";
        const storedAnnotation = {
            attachmentURI: Zotero.URI.getItemURI(attachmentItem),
            annotationKey: annotation.id,
            color: annotation.color,
            pageLabel: annotation.pageLabel,
            position: annotation.position,
        };
        // Citation
        const parentItem = skipCitation
            ? undefined
            : attachmentItem.parentID && Zotero.Items.get(attachmentItem.parentID);
        if (parentItem) {
            const uris = [Zotero.URI.getItemURI(parentItem)];
            const citationItem = {
                uris,
                locator: annotation.pageLabel,
            };
            // Note: integration.js` uses `Zotero.Cite.System.prototype.retrieveItem`,
            // which produces a little bit different CSL JSON
            // @ts-ignore
            const itemData = Zotero.Utilities.Item.itemToCSLJSON(parentItem);
            if (!skipEmbeddingItemData) {
                citationItem.itemData = itemData;
            }
            const item = storedCitationItems.find((item) => item.uris.some((uri) => uris.includes(uri)));
            if (!item) {
                storedCitationItems.push({ uris, itemData });
            }
            storedAnnotation.citationItem = citationItem;
            const citation = {
                citationItems: [citationItem],
                properties: {},
            };
            const citationWithData = JSON.parse(JSON.stringify(citation));
            citationWithData.citationItems[0].itemData = itemData;
            const formatted = Zotero.EditorInstanceUtilities.formatCitation(citationWithData);
            citationHTML = `<span class="citation" data-citation="${encodeURIComponent(JSON.stringify(citation))}">${formatted}</span>`;
        }
        // Image
        if (annotation.imageAttachmentKey) {
            // Normalize image dimensions to 1.25 of the print size
            const rect = annotation.position.rects[0];
            const rectWidth = rect[2] - rect[0];
            const rectHeight = rect[3] - rect[1];
            // Constants from pdf.js
            const CSS_UNITS = 96.0 / 72.0;
            const PDFJS_DEFAULT_SCALE = 1.25;
            const width = Math.round(rectWidth * CSS_UNITS * PDFJS_DEFAULT_SCALE);
            const height = Math.round((rectHeight * width) / rectWidth);
            imageHTML = `<img data-attachment-key="${annotation.imageAttachmentKey}" width="${width}" height="${height}" data-annotation="${encodeURIComponent(JSON.stringify(storedAnnotation))}"/>`;
        }
        // Image in b64
        if (annotation.image) {
            imageHTML = `<img src="${annotation.image}"/>`;
        }
        // Text
        if (annotation.text) {
            const text = Zotero.EditorInstanceUtilities._transformTextToHTML.call(Zotero.EditorInstanceUtilities, annotation.text.trim());
            highlightHTML = `<span class="${annotation.type}" data-annotation="${encodeURIComponent(JSON.stringify(storedAnnotation))}">${text}</span>`;
            quotedHighlightHTML = `<span class="${annotation.type}" data-annotation="${encodeURIComponent(JSON.stringify(storedAnnotation))}">${Zotero.getString("punctuation.openingQMark")}${text}${Zotero.getString("punctuation.closingQMark")}</span>`;
        }
        // Note
        if (annotation.comment) {
            commentHTML = Zotero.EditorInstanceUtilities._transformTextToHTML.call(Zotero.EditorInstanceUtilities, annotation.comment.trim());
        }
        let template = "";
        if (["highlight", "underline"].includes(annotation.type)) {
            template = Zotero.Prefs.get("annotations.noteTemplates.highlight");
        }
        else if (["note", "text"].includes(annotation.type)) {
            template = Zotero.Prefs.get("annotations.noteTemplates.note");
        }
        else if (annotation.type === "image") {
            template = "<p>{{image}}<br/>{{citation}} {{comment}}</p>";
        }
        ztoolkit.log("Using note template:");
        ztoolkit.log(template);
        template = template.replace(/(<blockquote>[^<>]*?)({{highlight}})([\s\S]*?<\/blockquote>)/g, (match, p1, p2, p3) => p1 + "{{highlight quotes='false'}}" + p3);
        const vars = {
            color: annotation.color || "",
            // Include quotation marks by default, but allow to disable with `quotes='false'`
            highlight: (attrs) => attrs.quotes === "false" ? highlightHTML : quotedHighlightHTML,
            comment: commentHTML,
            citation: citationHTML,
            image: imageHTML,
            tags: (attrs) => ((annotation.tags && annotation.tags.map((tag) => tag.name)) ||
                []).join(attrs.join || " "),
        };
        let templateHTML = Zotero.Utilities.Internal.generateHTMLFromTemplate(template, vars);
        // Remove some spaces at the end of paragraph
        templateHTML = templateHTML.replace(/([\s]*)(<\/p)/g, "$2");
        // Remove multiple spaces
        templateHTML = templateHTML.replace(/\s\s+/g, " ");
        html += templateHTML;
    }
    return { html, citationItems: storedCitationItems };
}
function importAnnotationImagesToNote(note, annotations) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const annotation of annotations) {
            if (annotation.image && note) {
                annotation.imageAttachmentKey =
                    (yield (0, note_1.importImageToNote)(note, annotation.image)) || "";
                delete annotation.image;
            }
        }
    });
}
function parseAnnotationHTML(annotations_1) {
    return __awaiter(this, arguments, void 0, function* (annotations, options = {}) {
        const annotationJSONList = [];
        for (const annot of annotations) {
            const annotJson = yield parseAnnotationJSON(annot);
            if (options.ignoreComment && (annotJson === null || annotJson === void 0 ? void 0 : annotJson.comment)) {
                annotJson.comment = "";
            }
            if (options.ignoreBody && (annotJson === null || annotJson === void 0 ? void 0 : annotJson.text) && (annotJson === null || annotJson === void 0 ? void 0 : annotJson.comment)) {
                annotJson.text = annotJson.comment;
                annotJson.comment = "";
            }
            annotationJSONList.push(annotJson);
        }
        yield importAnnotationImagesToNote(options.noteItem, annotationJSONList);
        const html = serializeAnnotations(annotationJSONList, false, options.skipCitation).html;
        return html;
    });
}
