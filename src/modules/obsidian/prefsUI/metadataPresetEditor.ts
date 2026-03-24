import { showHint } from "../../../utils/hint";
import { getString } from "../../../utils/locale";
import {
  cloneDefaultMetadataPreset,
  cloneMetadataPreset,
  createMetadataPresetID,
  getActiveMetadataPresetProfile,
  getFieldLabel,
  getMetadataFieldCatalog,
  getMetadataPresetLibrary,
  getMetadataPresetSectionLabel,
  type MetadataPresetProfile,
  type MetadataSectionKey,
  METADATA_SECTION_OPTIONS,
  OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID,
  OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID,
  OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID,
  OBSIDIAN_METADATA_PRESET_SEARCH_ID,
  OBSIDIAN_METADATA_PRESET_SECTION_ID,
  OBSIDIAN_METADATA_PRESET_SELECT_ID,
  OBSIDIAN_METADATA_PRESET_SUMMARY_ID,
  persistMetadataPresetLibrary,
} from "../settings";
import { resyncAllManagedObsidianNotes } from "../sync";
import { cleanInline } from "../shared";
import {
  metadataPresetEditorState,
  setMetadataPresetEditorState,
} from "./state";
import {
  createPrefHTMLElement,
  getPrefElement,
  promptChoice,
  uiText,
} from "./helpers";

let _refreshObsidianPrefsUI: (() => void) | null = null;

export function initMetadataPresetEditorCallbacks(cbs: {
  refreshObsidianPrefsUI: () => void;
}) {
  _refreshObsidianPrefsUI = cbs.refreshObsidianPrefsUI;
}

function refreshObsidianPrefsUI() {
  _refreshObsidianPrefsUI?.();
}

export function ensureMetadataPresetEditorState() {
  const library = getMetadataPresetLibrary();
  const activeProfile = getActiveMetadataPresetProfile(library);
  if (
    !metadataPresetEditorState ||
    !library.presets.some(
      (profile) => profile.id === metadataPresetEditorState?.presetId,
    )
  ) {
    setMetadataPresetEditorState({
      presetId: activeProfile.id,
      presetName: activeProfile.name,
      sectionKey: "default",
      searchText: "",
      sortSelectedFirst: false,
      draftPreset: cloneMetadataPreset(activeProfile.preset),
    });
  }
  return metadataPresetEditorState!;
}

function getMetadataPresetFieldState(
  sectionKey: MetadataSectionKey,
  fieldKey: string,
) {
  const state = ensureMetadataPresetEditorState();
  return {
    visible: (state.draftPreset.visible[sectionKey] || []).includes(fieldKey),
    hidden: (state.draftPreset.hidden[sectionKey] || []).includes(fieldKey),
  };
}

function setDraftMetadataField(
  sectionKey: MetadataSectionKey,
  fieldKey: string,
  target: "visible" | "hidden",
  enabled: boolean,
) {
  const state = ensureMetadataPresetEditorState();
  const values = new Set(state.draftPreset[target][sectionKey] || []);
  if (enabled) {
    values.add(fieldKey);
  } else {
    values.delete(fieldKey);
  }
  state.draftPreset[target][sectionKey] = Array.from(values);
}

