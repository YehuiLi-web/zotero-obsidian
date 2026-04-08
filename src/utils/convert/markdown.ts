import { unified } from "unified";
import rehypeParse from "rehype-parse";
import { toHtml } from "hast-util-to-html";
import { toText } from "hast-util-to-text";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { h } from "hastscript";
import YAML = require("yamljs");

import { Root as HRoot } from "hast";
import { Root as MRoot } from "mdast";
import { fileExists, formatPath, jointPath, randomString } from "../str";
import { importImageToNote } from "../note";
import { getNoteLinkParams } from "../link";
import { getPref } from "../prefs";
import {
  NodeMode,
  collectUniqueNodes,
  md2remark,
  note2rehype,
  rehype2note,
  rehype2remark,
  remark2md,
  remark2rehype,
  replaceNode,
} from "./core";

export {
  note2md,
  md2note,
  note2noteDiff,
  getN2MRehypeCitationNodes,
  getN2MRehypeImageNodes,
  getN2MRehypeInlineImageNodes,
  processN2MRehypeInlineImageNodes,
};

async function note2md(
  noteItem: Zotero.Item,
  dir: string,
  options: {
    keepNoteLink?: boolean;
    withYAMLHeader?: boolean;
    cachedYAMLHeader?: Record<string, any>;
    skipSavingImages?: boolean;
    attachmentDir?: string;
    attachmentFolder?: string;
  } = {},
) {
  const noteStatus = addon.api.sync.getNoteStatus(noteItem.id)!;
  const rehype = await note2rehype(noteStatus.content);
  processN2MRehypeHighlightNodes(
    getN2MRehypeHighlightNodes(rehype as HRoot),
    NodeMode.direct,
  );
  processN2MRehypeCitationNodes(
    getN2MRehypeCitationNodes(rehype as HRoot),
    NodeMode.direct,
  );
  await processN2MRehypeNoteLinkNodes(
    getN2MRehypeNoteLinkNodes(rehype),
    dir,
    options.keepNoteLink ? NodeMode.default : NodeMode.direct,
  );
  await processN2MRehypeImageNodes(
    getN2MRehypeImageNodes(rehype),
    noteItem.libraryID,
    options.attachmentDir ||
      jointPath(dir, getPref("syncAttachmentFolder") as string),
    options.attachmentFolder || (getPref("syncAttachmentFolder") as string),
    options.skipSavingImages,
    false,
    NodeMode.direct,
  );
  if (!options.skipSavingImages) {
    await processN2MRehypeInlineImageNodes(
      getN2MRehypeInlineImageNodes(rehype),
      options.attachmentDir ||
        jointPath(dir, getPref("syncAttachmentFolder") as string),
      options.attachmentFolder || (getPref("syncAttachmentFolder") as string),
      NodeMode.direct,
    );
  }
  const remark = await rehype2remark(rehype as HRoot);
  if (!remark) {
    throw new Error("Parsing Error: Rehype2Remark");
  }
  let md = await remark2md(remark as MRoot);
  try {
    md =
      (await addon.api.template.runTemplate(
        "[ExportMDFileContent]",
        "noteItem, mdContent",
        [noteItem, md],
      )) ?? md;
  } catch (e) {
    ztoolkit.log(e);
  }

  if (options.withYAMLHeader) {
    let header = {} as Record<string, any>;
    try {
      header = JSON.parse(
        await addon.api.template.runTemplate(
          "[ExportMDFileHeaderV2]",
          "noteItem",
          [noteItem],
        ),
      );
      const cachedHeader = options.cachedYAMLHeader || {};
      for (const key in cachedHeader) {
        if ((key === "tags" || key.startsWith("$")) && key in header) {
          continue;
        } else {
          header[key] = cachedHeader[key];
        }
      }
    } catch (e) {
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
}

async function md2note(
  mdStatus: MDStatus,
  noteItem: Zotero.Item,
  options: { isImport?: boolean } = {},
) {
  const remark = await md2remark(mdStatus.content);
  const _rehype = await remark2rehype(remark);
  const _note = await rehype2note(_rehype as HRoot);
  const rehype = await note2rehype(_note);

  processM2NRehypeMetaImageNodes(getM2NRehypeImageNodes(rehype));
  processM2NRehypeHighlightNodes(getM2NRehypeHighlightNodes(rehype));
  await processM2NRehypeCitationNodes(
    getM2NRehypeCitationNodes(rehype),
    options.isImport,
  );
  processM2NRehypeNoteLinkNodes(getM2NRehypeNoteLinkNodes(rehype));
  await processM2NRehypeImageNodes(
    getM2NRehypeImageNodes(rehype),
    noteItem,
    mdStatus.filedir,
    options.isImport,
  );
  return await rehype2note(rehype as HRoot);
}

async function note2noteDiff(noteItem: Zotero.Item) {
  const noteStatus = addon.api.sync.getNoteStatus(noteItem.id)!;
  const rehype = await note2rehype(noteStatus.content);
  await processM2NRehypeCitationNodes(getM2NRehypeCitationNodes(rehype), true);
  return await rehype2note(rehype as HRoot);
}

function getN2MRehypeHighlightNodes(rehype: HRoot) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.properties?.className?.includes("highlight"),
  );
}

