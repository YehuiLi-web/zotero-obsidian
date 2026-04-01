type ObsidianPrefsLayoutContext = {
  escapeHTML: (value: string) => string;
  getString: (key: string, attr?: string) => string;
  uiText: (zh: string, en: string) => string;
  resolvedPaths: {
    appPath: string;
    vaultRoot: string;
    notesDir: string;
    assetsDir: string;
    dashboardDir: string;
  };
  contentConfig: {
    includeMetadata: boolean;
    includeAbstract: boolean;
    includeHiddenInfo: boolean;
    includeAnnotations: boolean;
    includeChildNotes: boolean;
  };
  translationConfig: {
    enabled: boolean;
    includeTitle: boolean;
    includeAbstract: boolean;
  };
  fileNameTemplate: string;
  syncScope: string;
  updateStrategy: string;
  autoSync: boolean;
  watchFiles: boolean;
  openAfterSync: boolean;
  revealAfterSync: boolean;
  childNoteTags: string;
  childNotePrompt: boolean;
  dashboardAutoSetup: boolean;
  ids: {
    connectionStatusId: string;
    appPathInputId: string;
    vaultRootInputId: string;
    notesDirInputId: string;
    assetsDirInputId: string;
    connectionTestButtonId: string;
    connectionTestResultId: string;
    vaultRootHintId: string;
    notesDirHintId: string;
    assetsDirHintId: string;
    dashboardDirHintId: string;
    dashboardDirInputId: string;
    fileNameTemplateInputId: string;
    fileNamePreviewId: string;
    fileNameContextId: string;
    previewTriggerId: string;
    previewMetaId: string;
    previewFileId: string;
    previewFrontmatterId: string;
    previewBodyId: string;
    syncSummaryId: string;
    contentSummaryId: string;
    autoSyncInputId: string;
    watchFilesInputId: string;
    revealAfterSyncInputId: string;
    openAfterSyncInputId: string;
    includeMetadataInputId: string;
    includeAbstractInputId: string;
    includeAnnotationsInputId: string;
    includeHiddenInfoInputId: string;
    includeChildNotesInputId: string;
    translateMissingMetadataInputId: string;
    translateMissingTitleInputId: string;
    translateMissingAbstractInputId: string;
    itemTemplateDisplayId: string;
    frontmatterSummaryId: string;
    frontmatterFieldListId: string;
    metadataPresetSelectId: string;
    metadataPresetNameInputId: string;
    metadataPresetSectionId: string;
    metadataPresetSearchId: string;
    metadataPresetSummaryId: string;
    metadataPresetFieldListId: string;
    metadataPresetSaveButtonId: string;
    metadataPresetDuplicateButtonId: string;
    metadataPresetDeleteButtonId: string;
    metadataPresetResetButtonId: string;
    metadataPresetResyncButtonId: string;
    childNotePromptSelectInputId: string;
    childNoteTagsInputId: string;
    dashboardAutoSetupInputId: string;
  };
  groupNames: {
    updateStrategy: string;
    syncScope: string;
  };
};

function checkedAttr(value: boolean) {
  return value ? `checked="checked"` : "";
}

function disabledAttr(value: boolean) {
  return value ? `disabled="disabled"` : "";
}

function renderButtonHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    label: string;
    action?: string;
    id?: string;
  },
) {
  const esc = context.escapeHTML;
  const attrs = [
    options.id ? `id="${esc(options.id)}"` : "",
    options.action ? `data-ob-action="${esc(options.action)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<button type="button" class="ob-bridge-button" ${attrs}>${esc(
    options.label,
  )}</button>`;
}

function renderChoiceLineHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    inputType: "radio" | "checkbox";
    name?: string;
    value?: string;
    inputId?: string;
    checked: boolean;
    disabled?: boolean;
    title: string;
    meta?: string;
  },
) {
  const esc = context.escapeHTML;
  const inputAttrs = [
    options.inputId ? `id="${esc(options.inputId)}"` : "",
    options.name ? `name="${esc(options.name)}"` : "",
    options.value ? `value="${esc(options.value)}"` : "",
    checkedAttr(options.checked),
    disabledAttr(Boolean(options.disabled)),
  ]
    .filter(Boolean)
    .join(" ");
  const labelClass =
    options.inputType === "radio" ? "bn-pref-radio" : "bn-pref-checkbox";
  return `
    <label class="${labelClass} ob-bridge-choiceLine">
      <input type="${options.inputType}" ${inputAttrs} />
      <span class="ob-bridge-choiceLine__text">${esc(options.title)}</span>
      ${
        options.meta
          ? `<span class="ob-bridge-choiceLine__meta">${esc(options.meta)}</span>`
          : ""
      }
    </label>
  `;
}

function renderInputHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    id: string;
    value: string;
    readOnly?: boolean;
    placeholder?: string;
  },
) {
  const esc = context.escapeHTML;
  const attrs = [
    `id="${esc(options.id)}"`,
    `value="${esc(options.value)}"`,
    options.readOnly ? `readonly="readonly"` : "",
    options.placeholder
      ? `placeholder="${esc(options.placeholder)}"`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<input class="ob-bridge-input" ${attrs} />`;
}

function renderSelectHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    id: string;
  },
) {
  return `<select class="ob-bridge-select" id="${context.escapeHTML(
    options.id,
  )}"></select>`;
}

function renderFormRowHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    label: string;
    forId?: string;
    controlHTML: string;
    actionHTML?: string;
    hintId?: string;
    hintText?: string;
    className?: string;
  },
) {
  const esc = context.escapeHTML;
  return `
    <div class="ob-bridge-rowBlock${options.className ? ` ${options.className}` : ""}">
      <div class="ob-bridge-formRow">
        <label class="ob-bridge-formRow__label"${
          options.forId ? ` for="${esc(options.forId)}"` : ""
        }>${esc(options.label)}</label>
        <div class="ob-bridge-formRow__control">${options.controlHTML}</div>
        <div class="ob-bridge-formRow__actions">${options.actionHTML || ""}</div>
      </div>
      ${
        options.hintId || options.hintText
          ? `<div class="ob-bridge-inline"${
              options.hintId ? ` id="${esc(options.hintId)}"` : ""
            }>${options.hintText ? esc(options.hintText) : ""}</div>`
          : ""
      }
    </div>
  `;
}

function renderSectionHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    panel: "connection" | "noteDesign" | "sync" | "tools";
    title: string;
    bodyHTML: string;
  },
) {
  const esc = context.escapeHTML;
  return `
    <section class="bn-pref-section ob-bridge-section" data-ob-panel="${esc(
      options.panel,
    )}">
      <h3 class="ob-bridge-section__title">${esc(options.title)}</h3>
      ${options.bodyHTML}
    </section>
  `;
}

function renderChoiceGroupHTML(
  context: ObsidianPrefsLayoutContext,
  items: string[],
  className = "",
) {
  return `<div class="ob-bridge-choiceGroup${
    className ? ` ${className}` : ""
  }">${items.join("")}</div>`;
}

function buildObsidianConnectionPanelHTML(context: ObsidianPrefsLayoutContext) {
  const { ids } = context;
  return renderSectionHTML(context, {
    panel: "connection",
    title: context.uiText("连接", "Connection"),
    bodyHTML: `
      <div id="${context.escapeHTML(
        ids.connectionStatusId,
      )}" class="ob-bridge-status"></div>
      <div class="ob-bridge-actions">
        ${renderButtonHTML(context, {
          action: "detect-vault",
          label: context.uiText("自动检测 Vault", "Detect Vault"),
        })}
        ${renderButtonHTML(context, {
          action: "run-setup-wizard",
          label: context.uiText("配置向导", "Setup Wizard"),
        })}
        ${renderButtonHTML(context, {
          id: ids.connectionTestButtonId,
          label: context.uiText("测试写入", "Test Write"),
        })}
      </div>
      <div id="${context.escapeHTML(
        ids.connectionTestResultId,
      )}" class="ob-bridge-feedback" hidden="hidden"></div>

      ${renderFormRowHTML(context, {
        label: context.uiText("Vault", "Vault"),
        forId: ids.vaultRootInputId,
        controlHTML: renderInputHTML(context, {
          id: ids.vaultRootInputId,
          value: context.resolvedPaths.vaultRoot,
        }),
        actionHTML: renderButtonHTML(context, {
          action: "pick-vault",
          label: context.getString("obsidian-pickFolder", "label"),
        }),
        hintId: ids.vaultRootHintId,
      })}

      ${renderFormRowHTML(context, {
        label: context.uiText("笔记目录", "Notes"),
        forId: ids.notesDirInputId,
        controlHTML: renderInputHTML(context, {
          id: ids.notesDirInputId,
          value: context.resolvedPaths.notesDir,
        }),
        actionHTML: renderButtonHTML(context, {
          action: "pick-notes",
          label: context.getString("obsidian-pickFolder", "label"),
        }),
        hintId: ids.notesDirHintId,
      })}

      ${renderFormRowHTML(context, {
        label: context.uiText("资源目录", "Assets"),
        forId: ids.assetsDirInputId,
        controlHTML: renderInputHTML(context, {
          id: ids.assetsDirInputId,
          value: context.resolvedPaths.assetsDir,
        }),
        actionHTML: renderButtonHTML(context, {
          action: "pick-assets",
          label: context.getString("obsidian-pickFolder", "label"),
        }),
        hintId: ids.assetsDirHintId,
      })}

      <details class="ob-bridge-details">
        <summary>${context.escapeHTML(
          context.uiText("高级路径", "Advanced Paths"),
        )}</summary>
        ${renderFormRowHTML(context, {
          label: context.uiText("应用路径", "App Path"),
          forId: ids.appPathInputId,
          controlHTML: renderInputHTML(context, {
            id: ids.appPathInputId,
            value: context.resolvedPaths.appPath,
          }),
          actionHTML: renderButtonHTML(context, {
            action: "pick-app",
            label: context.getString("obsidian-pickFile", "label"),
          }),
        })}
      </details>
    `,
  });
}

