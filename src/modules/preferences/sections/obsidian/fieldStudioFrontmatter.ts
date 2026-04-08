import { showHint } from "../../../../utils/hint";
import { cleanInline } from "../../../obsidian/shared";
import {
  getManagedFrontmatterFields,
  getManagedFrontmatterPresetLabel,
  FIXED_MANAGED_FRONTMATTER_KEYS,
  MANAGED_FRONTMATTER_OPTIONS,
  MANAGED_FRONTMATTER_PRESETS,
  resolveManagedFrontmatterPreset,
  setManagedFrontmatterFields,
} from "../../../obsidian/settings";
import type {
  ManagedFrontmatterOptionGroup,
  ManagedFrontmatterOptionKey,
} from "../../../obsidian/types";
import { uiText } from "./helpers";
import {
  checkedAttr,
  escapeHTML,
  getFieldStudioCallbacks,
  getFieldStudioDocument,
  renderChipHTML,
  renderFilterButtonHTML,
  renderFrontmatterKeyList,
  rerenderFieldStudio,
} from "./fieldStudioWindow";

type FrontmatterVisibilityFilter = "all" | "selected";

let _frontmatterSearchText = "";
let _frontmatterVisibilityFilter: FrontmatterVisibilityFilter = "all";

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
  getFieldStudioCallbacks()?.refreshObsidianPrefsUI();
  getFieldStudioCallbacks()?.markPreviewStale();
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

export function renderFrontmatterPanel() {
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
                  "这部分始终保留，仅用于双 key 桥接识别。",
                  "Always kept for dual-key bridge identity.",
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

export function bindFrontmatterEvents(doc: Document) {
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
}