function getN2MRehypeCitationNodes(rehype: HRoot) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.properties?.className?.includes("citation"),
  );
}

function getN2MRehypeNoteLinkNodes(rehype: any) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.tagName === "a" &&
      node.properties?.href &&
      /zotero:\/\/note\/\w+\/\w+\//.test(node.properties?.href),
  );
}

function getN2MRehypeImageNodes(rehype: any) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.tagName === "img" &&
      node.properties?.dataAttachmentKey,
  );
}

function getN2MRehypeInlineImageNodes(rehype: any) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.tagName === "img" &&
      !node.properties?.dataAttachmentKey &&
      node.properties?.src &&
      typeof node.properties.src === "string" &&
      node.properties.src.startsWith("data:image/"),
  );
}

function processN2MRehypeHighlightNodes(
  nodes: string | any[],
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    let annotation;
    try {
      annotation = JSON.parse(
        decodeURIComponent(node.properties.dataAnnotation),
      );
    } catch (e) {
      continue;
    }
    if (!annotation) {
      continue;
    }
    const uri = annotation.attachmentURI || annotation.uri;
    const position = annotation.position;

    if (typeof uri === "string" && typeof position === "object") {
      let openURI;
      const uriParts = uri.split("/");
      const libraryType = uriParts[3];
      const key = uriParts[uriParts.length - 1];
      if (libraryType === "users") {
        openURI = "zotero://open/library/items/" + key;
      } else {
        const groupID = uriParts[4];
        openURI = "zotero://open/groups/" + groupID + "/items/" + key;
      }

      openURI +=
        "?page=" +
        (position.pageIndex + 1) +
        (annotation.annotationKey
          ? "&annotation=" + annotation.annotationKey
          : "");

      let newNode = h("span", [
        h(node.tagName, node.properties, node.children),
        h("span", " ("),
        h("a", { href: openURI }, ["pdf"]),
        h("span", ") "),
      ]);
      const annotKey =
        annotation.annotationKey ||
        randomString(
          8,
          Zotero.Utilities.Internal.md5(node.properties.dataAnnotation),
          Zotero.Utilities.allowedKeyChars,
        );

      if (mode === NodeMode.wrap) {
        newNode.children.splice(0, 0, h("wrapperleft", `annot:${annotKey}`));
        newNode.children.push(h("wrapperright", `annot:${annotKey}`));
      } else if (mode === NodeMode.replace) {
        newNode = h("placeholder", `annot:${annotKey}`);
      } else if (mode === NodeMode.direct) {
        const newChild = h("span") as any;
        replaceNode(newChild, node);
        newChild.children = [h("a", { href: openURI }, node.children)];
        newChild.properties.ztype = "zhighlight";
        newNode = h("zhighlight", [newChild]);
      }
      replaceNode(node, newNode);
    }
  }
}

