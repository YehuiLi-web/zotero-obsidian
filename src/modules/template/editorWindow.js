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
exports.showTemplateEditor = showTemplateEditor;
const YAML = require("yamljs");
const package_json_1 = require("../../../package.json");
const hint_1 = require("../../utils/hint");
const itemPicker_1 = require("../../utils/itemPicker");
const locale_1 = require("../../utils/locale");
const wait_1 = require("../../utils/wait");
const str_1 = require("../../utils/str");
const monacoEditor_1 = require("./monacoEditor");
function showTemplateEditor() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        if (!addon.data.template.editor.window ||
            Components.utils.isDeadWrapper(addon.data.template.editor.window) ||
            addon.data.template.editor.window.closed) {
            const windowArgs = {
                _initPromise: Zotero.Promise.defer(),
            };
            const _window = Zotero.getMainWindow().openDialog(`chrome://${package_json_1.config.addonRef}/content/templateEditor.xhtml`, `${package_json_1.config.addonRef}-templateEditor`, `chrome,centerscreen,resizable,status,dialog=no`, windowArgs);
            addon.data.template.editor.window = _window;
            yield windowArgs._initPromise.promise;
            updateData();
            addon.data.template.editor.tableHelper = new ztoolkit.VirtualizedTable(_window)
                .setContainerId("table-container")
                .setProp({
                id: "templates-table",
                // Do not use setLocale, as it modifies the Zotero.Intl.strings
                // Set locales directly to columns
                columns: [
                    {
                        dataKey: "type",
                        label: "templateEditor-templateType",
                        width: 60,
                        fixedWidth: true,
                    },
                    {
                        dataKey: "name",
                        label: "templateEditor-templateName",
                        fixedWidth: false,
                    },
                ].map((column) => Object.assign(column, {
                    label: (0, locale_1.getString)(column.label),
                })),
                showHeader: true,
                multiSelect: false,
                staticColumns: true,
                disableFontSizeScaling: true,
            })
                .setProp("getRowCount", () => addon.data.template.editor.templates.length)
                .setProp("getRowData", getRowData)
                .setProp("onSelectionChange", (selection) => {
                updateEditor();
                updatePreview();
            })
                .setProp("onKeyDown", (event) => {
                if (event.key == "Delete" ||
                    (Zotero.isMac && event.key == "Backspace")) {
                    addon.api.template.removeTemplate(getSelectedTemplateName());
                    refresh(true);
                    return false;
                }
                return true;
            })
                .setProp("getRowString", (index) => addon.data.template.editor.templates[index] || "")
                .setProp("renderItem", (index, selection, oldElem, columns) => {
                let div;
                if (oldElem) {
                    div = oldElem;
                    div.innerHTML = "";
                }
                else {
                    div = document.createElement("div");
                    div.className = "row";
                }
                div.classList.toggle("selected", selection.isSelected(index));
                div.classList.toggle("focused", selection.focused == index);
                const rowData = getRowData(index);
                for (const column of columns) {
                    const span = document.createElement("span");
                    // @ts-ignore - className property exists on column
                    span.className = `cell ${column === null || column === void 0 ? void 0 : column.className}`;
                    const cellData = rowData[column.dataKey];
                    span.textContent = cellData;
                    if (column.dataKey === "type") {
                        span.style.backgroundColor = getRowLabelColor(cellData);
                        span.style.borderRadius = "4px";
                        span.style.paddingInline = "4px";
                        span.style.marginInline = "2px -2px";
                        span.style.textAlign = "center";
                        span.textContent = (0, locale_1.getString)("templateEditor-templateDisplayType", cellData);
                    }
                    div.append(span);
                }
                return div;
            })
                .render();
            (_a = _window.document
                .querySelector("#templateType-help")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", (ev) => {
                new addon.data.ztoolkit.Guide().highlight(_window.document, {
                    title: "About Template Types",
                    description: ["system", "item", "text"]
                        .map((type) => `${(0, locale_1.getString)("templateEditor-templateDisplayType", type)}: ${(0, locale_1.getString)("templateEditor-templateHelp", type)}`)
                        .join("\n"),
                    onNextClick: () => {
                        Zotero.launchURL("https://github.com/windingwind/zotero-better-notes/blob/master/docs/about-note-template.md");
                    },
                    showButtons: ["next", "close"],
                    nextBtnText: "Learn more",
                    closeBtnText: "OK",
                    position: "center",
                });
            });
            (_b = _window.document
                .querySelector("#create")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", (ev) => {
                createTemplate();
            });
            (_c = _window.document.querySelector("#help")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", (ev) => {
                Zotero.launchURL("https://github.com/windingwind/zotero-better-notes/blob/master/docs/about-note-template.md");
            });
            (_d = _window.document.querySelector("#more")) === null || _d === void 0 ? void 0 : _d.addEventListener("click", (ev) => {
                Zotero.launchURL("https://github.com/windingwind/zotero-better-notes/discussions/categories/note-templates");
            });
            (_e = _window.document.querySelector("#save")) === null || _e === void 0 ? void 0 : _e.addEventListener("click", (ev) => {
                saveSelectedTemplate();
            });
            (_f = _window.document
                .querySelector("#delete")) === null || _f === void 0 ? void 0 : _f.addEventListener("click", (ev) => {
                deleteSelectedTemplate();
            });
            (_g = _window.document
                .querySelector("#reset")) === null || _g === void 0 ? void 0 : _g.addEventListener("click", (ev) => {
                resetSelectedTemplate();
            });
            (_h = _window.document
                .querySelector("#share")) === null || _h === void 0 ? void 0 : _h.addEventListener("click", (ev) => {
                shareSelectedTemplate();
            });
            (_j = _window.document
                .querySelector("#importClipboard")) === null || _j === void 0 ? void 0 : _j.addEventListener("click", (ev) => {
                addon.hooks.onImportTemplateFromClipboard();
            });
            (_k = _window.document
                .querySelector("#importNote")) === null || _k === void 0 ? void 0 : _k.addEventListener("click", (ev) => {
                importNoteTemplate();
            });
            (_l = _window.document
                .querySelector("#backup")) === null || _l === void 0 ? void 0 : _l.addEventListener("click", (ev) => {
                backupTemplates();
            });
            (_m = _window.document
                .querySelector("#restore")) === null || _m === void 0 ? void 0 : _m.addEventListener("click", (ev) => {
                restoreTemplates(_window);
            });
            (_o = _window.document
                .querySelector("#editor-type")) === null || _o === void 0 ? void 0 : _o.addEventListener("command", (ev) => {
                var _a;
                updateSnippets((_a = ev.target) === null || _a === void 0 ? void 0 : _a.value);
            });
            // An ugly hack to make the editor refresh exposed
            _window.refresh = refresh;
            (_p = addon.data.template.editor.window) === null || _p === void 0 ? void 0 : _p.focus();
            const editorWin = _window.document.querySelector("#editor")
                .contentWindow;
            yield (0, wait_1.waitUtilAsync)(() => editorWin === null || editorWin === void 0 ? void 0 : editorWin.loadMonaco);
            const isDark = editorWin === null || editorWin === void 0 ? void 0 : editorWin.matchMedia("(prefers-color-scheme: dark)").matches;
            const { monaco, editor } = yield editorWin.loadMonaco({
                language: "javascript",
                theme: "vs-" + (isDark ? "dark" : "light"),
            });
            // Register custom language for template syntax
            const success = (0, monacoEditor_1.initializeTemplateEditor)(monaco, editor, isDark);
            if (!success) {
                ztoolkit.log("Failed to register template language, falling back to default");
            }
            addon.data.template.editor.monaco = monaco;
            addon.data.template.editor.editor = editor;
            yield initFormats();
        }
    });
}
function refresh() {
    return __awaiter(this, arguments, void 0, function* (force = false) {
        const win = addon.data.template.editor.window;
        if (!win) {
            return;
        }
        if (!force && isTemplateNotSaved()) {
            const save = win.confirm((0, locale_1.getString)("alert-templateEditor-unsaved"));
            if (save) {
                saveSelectedTemplate();
                return;
            }
        }
        updateData();
        updateTable();
        updateEditor();
        yield updatePreview();
    });
}
function getRowData(index) {
    const rowData = addon.data.template.editor.templates[index];
    if (!rowData) {
        return {
            name: "",
            type: "unknown",
        };
    }
    let templateType = "unknown";
    let templateDisplayName = rowData;
    if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(rowData)) {
        templateType = "system";
        templateDisplayName = (0, locale_1.getString)("templateEditor-templateDisplayName", 
        // Exclude the first and last character, which are '[' and ']'
        rowData.slice(1, -1));
    }
    else if (rowData.toLowerCase().startsWith("[item]")) {
        templateType = "item";
        templateDisplayName = rowData.slice(6);
    }
    else if (rowData.toLowerCase().startsWith("[text]")) {
        templateType = "text";
        templateDisplayName = rowData.slice(6);
    }
    return {
        name: templateDisplayName,
        type: templateType,
    };
}
function getRowLabelColor(type) {
    switch (type) {
        case "system":
            return "var(--accent-yellow)";
        case "item":
            return "var(--accent-green)";
        case "text":
            return "var(--accent-azure)";
        default:
            return "var(--accent-red)";
    }
}
function isTemplateNotSaved() {
    var _a, _b, _c;
    const name = getSelectedTemplateName();
    if (!name) {
        return false;
    }
    const text = (_a = addon.data.template.editor.editor) === null || _a === void 0 ? void 0 : _a.getValue();
    const savedText = addon.api.template.getTemplateText(name);
    if (text !== savedText) {
        return true;
    }
    const { type, name: displayName } = getRowData(getSelectedIndex());
    const templateType = (_b = addon.data.template.editor.window) === null || _b === void 0 ? void 0 : _b.document.querySelector("#editor-type");
    const templateName = (_c = addon.data.template.editor.window) === null || _c === void 0 ? void 0 : _c.document.querySelector("#editor-name");
    return type !== templateType.value || displayName !== templateName.value;
}
function updateData() {
    addon.data.template.editor.templates = addon.api.template.getTemplateKeys();
}
function updateTable(selectId) {
    var _a;
    (_a = addon.data.template.editor.tableHelper) === null || _a === void 0 ? void 0 : _a.render(selectId);
}
function updateEditor() {
    const name = getSelectedTemplateName();
    const { type, name: displayName } = getRowData(getSelectedIndex());
    const templateText = addon.api.template.getTemplateText(name);
    const win = addon.data.template.editor.window;
    if (!win) {
        return;
    }
    const templateType = win.document.querySelector("#editor-type");
    const templateName = win.document.querySelector("#editor-name");
    const editor = win === null || win === void 0 ? void 0 : win.document.getElementById("editor");
    const saveTemplate = win === null || win === void 0 ? void 0 : win.document.getElementById("save");
    const deleteTemplate = win === null || win === void 0 ? void 0 : win.document.getElementById("delete");
    const resetTemplate = win === null || win === void 0 ? void 0 : win.document.getElementById("reset");
    const shareTemplate = win === null || win === void 0 ? void 0 : win.document.getElementById("share");
    const formats = win === null || win === void 0 ? void 0 : win.document.getElementById("formats-container");
    const snippets = win === null || win === void 0 ? void 0 : win.document.getElementById("snippets-container");
    if (!name) {
        templateType.value = "unknown";
        templateType.setAttribute("disabled", "true");
        templateName.value = "";
        templateName.setAttribute("disabled", "true");
        editor.hidden = true;
        saveTemplate === null || saveTemplate === void 0 ? void 0 : saveTemplate.setAttribute("disabled", "true");
        deleteTemplate === null || deleteTemplate === void 0 ? void 0 : deleteTemplate.setAttribute("disabled", "true");
        deleteTemplate && (deleteTemplate.hidden = false);
        shareTemplate === null || shareTemplate === void 0 ? void 0 : shareTemplate.setAttribute("disabled", "true");
        resetTemplate && (resetTemplate.hidden = true);
        formats.hidden = true;
        snippets.hidden = true;
    }
    else {
        templateType.value = type;
        templateName.value = displayName;
        if (!addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name)) {
            templateType.removeAttribute("disabled");
            templateName.removeAttribute("disabled");
            deleteTemplate && (deleteTemplate.hidden = false);
            resetTemplate && (resetTemplate.hidden = true);
        }
        else {
            templateType.setAttribute("disabled", "true");
            templateName.setAttribute("disabled", "true");
            deleteTemplate === null || deleteTemplate === void 0 ? void 0 : deleteTemplate.setAttribute("disabled", "true");
            deleteTemplate && (deleteTemplate.hidden = true);
            resetTemplate && (resetTemplate.hidden = false);
        }
        addon.data.template.editor.editor.setValue(templateText);
        editor.hidden = false;
        saveTemplate === null || saveTemplate === void 0 ? void 0 : saveTemplate.removeAttribute("disabled");
        deleteTemplate === null || deleteTemplate === void 0 ? void 0 : deleteTemplate.removeAttribute("disabled");
        shareTemplate === null || shareTemplate === void 0 ? void 0 : shareTemplate.removeAttribute("disabled");
        formats.hidden = false;
        snippets.hidden = false;
        updateSnippets((type === "system"
            ? name.slice(1, -1)
            : type));
    }
}
function initFormats() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const container = (_a = addon.data.template.editor.window) === null || _a === void 0 ? void 0 : _a.document.querySelector("#formats-container");
        if (!container) {
            return;
        }
        container.innerHTML = "";
        // Add formats to the container, with each format as a button
        for (const format of formatStore) {
            const button = document.createElement("div");
            button.classList.add("format", format.name);
            button.style.backgroundImage = `url("chrome://${package_json_1.config.addonRef}/content/icons/editor/${format.name}.svg")`;
            button.dataset.l10nId = `${package_json_1.config.addonRef}-format-${format.name}`;
            button.addEventListener("click", () => {
                const { editor, monaco } = addon.data.template.editor;
                const selection = editor.getSelection();
                const range = new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);
                const textTemplate = format.code;
                const source = editor.getModel().getValueInRange(range) ||
                    format.defaultText ||
                    "text";
                const text = textTemplate.replace("${text}", source);
                editor.executeEdits("", [
                    {
                        range,
                        text,
                        forceMoveMarkers: true,
                    },
                ]);
                // Keep the selection after inserting the format
                const textBeforeReplace = textTemplate.split("${text}")[0];
                const textBeforeLines = textBeforeReplace.split("\n");
                const textLines = source.split("\n");
                // Calculate the new range
                const startLineNumber = selection.startLineNumber + textBeforeLines.length - 1;
                const startColumn = textBeforeLines.length === 1
                    ? selection.startColumn + textBeforeReplace.length
                    : textBeforeLines.slice(-1)[0].length + 1;
                const endLineNumber = startLineNumber + textLines.length - 1;
                const endColumn = textLines.length === 1
                    ? startColumn + source.length
                    : textLines.slice(-1)[0].length + 1;
                const newRange = new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn);
                editor.setSelection(newRange);
                // If editor does not contain a line start with // @use-markdown, insert it
                if (!editor
                    .getModel()
                    .getLinesContent()
                    .some((line) => line.startsWith("// @use-markdown"))) {
                    editor.executeEdits("", [
                        {
                            range: new monaco.Range(1, 1, 1, 1),
                            text: "// @use-markdown\n",
                            forceMoveMarkers: true,
                        },
                    ]);
                }
            });
            container.appendChild(button);
        }
    });
}
function updateSnippets(type) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const container = (_a = addon.data.template.editor.window) === null || _a === void 0 ? void 0 : _a.document.querySelector("#snippets-container");
        if (!container) {
            return;
        }
        container.innerHTML = "";
        const snippets = (snippetsStore[type] || []).concat(snippetsStore.global);
        if (!snippets) {
            return;
        }
        // Add snippets to the container, with each snippet as a button
        // Dragging the button to the editor will insert the snippet
        for (const snippet of snippets) {
            const button = document.createElement("span");
            button.classList.add("snippet", snippet.type);
            button.dataset.l10nId = `${package_json_1.config.addonRef}-snippet-${snippet.name}`;
            button.addEventListener("click", () => {
                const { editor, monaco } = addon.data.template.editor;
                const selection = editor.getSelection();
                const range = new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);
                const text = snippet.code;
                editor.executeEdits("", [
                    {
                        range,
                        text,
                        forceMoveMarkers: true,
                    },
                ]);
                // Select the inserted text, should compute the new range, as the text can be multi-line
                const newRange = new monaco.Range(selection.startLineNumber, selection.startColumn, selection.startLineNumber + text.split("\n").length - 1, text.split("\n").slice(-1)[0].length + 1);
                editor.setSelection(newRange);
            });
            container.appendChild(button);
        }
    });
}
function updatePreview() {
    return __awaiter(this, void 0, void 0, function* () {
        const name = getSelectedTemplateName();
        const html = (0, str_1.xhtmlEscape)(yield addon.api.template.renderTemplatePreview(name));
        const win = addon.data.template.editor.window;
        const container = win === null || win === void 0 ? void 0 : win.document.getElementById("preview-container");
        if (container) {
            container.innerHTML = html;
        }
    });
}
function getSelectedTemplateName() {
    const selectedTemplate = addon.data.template.editor.templates[getSelectedIndex()];
    return selectedTemplate || "";
}
function getSelectedIndex() {
    var _a;
    const selectedIndex = (_a = addon.data.template.editor.tableHelper) === null || _a === void 0 ? void 0 : _a.treeInstance.selection.selected.values().next().value;
    return selectedIndex;
}
function createTemplate() {
    const template = {
        name: `New Template: ${new Date().getTime()}`,
        text: "",
    };
    addon.api.template.setTemplate(template);
    refresh();
}
function importNoteTemplate() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const ids = yield (0, itemPicker_1.itemPicker)();
        const note = Zotero.Items.get(ids).filter((item) => item.isNote())[0];
        if (!note) {
            return;
        }
        const template = {
            name: `Template from ${note.getNoteTitle()}: ${new Date().getTime()}`,
            text: ((_a = addon.api.sync.getNoteStatus(note.id)) === null || _a === void 0 ? void 0 : _a.content) || "",
        };
        addon.api.template.setTemplate(template);
        refresh();
    });
}
function saveSelectedTemplate() {
    var _a, _b;
    const win = addon.data.template.editor.window;
    if (!win) {
        return;
    }
    const templateType = win.document.querySelector("#editor-type");
    const templateName = win.document.querySelector("#editor-name");
    const name = getSelectedTemplateName();
    const type = templateType.value;
    let modifiedName;
    if (type === "system") {
        modifiedName = name;
    }
    else if (type === "unknown") {
        modifiedName = templateName.value;
    }
    else {
        modifiedName = `[${type}]${templateName.value}`;
    }
    if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name) &&
        modifiedName !== name) {
        (0, hint_1.showHint)(`Template ${name} is a system template. Modifying template name is not allowed.`);
        return;
    }
    const template = {
        name: modifiedName,
        text: addon.data.template.editor.editor.getValue(),
    };
    if (template.text.includes("# This template is specifically for importing/sharing")) {
        const useImport = (_a = addon.data.template.editor.window) === null || _a === void 0 ? void 0 : _a.confirm((0, locale_1.getString)("alert-templateEditor-shouldImport"));
        if (useImport) {
            addon.hooks.onImportTemplateFromClipboard(template.text);
            refresh(true);
            return;
        }
    }
    addon.api.template.setTemplate(template);
    if (name !== modifiedName) {
        addon.api.template.removeTemplate(name);
    }
    (0, hint_1.showHint)(`Template ${modifiedName} saved.`);
    const selectedId = (_b = addon.data.template.editor.tableHelper) === null || _b === void 0 ? void 0 : _b.treeInstance.selection.selected.values().next().value;
    refresh(true).then(() => updateTable(selectedId));
}
function deleteSelectedTemplate() {
    const name = getSelectedTemplateName();
    if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name)) {
        (0, hint_1.showHint)(`Template ${name} is a system template. Removing system template is note allowed.`);
        return;
    }
    addon.api.template.removeTemplate(name);
    refresh(true);
}
function resetSelectedTemplate() {
    var _a;
    const name = getSelectedTemplateName();
    if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name)) {
        addon.data.template.editor.editor.setValue(((_a = addon.api.template.DEFAULT_TEMPLATES.find((t) => t.name === name)) === null || _a === void 0 ? void 0 : _a.text) ||
            "");
        (0, hint_1.showHint)(`Template ${name} is reset. Please save before leaving.`);
    }
}
function shareSelectedTemplate() {
    const name = getSelectedTemplateName();
    if (!name) {
        return;
    }
    saveSelectedTemplate();
    const content = addon.api.template.getTemplateText(name);
    const yaml = `# This template is specifically for importing/sharing, using better 
# notes 'import from clipboard': copy the content and
# goto Zotero menu bar, click Tools->New Template from Clipboard.  
# Do not copy-paste this to Obsidian Bridge template editor directly.
name: "${name}"
zoteroVersion: "${Zotero.version}"
pluginVersion: "${package_json_1.version}"
savedAt: "${new Date().toISOString()}"
content: |-
${content
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")}
`;
    new ztoolkit.Clipboard().addText(yaml, "text/plain").copy();
    (0, hint_1.showHint)(`Template ${name} is copied to clipboard. To import it, goto Zotero menu->Tools->New Template from Clipboard.  `);
}
function backupTemplates() {
    return __awaiter(this, void 0, void 0, function* () {
        const time = new Date().toISOString().replace(/:/g, "-");
        const filepath = yield new ztoolkit.FilePicker("Save backup file", "save", [["yaml", "*.yaml"]], `zob-template-backup-${time}.yaml`).open();
        if (!filepath) {
            return;
        }
        const keys = addon.api.template.getTemplateKeys();
        const templates = keys.map((key) => {
            return {
                name: key,
                text: addon.api.template.getTemplateText(key),
            };
        });
        const yaml = YAML.stringify(templates);
        yield Zotero.File.putContentsAsync(filepath, yaml);
    });
}
function restoreTemplates(win) {
    return __awaiter(this, void 0, void 0, function* () {
        const filepath = yield new ztoolkit.FilePicker("Open backup file", "open", [["yaml", "*.yaml"]], undefined, win, "text").open();
        if (!filepath) {
            return;
        }
        const yaml = (yield Zotero.File.getContentsAsync(filepath));
        const templates = YAML.parse(yaml);
        const existingNames = addon.api.template.getTemplateKeys();
        for (const t of templates) {
            if (existingNames.includes(t.name)) {
                const overwrite = win.confirm(`Template ${t.name} already exists. Overwrite?`);
                if (!overwrite) {
                    continue;
                }
            }
            addon.api.template.setTemplate(t);
        }
        yield refresh(true);
    });
}
const formatStore = [
    {
        name: "bold",
        code: "**${text}**",
    },
    {
        name: "italic",
        code: "_${text}_",
    },
    {
        name: "strikethrough",
        code: "~~${text}~~",
    },
    {
        name: "underline",
        code: "<u>${text}</u>",
    },
    {
        name: "superscript",
        code: "<sup>${text}</sup>",
    },
    { name: "subscript", code: "<sub>${text}</sub>" },
    {
        name: "textColor",
        code: '<span style="color: orange">${text}</span>',
    },
    {
        name: "link",
        code: "[${text}](url)",
    },
    {
        name: "quote",
        code: "\n> ${text}",
    },
    {
        name: "monospaced",
        code: "<code>${text}</code>",
    },
    {
        name: "code",
        code: "\n<pre>\n${text}\n</pre>\n",
    },
    {
        name: "table",
        code: "\n| ${text} | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n",
    },
    {
        name: "h1",
        code: "\n# ${text}",
    },
    {
        name: "h2",
        code: "\n## ${text}",
    },
    {
        name: "h3",
        code: "\n### ${text}",
    },
    {
        name: "bullet",
        code: "\n- ${text}",
    },
    {
        name: "numbered",
        code: "\n1. ${text}",
    },
    {
        name: "inlineMath",
        code: "$${text}$",
        defaultText: "e=mc^2",
    },
    {
        name: "blockMath",
        code: "\n$$\n${text}\n$$\n",
        defaultText: "e=mc^2",
    },
    {
        name: "inlineScript",
        code: "${ ${text} }",
        defaultText: "Zotero.version",
    },
    {
        name: "blockScript",
        code: "\n${{\n  ${text}\n}}$\n",
        defaultText: "return Zotero.version;",
    },
];
const snippetsStore = {
    global: [
        {
            name: "useMarkdown",
            code: "\n// @use-markdown\n",
            type: "syntax",
        },
        {
            name: "useRefresh",
            code: "\n// @use-refresh\n",
            type: "syntax",
        },
        {
            name: "dryRunFlag",
            code: "_env.dryRun",
            type: "variable",
        },
    ],
    item: [
        {
            name: "itemBeforeLoop",
            code: "\n// @beforeloop-begin\n\n// @beforeloop-end\n",
            type: "syntax",
        },
        {
            name: "itemInLoop",
            code: "\n// @default-begin\n\n// @default-end\n",
            type: "syntax",
        },
        {
            name: "itemAfterLoop",
            code: "\n// @afterloop-begin\n\n// @afterloop-end\n",
            type: "syntax",
        },
        {
            name: "itemItems",
            code: "items",
            type: "variable",
        },
        {
            name: "itemItem",
            code: "item",
            type: "variable",
        },
        {
            name: "itemTopItem",
            code: "topItem",
            type: "variable",
        },
        {
            name: "itemTargetNoteItem",
            code: "targetNoteItem",
            type: "variable",
        },
        {
            name: "itemCopyNoteImage",
            code: "${copyNoteImage(...)}",
            type: "expression",
        },
        {
            name: "itemSharedObj",
            code: "sharedObj",
            type: "variable",
        },
        {
            name: "itemFieldTitle",
            code: '${topItem.getField("title")}',
            type: "expression",
        },
        {
            name: "itemFieldAbstract",
            code: '${topItem.getField("abstractNote")}',
            type: "expression",
        },
        {
            name: "itemFieldCitKey",
            code: '${topItem.getField("citationKey")}',
            type: "expression",
        },
        {
            name: "itemFieldDate",
            code: '${topItem.getField("date")}',
            type: "expression",
        },
        {
            name: "itemFieldDOI",
            code: '${topItem.getField("DOI")}',
            type: "expression",
        },
        {
            name: "itemFieldDOIURL",
            code: `
\${{
const doi = topItem.getField("DOI");
const url = topItem.getField("url");
if (doi) {
  return \`DOI: <a href="https://doi.org/\${doi}">\${doi}</a>\`;
} else {
  return \`URL: <a href="\${url}">\${url}</a>\`;
}
}}$
`,
            type: "expression",
        },
        {
            name: "itemFieldAuthors",
            code: '${topItem.getCreators().map((v)=>v.firstName+" "+v.lastName).join("; ")}',
            type: "expression",
        },
        {
            name: "itemFieldJournal",
            code: '${topItem.getField("publicationTitle")}',
            type: "expression",
        },
        {
            name: "itemFieldTitleTranslation",
            code: '${topItem.getField("titleTranslation")}',
            type: "expression",
        },
    ],
    text: [
        {
            name: "textTargetNoteItem",
            code: "targetNoteItem",
            type: "variable",
        },
        {
            name: "textSharedObj",
            code: "sharedObj",
            type: "variable",
        },
    ],
    QuickInsertV3: [
        {
            name: "quickInsertLink",
            code: "link",
            type: "variable",
        },
        {
            name: "quickInsertLinkText",
            code: "linkText",
            type: "variable",
        },
        {
            name: "quickInsertSubNoteItem",
            code: "subNoteItem",
            type: "variable",
        },
        {
            name: "quickInsertNoteItem",
            code: "noteItem",
            type: "variable",
        },
    ],
    QuickImportV2: [
        {
            name: "quickImportLink",
            code: "link",
            type: "variable",
        },
        {
            name: "quickImportNoteItem",
            code: "noteItem",
            type: "variable",
        },
    ],
    QuickNoteV5: [
        {
            name: "quickNoteAnnotationItem",
            code: "annotationItem",
            type: "variable",
        },
        {
            name: "quickNoteTopItem",
            code: "topItem",
            type: "variable",
        },
        {
            name: "quickNoteNoteItem",
            code: "noteItem",
            type: "variable",
        },
    ],
    ExportMDFileNameV2: [
        {
            name: "exportMDFileNameNoteItem",
            code: "noteItem",
            type: "variable",
        },
    ],
    ExportMDFileHeaderV2: [
        {
            name: "exportMDFileHeaderNoteItem",
            code: "noteItem",
            type: "variable",
        },
    ],
    ExportMDFileContent: [
        {
            name: "exportMDFileContentNoteItem",
            code: "noteItem",
            type: "variable",
        },
        {
            name: "exportMDFileContentMDContent",
            code: "mdContent",
            type: "variable",
        },
    ],
    ExportLatexFileContent: [
        {
            name: "exportLatexFileContentNoteItem",
            code: "noteItem",
            type: "variable",
        },
        {
            name: "exportLatexFileContentLatexContent",
            code: "latexContent",
            type: "variable",
        },
    ],
};
