import { config } from "../../../../../package.json";
import { getErrorMessage, logError } from "../../../../utils/errorUtils";
import { showHint } from "../../../../utils/hint";
import { getPref, setPref } from "../../../../utils/prefs";
import { waitUtilAsync } from "../../../../utils/wait";
import {
  DEFAULT_CHILD_NOTE_TAGS,
  getDefaultChildNoteTagsText,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
  OBSIDIAN_CHILD_NOTE_TAGS_PREF,
} from "../../../obsidian/childNotes";
import { cleanInline } from "../../../obsidian/shared";
import { uiText } from "./helpers";
import {
  bindFrontmatterEvents,
  renderFrontmatterPanel,
} from "./fieldStudioFrontmatter";
import {
  bindMetadataEvents,
  renderMetadataPanel,
} from "./fieldStudioMetadata";

export type FieldStudioTab = "frontmatter" | "metadata";

type FieldStudioCallbacks = {
  refreshObsidianPrefsUI: () => void;
  markPreviewStale: () => void;
};

let _fieldStudioCallbacks: FieldStudioCallbacks | null = null;
const _fieldStudioWindows: Record<FieldStudioTab, Window | null> = {
  frontmatter: null,
  metadata: null,
};
const _fieldStudioDocuments: Record<FieldStudioTab, Document | null> = {
  frontmatter: null,
  metadata: null,
};