function processN2MRehypeCitationNodes(
  nodes: string | any[],
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    let citation;
    try {
      citation = JSON.parse(decodeURIComponent(node.properties.dataCitation));
    } catch (e) {
      continue;
    }
    if (!citation?.citationItems?.length) {
      continue;
    }

    const uris: string[] = [];
    for (const citationItem of citation.citationItems) {
      const uri = citationItem.uris[0];
      if (typeof uri === "string") {
        const uriParts = uri.split("/");
        const libraryType = uriParts[3];
        const key = uriParts[uriParts.length - 1];
        if (libraryType === "users") {
          uris.push("zotero://select/library/items/" + key);
        } else {
          const groupID = uriParts[4];
          uris.push("zotero://select/groups/" + groupID + "/items/" + key);
        }
      }
    }

    let childNodes = collectUniqueNodes(node, (_n: any) =>
      _n.properties?.className?.includes("citation-item"),
    );

    if (!childNodes.length) {
      childNodes = toText(node).slice(1, -1).split("; ");
    }

    let newNode = h("span", node.properties, [
      { type: "text", value: "(" },
      ...childNodes.map((child, i) => {
        if (!child) {
          return h("text", "");
        }
        const nextNode = h("span");
        replaceNode(nextNode, child);
        nextNode.children = [h("a", { href: uris[i] }, child.children)];
        return nextNode;
      }),
      { type: "text", value: ")" },
    ]);
    const citationKey = randomString(
      8,
      Zotero.Utilities.Internal.md5(node.properties.dataCitation),
      Zotero.Utilities.allowedKeyChars,
    );
    if (mode === NodeMode.wrap) {
      newNode.children.splice(0, 0, h("wrapperleft", `cite:${citationKey}`));
      newNode.children.push(h("wrapperright", `cite:${citationKey}`));
    } else if (mode === NodeMode.replace) {
      newNode = h("placeholder", `cite:${citationKey}`);
    } else if (mode === NodeMode.direct) {
      const newChild = h("span") as any;
      replaceNode(newChild, newNode);
      newChild.properties.ztype = "zcitation";
      newNode = h("zcitation", [newChild]);
    }
    replaceNode(node, newNode);
  }
}

async function processN2MRehypeNoteLinkNodes(
  nodes: string | any[],
  dir: string,
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const linkParam = getNoteLinkParams(node.properties.href);
    if (!linkParam.noteItem) {
      continue;
    }
    const link =
      mode === NodeMode.default ||
      !addon.api.sync.isSyncNote(linkParam.noteItem.id)
        ? node.properties.href
        : `./${await addon.api.sync.getMDFileName(linkParam.noteItem.id, dir)}`;
    const linkKey = randomString(
      8,
      Zotero.Utilities.Internal.md5(node.properties.href),
      Zotero.Utilities.allowedKeyChars,
    );
    if (mode === NodeMode.wrap) {
      const newNode = h("span", [
        h("wrapperleft", `note:${linkKey}`),
        h(
          node.tagName,
          Object.assign(node.properties, { href: link }),
          node.children,
        ),
        h("wrapperright", `note:${linkKey}`),
      ]);
      replaceNode(node, newNode);
    } else if (mode === NodeMode.replace) {
      replaceNode(node, h("placeholder", `note:${linkKey}`));
    } else if (mode === NodeMode.direct || mode === NodeMode.default) {
      const newChild = h("a", node.properties, node.children) as any;
      newChild.properties.zhref = node.properties.href;
      newChild.properties.href = link;
      newChild.properties.ztype = "znotelink";
      if (!newChild.properties.className?.includes("internal-link")) {
        if (!newChild.properties.className) {
          newChild.properties.className = [];
        }
        newChild.properties.className.push("internal-link");
      }
      replaceNode(node, h("znotelink", [newChild]));
    }
  }
}

