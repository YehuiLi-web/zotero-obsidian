import { config } from "../../../../../package.json";
import { parseMarkdownFrontmatter } from "../../../obsidian/frontmatter";
import { renderNoteHTML } from "../../../../utils/note";
import { formatPath, jointPath } from "../../../../utils/str";
import { cleanInline } from "../../../obsidian/shared";
import { getObsidianResolvedPaths, uiText } from "./helpers";
import {
  buildPreviewSignature,
  generateObsidianPreview,
  getPreviewSourceItem,
} from "./preview";
import { type PreviewStatus, obsidianPrefsState } from "./state";

type PreviewSegment =
  | {
      kind: "markdown";
      content: string;
    }
  | {
      kind: "callout";
      calloutType: string;
      title: string;
      content: string;
    };

type PreviewWindowPayload = {
  status: PreviewStatus;
  sourceLabel: string;
  message: string;
  fileName: string;
  frontmatter: string;
  body: string;
  notePath: string;
  rawMarkdown: string;
  renderedHTML: string;
};

type PreviewWindowArgs = {
  _initPromise: { resolve: () => void; promise: Promise<unknown> };
  initialData: PreviewWindowPayload;
  refresh: () => Promise<PreviewWindowPayload>;
  mount: (hostWindow: PreviewHostWindow) => Promise<void>;
  wrappedJSObject?: PreviewWindowArgs;
};

type PreviewHostWindow = Window & {
  __obPreviewUpdate?: (payload: PreviewWindowPayload) => Promise<void>;
};

const CALLOUT_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  info: { zh: "信息", en: "Info" },
  example: { zh: "标签", en: "Example" },
  note: { zh: "笔记", en: "Note" },
  quote: { zh: "摘要", en: "Quote" },
  tldr: { zh: "隐藏字段", en: "TL;DR" },
  tip: { zh: "提示", en: "Tip" },
  warning: { zh: "警告", en: "Warning" },
  danger: { zh: "风险", en: "Danger" },
};

let _previewWindow: PreviewHostWindow | null = null;

function getPreviewStatusLabel(status: PreviewStatus) {
  switch (status) {
    case "ready":
      return uiText("已渲染", "Rendered");
    case "stale":
      return uiText("待刷新", "Stale");
    case "loading":
      return uiText("生成中", "Loading");
    case "error":
      return uiText("失败", "Error");
    default:
      return uiText("未生成", "Empty");
  }
}

function isPreviewWindowAlive(win: PreviewHostWindow | null) {
  if (!win) {
    return false;
  }
  try {
    return !win.closed && Boolean(win.document?.documentElement);
  } catch (error) {
    return false;
  }
}

function escapeHTML(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePropertyText(value: unknown) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return cleanInline(value);
}

function isLikelyLink(value: string) {
  return /^(?:https?|file|zotero|obsidian):/i.test(value) || /^www\./i.test(value);
}

function resolvePropertyHref(value: string, notePath: string) {
  if (!value) {
    return "";
  }
  if (/^www\./i.test(value)) {
    return `https://${value}`;
  }
  return resolvePreviewResourceURL(value, notePath);
}

function trimBlankLines(lines: string[]) {
  const nextLines = [...lines];
  while (nextLines.length && !cleanInline(nextLines[0])) {
    nextLines.shift();
  }
  while (nextLines.length && !cleanInline(nextLines[nextLines.length - 1])) {
    nextLines.pop();
  }
  return nextLines;
}

function normalizeCalloutTitle(rawTitle: string) {
  const title = String(rawTitle || "").trim();
  if (!title) {
    return "";
  }
  try {
    const doc = new DOMParser().parseFromString(
      `<body>${title}</body>`,
      "text/html",
    );
    return cleanInline(doc.body.textContent || title);
  } catch (error) {
    return cleanInline(title.replace(/<\/?center>/gi, ""));
  }
}

