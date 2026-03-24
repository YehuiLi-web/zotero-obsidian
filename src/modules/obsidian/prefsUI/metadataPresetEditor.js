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
exports.initMetadataPresetEditorCallbacks = initMetadataPresetEditorCallbacks;
exports.ensureMetadataPresetEditorState = ensureMetadataPresetEditorState;
exports.renderMetadataPresetFieldList = renderMetadataPresetFieldList;
exports.renderMetadataPresetEditor = renderMetadataPresetEditor;
exports.saveObsidianMetadataPreset = saveObsidianMetadataPreset;
exports.resetObsidianMetadataPreset = resetObsidianMetadataPreset;
const hint_1 = require("../../../utils/hint");
const locale_1 = require("../../../utils/locale");
const settings_1 = require("../settings");
const sync_1 = require("../sync");
const shared_1 = require("../shared");
const state_1 = require("./state");
const helpers_1 = require("./helpers");
let _refreshObsidianPrefsUI = null;
function initMetadataPresetEditorCallbacks(cbs) {
    _refreshObsidianPrefsUI = cbs.refreshObsidianPrefsUI;
}
function refreshObsidianPrefsUI() {
    _refreshObsidianPrefsUI === null || _refreshObsidianPrefsUI === void 0 ? void 0 : _refreshObsidianPrefsUI();
}
function ensureMetadataPresetEditorState() {
    const library = (0, settings_1.getMetadataPresetLibrary)();
    const activeProfile = (0, settings_1.getActiveMetadataPresetProfile)(library);
    if (!state_1.metadataPresetEditorState ||
        !library.presets.some((profile) => profile.id === (state_1.metadataPresetEditorState === null || state_1.metadataPresetEditorState === void 0 ? void 0 : state_1.metadataPresetEditorState.presetId))) {
        (0, state_1.setMetadataPresetEditorState)({
            presetId: activeProfile.id,
            presetName: activeProfile.name,
            sectionKey: "default",
            searchText: "",
            sortSelectedFirst: false,
            draftPreset: (0, settings_1.cloneMetadataPreset)(activeProfile.preset),
        });
    }
    return state_1.metadataPresetEditorState;
}
function getMetadataPresetFieldState(sectionKey, fieldKey) {
    const state = ensureMetadataPresetEditorState();
    return {
        visible: (state.draftPreset.visible[sectionKey] || []).includes(fieldKey),
        hidden: (state.draftPreset.hidden[sectionKey] || []).includes(fieldKey),
    };
}
function setDraftMetadataField(sectionKey, fieldKey, target, enabled) {
    const state = ensureMetadataPresetEditorState();
    const values = new Set(state.draftPreset[target][sectionKey] || []);
    if (enabled) {
        values.add(fieldKey);
    }
    else {
        values.delete(fieldKey);
    }
    state.draftPreset[target][sectionKey] = Array.from(values);
}
function renderMetadataPresetFieldList() {
    const state = ensureMetadataPresetEditorState();
    const container = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_FIELD_LIST_ID);
    const summary = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_SUMMARY_ID);
    if (!container || !summary) {
        return;
    }
    const searchText = (0, shared_1.cleanInline)(state.searchText).toLowerCase();
    const allFieldKeys = (0, settings_1.getMetadataFieldCatalog)(state.sectionKey, state.draftPreset);
    const fieldEntries = allFieldKeys
        .filter((fieldKey) => {
        if (!searchText) {
            return true;
        }
        return `${(0, settings_1.getFieldLabel)(fieldKey)} ${fieldKey}`
            .toLowerCase()
            .includes(searchText);
    })
        .map((fieldKey, index) => {
        const fieldState = getMetadataPresetFieldState(state.sectionKey, fieldKey);
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
    summary.textContent = (0, helpers_1.uiText)(`当前配置：${state.presetName || (0, locale_1.getString)("obsidian-metadataPreset-untitledName")}；当前栏目：${(0, settings_1.getMetadataPresetSectionLabel)(state.sectionKey)}；字段 ${fieldKeys.length} / ${allFieldKeys.length}；Metadata ${visibleCount}；隐藏 ${hiddenCount}。`, `Preset: ${state.presetName || (0, locale_1.getString)("obsidian-metadataPreset-untitledName")}; Section: ${(0, settings_1.getMetadataPresetSectionLabel)(state.sectionKey)}; Fields ${fieldKeys.length} / ${allFieldKeys.length}; Metadata ${visibleCount}; Hidden ${hiddenCount}.`);
    container.replaceChildren();
    const doc = container.ownerDocument;
    const details = (0, helpers_1.createPrefHTMLElement)(doc, "details");
    details.className = "ob-bridge-metadataPicker";
    details.open = isExpanded;
    details.addEventListener("toggle", () => {
        container.dataset.expanded = details.open ? "true" : "false";
    });
    const pickerSummary = (0, helpers_1.createPrefHTMLElement)(doc, "summary");
    pickerSummary.className = "ob-bridge-metadataPicker__summary";
    const pickerTitle = (0, helpers_1.createPrefHTMLElement)(doc, "span");
    pickerTitle.className = "ob-bridge-metadataPicker__title";
    pickerTitle.textContent = (0, helpers_1.uiText)("字段选择器", "Field Picker");
    const pickerMeta = (0, helpers_1.createPrefHTMLElement)(doc, "span");
    pickerMeta.className = "ob-bridge-metadataPicker__meta";
    pickerMeta.textContent = (0, helpers_1.uiText)(`${(0, settings_1.getMetadataPresetSectionLabel)(state.sectionKey)} · ${fieldKeys.length} / ${allFieldKeys.length} 项${state.sortSelectedFirst ? " · 已选优先" : ""}`, `${(0, settings_1.getMetadataPresetSectionLabel)(state.sectionKey)} · ${fieldKeys.length} / ${allFieldKeys.length} items${state.sortSelectedFirst ? " · Selected first" : ""}`);
    pickerSummary.title = (0, helpers_1.uiText)("右键可切换已选字段优先排序", "Right-click to toggle selected-first sorting");
    pickerSummary.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const nextState = ensureMetadataPresetEditorState();
        nextState.sortSelectedFirst = !nextState.sortSelectedFirst;
        renderMetadataPresetFieldList();
        (0, hint_1.showHint)(nextState.sortSelectedFirst
            ? "已切换为已选优先排序。"
            : "已恢复默认字段顺序。");
    });
    pickerSummary.appendChild(pickerTitle);
    pickerSummary.appendChild(pickerMeta);
    details.appendChild(pickerSummary);
    const panel = (0, helpers_1.createPrefHTMLElement)(doc, "div");
    panel.className = "ob-bridge-metadataPicker__panel";
    const header = (0, helpers_1.createPrefHTMLElement)(doc, "div");
    header.className = "ob-bridge-metadataPicker__head";
    for (const title of [
        (0, helpers_1.uiText)("字段", "Field"),
        (0, helpers_1.uiText)("元数据", "Meta"),
        (0, helpers_1.uiText)("隐藏", "Hidden"),
    ]) {
        const cell = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        cell.textContent = title;
        header.appendChild(cell);
    }
    panel.appendChild(header);
    const list = (0, helpers_1.createPrefHTMLElement)(doc, "div");
    list.className = "ob-bridge-metadataPicker__list";
    for (const entry of fieldEntries) {
        const { fieldKey, fieldState } = entry;
        const row = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        row.className = "ob-bridge-metadataField";
        if (fieldState.visible || fieldState.hidden) {
            row.dataset.active = "true";
        }
        row.title = `${(0, settings_1.getFieldLabel)(fieldKey)} (${fieldKey})`;
        const infoCell = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        infoCell.className = "ob-bridge-metadataField__info";
        const labelCell = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        labelCell.className = "ob-bridge-metadataField__label";
        labelCell.textContent = (0, settings_1.getFieldLabel)(fieldKey);
        labelCell.title = (0, settings_1.getFieldLabel)(fieldKey);
        infoCell.appendChild(labelCell);
        const keyCell = (0, helpers_1.createPrefHTMLElement)(doc, "code");
        keyCell.className = "ob-bridge-metadataField__key";
        keyCell.textContent = fieldKey;
        keyCell.title = fieldKey;
        infoCell.appendChild(keyCell);
        row.appendChild(infoCell);
        for (const target of ["visible", "hidden"]) {
            const checkboxCell = (0, helpers_1.createPrefHTMLElement)(doc, "div");
            checkboxCell.className = "ob-bridge-metadataField__toggle";
            const checkbox = (0, helpers_1.createPrefHTMLElement)(doc, "input");
            checkbox.type = "checkbox";
            checkbox.checked = fieldState[target];
            checkbox.addEventListener("change", () => {
                setDraftMetadataField(state.sectionKey, fieldKey, target, checkbox.checked);
                renderMetadataPresetFieldList();
            });
            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);
        }
        list.appendChild(row);
    }
    if (!fieldKeys.length) {
        const empty = (0, helpers_1.createPrefHTMLElement)(doc, "div");
        empty.className = "ob-bridge-metadataPicker__empty";
        empty.textContent = (0, helpers_1.uiText)("没有匹配到字段。", "No matching fields.");
        list.appendChild(empty);
    }
    panel.appendChild(list);
    details.appendChild(panel);
    container.appendChild(details);
}
function renderMetadataPresetEditor() {
    const library = (0, settings_1.getMetadataPresetLibrary)();
    const state = ensureMetadataPresetEditorState();
    const presetSelect = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_SELECT_ID);
    const nameInput = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_NAME_INPUT_ID);
    const sectionSelect = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_SECTION_ID);
    const searchInput = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_SEARCH_ID);
    const saveButton = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_SAVE_BUTTON_ID);
    const duplicateButton = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_DUPLICATE_BUTTON_ID);
    const deleteButton = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_DELETE_BUTTON_ID);
    const resetButton = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_RESET_BUTTON_ID);
    const resyncButton = (0, helpers_1.getPrefElement)(settings_1.OBSIDIAN_METADATA_PRESET_RESYNC_BUTTON_ID);
    if (!presetSelect ||
        !nameInput ||
        !sectionSelect ||
        !searchInput ||
        !saveButton ||
        !duplicateButton ||
        !deleteButton ||
        !resetButton ||
        !resyncButton) {
        return;
    }
    presetSelect.replaceChildren();
    for (const profile of library.presets) {
        const option = (0, helpers_1.createPrefHTMLElement)(presetSelect.ownerDocument, "option");
        option.value = profile.id;
        option.textContent = profile.name;
        presetSelect.appendChild(option);
    }
    presetSelect.value = state.presetId;
    presetSelect.onchange = () => __awaiter(this, void 0, void 0, function* () {
        const nextPresetId = (0, shared_1.cleanInline)(presetSelect.value);
        const nextProfile = library.presets.find((profile) => profile.id === nextPresetId);
        if (!nextProfile) {
            return;
        }
        library.activePresetId = nextProfile.id;
        (0, settings_1.persistMetadataPresetLibrary)(library);
        (0, state_1.setMetadataPresetEditorState)(Object.assign(Object.assign({}, ensureMetadataPresetEditorState()), { presetId: nextProfile.id, presetName: nextProfile.name, draftPreset: (0, settings_1.cloneMetadataPreset)(nextProfile.preset) }));
        renderMetadataPresetEditor();
        yield (0, sync_1.resyncAllManagedObsidianNotes)((0, locale_1.getString)("obsidian-metadataPreset-switch-finished", {
            args: {
                name: nextProfile.name,
            },
        }));
    });
    nameInput.value = state.presetName;
    nameInput.placeholder = (0, helpers_1.uiText)("例如：简单配置", "Example: Simple Preset");
    nameInput.oninput = () => {
        ensureMetadataPresetEditorState().presetName = nameInput.value;
    };
    sectionSelect.replaceChildren();
    for (const sectionKey of settings_1.METADATA_SECTION_OPTIONS) {
        const option = (0, helpers_1.createPrefHTMLElement)(sectionSelect.ownerDocument, "option");
        option.value = sectionKey;
        option.textContent = (0, settings_1.getMetadataPresetSectionLabel)(sectionKey);
        sectionSelect.appendChild(option);
    }
    sectionSelect.value = state.sectionKey;
    sectionSelect.onchange = () => {
        ensureMetadataPresetEditorState().sectionKey =
            sectionSelect.value;
        renderMetadataPresetFieldList();
    };
    searchInput.value = state.searchText;
    searchInput.placeholder = (0, helpers_1.uiText)("按字段名或 Key 过滤", "Filter by label or key");
    let searchDebounceTimer = null;
    searchInput.oninput = () => {
        ensureMetadataPresetEditorState().searchText = searchInput.value;
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        searchDebounceTimer = setTimeout(() => {
            renderMetadataPresetFieldList();
        }, 150);
    };
    saveButton.onclick = () => __awaiter(this, void 0, void 0, function* () { return saveObsidianMetadataPreset(); });
    duplicateButton.onclick = () => __awaiter(this, void 0, void 0, function* () { return duplicateObsidianMetadataPreset(); });
    deleteButton.onclick = () => __awaiter(this, void 0, void 0, function* () { return deleteObsidianMetadataPreset(); });
    resetButton.onclick = () => __awaiter(this, void 0, void 0, function* () { return resetObsidianMetadataPreset(); });
    resyncButton.onclick = () => __awaiter(this, void 0, void 0, function* () { return (0, sync_1.resyncAllManagedObsidianNotes)(); });
    deleteButton.disabled = library.presets.length <= 1;
    renderMetadataPresetFieldList();
}
function saveObsidianMetadataPreset() {
    return __awaiter(this, void 0, void 0, function* () {
        const library = (0, settings_1.getMetadataPresetLibrary)();
        const state = ensureMetadataPresetEditorState();
        const profile = library.presets.find((item) => item.id === state.presetId);
        if (!profile) {
            throw new Error("Metadata preset does not exist.");
        }
        profile.name = (0, shared_1.cleanInline)(state.presetName) || profile.name;
        profile.preset = (0, settings_1.cloneMetadataPreset)(state.draftPreset);
        (0, settings_1.persistMetadataPresetLibrary)(library);
        (0, state_1.setMetadataPresetEditorState)(Object.assign(Object.assign({}, state), { presetName: profile.name, draftPreset: (0, settings_1.cloneMetadataPreset)(profile.preset) }));
        refreshObsidianPrefsUI();
        yield (0, sync_1.resyncAllManagedObsidianNotes)((0, locale_1.getString)("obsidian-metadataPreset-save-finished", {
            args: {
                name: profile.name,
            },
        }));
    });
}
function duplicateObsidianMetadataPreset() {
    return __awaiter(this, void 0, void 0, function* () {
        const library = (0, settings_1.getMetadataPresetLibrary)();
        const state = ensureMetadataPresetEditorState();
        const presetName = (0, shared_1.cleanInline)(state.presetName) ||
            (0, locale_1.getString)("obsidian-metadataPreset-newName");
        const newProfile = {
            id: (0, settings_1.createMetadataPresetID)(presetName),
            name: presetName,
            preset: (0, settings_1.cloneMetadataPreset)(state.draftPreset),
        };
        library.presets.push(newProfile);
        library.activePresetId = newProfile.id;
        (0, settings_1.persistMetadataPresetLibrary)(library);
        (0, state_1.setMetadataPresetEditorState)(Object.assign(Object.assign({}, state), { presetId: newProfile.id, presetName: newProfile.name, draftPreset: (0, settings_1.cloneMetadataPreset)(newProfile.preset) }));
        refreshObsidianPrefsUI();
        yield (0, sync_1.resyncAllManagedObsidianNotes)((0, locale_1.getString)("obsidian-metadataPreset-saveAs-finished", {
            args: {
                name: newProfile.name,
            },
        }));
    });
}
function deleteObsidianMetadataPreset() {
    return __awaiter(this, void 0, void 0, function* () {
        const library = (0, settings_1.getMetadataPresetLibrary)();
        const state = ensureMetadataPresetEditorState();
        if (library.presets.length <= 1) {
            (0, hint_1.showHint)((0, locale_1.getString)("obsidian-metadataPreset-delete-lastBlocked"));
            return;
        }
        const confirmIndex = (0, helpers_1.promptChoice)({
            title: (0, helpers_1.uiText)("删除预设", "Delete Preset"),
            text: (0, helpers_1.uiText)(`确定要删除预设「${state.presetName}」吗？删除后将切换到下一个可用预设。`, `Delete preset "${state.presetName}"? The next available preset will become active.`),
            buttons: [(0, helpers_1.uiText)("删除", "Delete"), (0, helpers_1.uiText)("取消", "Cancel")],
            defaultButton: 1,
        });
        if (confirmIndex !== 0) {
            return;
        }
        library.presets = library.presets.filter((profile) => profile.id !== state.presetId);
        library.activePresetId = library.presets[0].id;
        (0, settings_1.persistMetadataPresetLibrary)(library);
        const nextProfile = (0, settings_1.getActiveMetadataPresetProfile)(library);
        (0, state_1.setMetadataPresetEditorState)(Object.assign(Object.assign({}, state), { presetId: nextProfile.id, presetName: nextProfile.name, draftPreset: (0, settings_1.cloneMetadataPreset)(nextProfile.preset) }));
        refreshObsidianPrefsUI();
        yield (0, sync_1.resyncAllManagedObsidianNotes)((0, locale_1.getString)("obsidian-metadataPreset-delete-finished", {
            args: {
                name: nextProfile.name,
            },
        }));
    });
}
function resetObsidianMetadataPreset() {
    return __awaiter(this, void 0, void 0, function* () {
        const state = ensureMetadataPresetEditorState();
        state.draftPreset = (0, settings_1.cloneDefaultMetadataPreset)();
        if (!(0, shared_1.cleanInline)(state.presetName)) {
            state.presetName = (0, locale_1.getString)("obsidian-metadataPreset-defaultName");
        }
        refreshObsidianPrefsUI();
        (0, hint_1.showHint)((0, locale_1.getString)("obsidian-metadataPreset-reset-finished"));
    });
}