export function renderMetadataPresetFieldList() {
  const state = ensureMetadataPresetEditorState();
  const container = getPrefElement<HTMLDivElement>(
    OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID,
  );
  const summary = getPrefElement<HTMLElement>(
    OBSIDIAN_METADATA_PRESET_SUMMARY_ID,
  );
  if (!container || !summary) {
    return;
  }

  const searchText = cleanInline(state.searchText).toLowerCase();
  const allFieldKeys = getMetadataFieldCatalog(
    state.sectionKey,
    state.draftPreset,
  );
  const fieldEntries = allFieldKeys
    .filter((fieldKey) => {
      if (!searchText) {
        return true;
      }
      return `${getFieldLabel(fieldKey)} ${fieldKey}`
        .toLowerCase()
        .includes(searchText);
    })
    .map((fieldKey, index) => {
      const fieldState = getMetadataPresetFieldState(
        state.sectionKey,
        fieldKey,
      );
      return {
        fieldKey,
        index,
        fieldState,
        selected: fieldState.visible || fieldState.hidden,
      };
    });
  if (state.sortSelectedFirst) {
    fieldEntries.sort((a, b) => {
      if (a.selected !== b.selected) {
        return a.selected ? -1 : 1;
      }
      return a.index - b.index;
    });
  }
  const fieldKeys = fieldEntries.map((entry) => entry.fieldKey);
  const visibleCount = (state.draftPreset.visible[state.sectionKey] || [])
    .length;
  const hiddenCount = (state.draftPreset.hidden[state.sectionKey] || []).length;
  const isExpanded = container.dataset.expanded !== "false";

  summary.textContent = uiText(
    `当前配置：${state.presetName || getString("obsidian-metadataPreset-untitledName")}；当前栏目：${getMetadataPresetSectionLabel(
      state.sectionKey,
    )}；字段 ${fieldKeys.length} / ${allFieldKeys.length}；Metadata ${visibleCount}；隐藏 ${hiddenCount}。`,
    `Preset: ${state.presetName || getString("obsidian-metadataPreset-untitledName")}; Section: ${getMetadataPresetSectionLabel(
      state.sectionKey,
    )}; Fields ${fieldKeys.length} / ${allFieldKeys.length}; Metadata ${visibleCount}; Hidden ${hiddenCount}.`,
  );

  container.replaceChildren();
  const doc = container.ownerDocument;
  const details = createPrefHTMLElement(doc, "details");
  details.className = "ob-bridge-metadataPicker";
  details.open = isExpanded;
  details.addEventListener("toggle", () => {
    container.dataset.expanded = details.open ? "true" : "false";
  });

  const pickerSummary = createPrefHTMLElement(doc, "summary");
  pickerSummary.className = "ob-bridge-metadataPicker__summary";
  const pickerTitle = createPrefHTMLElement(doc, "span");
  pickerTitle.className = "ob-bridge-metadataPicker__title";
  pickerTitle.textContent = uiText("字段选择器", "Field Picker");
  const pickerMeta = createPrefHTMLElement(doc, "span");
  pickerMeta.className = "ob-bridge-metadataPicker__meta";
  pickerMeta.textContent = uiText(
    `${getMetadataPresetSectionLabel(state.sectionKey)} · ${fieldKeys.length} / ${allFieldKeys.length} 项${
      state.sortSelectedFirst ? " · 已选优先" : ""
    }`,
    `${getMetadataPresetSectionLabel(state.sectionKey)} · ${fieldKeys.length} / ${allFieldKeys.length} items${
      state.sortSelectedFirst ? " · Selected first" : ""
    }`,
  );
  pickerSummary.title = uiText(
    "右键可切换已选字段优先排序",
    "Right-click to toggle selected-first sorting",
  );
  pickerSummary.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const nextState = ensureMetadataPresetEditorState();
    nextState.sortSelectedFirst = !nextState.sortSelectedFirst;
    renderMetadataPresetFieldList();
    showHint(
      nextState.sortSelectedFirst
        ? "已切换为已选优先排序。"
        : "已恢复默认字段顺序。",
    );
  });
  pickerSummary.appendChild(pickerTitle);
  pickerSummary.appendChild(pickerMeta);
  details.appendChild(pickerSummary);

  const panel = createPrefHTMLElement(doc, "div");
  panel.className = "ob-bridge-metadataPicker__panel";

  const header = createPrefHTMLElement(doc, "div");
  header.className = "ob-bridge-metadataPicker__head";
  for (const title of [
    uiText("字段", "Field"),
    uiText("元数据", "Meta"),
    uiText("隐藏", "Hidden"),
  ]) {
    const cell = createPrefHTMLElement(doc, "div");
    cell.textContent = title;
    header.appendChild(cell);
  }
  panel.appendChild(header);

  const list = createPrefHTMLElement(doc, "div");
  list.className = "ob-bridge-metadataPicker__list";

  for (const entry of fieldEntries) {
    const { fieldKey, fieldState } = entry;
    const row = createPrefHTMLElement(doc, "div");
    row.className = "ob-bridge-metadataField";
    if (fieldState.visible || fieldState.hidden) {
      row.dataset.active = "true";
    }
    row.title = `${getFieldLabel(fieldKey)} (${fieldKey})`;

    const infoCell = createPrefHTMLElement(doc, "div");
    infoCell.className = "ob-bridge-metadataField__info";

    const labelCell = createPrefHTMLElement(doc, "div");
    labelCell.className = "ob-bridge-metadataField__label";
    labelCell.textContent = getFieldLabel(fieldKey);
    labelCell.title = getFieldLabel(fieldKey);
    infoCell.appendChild(labelCell);

    const keyCell = createPrefHTMLElement(doc, "code");
    keyCell.className = "ob-bridge-metadataField__key";
    keyCell.textContent = fieldKey;
    keyCell.title = fieldKey;
    infoCell.appendChild(keyCell);

    row.appendChild(infoCell);

    for (const target of ["visible", "hidden"] as const) {
      const checkboxCell = createPrefHTMLElement(doc, "div");
      checkboxCell.className = "ob-bridge-metadataField__toggle";
      const checkbox = createPrefHTMLElement(doc, "input");
      checkbox.type = "checkbox";
      checkbox.checked = fieldState[target];
      checkbox.addEventListener("change", () => {
        setDraftMetadataField(
          state.sectionKey,
          fieldKey,
          target,
          checkbox.checked,
        );
        renderMetadataPresetFieldList();
      });
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);
    }

    list.appendChild(row);
  }

  if (!fieldKeys.length) {
    const empty = createPrefHTMLElement(doc, "div");
    empty.className = "ob-bridge-metadataPicker__empty";
    empty.textContent = uiText("没有匹配到字段。", "No matching fields.");
    list.appendChild(empty);
  }

  panel.appendChild(list);
  details.appendChild(panel);
  container.appendChild(details);
}