function parsePreviewMarkdownSegments(markdown: string) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const segments: PreviewSegment[] = [];
  const markdownBuffer: string[] = [];

  const flushMarkdown = () => {
    const content = markdownBuffer.join("\n").trim();
    markdownBuffer.length = 0;
    if (content) {
      segments.push({
        kind: "markdown",
        content,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const calloutMatch = line.match(/^>\s*\[!([^\]\s]+)\][+-]?\s*(.*)$/i);
    if (!calloutMatch) {
      markdownBuffer.push(line);
      continue;
    }

    flushMarkdown();

    const bodyLines: string[] = [];
    i += 1;
    while (i < lines.length) {
      const bodyLine = lines[i];
      if (!bodyLine.startsWith(">")) {
        i -= 1;
        break;
      }
      bodyLines.push(bodyLine.replace(/^>\s?/, ""));
      i += 1;
    }

    segments.push({
      kind: "callout",
      calloutType: cleanInline(calloutMatch[1]).toLowerCase() || "note",
      title: normalizeCalloutTitle(calloutMatch[2]),
      content: trimBlankLines(bodyLines).join("\n"),
    });
  }

  flushMarkdown();
  return segments;
}

function getCalloutTypeLabel(calloutType: string) {
  const text = CALLOUT_TYPE_LABELS[calloutType];
  return text ? uiText(text.zh, text.en) : calloutType.toUpperCase();
}

function renderPropertyScalarHTML(value: unknown, notePath: string) {
  const text = normalizePropertyText(value);
  if (!text) {
    return "";
  }
  if (isLikelyLink(text)) {
    const href = resolvePropertyHref(text, notePath);
    return `<a class="ob-preview-property__link" href="${escapeHTML(
      href,
    )}">${escapeHTML(text)}</a>`;
  }
  return `<span>${escapeHTML(text)}</span>`;
}

function renderPropertyValueHTML(value: unknown, notePath: string): string {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => normalizePropertyText(item))
      .filter(Boolean)
      .map((item) => {
        const content = isLikelyLink(item)
          ? renderPropertyScalarHTML(item, notePath)
          : escapeHTML(item);
        return `<span class="ob-preview-property__chip">${content}</span>`;
      });
    return items.join("");
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, nestedValue]) =>
        Array.isArray(nestedValue)
          ? nestedValue.length
          : Boolean(normalizePropertyText(nestedValue)),
    );
    if (!entries.length) {
      return "";
    }
    return `
      <div class="ob-preview-property__nested">
        ${entries
          .map(
            ([nestedKey, nestedValue]) => `
              <div class="ob-preview-property__nestedRow">
                <span class="ob-preview-property__nestedKey">${escapeHTML(
                  nestedKey,
                )}</span>
                <span class="ob-preview-property__nestedValue">${renderPropertyValueHTML(
                  nestedValue,
                  notePath,
                )}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    `.trim();
  }

  return renderPropertyScalarHTML(value, notePath);
}

function buildFrontmatterPropertiesHTML(frontmatterMarkdown: string, notePath: string) {
  const frontmatter = parseMarkdownFrontmatter(frontmatterMarkdown);
  const entries = Object.entries(frontmatter).filter(([key, value]) => {
    if (key === "title") {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (value && typeof value === "object") {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }
    return Boolean(normalizePropertyText(value));
  });

  if (!entries.length) {
    return "";
  }

  return `
    <section class="ob-preview-properties" aria-label="${escapeHTML(
      uiText("笔记属性", "Note properties"),
    )}">
      ${entries
        .map(
          ([key, value]) => `
            <div class="ob-preview-property">
              <div class="ob-preview-property__key">${escapeHTML(key)}</div>
              <div class="ob-preview-property__value">${renderPropertyValueHTML(
                value,
                notePath,
              )}</div>
            </div>
          `,
        )
        .join("")}
    </section>
  `.trim();
}

function buildCalloutHTML(
  segment: Extract<PreviewSegment, { kind: "callout" }>,
  innerHTML: string,
) {
  const calloutType = cleanInline(segment.calloutType).toLowerCase() || "note";
  const title =
    cleanInline(segment.title) || getCalloutTypeLabel(calloutType);
  return `
    <section class="ob-preview-callout ob-preview-callout--${escapeHTML(
      calloutType,
    )}">
      <div class="ob-preview-callout__title">${escapeHTML(title)}</div>
      <div class="ob-preview-callout__body">${innerHTML}</div>
    </section>
  `.trim();
}

async function renderMarkdownSegment(content: string) {
  const normalized = String(content || "").trim();
  if (!normalized) {
    return "";
  }
  return await addon.api.convert.md2html(normalized);
}

function resolvePreviewResourceURL(rawURL: string, notePath: string) {
  const value = String(rawURL || "").trim();
  if (!value || value.startsWith("#")) {
    return value;
  }
  if (
    /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value) ||
    value.startsWith("data:")
  ) {
    return value;
  }

  const match = value.match(/^([^?#]*)(.*)$/);
  const resourcePath = match?.[1] || value;
  const suffix = match?.[2] || "";
  const baseDir = PathUtils.parent(notePath) || "";
  let decodedResourcePath = resourcePath;
  try {
    decodedResourcePath = decodeURI(resourcePath);
  } catch (error) {
    decodedResourcePath = resourcePath;
  }
  const absolutePath = formatPath(jointPath(baseDir, decodedResourcePath));
  const fileURI =
    typeof Zotero.File?.pathToFileURI === "function"
      ? Zotero.File.pathToFileURI(absolutePath)
      : `file://${Zotero.File.normalizeToUnix(absolutePath)}`;
  return `${fileURI}${suffix}`;
}

