import { Root as HRoot } from "hast";
import { Root as MRoot } from "mdast";

import { copyEmbeddedImagesInHTML, renderNoteHTML } from "../note";
import {
  getLinkedNotesRecursively,
  getNoteLink,
  getNoteLinkParams,
} from "../link";
import { parseAnnotationHTML } from "../annotation";
import { note2rehype, rehype2remark, remark2md } from "./core";

export {
  note2link,
  link2note,
  link2params,
  link2html,
  html2md,
  annotations2html,
  note2html,
};

function note2link(
  noteItem: Zotero.Item,
  options: Parameters<typeof getNoteLink>[1] = {},
) {
  return getNoteLink(noteItem, options);
}

function link2note(link: string) {
  return getNoteLinkParams(link).noteItem;
}

function link2params(link: string) {
  return getNoteLinkParams(link);
}

async function link2html(
  link: string,
  options: {
    noteItem?: Zotero.Item;
    dryRun?: boolean;
    usePosition?: boolean;
  } = {},
) {
  ztoolkit.log(
    "link2html",
    link,
    options.noteItem?.id,
    options.dryRun,
    options.usePosition,
  );
  const linkParams = getNoteLinkParams(link);
  if (!linkParams.noteItem) {
    return "";
  }
  const refIds = getLinkedNotesRecursively(link);
  const refNotes = options.noteItem ? Zotero.Items.get(refIds) : [];
  ztoolkit.log(refIds);
  let html;
  if (options.usePosition) {
    const item = linkParams.noteItem;
    let lineIndex = linkParams.lineIndex;

    if (typeof linkParams.sectionName === "string") {
      const sectionTree = await addon.api.note.getNoteTreeFlattened(item);
      const sectionNode = sectionTree.find(
        (node) => node.model.name.trim() === linkParams.sectionName!.trim(),
      );
      lineIndex = sectionNode?.model.lineIndex;
    }
    html = (await addon.api.note.getLinesInNote(item))
      .slice(lineIndex)
      .join("\n");
  } else {
    html = addon.api.sync.getNoteStatus(linkParams.noteItem.id)?.content || "";
  }
  if (options.dryRun) {
    return await renderNoteHTML(html, refNotes);
  } else {
    return await copyEmbeddedImagesInHTML(html, options.noteItem, refNotes);
  }
}

async function html2md(html: string) {
  const rehype = await note2rehype(html);
  const remark = await rehype2remark(rehype as HRoot);
  if (!remark) {
    throw new Error("Parsing Error: HTML2MD");
  }
  return await remark2md(remark as MRoot);
}

function annotations2html(
  annotations: Zotero.Item[],
  options: Parameters<typeof parseAnnotationHTML>[1] = {},
) {
  return parseAnnotationHTML(annotations, options);
}

async function note2html(
  noteItems: Zotero.Item | Zotero.Item[],
  options: {
    targetNoteItem?: Zotero.Item;
    html?: string;
    dryRun?: boolean;
  } = {},
) {
  if (!Array.isArray(noteItems)) {
    noteItems = [noteItems];
  }
  const { targetNoteItem, dryRun } = options;
  let html = options.html;
  if (!html) {
    html = noteItems.map((item) => item.getNote()).join("\n");
  }
  if (!dryRun && targetNoteItem?.isNote()) {
    return await copyEmbeddedImagesInHTML(html, targetNoteItem, noteItems);
  }
  return await renderNoteHTML(html, noteItems);
}
