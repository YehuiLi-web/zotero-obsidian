import { getString } from "../../../../utils/locale";
import { showHint } from "../../../../utils/hint";
import { cleanInline } from "../../../obsidian/shared";
import {
  cloneDefaultMetadataPreset,
  cloneMetadataPreset,
  DERIVED_METADATA_FIELD_KEYS,
  getConfiguredFields,
  getFieldLabel,
  getMetadataFieldCatalog,
  getMetadataPresetLibrary,
  getMetadataPresetSectionLabel,
  METADATA_SECTION_OPTIONS,
  persistMetadataPresetLibrary,
} from "../../../obsidian/settings";
import { resyncAllManagedObsidianNotes } from "../../../obsidian/sync";
import type {
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
import {
  checkedAttr,
  escapeHTML,
  getFieldStudioCallbacks,
  renderChipHTML,
  renderFilterButtonHTML,
  renderMetricHTML,
  rerenderFieldStudio,
  selectedAttr,
} from "./fieldStudioWindow";

type MetadataPlacement = "none" | "visible" | "hidden";
type MetadataPlacementFilter = "all" | MetadataPlacement;
type MetadataPlacementCounts = Record<MetadataPlacement | "all", number>;
type MetadataSchemeId = "writing" | "research" | "index";
type MetadataSchemeDefinition = {
  id: MetadataSchemeId;
  label: string;
  description: string;
  preset: MetadataPreset;
};

let _metadataPlacementFilter: MetadataPlacementFilter = "all";

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

export function renderMetadataPanel() {
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

export async function switchMetadataPreset(presetId: string) {
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
  getFieldStudioCallbacks()?.refreshObsidianPrefsUI();
  getFieldStudioCallbacks()?.markPreviewStale();
  rerenderFieldStudio("metadata");
  await resyncAllManagedObsidianNotes(
    getString("obsidian-metadataPreset-switch-finished", {
      args: { name: nextProfile.name },
    }),
  );
}

export function bindMetadataEvents(doc: Document) {
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
    getFieldStudioCallbacks()?.markPreviewStale();
    rerenderFieldStudio("metadata");
  });
  bindAsyncAction("metadata-duplicate", async () => {
    await duplicateObsidianMetadataPreset();
    getFieldStudioCallbacks()?.markPreviewStale();
    rerenderFieldStudio("metadata");
  });
  bindAsyncAction("metadata-reset", async () => {
    await resetObsidianMetadataPreset();
    rerenderFieldStudio("metadata");
  });
  bindAsyncAction("metadata-delete", async () => {
    await deleteObsidianMetadataPreset();
    getFieldStudioCallbacks()?.markPreviewStale();
    rerenderFieldStudio("metadata");
  });
  bindAsyncAction("metadata-resync", async () => {
    await resyncAllManagedObsidianNotes();
    getFieldStudioCallbacks()?.refreshObsidianPrefsUI();
    getFieldStudioCallbacks()?.markPreviewStale();
  });
}