function resolvePreviewResourceURLs(html: string, notePath: string) {
  if (!html || !notePath) {
    return html;
  }
  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html",
  );
  doc.querySelectorAll("img[src],a[href]").forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    if (tagName === "img") {
      const imageElement = element as HTMLImageElement;
      imageElement.src = resolvePreviewResourceURL(
        imageElement.getAttribute("src") || "",
        notePath,
      );
      return;
    }
    if (tagName === "a") {
      const anchorElement = element as HTMLAnchorElement;
      anchorElement.href = resolvePreviewResourceURL(
        anchorElement.getAttribute("href") || "",
        notePath,
      );
      anchorElement.target = "_blank";
      anchorElement.rel = "noopener noreferrer";
    }
  });
  return doc.body.innerHTML;
}

async function renderPreviewBodyHTML(markdown: string, notePath: string) {
  const segments = parsePreviewMarkdownSegments(markdown);
  const renderedParts: string[] = [];
  for (const segment of segments) {
    if (segment.kind === "markdown") {
      const html = await renderMarkdownSegment(segment.content);
      if (html) {
        renderedParts.push(html);
      }
      continue;
    }
    const innerHTML = await renderMarkdownSegment(segment.content);
    renderedParts.push(buildCalloutHTML(segment, innerHTML));
  }

  if (!renderedParts.length) {
    return "";
  }

  const noteHTML = await renderNoteHTML(renderedParts.join("\n"), []);
  return resolvePreviewResourceURLs(noteHTML, notePath);
}

async function renderPreviewNoteHTML(
  frontmatter: string,
  markdown: string,
  notePath: string,
) {
  const frontmatterHTML = buildFrontmatterPropertiesHTML(frontmatter, notePath);
  const bodyHTML = await renderPreviewBodyHTML(markdown, notePath);
  return [frontmatterHTML, bodyHTML].filter(Boolean).join("\n");
}

async function buildPreviewWindowPayload() {
  const preview = obsidianPrefsState.preview;
  const { notesDir } = getObsidianResolvedPaths();
  const notePath =
    preview.fileName && notesDir ? jointPath(notesDir, preview.fileName) : "";
  const rawMarkdown = [preview.frontmatter, preview.body]
    .map((block) => String(block || "").trim())
    .filter(Boolean)
    .join("\n\n");
  const renderedHTML =
    preview.status === "ready" && (preview.frontmatter || preview.body)
      ? await renderPreviewNoteHTML(preview.frontmatter, preview.body, notePath)
      : "";

  return {
    status: preview.status,
    sourceLabel: preview.sourceLabel,
    message: preview.message,
    fileName: preview.fileName,
    frontmatter: preview.frontmatter,
    body: preview.body,
    notePath,
    rawMarkdown,
    renderedHTML,
  } satisfies PreviewWindowPayload;
}

async function ensurePreviewWindowPayload(forceRefresh = false) {
  const currentSignature = buildPreviewSignature(getPreviewSourceItem());
  if (
    forceRefresh ||
    obsidianPrefsState.preview.status !== "ready" ||
    obsidianPrefsState.preview.signature !== currentSignature
  ) {
    await generateObsidianPreview();
  }
  return await buildPreviewWindowPayload();
}

function buildPreviewShellMarkup() {
  return `
    <div class="ob-preview-shell">
      <header class="ob-preview-header">
        <div class="ob-preview-header__copy">
          <div class="ob-preview-eyebrow">${escapeHTML(
            uiText("Obsidian 联动笔记", "Obsidian Managed Note"),
          )}</div>
          <h1 class="ob-preview-title">${escapeHTML(
            uiText("笔记预览", "Note Preview"),
          )}</h1>
          <p class="ob-preview-meta" data-role="meta"></p>
        </div>
        <div class="ob-preview-header__actions">
          <button type="button" class="ob-preview-button" data-action="refresh">${escapeHTML(
            uiText("刷新预览", "Refresh Preview"),
          )}</button>
          <button type="button" class="ob-preview-button ob-preview-button--ghost" data-action="close">${escapeHTML(
            uiText("关闭", "Close"),
          )}</button>
        </div>
      </header>

      <div class="ob-preview-bar">
        <span class="ob-preview-pill" data-role="status"></span>
        <span class="ob-preview-file" data-role="file"></span>
      </div>

      <div class="ob-preview-pathBar">
        <span class="ob-preview-pathBar__label">${escapeHTML(
          uiText("预期文件路径", "Expected File Path"),
        )}</span>
        <span class="ob-preview-pathBar__value" data-role="path"></span>
      </div>

      <div class="ob-preview-noteFrame">
        <article class="markdown-body ob-preview-note" data-role="rendered"></article>
      </div>
    </div>
  `.trim();
}

