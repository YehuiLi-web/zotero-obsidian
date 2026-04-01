import { config } from "../../../../../package.json";
import { showHint } from "../../../../utils/hint";
import { getString } from "../../../../utils/locale";
import { getPref, setPref } from "../../../../utils/prefs";
import { waitUtilAsync } from "../../../../utils/wait";
import {
  DEFAULT_CHILD_NOTE_TAGS,
  OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF,
  OBSIDIAN_CHILD_NOTE_TAGS_PREF,
} from "../../../obsidian/childNotes";
import { cleanInline } from "../../../obsidian/shared";
import {
  cloneDefaultMetadataPreset,
  cloneMetadataPreset,
  DERIVED_METADATA_FIELD_KEYS,
  FIXED_MANAGED_FRONTMATTER_KEYS,
  getConfiguredFields,
  getFieldLabel,
  getManagedFrontmatterFields,
  getManagedFrontmatterPresetLabel,
  getMetadataFieldCatalog,
  getMetadataPresetLibrary,
  getMetadataPresetSectionLabel,
  MANAGED_FRONTMATTER_OPTIONS,
  MANAGED_FRONTMATTER_PRESETS,
  METADATA_SECTION_OPTIONS,
  persistMetadataPresetLibrary,
  resolveManagedFrontmatterPreset,
  setManagedFrontmatterFields,
} from "../../../obsidian/settings";
import { resyncAllManagedObsidianNotes } from "../../../obsidian/sync";
import type {
  ManagedFrontmatterOptionGroup,
  ManagedFrontmatterOptionKey,
  MetadataPreset,
  MetadataSectionKey,
} from "../../../obsidian/types";
import { uiText } from "./helpers";
import {
  deleteObsidianMetadataPreset,
  duplicateObsidianMetadataPreset,
  ensureMetadataPresetEditorState,
  resetObsidianMetadataPreset,
  saveObsidianMetadataPreset,
  setDraftMetadataFieldPlacement,
} from "./metadataPresetEditor";
import {
  metadataPresetEditorState,
  setMetadataPresetEditorState,
} from "./state";

export type FieldStudioTab = "frontmatter" | "metadata";

type FieldStudioCallbacks = {
  refreshObsidianPrefsUI: () => void;
  markPreviewStale: () => void;
};

type MetadataPlacement = "none" | "visible" | "hidden";
type FrontmatterVisibilityFilter = "all" | "selected";
type MetadataPlacementFilter = "all" | MetadataPlacement;
type MetadataPlacementCounts = Record<MetadataPlacement | "all", number>;
type MetadataSchemeId = "writing" | "research" | "index";
type MetadataSchemeDefinition = {
  id: MetadataSchemeId;
  label: string;
  description: string;
  preset: MetadataPreset;
};

let _fieldStudioCallbacks: FieldStudioCallbacks | null = null;
let _frontmatterSearchText = "";
let _frontmatterVisibilityFilter: FrontmatterVisibilityFilter = "all";
let _metadataPlacementFilter: MetadataPlacementFilter = "all";
const _fieldStudioWindows: Record<FieldStudioTab, Window | null> = {
  frontmatter: null,
  metadata: null,
};
const _fieldStudioDocuments: Record<FieldStudioTab, Document | null> = {
  frontmatter: null,
  metadata: null,
};

function escapeHTML(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function checkedAttr(value: boolean) {
  return value ? "checked" : "";
}

function selectedAttr(value: boolean) {
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
  } catch (error) {
    return false;
  }
}

function getFieldStudioWindow(tab: FieldStudioTab) {
  return isUsableWindow(_fieldStudioWindows[tab]) ? _fieldStudioWindows[tab] : null;
}

function getFieldStudioDocument(tab: FieldStudioTab) {
  if (_fieldStudioDocuments[tab]) {
    return _fieldStudioDocuments[tab];
  }
  const win = getFieldStudioWindow(tab);
  if (!win) {
    return null;
  }
  try {
    return win.document;
  } catch (error) {
    return null;
  }
}