function buildObsidianNoteDesignPanelHTML(
  context: ObsidianPrefsLayoutContext,
) {
  const { ids, contentConfig, translationConfig } = context;
  return renderSectionHTML(context, {
    panel: "noteDesign",
    title: context.uiText("笔记", "Notes"),
    bodyHTML: `
      <input
        id="${context.escapeHTML(ids.fileNameTemplateInputId)}"
        type="hidden"
        value="${context.escapeHTML(context.fileNameTemplate)}"
      />

      ${renderFormRowHTML(context, {
        label: context.uiText("模板", "Template"),
        forId: ids.itemTemplateDisplayId,
        controlHTML: renderInputHTML(context, {
          id: ids.itemTemplateDisplayId,
          value: "",
          readOnly: true,
        }),
        actionHTML: `
          ${renderButtonHTML(context, {
            action: "pick-template",
            label: context.uiText("选择", "Choose"),
          })}
          ${renderButtonHTML(context, {
            action: "edit-template",
            label: context.uiText("编辑", "Edit"),
          })}
        `,
      })}

      ${renderFormRowHTML(context, {
        label: context.uiText("文件名", "Filename"),
        controlHTML: `<div id="${context.escapeHTML(
          ids.fileNamePreviewId,
        )}" class="ob-bridge-previewValue"></div>`,
        hintId: ids.fileNameContextId,
      })}

      <div id="${context.escapeHTML(
        ids.contentSummaryId,
      )}" class="ob-bridge-inline-summary"></div>

      ${renderChoiceGroupHTML(
        context,
        [
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.includeMetadataInputId,
            checked: contentConfig.includeMetadata,
            title: context.uiText("元数据", "Metadata"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.includeAbstractInputId,
            checked: contentConfig.includeAbstract,
            title: "Abstract",
          }),
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.includeAnnotationsInputId,
            checked: contentConfig.includeAnnotations,
            title: context.uiText("批注", "Annotations"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.includeHiddenInfoInputId,
            checked: contentConfig.includeHiddenInfo,
            title: context.uiText("隐藏字段", "Hidden Fields"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.includeChildNotesInputId,
            checked: contentConfig.includeChildNotes,
            title: context.uiText("子笔记", "Child Notes"),
          }),
        ],
        "ob-bridge-choiceGroup--grid",
      )}

      <details class="ob-bridge-details" data-ob-role="child-note-config"${
        contentConfig.includeChildNotes ? "" : ' hidden="hidden"'
      }>
        <summary>${context.escapeHTML(
          context.uiText("子笔记规则", "Child Note Rules"),
        )}</summary>
        ${renderFormRowHTML(context, {
          label: context.uiText("匹配标签", "Tags"),
          forId: ids.childNoteTagsInputId,
          controlHTML: renderInputHTML(context, {
            id: ids.childNoteTagsInputId,
            value: context.childNoteTags,
          }),
          actionHTML: renderButtonHTML(context, {
            action: "open-child-note-rules",
            label: context.uiText("编辑规则", "Edit Rules"),
          }),
        })}
        ${renderChoiceGroupHTML(context, [
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.childNotePromptSelectInputId,
            checked: context.childNotePrompt,
            title: context.uiText("同步时询问", "Prompt During Sync"),
          }),
        ])}
      </details>

      <details class="ob-bridge-details">
        <summary>${context.escapeHTML(
          context.uiText("属性输出", "Property Output"),
        )}</summary>
        <div id="${context.escapeHTML(
          ids.frontmatterSummaryId,
        )}" class="ob-bridge-inline-summary"></div>
        <div class="ob-bridge-actions">
          ${renderButtonHTML(context, {
            action: "open-field-studio-frontmatter",
            label: context.uiText("打开属性输出工作台", "Open Property Output Studio"),
          })}
        </div>
      </details>

      <details class="ob-bridge-details">
        <summary>${context.escapeHTML(
          context.uiText("字段分流", "Field Routing"),
        )}</summary>
        <div id="${context.escapeHTML(
          ids.metadataPresetSummaryId,
        )}" class="ob-bridge-inline-summary"></div>
        <div class="ob-bridge-actions">
          ${renderButtonHTML(context, {
            action: "open-field-studio-metadata",
            label: context.uiText("打开字段分流工作台", "Open Field Routing Studio"),
          })}
        </div>
      </details>

      <details class="ob-bridge-details">
        <summary>${context.escapeHTML(
          context.uiText("预览", "Preview"),
        )}</summary>
        <div class="ob-bridge-actions">
          <button
            type="button"
            class="ob-bridge-button"
            id="${context.escapeHTML(ids.previewTriggerId)}"
          >${context.escapeHTML(
            context.uiText("弹窗预览", "Preview Popup"),
          )}</button>
        </div>
        <div id="${context.escapeHTML(
          ids.previewMetaId,
        )}" class="ob-bridge-inline-summary"></div>
        <div class="ob-bridge-previewBlock">
          <div class="ob-bridge-previewBlock__label">${context.escapeHTML(
            context.uiText("文件名", "Filename"),
          )}</div>
          <div id="${context.escapeHTML(
            ids.previewFileId,
          )}" class="ob-bridge-previewValue"></div>
        </div>
        <p class="ob-bridge-inline ob-bridge-previewHint">${context.escapeHTML(
          context.uiText(
            "预览会在弹窗中按 Markdown 真实渲染，并保留 frontmatter 与原始 Markdown 供核对。",
            "The preview opens in a popup with rendered Markdown, while keeping frontmatter and raw Markdown available for inspection.",
          ),
        )}</p>
      </details>
    `,
  });
}

function buildObsidianSyncPanelHTML(context: ObsidianPrefsLayoutContext) {
  const { ids, groupNames, translationConfig } = context;
  return renderSectionHTML(context, {
    panel: "sync",
    title: context.uiText("同步", "Sync"),
    bodyHTML: `
      ${renderFormRowHTML(context, {
        label: context.uiText("同步范围", "Scope"),
        controlHTML: renderChoiceGroupHTML(context, [
          renderChoiceLineHTML(context, {
            inputType: "radio",
            name: groupNames.syncScope,
            value: "selection",
            checked: context.syncScope === "selection",
            title: context.uiText("选中", "Selection"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "radio",
            name: groupNames.syncScope,
            value: "currentList",
            checked: context.syncScope === "currentList",
            title: context.uiText("当前列表", "Current List"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "radio",
            name: groupNames.syncScope,
            value: "library",
            checked: context.syncScope === "library",
            title: context.uiText("整个库", "Library"),
          }),
        ]),
      })}

      ${renderFormRowHTML(context, {
        label: context.uiText("更新方式", "Update"),
        controlHTML: renderChoiceGroupHTML(context, [
          renderChoiceLineHTML(context, {
            inputType: "radio",
            name: groupNames.updateStrategy,
            value: "managed",
            checked: context.updateStrategy === "managed",
            title: context.uiText("只更新托管区", "Managed Only"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "radio",
            name: groupNames.updateStrategy,
            value: "overwrite",
            checked: context.updateStrategy === "overwrite",
            title: context.uiText("覆盖全部", "Overwrite"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "radio",
            name: groupNames.updateStrategy,
            value: "skip",
            checked: context.updateStrategy === "skip",
            title: context.uiText("跳过已有", "Skip Existing"),
          }),
        ]),
      })}

      ${renderChoiceGroupHTML(
        context,
        [
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.autoSyncInputId,
            checked: context.autoSync,
            title: context.uiText("自动同步", "Auto Sync"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.watchFilesInputId,
            checked: context.watchFiles,
            title: context.uiText("监视文件变化", "Watch Files"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.openAfterSyncInputId,
            checked: context.openAfterSync,
            title: context.uiText("同步后打开 Obsidian", "Open After Sync"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.revealAfterSyncInputId,
            checked: context.revealAfterSync,
            title: context.uiText("同步后定位文件", "Reveal File"),
          }),
        ],
        "ob-bridge-choiceGroup--grid",
      )}

      <details class="ob-bridge-details">
        <summary>${context.escapeHTML(
          context.uiText("翻译补全", "Translation Autofill"),
        )}</summary>
        ${renderChoiceGroupHTML(context, [
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.translateMissingMetadataInputId,
            checked: translationConfig.enabled,
            title: context.uiText("同步前补全缺失翻译", "Fill Missing Translations"),
          }),
        ])}
        <div data-ob-role="translation-options"${
          translationConfig.enabled ? "" : ' hidden="hidden"'
        }>
          ${renderChoiceGroupHTML(context, [
            renderChoiceLineHTML(context, {
              inputType: "checkbox",
              inputId: ids.translateMissingTitleInputId,
              checked: translationConfig.includeTitle,
              disabled: !translationConfig.enabled,
              title: context.uiText("标题", "Title"),
            }),
            renderChoiceLineHTML(context, {
              inputType: "checkbox",
              inputId: ids.translateMissingAbstractInputId,
              checked: translationConfig.includeAbstract,
              disabled: !translationConfig.enabled,
              title: context.uiText("摘要", "Abstract"),
            }),
          ])}
        </div>
      </details>

      <div id="${context.escapeHTML(
        ids.syncSummaryId,
      )}" class="ob-bridge-inline-summary"></div>
      <div class="ob-bridge-actions">
        ${renderButtonHTML(context, {
          action: "sync-now",
          label: context.getString("obsidian-syncNow", "label"),
        })}
        ${renderButtonHTML(context, {
          action: "open-note-design",
          label: context.uiText("查看笔记设置", "Open Note Settings"),
        })}
      </div>
    `,
  });
}

function buildObsidianToolsPanelHTML(context: ObsidianPrefsLayoutContext) {
  const { ids } = context;
  return renderSectionHTML(context, {
    panel: "tools",
    title: context.uiText("工具", "Tools"),
    bodyHTML: `
      ${renderFormRowHTML(context, {
        label: context.uiText("Dashboard 目录", "Dashboard Folder"),
        forId: ids.dashboardDirInputId,
        controlHTML: renderInputHTML(context, {
          id: ids.dashboardDirInputId,
          value: context.resolvedPaths.dashboardDir,
        }),
        actionHTML: renderButtonHTML(context, {
          action: "pick-dashboard",
          label: context.getString("obsidian-pickFolder", "label"),
        }),
        hintId: ids.dashboardDirHintId,
      })}

      ${renderChoiceGroupHTML(context, [
        renderChoiceLineHTML(context, {
          inputType: "checkbox",
          inputId: ids.dashboardAutoSetupInputId,
          checked: context.dashboardAutoSetup,
          title: context.getString("obsidian-dashboardAutoSetup", "label"),
        }),
      ])}

      <div class="ob-bridge-actions">
        ${renderButtonHTML(context, {
          action: "setup-dashboard",
          label: context.getString("obsidian-setupDashboards", "label"),
        })}
        ${renderButtonHTML(context, {
          action: "repair-links",
          label: context.getString("obsidian-repairManagedLinks", "label"),
        })}
        ${renderButtonHTML(context, {
          action: "resync-managed",
          label: context.uiText("重同步已联动笔记", "Resync Managed Notes"),
        })}
      </div>
    `,
  });
}

function buildObsidianSettingsShellHTML(context: ObsidianPrefsLayoutContext) {
  return `
    <div class="ob-bridge-settings">
      ${buildObsidianConnectionPanelHTML(context)}
      ${buildObsidianNoteDesignPanelHTML(context)}
      ${buildObsidianSyncPanelHTML(context)}
      ${buildObsidianToolsPanelHTML(context)}
    </div>
  `;
}

export { buildObsidianSettingsShellHTML };
export type { ObsidianPrefsLayoutContext };