export function renderMetadataPresetEditor() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  const presetSelect = getPrefElement<HTMLSelectElement>(
    OBSIDIAN_METADATA_PRESET_SELECT_ID,
  );
  const nameInput = getPrefElement<HTMLInputElement>(
    OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID,
  );
  const sectionSelect = getPrefElement<HTMLSelectElement>(
    OBSIDIAN_METADATA_PRESET_SECTION_ID,
  );
  const searchInput = getPrefElement<HTMLInputElement>(
    OBSIDIAN_METADATA_PRESET_SEARCH_ID,
  );
  const saveButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID,
  );
  const duplicateButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID,
  );
  const deleteButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID,
  );
  const resetButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID,
  );
  const resyncButton = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID,
  );
  if (
    !presetSelect ||
    !nameInput ||
    !sectionSelect ||
    !searchInput ||
    !saveButton ||
    !duplicateButton ||
    !deleteButton ||
    !resetButton ||
    !resyncButton
  ) {
    return;
  }

  presetSelect.replaceChildren();
  for (const profile of library.presets) {
    const option = createPrefHTMLElement(presetSelect.ownerDocument, "option");
    option.value = profile.id;
    option.textContent = profile.name;
    presetSelect.appendChild(option);
  }
  presetSelect.value = state.presetId;
  presetSelect.onchange = async () => {
    const nextPresetId = cleanInline(presetSelect.value);
    const nextProfile = library.presets.find(
      (profile) => profile.id === nextPresetId,
    );
    if (!nextProfile) {
      return;
    }
    library.activePresetId = nextProfile.id;
    persistMetadataPresetLibrary(library);
    setMetadataPresetEditorState({
      ...ensureMetadataPresetEditorState(),
      presetId: nextProfile.id,
      presetName: nextProfile.name,
      draftPreset: cloneMetadataPreset(nextProfile.preset),
    });
    renderMetadataPresetEditor();
    await resyncAllManagedObsidianNotes(
      getString("obsidian-metadataPreset-switch-finished", {
        args: {
          name: nextProfile.name,
        },
      }),
    );
  };

  nameInput.value = state.presetName;
  nameInput.placeholder = uiText("例如：简单配置", "Example: Simple Preset");
  nameInput.oninput = () => {
    ensureMetadataPresetEditorState().presetName = nameInput.value;
  };

  sectionSelect.replaceChildren();
  for (const sectionKey of METADATA_SECTION_OPTIONS) {
    const option = createPrefHTMLElement(sectionSelect.ownerDocument, "option");
    option.value = sectionKey;
    option.textContent = getMetadataPresetSectionLabel(sectionKey);
    sectionSelect.appendChild(option);
  }
  sectionSelect.value = state.sectionKey;
  sectionSelect.onchange = () => {
    ensureMetadataPresetEditorState().sectionKey =
      sectionSelect.value as MetadataSectionKey;
    renderMetadataPresetFieldList();
  };

  searchInput.value = state.searchText;
  searchInput.placeholder = uiText(
    "按字段名或 Key 过滤",
    "Filter by label or key",
  );
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  searchInput.oninput = () => {
    ensureMetadataPresetEditorState().searchText = searchInput.value;
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(() => {
      renderMetadataPresetFieldList();
    }, 150);
  };

  saveButton.onclick = async () => saveObsidianMetadataPreset();
  duplicateButton.onclick = async () => duplicateObsidianMetadataPreset();
  deleteButton.onclick = async () => deleteObsidianMetadataPreset();
  resetButton.onclick = async () => resetObsidianMetadataPreset();
  resyncButton.onclick = async () => resyncAllManagedObsidianNotes();
  deleteButton.disabled = library.presets.length <= 1;

  renderMetadataPresetFieldList();
}