async function mountPreviewWindow(
  hostWindow: PreviewHostWindow,
  windowArgs: PreviewWindowArgs,
) {
  const doc = hostWindow.document;
  const root = doc.getElementById("obsidian-preview-root");
  if (!root) {
    return;
  }

  root.innerHTML = buildPreviewShellMarkup();

  const meta = root.querySelector<HTMLElement>('[data-role="meta"]');
  const status = root.querySelector<HTMLElement>('[data-role="status"]');
  const file = root.querySelector<HTMLElement>('[data-role="file"]');
  const notePath = root.querySelector<HTMLElement>('[data-role="path"]');
  const rendered = root.querySelector<HTMLElement>('[data-role="rendered"]');
  const refreshButton = root.querySelector<HTMLButtonElement>(
    '[data-action="refresh"]',
  );
  const closeButton = root.querySelector<HTMLButtonElement>(
    '[data-action="close"]',
  );

  if (
    !meta ||
    !status ||
    !file ||
    !notePath ||
    !rendered ||
    !refreshButton ||
    !closeButton
  ) {
    return;
  }

  const setBusy = (busy: boolean) => {
    refreshButton.disabled = busy;
    refreshButton.textContent = busy
      ? uiText("正在刷新…", "Refreshing...")
      : uiText("刷新预览", "Refresh Preview");
  };

  const renderPayload = async (payload: PreviewWindowPayload) => {
    const fallbackMessage = uiText(
      "先在 Zotero 主界面选中文献，再生成预览。",
      "Select a Zotero item in the main window first.",
    );
    doc.title = payload.fileName
      ? `${payload.fileName} · ${uiText("预览", "Preview")}`
      : uiText("Obsidian 预览", "Obsidian Preview");
    root.dataset.status = payload.status;
    status.className = `ob-preview-pill ob-preview-pill--${payload.status}`;
    status.textContent = getPreviewStatusLabel(payload.status);
    meta.textContent = [payload.sourceLabel, payload.message || fallbackMessage]
      .filter(Boolean)
      .join(" · ");
    file.textContent =
      payload.fileName ||
      uiText("尚未生成文件名预览", "No filename preview yet");
    notePath.textContent =
      payload.notePath ||
      uiText(
        "未设置落盘目录，先显示纯预览内容。",
        "No output path yet. Showing content preview first.",
      );

    if (payload.renderedHTML) {
      rendered.innerHTML = payload.renderedHTML;
    } else {
      rendered.innerHTML = `
        <section class="ob-preview-empty">
          <h2>${escapeHTML(uiText("暂无可渲染内容", "Nothing to render yet"))}</h2>
          <p>${escapeHTML(payload.message || fallbackMessage)}</p>
        </section>
      `.trim();
    }
  };

  rendered.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link?.href) {
      return;
    }
    event.preventDefault();
    try {
      Zotero.launchURL(link.href);
    } catch (error) {
      ztoolkit.log("[obsidian preview] open link failed", link.href, error);
    }
  });

  refreshButton.addEventListener("click", async () => {
    setBusy(true);
    try {
      const payload = await windowArgs.refresh();
      await renderPayload(payload);
    } catch (error) {
      ztoolkit.log("[obsidian preview] refresh failed", error);
    } finally {
      setBusy(false);
    }
  });

  closeButton.addEventListener("click", () => {
    hostWindow.close();
  });

  hostWindow.__obPreviewUpdate = async (payload: PreviewWindowPayload) => {
    await renderPayload(payload);
  };

  await renderPayload(windowArgs.initialData);
}

export async function showObsidianPreviewWindow() {
  const payload = await ensurePreviewWindowPayload();
  if (isPreviewWindowAlive(_previewWindow)) {
    await _previewWindow!.__obPreviewUpdate?.(payload);
    _previewWindow!.focus();
    return _previewWindow!;
  }

  const windowArgs: PreviewWindowArgs = {
    _initPromise: Zotero.Promise.defer(),
    initialData: payload,
    refresh: async () => {
      return await ensurePreviewWindowPayload(true);
    },
    mount: async (hostWindow: PreviewHostWindow) => {
      await mountPreviewWindow(hostWindow, windowArgs);
    },
  };
  windowArgs.wrappedJSObject = windowArgs;

  const previewWindow = Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/obsidianPreview.xhtml`,
    `${config.addonRef}-obsidianPreview`,
    "chrome,centerscreen,resizable,status,dialog=no,width=1240,height=860",
    windowArgs,
  ) as PreviewHostWindow | null;

  if (!previewWindow) {
    return null;
  }

  _previewWindow = previewWindow;
  previewWindow.addEventListener(
    "unload",
    () => {
      if (_previewWindow === previewWindow) {
        _previewWindow = null;
      }
    },
    { once: true },
  );

  await windowArgs._initPromise.promise;
  previewWindow.focus();
  return previewWindow;
}