async function processN2MRehypeImageNodes(
  nodes: string | any[],
  libraryID: number,
  dir: string,
  relativeDir: string = getPref("syncAttachmentFolder") as string,
  skipSavingImages: boolean = false,
  absolutePath: boolean = false,
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const imgKey = node.properties.dataAttachmentKey;
    const width = node.properties.width;

    const attachmentItem = (await Zotero.Items.getByLibraryAndKeyAsync(
      libraryID,
      imgKey,
    )) as Zotero.Item;
    if (!attachmentItem) {
      continue;
    }

    const oldFile = String(await attachmentItem.getFilePathAsync());
    const ext = oldFile.split(".").pop();
    const newAbsPath = formatPath(`${dir}/${imgKey}.${ext}`);
    let newFile = oldFile;
    try {
      if (skipSavingImages || (await fileExists(newAbsPath))) {
        newFile = newAbsPath;
      } else {
        newFile = (await Zotero.File.copyToUnique(oldFile, newAbsPath)).path;
      }
      newFile = formatPath(
        absolutePath
          ? newFile
          : jointPath(relativeDir || "", PathUtils.split(newFile).pop() || ""),
      );
    } catch (e) {
      ztoolkit.log(e);
    }

    node.properties.src = newFile ? newFile : oldFile;
    if (Zotero.isWin) {
      node.properties.src = Zotero.File.normalizeToUnix(node.properties.src);
    }

    if (mode === NodeMode.direct) {
      const newChild = h("span") as any;
      replaceNode(newChild, node);
      newChild.properties.ztype = "zimage";
      node.properties.alt = toHtml(newChild);
      if (width) {
        node.properties.alt = `${node.properties.alt} | ${width}`;
      }
    }
  }
}

async function processN2MRehypeInlineImageNodes(
  nodes: any[],
  dir: string,
  relativeDir: string = "",
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const src: string = node.properties.src;
    const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      continue;
    }
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const hash = Zotero.Utilities.Internal.md5(match[2], false).slice(0, 12);
    const fileName = `inline-${hash}.${ext}`;
    const absPath = formatPath(`${dir}/${fileName}`);
    try {
      if (!(await fileExists(absPath))) {
        const binaryStr = atob(match[2]);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        await Zotero.File.createDirectoryIfMissingAsync(dir);
        await IOUtils.write(absPath, bytes);
      }
      let newFile = formatPath(jointPath(relativeDir || "", fileName));
      if (Zotero.isWin) {
        newFile = Zotero.File.normalizeToUnix(newFile);
      }
      node.properties.src = newFile;

      if (mode === NodeMode.direct) {
        const newChild = h("span") as any;
        replaceNode(newChild, node);
        newChild.properties.ztype = "zimage";
        node.properties.alt = toHtml(newChild);
        const width = node.properties.width;
        if (width) {
          node.properties.alt = `${node.properties.alt} | ${width}`;
        }
      }
    } catch (e) {
      ztoolkit.log("[note2md] processN2MRehypeInlineImageNodes failed", e);
    }
  }
}

function getM2NRehypeHighlightNodes(rehype: any) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" && node.properties?.ztype === "zhighlight",
  );
}

function getM2NRehypeCitationNodes(rehype: any) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" &&
      (node.properties?.ztype === "zcitation" || node.properties?.dataCitation),
  );
}

function getM2NRehypeNoteLinkNodes(rehype: any) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" && node.properties?.ztype === "znotelink",
  );
}

function getM2NRehypeImageNodes(rehype: any) {
  return collectUniqueNodes(
    rehype,
    (node: any) => node.type === "element" && node.tagName === "img",
  );
}

