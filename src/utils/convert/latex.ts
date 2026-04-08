import { Root as HRoot } from "hast";
import { Root as MRoot } from "mdast";

import { fileExists, formatPath, jointPath } from "../str";
import { getPref } from "../prefs";
import { showHint } from "../hint";
import {
  NodeMode,
  collectUniqueNodes,
  note2rehype,
  rehype2remark,
  remark2latex,
} from "./core";
import {
  getN2MRehypeCitationNodes,
  getN2MRehypeImageNodes,
  getN2MRehypeInlineImageNodes,
  processN2MRehypeInlineImageNodes,
} from "./markdown";

export { note2latex };

async function note2latex(
  noteItem: Zotero.Item,
  dir: string,
  options: {
    keepNoteLink?: boolean;
    withYAMLHeader?: boolean;
    cachedYAMLHeader?: Record<string, any>;
    skipSavingImages?: boolean;
  } = {},
) {
  const noteStatus = addon.api.sync.getNoteStatus(noteItem.id)!;
  const rehype = await note2rehype(noteStatus.content);

  const bibString = await processN2LRehypeCitationNodes(
    getN2MRehypeCitationNodes(rehype as HRoot),
  );
  await processN2LRehypeHeaderNodes(getN2LRehypeHeaderNodes(rehype as HRoot));
  await processN2LRehypeLinkNodes(getN2LRehypeLinkNodes(rehype as HRoot));
  await processN2LRehypeListNodes(getN2LRehypeListNodes(rehype as HRoot));
  await processN2LRehypeTableNodes(getN2LRehypeTableNodes(rehype as HRoot));
  await processN2LRehypeImageNodes(
    getN2MRehypeImageNodes(rehype),
    noteItem.libraryID,
    jointPath(dir, getPref("syncAttachmentFolder") as string),
    options.skipSavingImages,
    false,
    NodeMode.direct,
  );
  if (!options.skipSavingImages) {
    await processN2MRehypeInlineImageNodes(
      getN2MRehypeInlineImageNodes(rehype),
      jointPath(dir, getPref("syncAttachmentFolder") as string),
      getPref("syncAttachmentFolder") as string,
      NodeMode.direct,
    );
  }

  const remark = await rehype2remark(rehype as HRoot);
  if (!remark) {
    throw new Error("Parsing Error: Rehype2Remark");
  }
  let latex = await remark2latex(remark as MRoot);
  try {
    latex =
      (await addon.api.template.runTemplate(
        "[ExportLatexFileContent]",
        "noteItem, latexContent",
        [noteItem, latex],
      )) ?? latex;
  } catch (e) {
    ztoolkit.log(e);
  }

  return [latex, bibString];
}

function getN2LRehypeHeaderNodes(rehype: HRoot) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" &&
      ["h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "span"].includes(
        node.tagName,
      ),
  );
}

function getN2LRehypeLinkNodes(rehype: HRoot) {
  return collectUniqueNodes(
    rehype,
    (node: any) => node.type === "element" && node.tagName === "a",
  );
}

function getN2LRehypeListNodes(rehype: HRoot) {
  return collectUniqueNodes(
    rehype,
    (node: any) =>
      node.type === "element" &&
      (node.tagName === "ul" || node.tagName === "ol"),
  );
}

function getN2LRehypeTableNodes(rehype: HRoot) {
  return collectUniqueNodes(
    rehype,
    (node: any) => node.type === "element" && node.tagName === "table",
  );
}

async function processN2LRehypeCitationNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return "";
  }
  const libIdAndCitationKeys: Map<number, Set<string>> = new Map();
  for (const node of nodes) {
    let citation;
    try {
      citation = JSON.parse(decodeURIComponent(node.properties.dataCitation));
    } catch (e) {
      ztoolkit.log("citation parse error: " + e);
      continue;
    }
    if (!citation?.citationItems?.length) {
      ztoolkit.log(citation?.citationItems);
      continue;
    }

    const citationKeys: string[] = [];
    for (const citationItem of citation.citationItems) {
      const uri = citationItem.uris[0];
      if (typeof uri === "string") {
        const uriParts = uri.split("/");
        let libID: number | boolean;
        if (uriParts[3] === "groups") {
          libID = Zotero.Groups.getLibraryIDFromGroupID(Number(uriParts[4]));
        } else {
          libID = Zotero.Libraries.userLibraryID;
        }
        if (!libID) {
          ztoolkit.log(
            "[Bid Export] Library not found, groups ID = " + uriParts[4],
          );
          continue;
        }
        const key = uriParts[uriParts.length - 1];
        const item = Zotero.Items.getByLibraryAndKey(libID, key);
        if (!item) {
          ztoolkit.log("[Bid Export] Item not found, key = " + key);
          continue;
        }
        const citationKey = item.getField("citationKey");
        if (citationKey === "") {
          ztoolkit.log("[Bid Export] Detect empty citationKey.");
          continue;
        }

        if (!libIdAndCitationKeys.has(libID as number)) {
          libIdAndCitationKeys.set(libID as number, new Set());
        }

        const existingKeys =
          libIdAndCitationKeys.get(libID as number) || new Set();
        existingKeys.add(citationKey);
        libIdAndCitationKeys.set(libID as number, existingKeys);

        citationKeys.push(citationKey);
      }
    }

    node.type = "text";
    node.value = "\\cite{" + citationKeys.join(",") + "}";
  }

  return await convertToBibString(libIdAndCitationKeys);
}