export function escapeHTML(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function checkedAttr(value: boolean) {
  return value ? "checked" : "";
}

export function selectedAttr(value: boolean) {
  return value ? "selected" : "";
}

function isUsableWindow(win: Window | null) {
  if (!win) {
    return false;
  }
  try {
    if (win.closed) {
      return false;
    }
    void win.document?.documentElement;
    return true;
  } catch (_error) {
    return false;
  }
}

function getFieldStudioWindow(tab: FieldStudioTab) {
  return isUsableWindow(_fieldStudioWindows[tab]) ? _fieldStudioWindows[tab] : null;
}

export function getFieldStudioDocument(tab: FieldStudioTab) {
  if (_fieldStudioDocuments[tab]) {
    return _fieldStudioDocuments[tab];
  }
  const win = getFieldStudioWindow(tab);
  if (!win) {
    return null;
  }
  try {
    return win.document;
  } catch (_error) {
    return null;
  }
}

function getFieldStudioRoot(doc: Document) {
  return doc.getElementById("field-studio-root") as HTMLDivElement | null;
}

function getFieldStudioWindowFeatures(tab: FieldStudioTab) {
  const size =
    tab === "frontmatter"
      ? ["width=920", "height=860"]
      : ["width=980", "height=860"];
  return ["chrome", "centerscreen", "resizable", "status", "dialog=no"]
    .concat(size)
    .join(",");
}

function cloneStudioNode(targetDoc: Document, sourceNode: Node | null): Node | null {
  if (!sourceNode) {
    return null;
  }
  switch (sourceNode.nodeType) {
    case 1: {
      const sourceElement = sourceNode as HTMLElement;
      const localName = cleanInline(sourceElement.localName || "").toLowerCase();
      if (!localName) {
        return null;
      }
      const nextElement = targetDoc.createElementNS(
        "http://www.w3.org/1999/xhtml",
        localName,
      );
      for (const attr of Array.from(sourceElement.attributes || [])) {
        nextElement.setAttribute(attr.name, attr.value);
      }
      for (const childNode of Array.from(sourceElement.childNodes)) {
        const nextChild = cloneStudioNode(targetDoc, childNode);
        if (nextChild) {
          nextElement.appendChild(nextChild);
        }
      }
      return nextElement;
    }
    case 3:
      return targetDoc.createTextNode(sourceNode.textContent || "");
    default:
      return null;
  }
}

function replaceStudioHTML(target: Element, markup: string) {
  const targetDoc = target.ownerDocument;
  const parser = new (targetDoc.defaultView?.DOMParser || DOMParser)();
  const htmlDoc = parser.parseFromString(String(markup || "").trim(), "text/html");
  const sourceRoot = htmlDoc.body || htmlDoc.documentElement;
  const fragment = targetDoc.createDocumentFragment();
  for (const node of Array.from(sourceRoot.childNodes)) {
    const nextNode = cloneStudioNode(targetDoc, node);
    if (nextNode) {
      fragment.appendChild(nextNode);
    }
  }
  target.replaceChildren(fragment);
}

export function getFieldStudioCallbacks() {
  return _fieldStudioCallbacks;
}

export function renderMetricHTML(
  label: string,
  value: string,
  tone: "default" | "accent" | "success" | "muted" = "default",
) {
  return `
    <div class="field-studio__metric field-studio__metric--${tone}">
      <div class="field-studio__metricValue">${escapeHTML(value)}</div>
      <div class="field-studio__metricLabel">${escapeHTML(label)}</div>
    </div>
  `;
}

export function renderChipHTML(
  label: string,
  tone: "default" | "accent" | "muted" | "success" = "default",
) {
  return `<span class="field-studio__chip field-studio__chip--${tone}">${escapeHTML(label)}</span>`;
}

export function renderFilterButtonHTML(options: {
  action: string;
  label: string;
  active?: boolean;
  dataAttrs?: Record<string, string>;
}) {
  const attrs = Object.entries(options.dataAttrs || {})
    .map(([key, value]) => `data-${escapeHTML(key)}="${escapeHTML(value)}"`)
    .join(" ");
  return `
    <button
      type="button"
      class="field-studio__filterButton${options.active ? " is-active" : ""}"
      data-fs-action="${escapeHTML(options.action)}"
      ${attrs}
    >${escapeHTML(options.label)}</button>
  `;
}

export function renderFrontmatterKeyList(keys: string[]) {
  return `
    <div class="field-studio__chipList">
      ${keys.map((key) => renderChipHTML(key, "muted")).join("")}
    </div>
  `;
}

function renderFieldStudio(tab: FieldStudioTab) {
  const doc = getFieldStudioDocument(tab);
  if (!doc) {
    return;
  }
  const root = getFieldStudioRoot(doc);
  if (!root) {
    return;
  }
  try {
    doc.title =
      tab === "frontmatter"
        ? uiText("属性输出工作台", "Property Output Studio")
        : uiText("字段分流工作台", "Field Routing Studio");
    replaceStudioHTML(
      root,
      `
        <div class="field-studio field-studio--dense field-studio--${escapeHTML(tab)}">
          ${tab === "frontmatter" ? renderFrontmatterPanel() : renderMetadataPanel()}
        </div>
      `,
    );
  } catch (error) {
    logError("Field studio render", error, tab);
    root.textContent = cleanInline(getErrorMessage(error));
  }
}

function bindFieldStudioEvents(tab: FieldStudioTab) {
  const doc = getFieldStudioDocument(tab);
  if (!doc) {
    return;
  }
  if (tab === "frontmatter") {
    bindFrontmatterEvents(doc);
    return;
  }
  bindMetadataEvents(doc);
}

export function rerenderFieldStudio(tab: FieldStudioTab) {
  renderFieldStudio(tab);
  bindFieldStudioEvents(tab);
}

async function ensureFieldStudioWindow(tab: FieldStudioTab) {
  const existingWindow = getFieldStudioWindow(tab);
  if (existingWindow) {
    existingWindow.focus();
    return existingWindow;
  }

  const windowArgs = {
    _initPromise: Zotero.Promise.defer(),
    studioTab: tab,
    mount: (hostWindow: Window) => {
      _fieldStudioWindows[tab] = hostWindow;
      _fieldStudioDocuments[tab] = hostWindow.document;
      rerenderFieldStudio(tab);
    },
  };
  // @ts-ignore
  windowArgs.wrappedJSObject = windowArgs;
  const dialogWindow = Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/fieldStudio.xhtml`,
    `${config.addonRef}-fieldStudio-${tab}`,
    getFieldStudioWindowFeatures(tab),
    windowArgs,
  )!;
  _fieldStudioWindows[tab] = dialogWindow;
  dialogWindow.addEventListener("unload", () => {
    if (_fieldStudioWindows[tab] === dialogWindow) {
      _fieldStudioWindows[tab] = null;
    }
    if (_fieldStudioDocuments[tab]?.defaultView === dialogWindow) {
      _fieldStudioDocuments[tab] = null;
    }
  });
  try {
    await Promise.race([
      windowArgs._initPromise.promise,
      waitUtilAsync(() => {
        try {
          return Boolean(dialogWindow.document?.getElementById("field-studio-root"));
        } catch (_error) {
          return false;
        }
      }, 50, 3000),
    ]);
  } catch (error) {
    logError("Field studio init timeout", error, tab);
  }
  dialogWindow.focus();
  return dialogWindow;
}

export async function showFieldStudio(options: {
  tab: FieldStudioTab;
  refreshObsidianPrefsUI: () => void;
  markPreviewStale: () => void;
}) {
  _fieldStudioCallbacks = {
    refreshObsidianPrefsUI: options.refreshObsidianPrefsUI,
    markPreviewStale: options.markPreviewStale,
  };
  await ensureFieldStudioWindow(options.tab);
  rerenderFieldStudio(options.tab);
  getFieldStudioWindow(options.tab)?.focus();
}

export async function showChildNoteRulesDialog(options: FieldStudioCallbacks) {
  const dialogData = {
    accepted: false,
    tags: cleanInline(
      String(getPref(OBSIDIAN_CHILD_NOTE_TAGS_PREF) || "") ||
        getDefaultChildNoteTagsText(),
    ),
    promptSelect:
      typeof getPref(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF) === "boolean"
        ? Boolean(getPref(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF))
        : true,
  };
  const tagsInputId = `${config.addonRef}-child-note-rules-tags`;
  const promptInputId = `${config.addonRef}-child-note-rules-prompt`;
  const dialog = new ztoolkit.Dialog(1, 1)
    .setDialogData(dialogData)
    .addCell(0, 0, {
      tag: "vbox",
      attributes: { flex: 1 },
      styles: {
        gap: "12px",
        padding: "12px 10px 2px",
      },
      children: [
        {
          tag: "label",
          properties: {
            textContent: uiText(
              "哪些标签的子笔记要同步到 Obsidian",
              "Which tagged child notes should sync to Obsidian",
            ),
          },
          styles: {
            fontSize: "16px",
            fontWeight: "700",
            lineHeight: "1.4",
          },
        },
        {
          tag: "input",
          namespace: "html",
          attributes: {
            id: tagsInputId,
            type: "text",
            value: dialogData.tags,
            placeholder: uiText(
              "例如：ai-summary, ai-reading",
              "e.g. ai-summary, ai-reading",
            ),
          },
          styles: {
            minHeight: "38px",
            padding: "8px 10px",
            borderRadius: "10px",
          },
        },
        {
          tag: "label",
          namespace: "html",
          styles: {
            display: "flex",
            alignItems: "center",
            gap: "10px",
          },
          children: [
            {
              tag: "input",
              namespace: "html",
              attributes: {
                id: promptInputId,
                type: "checkbox",
                checked: dialogData.promptSelect ? "checked" : undefined,
              },
            },
            {
              tag: "span",
              namespace: "html",
              properties: {
                textContent: uiText(
                  "同步单篇文献时，先让我选择要带上的子笔记",
                  "Prompt me to choose child notes when syncing a single item",
                ),
              },
            },
          ],
        },
      ],
    })
    .addButton(uiText("保存", "Save"), "accept", {
      callback: () => {
        dialogData.accepted = true;
        const dialogDoc = dialog.window?.document;
        const tagsInput = dialogDoc?.getElementById(tagsInputId) as
          | HTMLInputElement
          | null;
        const promptInput = dialogDoc?.getElementById(promptInputId) as
          | HTMLInputElement
          | null;
        dialogData.tags = cleanInline(tagsInput?.value || "");
        dialogData.promptSelect = Boolean(promptInput?.checked);
      },
    })
    .addButton(uiText("取消", "Cancel"), "cancel")
    .open(uiText("配置子笔记规则", "Configure Child Note Rules"), {
      width: 560,
      height: 260,
      centerscreen: true,
      resizable: true,
      fitContent: false,
    });

  await dialog.dialogData.unloadLock?.promise;
  if (!dialogData.accepted) {
    return;
  }

  setPref(
    OBSIDIAN_CHILD_NOTE_TAGS_PREF,
    dialogData.tags || getDefaultChildNoteTagsText(),
  );
  setPref(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, dialogData.promptSelect);
  options.refreshObsidianPrefsUI();
  options.markPreviewStale();
  showHint(uiText("子笔记规则已保存。", "Child note rules saved."));
}