function processM2NRehypeMetaImageNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }

  for (const node of nodes) {
    const alt = node.properties.alt as string;
    if (/zimage/.test(alt)) {
      const width = Number(alt.split("|").pop() || "");
      let nodeRaw = alt;
      if (width > 0) {
        nodeRaw = alt.split("|").slice(0, -1).join("|");
      }

      const newNode = unified()
        .use(remarkGfm)
        .use(remarkMath)
        .use(rehypeParse, { fragment: true })
        .parse(nodeRaw).children[0] as any;
      if (!newNode) {
        continue;
      }
      newNode.properties.src = node.properties.src;
      if (width > 0) {
        newNode.properties.width = width;
      }
      replaceNode(node, newNode);
    }
  }
}

function processM2NRehypeHighlightNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    node.children = node.children[0].children;
    delete node.properties.ztype;
  }
}

async function processM2NRehypeCitationNodes(
  nodes: string | any[],
  isImport: boolean = false,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    let importFailed = false;
    if (isImport) {
      try {
        const dataCitation = JSON.parse(
          decodeURIComponent(node.properties.dataCitation),
        );
        const ids = dataCitation.citationItems.map((c: { uris: string[] }) =>
          Zotero.URI.getURIItemID(c.uris[0]),
        );
        const html = await addon.api.convert.item2citation(ids, dataCitation);
        if (html) {
          const newNode = await note2rehype(html);
          replaceNode(node, (newNode.children[0] as any).children[0]);
        } else {
          importFailed = true;
        }
      } catch (e) {
        ztoolkit.log(e);
      }
    }
    if (importFailed || !isImport) {
      const childNodes = collectUniqueNodes(node, (_n: any) =>
        _n.properties?.className?.includes("citation-item"),
      );
      for (const child of childNodes) {
        child.children = [{ type: "text", value: toText(child) }];
      }
      delete node.properties?.ztype;
    }
  }
}

function processM2NRehypeNoteLinkNodes(nodes: string | any[]) {
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

async function resolveImagePath(
  rawSrc: string,
  fileDir: string,
): Promise<string> {
  let resolved = PathUtils.isAbsolute(rawSrc)
    ? rawSrc
    : jointPath(fileDir, rawSrc);
  if (await fileExists(resolved)) {
    return resolved;
  }

  const vaultRoot = String(getPref("obsidian.vaultRoot") || "").trim();
  const assetsDir = String(getPref("obsidian.assetsDir") || "").trim();
  const fileName = rawSrc.replace(/\\/g, "/").split("/").pop() || "";
  if (!fileName) {
    return "";
  }

  const searchDirs = [
    vaultRoot,
    assetsDir,
    vaultRoot ? jointPath(vaultRoot, "attachments") : "",
    vaultRoot ? jointPath(vaultRoot, "assets") : "",
  ].filter(Boolean);

  for (const dir of searchDirs) {
    const candidate = jointPath(dir, fileName);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return "";
}

async function processM2NRehypeImageNodes(
  nodes: any[],
  noteItem: Zotero.Item,
  fileDir: string,
  isImport: boolean = false,
) {
  if (!nodes.length || (isImport && !noteItem)) {
    return;
  }

  let attKeys = [] as string[];
  if (isImport) {
    attKeys = Zotero.Items.get(noteItem.getAttachments()).map(
      (item) => item.key,
    );
  }

  for (const node of nodes) {
    if (isImport) {
      if (!attKeys.includes(node.properties.dataAttachmentKey)) {
        let src = formatPath(decodeURIComponent(node.properties.src));
        const srcType = (src as string).startsWith("data:")
          ? "b64"
          : (src as string).startsWith("http")
            ? "url"
            : "file";
        if (srcType === "file") {
          const resolvedSrc = await resolveImagePath(src, fileDir);
          if (!resolvedSrc) {
            ztoolkit.log("parse image, path invalid", src);
            continue;
          }
          src = resolvedSrc;
        }
        const key = await importImageToNote(noteItem, src, srcType);
        node.properties.dataAttachmentKey = key;
      }
      delete node.properties.src;
      node.properties.ztype && delete node.properties.ztype;
    } else {
      delete node.properties.src;
      node.properties.ztype && delete node.properties.ztype;
    }
  }
}