async function convertToBibString(
  libIdAndCitationKeys: Map<number, Set<string>>,
) {
  const BBT = "Better BibTex for Zotero";
  const installedExtensions = await Zotero.getInstalledExtensions();
  const installedAndEnabled = installedExtensions.some(
    (item) => item.includes(BBT) && !item.includes("disabled"),
  );
  if (!installedAndEnabled) {
    ztoolkit.log("Better BibTex for Zotero is not installed.");
    showHint(
      "Export Error: Better BibTex for Zotero is needed for exporting the .bib file. Please install and enable it first.",
    );
    return "";
  }

  return await exportToBibtex(libIdAndCitationKeys);
}

async function exportToBibtex(
  libCitationMap: Map<number, Set<string>>,
): Promise<string> {
  const port = Services.prefs.getIntPref("extensions.zotero.httpServer.port");
  const promises: Promise<string>[] = [];

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
          ztoolkit.log(
            `[Bib Export] Network response was not ok for libId ${libId}`,
          );
          throw new Error(`Network response was not ok for libId ${libId}`);
        }
        return response.json();
      })
      .then((result) => {
        ztoolkit.log(
          `[Bib Export] Response data for libId ${libId}: ` +
            JSON.stringify(result),
        );
        return "result" in result ? (result.result as string) : "";
      });

    promises.push(promise);
  });

  return Promise.all(promises)
    .then((results) => results.join("\n"))
    .catch((error) => {
      ztoolkit.log("[Bib Export] Fetch error: " + error.message);
      return "[Bib Export] Fetch error: " + error.message;
    });
}

async function processN2LRehypeHeaderNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    let hx = "";
    if (node.tagName === "h1") {
      hx = "\\section{" + getTextFromNode(node) + "}\n";
    } else if (node.tagName === "h2") {
      hx = "\\subsection{" + getTextFromNode(node) + "}\n";
    } else if (node.tagName === "h3") {
      hx = "\\subsubsection{" + getTextFromNode(node) + "}\n";
    } else if (["h4", "h5", "h6"].includes(node.tagName)) {
      hx = "\\textbf{" + getTextFromNode(node) + "}\n";
    } else if (node.tagName === "strong") {
      hx = "\\textbf{" + getTextFromNode(node) + "}";
    } else if (node.tagName === "em") {
      hx = "\\textit{" + getTextFromNode(node) + "}";
    } else if (node.tagName === "span") {
      hx = getTextFromNode(node);
    } else {
      hx = getTextFromNode(node);
    }

    node.type = "text";
    node.value = hx;
  }
}

async function processN2LRehypeLinkNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    node.type = "text";
    node.value = `\\href{${node.properties.href}}{${getTextFromNode(node)}}`;
  }
}

async function processN2LRehypeListNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const itemStr: string[] = [];
    for (const itemKey in node.children) {
      const itemNode = node.children[itemKey];
      if (itemNode.type === "element" && itemNode.tagName === "li") {
        itemStr.push(getTextFromNode(itemNode));
      }
    }

    const joinStr = itemStr.join("\n\\item");
    let listStr;
    if (node.tagName === "ul") {
      listStr = `\\begin{itemize}\n\\item ${joinStr} \n\\end{itemize}`;
    } else if (node.tagName === "ol") {
      listStr = `\\begin{enumerate}\n\\item ${joinStr} \n\\end{enumerate}`;
    }

    node.type = "text";
    node.value = listStr;
  }
}

async function processN2LRehypeTableNodes(nodes: any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    if (node.type === "element" && node.tagName === "table") {
      node.type = "text";
      node.value = convertHtmlTableToLatex(node.children[1]);
    }
  }
}

function convertHtmlTableToLatex(tableNode: any): string {
  let colCount = 0;
  const tableData: string[][] = [];

  for (const child of tableNode.children) {
    if (child.type === "element" && child.tagName === "tr") {
      const rowData: string[] = [];
      for (const td of child.children) {
        if (
          td.type === "element" &&
          (td.tagName === "td" || td.tagName === "th")
        ) {
          colCount = Math.max(colCount, rowData.length + 1);
          rowData.push(getTextFromNode(td));
        }
      }
      tableData.push(rowData);
    }
  }

  let columnFormat = "|";
  for (let i = 0; i < colCount; i++) {
    columnFormat += "l|";
  }

  const latexRows: string[] = [];
  latexRows.push("\\hline");
  for (const row of tableData) {
    const rowContent = row
      .map((cell) => cell.replace(/_/g, "\\_").replace(/&/g, "\\&"))
      .join(" & ");
    latexRows.push(rowContent + " \\\\");
    latexRows.push("\\hline");
  }

  return `\\begin{table}[htbp]\n\\centering\n\\caption{Caption}\n\\label{tab:simple_table}\n\\begin{tabular}{${columnFormat}}
${latexRows.join("\n")}
\\end{tabular}\n\\end{table}`;
}

function getTextFromNode(node: any): string {
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") {
      text += child.value === "\n " ? "" : child.value;
    } else if (child.children) {
      text += getTextFromNode(child);
    }
  }
  return text;
}

async function processN2LRehypeImageNodes(
  nodes: string | any[],
  libraryID: number,
  dir: string,
  skipSavingImages: boolean = false,
  absolutePath: boolean = false,
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const imgKey = node.properties.dataAttachmentKey;
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
          : jointPath(
              getPref("syncAttachmentFolder") as string,
              PathUtils.split(newFile).pop() || "",
            ),
      );
    } catch (e) {
      ztoolkit.log(e);
    }

    let filename = newFile ? newFile : oldFile;
    if (Zotero.isWin) {
      filename = Zotero.File.normalizeToUnix(filename);
    }

    node.type = "text";
    node.value = `\\begin{figure}[!t]
\\centering
\\includegraphics[width=4.5in]{{./${filename}}}
\\caption{}
\\label{${imgKey}}
\\end{figure}`;
  }
}