export async function saveObsidianMetadataPreset() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  const profile = library.presets.find((item) => item.id === state.presetId);
  if (!profile) {
    throw new Error("Metadata preset does not exist.");
  }
  profile.name = cleanInline(state.presetName) || profile.name;
  profile.preset = cloneMetadataPreset(state.draftPreset);
  persistMetadataPresetLibrary(library);
  setMetadataPresetEditorState({
    ...state,
    presetName: profile.name,
    draftPreset: cloneMetadataPreset(profile.preset),
  });
  refreshObsidianPrefsUI();
  await resyncAllManagedObsidianNotes(
    getString("obsidian-metadataPreset-save-finished", {
      args: {
        name: profile.name,
      },
    }),
  );
}

async function duplicateObsidianMetadataPreset() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  const presetName =
    cleanInline(state.presetName) ||
    getString("obsidian-metadataPreset-newName");
  const newProfile: MetadataPresetProfile = {
    id: createMetadataPresetID(presetName),
    name: presetName,
    preset: cloneMetadataPreset(state.draftPreset),
  };
  library.presets.push(newProfile);
  library.activePresetId = newProfile.id;
  persistMetadataPresetLibrary(library);
  setMetadataPresetEditorState({
    ...state,
    presetId: newProfile.id,
    presetName: newProfile.name,
    draftPreset: cloneMetadataPreset(newProfile.preset),
  });
  refreshObsidianPrefsUI();
  await resyncAllManagedObsidianNotes(
    getString("obsidian-metadataPreset-saveAs-finished", {
      args: {
        name: newProfile.name,
      },
    }),
  );
}

async function deleteObsidianMetadataPreset() {
  const library = getMetadataPresetLibrary();
  const state = ensureMetadataPresetEditorState();
  if (library.presets.length <= 1) {
    showHint(getString("obsidian-metadataPreset-delete-lastBlocked"));
    return;
  }
  const confirmIndex = promptChoice({
    title: uiText("删除预设", "Delete Preset"),
    text: uiText(
      `确定要删除预设「${state.presetName}」吗？删除后将切换到下一个可用预设。`,
      `Delete preset "${state.presetName}"? The next available preset will become active.`,
    ),
    buttons: [uiText("删除", "Delete"), uiText("取消", "Cancel")],
    defaultButton: 1,
  });
  if (confirmIndex !== 0) {
    return;
  }
  library.presets = library.presets.filter(
    (profile) => profile.id !== state.presetId,
  );
  library.activePresetId = library.presets[0].id;
  persistMetadataPresetLibrary(library);
  const nextProfile = getActiveMetadataPresetProfile(library);
  setMetadataPresetEditorState({
    ...state,
    presetId: nextProfile.id,
    presetName: nextProfile.name,
    draftPreset: cloneMetadataPreset(nextProfile.preset),
  });
  refreshObsidianPrefsUI();
  await resyncAllManagedObsidianNotes(
    getString("obsidian-metadataPreset-delete-finished", {
      args: {
        name: nextProfile.name,
      },
    }),
  );
}

export async function resetObsidianMetadataPreset() {
  const state = ensureMetadataPresetEditorState();
  state.draftPreset = cloneDefaultMetadataPreset();
  if (!cleanInline(state.presetName)) {
    state.presetName = getString("obsidian-metadataPreset-defaultName");
  }
  refreshObsidianPrefsUI();
  showHint(getString("obsidian-metadataPreset-reset-finished"));
}