function getFieldStudioRoot(doc: Document) {
  return doc.getElementById("field-studio-root") as HTMLDivElement | null;
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

function rerenderFieldStudio(tab: FieldStudioTab) {
  renderFieldStudio(tab);
  bindFieldStudioEvents(tab);
}

function renderMetricHTML(
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

function renderChipHTML(
  label: string,
  tone: "default" | "accent" | "muted" | "success" = "default",
) {
  return `<span class="field-studio__chip field-studio__chip--${tone}">${escapeHTML(label)}</span>`;
}

function renderFilterButtonHTML(options: {
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

function renderFrontmatterKeyList(keys: string[]) {
  return `
    <div class="field-studio__chipList">
      ${keys.map((key) => renderChipHTML(key, "muted")).join("")}
    </div>
  `;
}

function getFrontmatterGroupLabel(group: ManagedFrontmatterOptionGroup) {
  switch (group) {
    case "links":
      return uiText("链接", "Links");
    case "library":
      return uiText("库信息", "Library");
    default:
      return uiText("参考信息", "Reference");
  }
}

function buildFrontmatterSummaryText() {
  const fields = getManagedFrontmatterFields();
  const presetId = resolveManagedFrontmatterPreset(fields);
  return uiText(
    `当前方案 ${getManagedFrontmatterPresetLabel(presetId)}，固定 ${FIXED_MANAGED_FRONTMATTER_KEYS.length} 项，可选已启用 ${fields.length} / ${MANAGED_FRONTMATTER_OPTIONS.length}。`,
    `Preset ${getManagedFrontmatterPresetLabel(presetId)}; ${FIXED_MANAGED_FRONTMATTER_KEYS.length} fixed; ${fields.length} / ${MANAGED_FRONTMATTER_OPTIONS.length} optional enabled.`,
  );
}

function applyFrontmatterSelection(
  nextFields: ManagedFrontmatterOptionKey[],
  hintText = "",
) {
  const uniqueFields = Array.from(new Set(nextFields));
  setManagedFrontmatterFields(uniqueFields);
  _fieldStudioCallbacks?.refreshObsidianPrefsUI();
  _fieldStudioCallbacks?.markPreviewStale();
  if (hintText) {
    showHint(hintText);
  }
  rerenderFieldStudio("frontmatter");
}

function applyFrontmatterPreset(presetId: string) {
  const preset = MANAGED_FRONTMATTER_PRESETS.find((item) => item.id === presetId);
  if (!preset) {
    return;
  }
  applyFrontmatterSelection(
    preset.fields,
    uiText(
      `已应用 ${getManagedFrontmatterPresetLabel(preset.id)}。`,
      `${getManagedFrontmatterPresetLabel(preset.id)} applied.`,
    ),
  );
}

function applyFrontmatterBulk(mode: "recommended" | "all" | "none") {
  if (mode === "recommended") {
    applyFrontmatterPreset("recommended");
    return;
  }
  if (mode === "all") {
    applyFrontmatterSelection(
      MANAGED_FRONTMATTER_OPTIONS.map((option) => option.key),
      uiText("已启用全部可选属性。", "All optional properties enabled."),
    );
    return;
  }
  applyFrontmatterSelection(
    [],
    uiText("已清空全部可选属性。", "All optional properties cleared."),
  );
}

function setFrontmatterGroupEnabled(
  groupKey: ManagedFrontmatterOptionGroup,
  enabled: boolean,
) {
  const current = new Set(getManagedFrontmatterFields());
  const groupOptions = MANAGED_FRONTMATTER_OPTIONS.filter(
    (option) => option.group === groupKey,
  );
  for (const option of groupOptions) {
    if (enabled) {
      current.add(option.key);
    } else {
      current.delete(option.key);
    }
  }
  applyFrontmatterSelection(
    Array.from(current),
    uiText(
      `${getFrontmatterGroupLabel(groupKey)}已${enabled ? "全部启用" : "清空"}。`,
      `${getFrontmatterGroupLabel(groupKey)} ${enabled ? "enabled" : "cleared"}.`,
    ),
  );
}

function renderFrontmatterPresetButtons() {
  const selectedFields = getManagedFrontmatterFields();
  const presetId = resolveManagedFrontmatterPreset(selectedFields);
  return `
    <div class="field-studio__buttonRow">
      ${MANAGED_FRONTMATTER_PRESETS.map((preset) => {
        const title = getManagedFrontmatterPresetLabel(preset.id);
        return `
          <button
            type="button"
            class="field-studio__button${preset.id === presetId ? " field-studio__button--primary" : ""}"
            data-fs-action="apply-frontmatter-preset"
            data-fs-preset-id="${escapeHTML(preset.id)}"
          >${escapeHTML(title)}</button>
        `;
      }).join("")}
    </div>
  `;
}

function renderFrontmatterGroups() {
  const selectedFields = new Set(getManagedFrontmatterFields());
  const searchText = cleanInline(_frontmatterSearchText).toLowerCase();
  const groups = ["reference", "links", "library"] as ManagedFrontmatterOptionGroup[];
  return groups
    .map((groupKey) => {
      const allOptions = MANAGED_FRONTMATTER_OPTIONS.filter(
        (option) => option.group === groupKey,
      );
      const groupSelectedCount = allOptions.filter((option) =>
        selectedFields.has(option.key),
      ).length;
      const options = allOptions.filter((option) => {
        if (
          _frontmatterVisibilityFilter === "selected" &&
          !selectedFields.has(option.key)
        ) {
          return false;
        }
        if (!searchText) {
          return true;
        }
        return `${option.label} ${option.help} ${option.key} ${option.frontmatterKeys.join(" ")}`
          .toLowerCase()
          .includes(searchText);
      });
      if (!options.length) {
        return "";
      }
      return `
        <details class="field-studio__group" open>
          <summary>
            <span class="field-studio__groupTitle">${escapeHTML(
              getFrontmatterGroupLabel(groupKey),
            )}</span>
            <span class="field-studio__groupMeta">${escapeHTML(
              uiText(
                `已启用 ${groupSelectedCount} / ${allOptions.length}`,
                `${groupSelectedCount} / ${allOptions.length} enabled`,
              ),
            )}</span>
          </summary>
          <div class="field-studio__groupBody">
            <div class="field-studio__buttonRow">
              <button
                type="button"
                class="field-studio__button field-studio__button--ghost"
                data-fs-action="frontmatter-group"
                data-fs-group="${escapeHTML(groupKey)}"
                data-fs-enabled="true"
              >${escapeHTML(uiText("启用本组", "Enable group"))}</button>
              <button
                type="button"
                class="field-studio__button field-studio__button--ghost"
                data-fs-action="frontmatter-group"
                data-fs-group="${escapeHTML(groupKey)}"
                data-fs-enabled="false"
              >${escapeHTML(uiText("清空本组", "Clear group"))}</button>
            </div>
            <div class="field-studio__optionList">
              ${options
                .map((option) => {
                  const active = selectedFields.has(option.key);
                  const optionKeys = option.frontmatterKeys.join(", ");
                  return `
                    <label
                      class="field-studio__optionRow${active ? " is-active" : ""}"
                      title="${escapeHTML(option.help)}"
                    >
                      <input
                        type="checkbox"
                        data-fs-frontmatter-key="${escapeHTML(option.key)}"
                        ${checkedAttr(active)}
                      />
                      <span class="field-studio__optionRowMain">
                        <span class="field-studio__optionRowTitle">${escapeHTML(
                          option.label,
                        )}</span>
                        <code class="field-studio__optionRowKeys">${escapeHTML(
                          optionKeys,
                        )}</code>
                      </span>
                    </label>
                  `;
                })
                .join("")}
            </div>
          </div>
        </details>
      `;
    })
    .filter(Boolean)
    .join("");
}

function renderFrontmatterPanel() {
  const selectedFields = getManagedFrontmatterFields();
  const presetId = resolveManagedFrontmatterPreset(selectedFields);
  const presetLabel = getManagedFrontmatterPresetLabel(presetId);
  return `
    <section class="field-studio__panel">
      <div class="field-studio__panelInner field-studio__panelInner--dense">
        <section class="field-studio__card field-studio__card--control">
          <div class="field-studio__panelHeader">
            <div class="field-studio__panelHeaderMain">
              <h3 class="field-studio__panelTitle">${escapeHTML(
                uiText("属性输出", "Property Output"),
              )}</h3>
              <div class="field-studio__subtleText">${escapeHTML(
                buildFrontmatterSummaryText(),
              )}</div>
            </div>
            <div class="field-studio__chipList">
              ${renderChipHTML(uiText(`方案 ${presetLabel}`, `Preset ${presetLabel}`), "accent")}
              ${renderChipHTML(
                uiText(
                  `固定 ${FIXED_MANAGED_FRONTMATTER_KEYS.length}`,
                  `Fixed ${FIXED_MANAGED_FRONTMATTER_KEYS.length}`,
                ),
                "muted",
              )}
              ${renderChipHTML(
                uiText(
                  `已启用 ${selectedFields.length} / ${MANAGED_FRONTMATTER_OPTIONS.length}`,
                  `Enabled ${selectedFields.length} / ${MANAGED_FRONTMATTER_OPTIONS.length}`,
                ),
                "success",
              )}
            </div>
          </div>

          <div class="field-studio__actionStrip">
            <div class="field-studio__actionCluster">
              <div class="field-studio__inlineLabel">${escapeHTML(
                uiText("方案", "Preset"),
              )}</div>
              ${renderFrontmatterPresetButtons()}
            </div>
            <div class="field-studio__actionCluster">
              <div class="field-studio__inlineLabel">${escapeHTML(
                uiText("批量", "Bulk"),
              )}</div>
              <div class="field-studio__buttonRow">
                <button
                  type="button"
                  class="field-studio__button"
                  data-fs-action="frontmatter-bulk"
                  data-fs-mode="all"
                >${escapeHTML(uiText("全部启用", "Enable all"))}</button>
                <button
                  type="button"
                  class="field-studio__button"
                  data-fs-action="frontmatter-bulk"
                  data-fs-mode="none"
                >${escapeHTML(uiText("全部清空", "Clear all"))}</button>
              </div>
            </div>
          </div>

          <div class="field-studio__inputRow field-studio__inputRow--frontmatter">
            <div class="field-studio__field field-studio__field--search">
              <input
                id="field-studio-frontmatter-search"
                class="field-studio__input"
                type="search"
                value="${escapeHTML(_frontmatterSearchText)}"
                aria-label="${escapeHTML(uiText("搜索属性", "Search properties"))}"
                placeholder="${escapeHTML(uiText("搜索属性名、key 或输出字段", "Search label, key, or output field"))}"
              />
            </div>
            <div class="field-studio__segmentedBar">
              ${renderFilterButtonHTML({
                action: "frontmatter-filter",
                label: uiText("全部属性", "All"),
                active: _frontmatterVisibilityFilter === "all",
                dataAttrs: { "fs-filter": "all" },
              })}
              ${renderFilterButtonHTML({
                action: "frontmatter-filter",
                label: uiText("仅看已启用", "Enabled"),
                active: _frontmatterVisibilityFilter === "selected",
                dataAttrs: { "fs-filter": "selected" },
              })}
            </div>
          </div>

          <details class="field-studio__details">
            <summary class="field-studio__detailsSummary">${escapeHTML(
              uiText(
                `固定桥接属性 ${FIXED_MANAGED_FRONTMATTER_KEYS.length} 项`,
                `Fixed bridge properties ${FIXED_MANAGED_FRONTMATTER_KEYS.length}`,
              ),
            )}</summary>
            <div class="field-studio__detailsBody">
              <div class="field-studio__subtleText">${escapeHTML(
                uiText(
                  "这部分始终保留，用于桥接关系和基础状态。",
                  "Always kept for bridge identity and state.",
                ),
              )}</div>
              <div class="field-studio__chipList">
                ${FIXED_MANAGED_FRONTMATTER_KEYS.map((key) =>
                  renderChipHTML(key, "muted"),
                ).join("")}
              </div>
            </div>
          </details>
        </section>

        <section class="field-studio__card field-studio__card--main">
          <div class="field-studio__scrollArea field-studio__scrollArea--list">
            ${renderFrontmatterGroups() || `<div class="field-studio__empty">${escapeHTML(uiText("没有匹配到属性字段。", "No matching properties."))}</div>`}
          </div>
        </section>
      </div>
    </section>
  `;
}

function getMetadataPlacement(
  sectionKey: MetadataSectionKey,
  fieldKey: string,
): MetadataPlacement {
  const state = ensureMetadataPresetEditorState();
  if ((state.draftPreset.visible[sectionKey] || []).includes(fieldKey)) {
    return "visible";
  }
  if ((state.draftPreset.hidden[sectionKey] || []).includes(fieldKey)) {
    return "hidden";
  }
  return "none";
}

function getMetadataOverrideCount() {
  const state = ensureMetadataPresetEditorState();
  return METADATA_SECTION_OPTIONS.filter((sectionKey) => {
    if (sectionKey === "default") {
      return false;
    }
    return Boolean(
      (state.draftPreset.visible[sectionKey] || []).length ||
        (state.draftPreset.hidden[sectionKey] || []).length,
    );
  }).length;
}

function getMetadataPlacementCounts(
  sectionKey: MetadataSectionKey,
): MetadataPlacementCounts {
  const state = ensureMetadataPresetEditorState();
  const fieldKeys = getMetadataFieldCatalog(sectionKey, state.draftPreset);
  const counts: MetadataPlacementCounts = {
    all: fieldKeys.length,
    visible: 0,
    hidden: 0,
    none: 0,
  };
  for (const fieldKey of fieldKeys) {
    counts[getMetadataPlacement(sectionKey, fieldKey)] += 1;
  }
  return counts;
}

function getMetadataFieldOriginLabel(fieldKey: string) {
  return DERIVED_METADATA_FIELD_KEYS.includes(fieldKey)
    ? uiText("派生字段", "Derived")
    : uiText("Zotero 字段", "Zotero");
}

function createMetadataSchemes(): MetadataSchemeDefinition[] {
  const writing = cloneDefaultMetadataPreset();
  writing.visible.default = ["itemTypeZh", "title", "creators", "itemLink", "pdfLink"];
  writing.visible.journalArticle = ["publicationTitle", "date", "DOI"];
  writing.visible.conferencePaper = ["proceedingsTitle", "date", "DOI"];
  writing.visible.thesis = ["university", "date"];
  writing.visible.book = ["publisher", "date", "ISBN"];
  writing.visible.bookSection = ["bookTitle", "publisher", "date", "ISBN"];
  writing.visible.patent = ["issuingAuthority", "patentNumber", "issueDate"];
  writing.hidden.default = ["itemType", "citationKey", "tags", "related"];
  writing.hidden.journalArticle = ["volume", "issue", "pages"];
  writing.hidden.conferencePaper = ["conferenceName", "place", "pages"];
  writing.hidden.thesis = ["place"];
  writing.hidden.book = ["place", "pages"];
  writing.hidden.bookSection = ["place", "pages"];
  writing.hidden.patent = ["url"];

  const research = cloneDefaultMetadataPreset();
  research.visible.default = [
    "itemTypeZh",
    "title",
    "titleTranslation",
    "creators",
    "collection",
    "citationKey",
    "itemLink",
    "pdfLink",
  ];
  research.visible.journalArticle = ["publicationTitle", "date", "DOI", "JCRQ"];
  research.visible.conferencePaper = [
    "proceedingsTitle",
    "conferenceName",
    "date",
    "DOI",
  ];
  research.visible.thesis = ["university", "date"];
  research.visible.book = ["publisher", "date", "ISBN"];
  research.visible.bookSection = ["bookTitle", "publisher", "date", "ISBN"];
  research.visible.patent = ["issuingAuthority", "patentNumber", "issueDate"];
  research.hidden.default = [
    "itemType",
    "shortTitle",
    "tags",
    "related",
    "dateAdded",
    "dateModified",
    "qnkey",
  ];
  research.hidden.journalArticle = ["journalAbbreviation", "volume", "issue", "pages"];
  research.hidden.conferencePaper = ["place", "pages"];
  research.hidden.thesis = ["place"];
  research.hidden.book = ["place", "pages"];
  research.hidden.bookSection = ["place", "pages"];
  research.hidden.patent = ["url"];

  const index = cloneDefaultMetadataPreset();
  index.visible.default = [
    "itemTypeZh",
    "title",
    "creators",
    "collection",
    "tags",
    "citationKey",
    "itemLink",
    "pdfLink",
  ];
  index.visible.journalArticle = [
    "publicationTitle",
    "date",
    "DOI",
    "volume",
    "issue",
  ];
  index.visible.conferencePaper = [
    "proceedingsTitle",
    "conferenceName",
    "date",
    "DOI",
  ];
  index.visible.thesis = ["university", "date"];
  index.visible.book = ["publisher", "date", "ISBN"];
  index.visible.bookSection = ["bookTitle", "publisher", "date", "ISBN"];
  index.visible.patent = ["issuingAuthority", "patentNumber", "issueDate"];
  index.hidden.default = ["itemType", "shortTitle", "related", "dateAdded", "dateModified"];
  index.hidden.journalArticle = ["journalAbbreviation", "pages", "ISSN"];
  index.hidden.conferencePaper = ["place", "pages"];
  index.hidden.thesis = ["place"];
  index.hidden.book = ["place", "pages"];
  index.hidden.bookSection = ["place", "pages"];
  index.hidden.patent = ["url"];

  return [
    {
      id: "writing",
      label: uiText("写作精简", "Writing Lean"),
      description: uiText("只保留写作最常看的字段。", "Keep only the fields most useful while writing."),
      preset: writing,
    },
    {
      id: "research",
      label: uiText("研究整理", "Research Organize"),
      description: uiText("兼顾阅读、检索和笔记整理。", "Balanced for reading, retrieval, and note organization."),
      preset: research,
    },
    {
      id: "index",
      label: uiText("索引查询", "Index Query"),
      description: uiText("偏向 Dataview / Bases 索引和筛选。", "Optimized for Dataview and Bases indexing."),
      preset: index,
    },
  ];
}

function getMetadataSchemeId(preset: MetadataPreset): MetadataSchemeId | "custom" {
  const target = JSON.stringify(cloneMetadataPreset(preset));
  for (const scheme of createMetadataSchemes()) {
    if (JSON.stringify(cloneMetadataPreset(scheme.preset)) === target) {
      return scheme.id;
    }
  }
  return "custom";
}

function applyMetadataScheme(schemeId: MetadataSchemeId) {
  const scheme = createMetadataSchemes().find((item) => item.id === schemeId);
  if (!scheme) {
    return;
  }
  const state = ensureMetadataPresetEditorState();
  state.draftPreset = cloneMetadataPreset(scheme.preset);
  state.onlyConfigured = true;
  state.sortSelectedFirst = true;
  _metadataPlacementFilter = "all";
  rerenderFieldStudio("metadata");
  showHint(uiText(`已切换到${scheme.label}。`, `${scheme.label} applied.`));
}

function renderMetadataSchemeButtons() {
  const state = ensureMetadataPresetEditorState();
  const activeId = getMetadataSchemeId(state.draftPreset);
  return `
    <div class="field-studio__buttonRow">
      ${createMetadataSchemes()
        .map(
          (scheme) => `
            <button
              type="button"
              class="field-studio__button${activeId === scheme.id ? " field-studio__button--primary" : ""}"
              data-fs-action="metadata-scheme"
              data-fs-scheme="${escapeHTML(scheme.id)}"
              title="${escapeHTML(scheme.description)}"
            >${escapeHTML(scheme.label)}</button>
          `,
        )
        .join("")}
      ${
        activeId === "custom"
          ? `<span class="field-studio__chip field-studio__chip--accent">${escapeHTML(
              uiText("当前：自定义", "Current: Custom"),
            )}</span>`
          : ""
      }
    </div>
  `;
}

function buildMetadataSummaryText() {
  const state = ensureMetadataPresetEditorState();
  const counts = getMetadataPlacementCounts(state.sectionKey);
  const schemeId = getMetadataSchemeId(state.draftPreset);
  const schemeLabel =
    schemeId === "custom"
      ? uiText("自定义", "Custom")
      : createMetadataSchemes().find((item) => item.id === schemeId)?.label ||
        uiText("自定义", "Custom");
  const visibleCount = getConfiguredFields(
    state.draftPreset.visible,
    state.sectionKey,
  ).length;
  const hiddenCount = getConfiguredFields(
    state.draftPreset.hidden,
    state.sectionKey,
  ).length;
  return uiText(
    `方案 ${schemeLabel}，栏目 ${getMetadataPresetSectionLabel(
      state.sectionKey,
    )}，属性 ${visibleCount}，隐藏 ${hiddenCount}，未输出 ${counts.none}。`,
    `Scheme ${schemeLabel}; Section ${getMetadataPresetSectionLabel(
      state.sectionKey,
    )}; Visible ${visibleCount}; Hidden ${hiddenCount}; Omitted ${counts.none}.`,
  );
}

function getFilteredMetadataRows() {
  const state = ensureMetadataPresetEditorState();
  const searchText = cleanInline(state.searchText).toLowerCase();
  const allFieldKeys = getMetadataFieldCatalog(state.sectionKey, state.draftPreset);
  const rows = allFieldKeys
    .map((fieldKey, index) => ({
      fieldKey,
      index,
      placement: getMetadataPlacement(state.sectionKey, fieldKey),
      origin: getMetadataFieldOriginLabel(fieldKey),
      derived: DERIVED_METADATA_FIELD_KEYS.includes(fieldKey),
    }))
    .filter((entry) => {
      if (
        _metadataPlacementFilter !== "all" &&
        entry.placement !== _metadataPlacementFilter
      ) {
        return false;
      }
      if (_metadataPlacementFilter === "all" && state.onlyConfigured) {
        if (entry.placement === "none") {
          return false;
        }
      }
      if (!searchText) {
        return true;
      }
      return `${getFieldLabel(entry.fieldKey)} ${entry.fieldKey} ${entry.origin}`
        .toLowerCase()
        .includes(searchText);
    });

  if (state.sortSelectedFirst) {
    rows.sort((left, right) => {
      const leftSelected = left.placement !== "none";
      const rightSelected = right.placement !== "none";
      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }
      return left.index - right.index;
    });
  }

  return rows;
}

function renderMetadataPlacementButtons(
  fieldKey: string,
  placement: MetadataPlacement,
) {
  return `
    <div class="field-studio__segmented">
      ${(
        [
          { key: "none", label: uiText("不输出", "Omit") },
          { key: "visible", label: uiText("属性", "Visible") },
          { key: "hidden", label: uiText("隐藏", "Hidden") },
        ] as { key: MetadataPlacement; label: string }[]
      )
        .map(
          (option) => `
            <button
              type="button"
              class="field-studio__segment${placement === option.key ? " is-active" : ""}"
              data-fs-action="metadata-placement"
              data-fs-field-key="${escapeHTML(fieldKey)}"
              data-fs-placement="${escapeHTML(option.key)}"
            >${escapeHTML(option.label)}</button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderMetadataList() {
  const rows = getFilteredMetadataRows();
  if (!rows.length) {
    return `<div class="field-studio__empty">${escapeHTML(
      uiText("当前过滤条件下没有可显示的字段。", "No fields match the current filters."),
    )}</div>`;
  }

  return `
    <div class="field-studio__metaList">
      <div class="field-studio__metaHead">
        <div>${escapeHTML(uiText("字段", "Field"))}</div>
        <div>${escapeHTML(uiText("来源", "Source"))}</div>
        <div>${escapeHTML(uiText("去向", "Route"))}</div>
      </div>
      ${rows
        .map((entry) => {
          const active = entry.placement !== "none";
          return `
            <div class="field-studio__metaRow${active ? " is-active" : ""}">
              <div class="field-studio__metaInfo">
                <div class="field-studio__metaInline">
                  <div class="field-studio__metaLabel">${escapeHTML(
                    getFieldLabel(entry.fieldKey),
                  )}</div>
                  <code class="field-studio__metaKey">${escapeHTML(
                    entry.fieldKey,
                  )}</code>
                </div>
              </div>
              <div class="field-studio__metaOrigin">
                ${renderChipHTML(
                  entry.origin,
                  entry.derived ? "accent" : "muted",
                )}
              </div>
              <div class="field-studio__metaRoute">
                ${renderMetadataPlacementButtons(entry.fieldKey, entry.placement)}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderMetadataPanel() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  const counts = getMetadataPlacementCounts(state.sectionKey);
  const rows = getFilteredMetadataRows();
  const schemeId = getMetadataSchemeId(state.draftPreset);
  const activeSchemeLabel =
    schemeId === "custom"
      ? uiText("自定义", "Custom")
      : createMetadataSchemes().find((item) => item.id === schemeId)?.label ||
        uiText("自定义", "Custom");
  return `
    <section class="field-studio__panel">
      <div class="field-studio__panelInner field-studio__panelInner--dense">
        <section class="field-studio__card field-studio__card--control">
          <div class="field-studio__panelHeader">
            <div class="field-studio__panelHeaderMain">
              <h3 class="field-studio__panelTitle">${escapeHTML(
                uiText("字段分流", "Field Routing"),
              )}</h3>
              <div class="field-studio__subtleText">${escapeHTML(
                buildMetadataSummaryText(),
              )}</div>
            </div>
            <div class="field-studio__chipList">
              ${renderChipHTML(uiText(`方案 ${activeSchemeLabel}`, `Scheme ${activeSchemeLabel}`), "accent")}
              ${renderChipHTML(
                uiText(`属性 ${counts.visible}`, `Visible ${counts.visible}`),
                "success",
              )}
              ${renderChipHTML(
                uiText(`隐藏 ${counts.hidden}`, `Hidden ${counts.hidden}`),
                "muted",
              )}
              ${renderChipHTML(uiText(`未输出 ${counts.none}`, `Omitted ${counts.none}`))}
              ${renderChipHTML(
                uiText(
                  `覆盖 ${getMetadataOverrideCount()}`,
                  `Overrides ${getMetadataOverrideCount()}`,
                ),
                "accent",
              )}
            </div>
          </div>

          <div class="field-studio__actionStrip">
            <div class="field-studio__actionCluster">
              <div class="field-studio__inlineLabel">${escapeHTML(
                uiText("功能方案", "Functional schemes"),
              )}</div>
              ${renderMetadataSchemeButtons()}
            </div>
            <div class="field-studio__actionCluster">
              <button type="button" class="field-studio__button field-studio__button--primary" data-fs-action="metadata-save">${escapeHTML(
                uiText("保存当前调整", "Save current changes"),
              )}</button>
              <button type="button" class="field-studio__button" data-fs-action="metadata-resync">${escapeHTML(
                uiText("重同步", "Resync"),
              )}</button>
            </div>
          </div>

          <div class="field-studio__formGrid field-studio__formGrid--metadataCompact">
            <div class="field-studio__field">
              <label for="field-studio-metadata-section">${escapeHTML(
                uiText("文献类型", "Item type"),
              )}</label>
              <select id="field-studio-metadata-section" class="field-studio__select">
                ${METADATA_SECTION_OPTIONS.map(
                  (sectionKey) => `
                    <option value="${escapeHTML(sectionKey)}" ${selectedAttr(
                      sectionKey === state.sectionKey,
                    )}>
                      ${escapeHTML(getMetadataPresetSectionLabel(sectionKey))}
                    </option>
                  `,
                ).join("")}
              </select>
            </div>
            <label class="field-studio__checkboxLine field-studio__checkboxLine--compact">
              <input
                id="field-studio-metadata-only-configured"
                type="checkbox"
                ${checkedAttr(state.onlyConfigured)}
              />
              <span>${escapeHTML(
                uiText("只看常用 / 已配置字段", "Show curated / configured fields only"),
              )}</span>
            </label>
            <label class="field-studio__checkboxLine field-studio__checkboxLine--compact">
              <input
                id="field-studio-metadata-selected-first"
                type="checkbox"
                ${checkedAttr(state.sortSelectedFirst)}
              />
              <span>${escapeHTML(
                uiText("已配置优先排序", "Configured first"),
              )}</span>
            </label>
          </div>

          <div class="field-studio__subtleText">${escapeHTML(
            uiText(
              "主界面只放常用方案和常用字段；命名快照与高级操作放到下面折叠区。",
              "The main view focuses on common schemes and common fields; named snapshots and advanced actions live below.",
            ),
          )}</div>

          <div class="field-studio__inputRow field-studio__inputRow--metadata">
            <div class="field-studio__field field-studio__field--search">
              <input
                id="field-studio-metadata-search"
                class="field-studio__input"
                type="search"
                value="${escapeHTML(state.searchText)}"
                aria-label="${escapeHTML(uiText("搜索字段", "Search fields"))}"
                placeholder="${escapeHTML(uiText("搜索字段名、key 或来源", "Search label, key, or source"))}"
              />
            </div>
            <div class="field-studio__segmentedBar">
              ${renderFilterButtonHTML({
                action: "metadata-filter",
                label: uiText(`全部 ${counts.all}`, `All ${counts.all}`),
                active: _metadataPlacementFilter === "all",
                dataAttrs: { "fs-filter": "all" },
              })}
              ${renderFilterButtonHTML({
                action: "metadata-filter",
                label: uiText(`属性 ${counts.visible}`, `Visible ${counts.visible}`),
                active: _metadataPlacementFilter === "visible",
                dataAttrs: { "fs-filter": "visible" },
              })}
              ${renderFilterButtonHTML({
                action: "metadata-filter",
                label: uiText(`隐藏 ${counts.hidden}`, `Hidden ${counts.hidden}`),
                active: _metadataPlacementFilter === "hidden",
                dataAttrs: { "fs-filter": "hidden" },
              })}
              ${renderFilterButtonHTML({
                action: "metadata-filter",
                label: uiText(`未输出 ${counts.none}`, `Omitted ${counts.none}`),
                active: _metadataPlacementFilter === "none",
                dataAttrs: { "fs-filter": "none" },
              })}
            </div>
          </div>

          <div class="field-studio__actionStrip field-studio__actionStrip--meta">
            <div class="field-studio__resultMeta">${escapeHTML(
              uiText(`当前显示 ${rows.length} 项`, `${rows.length} fields shown`),
            )}</div>
          </div>

          <details class="field-studio__details">
            <summary class="field-studio__detailsSummary">${escapeHTML(
              uiText("高级：命名快照与重置", "Advanced: named snapshots and reset"),
            )}</summary>
            <div class="field-studio__detailsBody">
              <div class="field-studio__formGrid field-studio__formGrid--metadata">
                <div class="field-studio__field">
                  <label for="field-studio-metadata-preset">${escapeHTML(
                    uiText("快照", "Snapshot"),
                  )}</label>
                  <select id="field-studio-metadata-preset" class="field-studio__select">
                    ${library.presets
                      .map(
                        (profile) => `
                          <option value="${escapeHTML(profile.id)}" ${selectedAttr(
                            profile.id === state.presetId,
                          )}>
                            ${escapeHTML(profile.name)}
                          </option>
                        `,
                      )
                      .join("")}
                  </select>
                </div>
                <div class="field-studio__field">
                  <label for="field-studio-metadata-name">${escapeHTML(
                    uiText("快照名称", "Snapshot name"),
                  )}</label>
                  <input
                    id="field-studio-metadata-name"
                    class="field-studio__input"
                    type="text"
                    value="${escapeHTML(state.presetName)}"
                    placeholder="${escapeHTML(uiText("例如：论文写作版", "Example: Writing snapshot"))}"
                  />
                </div>
              </div>
              <div class="field-studio__buttonRow">
                <button type="button" class="field-studio__button" data-fs-action="metadata-duplicate">${escapeHTML(
                  uiText("另存快照", "Save as snapshot"),
                )}</button>
                <button type="button" class="field-studio__button" data-fs-action="metadata-reset">${escapeHTML(
                  uiText("重置草稿", "Reset draft"),
                )}</button>
                <button type="button" class="field-studio__button" data-fs-action="metadata-delete"${library.presets.length <= 1 ? " disabled" : ""}>${escapeHTML(
                  uiText("删除当前快照", "Delete current snapshot"),
                )}</button>
              </div>
            </div>
          </details>
        </section>

        <section class="field-studio__card field-studio__card--table">
          ${renderMetadataList()}
        </section>
      </div>
    </section>
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
        <div class="field-studio field-studio--dense">
          ${tab === "frontmatter" ? renderFrontmatterPanel() : renderMetadataPanel()}
        </div>
      `,
    );
  } catch (error) {
    ztoolkit.log("[Obsidian Bridge] field studio render failed", tab, error);
    root.textContent = cleanInline(String((error as Error)?.stack || (error as Error)?.message || error || "Unknown error"));
  }
}

async function switchMetadataPreset(presetId: string) {
  const library = getMetadataPresetLibrary();
  const nextProfile = library.presets.find((profile) => profile.id === presetId);
  if (!nextProfile) {
    return;
  }
  library.activePresetId = nextProfile.id;
  persistMetadataPresetLibrary(library);
  setMetadataPresetEditorState({
    ...ensureMetadataPresetEditorState(),
    presetId: nextProfile.id,
    presetName: nextProfile.name,
    sectionKey: metadataPresetEditorState?.sectionKey || "default",
    onlyConfigured: true,
    draftPreset: cloneMetadataPreset(nextProfile.preset),
  });
  _fieldStudioCallbacks?.refreshObsidianPrefsUI();
  _fieldStudioCallbacks?.markPreviewStale();
  rerenderFieldStudio("metadata");
  await resyncAllManagedObsidianNotes(
    getString("obsidian-metadataPreset-switch-finished", {
      args: { name: nextProfile.name },
    }),
  );
}

function bindFieldStudioEvents(tab: FieldStudioTab) {
  const doc = getFieldStudioDocument(tab);
  if (!doc) {
    return;
  }

  doc.querySelectorAll<HTMLElement>("[data-fs-action='apply-frontmatter-preset']").forEach((button) => {
    button.onclick = () => {
      applyFrontmatterPreset(cleanInline(button.dataset.fsPresetId || ""));
    };
  });

  doc.querySelectorAll<HTMLElement>("[data-fs-action='frontmatter-bulk']").forEach((button) => {
    button.onclick = () => {
      const mode = cleanInline(button.dataset.fsMode || "") as
        | "recommended"
        | "all"
        | "none";
      if (!mode) {
        return;
      }
      applyFrontmatterBulk(mode);
    };
  });

  doc.querySelectorAll<HTMLElement>("[data-fs-action='frontmatter-group']").forEach((button) => {
    button.onclick = () => {
      const groupKey = cleanInline(
        button.dataset.fsGroup || "",
      ) as ManagedFrontmatterOptionGroup;
      if (!groupKey) {
        return;
      }
      setFrontmatterGroupEnabled(groupKey, button.dataset.fsEnabled === "true");
    };
  });

  doc.querySelectorAll<HTMLElement>("[data-fs-action='frontmatter-filter']").forEach((button) => {
    button.onclick = () => {
      _frontmatterVisibilityFilter =
        (button.dataset.fsFilter as FrontmatterVisibilityFilter) || "all";
      rerenderFieldStudio("frontmatter");
    };
  });

  doc
    .querySelectorAll<HTMLInputElement>("[data-fs-frontmatter-key]")
    .forEach((input) => {
      input.onchange = () => {
        const current = new Set(getManagedFrontmatterFields());
        const fieldKey = cleanInline(
          input.dataset.fsFrontmatterKey || "",
        ) as ManagedFrontmatterOptionKey;
        if (!fieldKey) {
          return;
        }
        if (input.checked) {
          current.add(fieldKey);
        } else {
          current.delete(fieldKey);
        }
        applyFrontmatterSelection(Array.from(current));
      };
    });

  const frontmatterSearch = doc.getElementById(
    "field-studio-frontmatter-search",
  ) as HTMLInputElement | null;
  if (frontmatterSearch) {
    frontmatterSearch.oninput = () => {
      _frontmatterSearchText = frontmatterSearch.value;
      rerenderFieldStudio("frontmatter");
    };
  }

  doc.querySelectorAll<HTMLElement>("[data-fs-action='metadata-scheme']").forEach((button) => {
    button.onclick = () => {
      const schemeId = cleanInline(button.dataset.fsScheme || "") as MetadataSchemeId;
      if (!schemeId) {
        return;
      }
      applyMetadataScheme(schemeId);
    };
  });

  const metadataPreset = doc.getElementById(
    "field-studio-metadata-preset",
  ) as HTMLSelectElement | null;
  if (metadataPreset) {
    metadataPreset.onchange = async () => {
      await switchMetadataPreset(metadataPreset.value);
    };
  }

  const metadataName = doc.getElementById(
    "field-studio-metadata-name",
  ) as HTMLInputElement | null;
  if (metadataName) {
    metadataName.oninput = () => {
      ensureMetadataPresetEditorState().presetName = metadataName.value;
    };
  }

  const metadataSection = doc.getElementById(
    "field-studio-metadata-section",
  ) as HTMLSelectElement | null;
  if (metadataSection) {
    metadataSection.onchange = () => {
      ensureMetadataPresetEditorState().sectionKey =
        metadataSection.value as MetadataSectionKey;
      _metadataPlacementFilter = "all";
      rerenderFieldStudio("metadata");
    };
  }

  const metadataSearch = doc.getElementById(
    "field-studio-metadata-search",
  ) as HTMLInputElement | null;
  if (metadataSearch) {
    metadataSearch.oninput = () => {
      ensureMetadataPresetEditorState().searchText = metadataSearch.value;
      rerenderFieldStudio("metadata");
    };
  }

  const onlyConfigured = doc.getElementById(
    "field-studio-metadata-only-configured",
  ) as HTMLInputElement | null;
  if (onlyConfigured) {
    onlyConfigured.onchange = () => {
      ensureMetadataPresetEditorState().onlyConfigured = onlyConfigured.checked;
      rerenderFieldStudio("metadata");
    };
  }

  const selectedFirst = doc.getElementById(
    "field-studio-metadata-selected-first",
  ) as HTMLInputElement | null;
  if (selectedFirst) {
    selectedFirst.onchange = () => {
      ensureMetadataPresetEditorState().sortSelectedFirst = selectedFirst.checked;
      rerenderFieldStudio("metadata");
    };
  }

  doc.querySelectorAll<HTMLElement>("[data-fs-action='metadata-filter']").forEach((button) => {
    button.onclick = () => {
      _metadataPlacementFilter =
        (button.dataset.fsFilter as MetadataPlacementFilter) || "all";
      rerenderFieldStudio("metadata");
    };
  });

  doc.querySelectorAll<HTMLElement>("[data-fs-action='metadata-placement']").forEach((button) => {
    button.onclick = () => {
      const state = ensureMetadataPresetEditorState();
      const fieldKey = cleanInline(button.dataset.fsFieldKey || "");
      const placement =
        (button.dataset.fsPlacement as MetadataPlacement) || "none";
      setDraftMetadataFieldPlacement(state.sectionKey, fieldKey, placement);
      rerenderFieldStudio("metadata");
    };
  });

  const bindAsyncAction = (action: string, handler: () => Promise<void>) => {
    doc
      .querySelector<HTMLElement>(`[data-fs-action='${action}']`)
      ?.addEventListener("click", () => {
        void handler();
      });
  };

  bindAsyncAction("metadata-save", async () => {
    await saveObsidianMetadataPreset();
    _fieldStudioCallbacks?.markPreviewStale();
    rerenderFieldStudio("metadata");
  });
  bindAsyncAction("metadata-duplicate", async () => {
    await duplicateObsidianMetadataPreset();
    _fieldStudioCallbacks?.markPreviewStale();
    rerenderFieldStudio("metadata");
  });
  bindAsyncAction("metadata-reset", async () => {
    await resetObsidianMetadataPreset();
    rerenderFieldStudio("metadata");
  });
  bindAsyncAction("metadata-delete", async () => {
    await deleteObsidianMetadataPreset();
    _fieldStudioCallbacks?.markPreviewStale();
    rerenderFieldStudio("metadata");
  });
  bindAsyncAction("metadata-resync", async () => {
    await resyncAllManagedObsidianNotes();
    _fieldStudioCallbacks?.refreshObsidianPrefsUI();
    _fieldStudioCallbacks?.markPreviewStale();
  });
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
    "chrome,centerscreen,resizable,status,dialog=no",
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
        } catch (error) {
          return false;
        }
      }, 50, 3000),
    ]);
  } catch (error) {
    ztoolkit.log("[Obsidian Bridge] field studio init timeout", error);
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
        DEFAULT_CHILD_NOTE_TAGS.join(", "),
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
    dialogData.tags || DEFAULT_CHILD_NOTE_TAGS.join(", "),
  );
  setPref(OBSIDIAN_CHILD_NOTE_PROMPT_SELECT_PREF, dialogData.promptSelect);
  options.refreshObsidianPrefsUI();
  options.markPreviewStale();
  showHint(uiText("子笔记规则已保存。", "Child note rules saved."));
}
