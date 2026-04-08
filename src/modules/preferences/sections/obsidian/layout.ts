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
  collectionFoldersEnabled: boolean;
  autoSync: boolean;
  watchFiles: boolean;
  openAfterSync: boolean;
  revealAfterSync: boolean;
  childNoteTags: string;
  childNotePrompt: boolean;
  dashboardAutoSetup: boolean;
  workflowConfig: {
    exportNotesTakeover: boolean;
    outlineExpandLevel: number;
    keepOutlineLinks: boolean;
    noteLinkPreviewType: "hover" | "ctrl" | "disable";
    useMagicKey: boolean;
    useMagicKeyShortcut: boolean;
    useMarkdownPaste: boolean;
    pinTableLeft: boolean;
    pinTableTop: boolean;
    syncPeriodSeconds: number;
    syncAttachmentFolder: string;
    annotationTagSync: boolean;
    aboutLinks: Array<{
      label: string;
      href: string;
    }>;
    aboutMeta: string;
  };
  ids: {
    connectionStatusId: string;
    appPathInputId: string;
    vaultRootInputId: string;
    notesDirInputId: string;
    assetsDirInputId: string;
    collectionFoldersInputId: string;
    connectionTestButtonId: string;
    connectionTestResultId: string;
    vaultRootHintId: string;
    notesDirHintId: string;
    assetsDirHintId: string;
    dashboardDirHintId: string;
    dashboardDirInputId: string;
    fileNameTemplateInputId: string;
    fileNameRuleId: string;
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
    workflowExportNotesInputId: string;
    workflowExpandLevelInputId: string;
    workflowKeepLinksInputId: string;
    workflowNoteLinkPreviewGroupName: string;
    workflowNoteLinkPreviewHoverInputId: string;
    workflowNoteLinkPreviewCtrlInputId: string;
    workflowNoteLinkPreviewDisableInputId: string;
    workflowMagicKeyInputId: string;
    workflowMagicKeyShortcutInputId: string;
    workflowMarkdownPasteInputId: string;
    workflowPinLeftInputId: string;
    workflowPinTopInputId: string;
    workflowSyncPeriodInputId: string;
    workflowAttachmentFolderInputId: string;
    workflowAnnotationTagSyncInputId: string;
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
    variant?: "default" | "link";
    url?: string;
  },
) {
  const esc = context.escapeHTML;
  const attrs = [
    options.id ? `id="${esc(options.id)}"` : "",
    options.action ? `data-ob-action="${esc(options.action)}"` : "",
    options.url ? `data-ob-open-url="${esc(options.url)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const className =
    options.variant === "link"
      ? "ob-bridge-button ob-bridge-button--link"
      : "ob-bridge-button";
  return `<button type="button" class="${className}" ${attrs}>${esc(
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
    type?: "text" | "number";
    readOnly?: boolean;
    placeholder?: string;
    min?: string;
    max?: string;
    step?: string;
  },
) {
  const esc = context.escapeHTML;
  const attrs = [
    `id="${esc(options.id)}"`,
    `type="${esc(options.type || "text")}"`,
    `value="${esc(options.value)}"`,
    options.readOnly ? `readonly="readonly"` : "",
    options.placeholder ? `placeholder="${esc(options.placeholder)}"` : "",
    options.min ? `min="${esc(options.min)}"` : "",
    options.max ? `max="${esc(options.max)}"` : "",
    options.step ? `step="${esc(options.step)}"` : "",
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
    panel:
      | "connection"
      | "workflow"
      | "noteDesign"
      | "sync"
      | "tools"
      | "about";
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

function renderCardHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    title: string;
    bodyHTML: string;
    description?: string;
  },
) {
  const esc = context.escapeHTML;
  return `
    <section class="ob-bridge-card">
      <div class="ob-bridge-card__title">${esc(options.title)}</div>
      ${
        options.description
          ? `<div class="ob-bridge-card__description">${esc(
              options.description,
            )}</div>`
          : ""
      }
      <div class="ob-bridge-card__body">${options.bodyHTML}</div>
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

      ${renderChoiceGroupHTML(context, [
        renderChoiceLineHTML(context, {
          inputType: "checkbox",
          inputId: ids.collectionFoldersInputId,
          checked: context.collectionFoldersEnabled,
          title: context.uiText(
            "按 Zotero collection 建子目录",
            "Create subfolders from Zotero collections",
          ),
          meta: context.uiText(
            "命中文献多个 collection 时，默认使用层级最深的一条路径。",
            "When an item belongs to multiple collections, the deepest hierarchy is used.",
          ),
        }),
      ])}

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

function buildObsidianWorkflowPanelHTML(context: ObsidianPrefsLayoutContext) {
  const { ids, workflowConfig } = context;
  const noteLinkPreviewChoices = renderChoiceGroupHTML(context, [
    renderChoiceLineHTML(context, {
      inputType: "radio",
      inputId: ids.workflowNoteLinkPreviewHoverInputId,
      name: ids.workflowNoteLinkPreviewGroupName,
      value: "hover",
      checked: workflowConfig.noteLinkPreviewType === "hover",
      title: context.uiText("鼠标悬停", "Hover"),
    }),
    renderChoiceLineHTML(context, {
      inputType: "radio",
      inputId: ids.workflowNoteLinkPreviewCtrlInputId,
      name: ids.workflowNoteLinkPreviewGroupName,
      value: "ctrl",
      checked: workflowConfig.noteLinkPreviewType === "ctrl",
      title: context.uiText("按下 Ctrl", "Hold Ctrl"),
    }),
    renderChoiceLineHTML(context, {
      inputType: "radio",
      inputId: ids.workflowNoteLinkPreviewDisableInputId,
      name: ids.workflowNoteLinkPreviewGroupName,
      value: "disable",
      checked: workflowConfig.noteLinkPreviewType === "disable",
      title: context.uiText("从不", "Never"),
    }),
  ]);
  return renderSectionHTML(context, {
    panel: "workflow",
    title: context.uiText("Better Note 设置", "Better Note Settings"),
    bodyHTML: `
      <div class="ob-bridge-cardStack">
        ${renderCardHTML(context, {
          title: context.uiText("基本", "Basic"),
          bodyHTML: renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.workflowExportNotesInputId,
            checked: workflowConfig.exportNotesTakeover,
            title: context.uiText("接管导出笔记", "Take Over Exported Notes"),
          }),
        })}
        ${renderCardHTML(context, {
          title: context.uiText("笔记编辑器", "Note Editor"),
          description: context.uiText(
            "大纲层级和链接预览方式在重启 Zotero 后会完全生效。",
            "Outline depth and link preview mode fully apply after restarting Zotero.",
          ),
          bodyHTML: `
            ${renderFormRowHTML(context, {
              label: context.uiText("大纲展开至标题层级", "Outline Expand Level"),
              forId: ids.workflowExpandLevelInputId,
              controlHTML: renderInputHTML(context, {
                id: ids.workflowExpandLevelInputId,
                type: "number",
                value: String(workflowConfig.outlineExpandLevel),
                min: "1",
                max: "6",
                step: "1",
              }),
              className: "ob-bridge-rowBlock--wideLabel",
            })}
            ${renderChoiceLineHTML(context, {
              inputType: "checkbox",
              inputId: ids.workflowKeepLinksInputId,
              checked: workflowConfig.keepOutlineLinks,
              title: context.uiText(
                "在大纲中显示笔记链接",
                "Show Note Links in Outline",
              ),
            })}
            ${renderFormRowHTML(context, {
              label: context.uiText(
                "笔记链接预览触发方式",
                "Note Link Preview Trigger",
              ),
              controlHTML: noteLinkPreviewChoices,
              className: "ob-bridge-rowBlock--wideLabel",
            })}
            <div class="ob-bridge-choiceGroup ob-bridge-choiceGroup--grid">
              ${renderChoiceLineHTML(context, {
                inputType: "checkbox",
                inputId: ids.workflowMagicKeyInputId,
                checked: workflowConfig.useMagicKey,
                title: context.uiText(
                  '使用魔法键 "/" 显示命令面板',
                  'Use Magic Key "/" for the Command Palette',
                ),
              })}
              ${renderChoiceLineHTML(context, {
                inputType: "checkbox",
                inputId: ids.workflowMagicKeyShortcutInputId,
                checked: workflowConfig.useMagicKeyShortcut,
                title: context.uiText(
                  '使用 Ctrl + "/" 显示命令面板',
                  'Use Ctrl + "/" for the Command Palette',
                ),
              })}
              ${renderChoiceLineHTML(context, {
                inputType: "checkbox",
                inputId: ids.workflowMarkdownPasteInputId,
                checked: workflowConfig.useMarkdownPaste,
                title: context.uiText(
                  "使用增强的 Markdown 粘贴",
                  "Use Enhanced Markdown Paste",
                ),
              })}
            </div>
            ${renderFormRowHTML(context, {
              label: context.uiText(
                "鼠标滚动时固定表格的",
                "Keep Table Frozen While Scrolling",
              ),
              controlHTML: renderChoiceGroupHTML(context, [
                renderChoiceLineHTML(context, {
                  inputType: "checkbox",
                  inputId: ids.workflowPinLeftInputId,
                  checked: workflowConfig.pinTableLeft,
                  title: context.uiText("首列", "First Column"),
                }),
                renderChoiceLineHTML(context, {
                  inputType: "checkbox",
                  inputId: ids.workflowPinTopInputId,
                  checked: workflowConfig.pinTableTop,
                  title: context.uiText("首行", "Header Row"),
                }),
              ]),
              className: "ob-bridge-rowBlock--wideLabel",
            })}
          `,
        })}
        ${renderCardHTML(context, {
          title: context.uiText("同步", "Sync"),
          description: context.uiText(
            "自动同步周期调整后建议重启 Zotero。",
            "Restarting Zotero is recommended after changing the auto-sync interval.",
          ),
          bodyHTML: `
            ${renderFormRowHTML(context, {
              label: context.uiText("自动同步周期（秒）", "Auto Sync Interval (sec)"),
              forId: ids.workflowSyncPeriodInputId,
              controlHTML: renderInputHTML(context, {
                id: ids.workflowSyncPeriodInputId,
                type: "number",
                value: String(workflowConfig.syncPeriodSeconds),
                min: "-1",
                max: "3600",
                step: "1",
              }),
              className: "ob-bridge-rowBlock--wideLabel",
            })}
            ${renderFormRowHTML(context, {
              label: context.uiText("附件文件夹", "Attachment Folder"),
              forId: ids.workflowAttachmentFolderInputId,
              controlHTML: renderInputHTML(context, {
                id: ids.workflowAttachmentFolderInputId,
                value: workflowConfig.syncAttachmentFolder,
              }),
            })}
            <div class="ob-bridge-actions">
              ${renderButtonHTML(context, {
                action: "open-sync-manager",
                label: context.uiText("打开同步管理器", "Open Sync Manager"),
              })}
            </div>
          `,
        })}
        ${renderCardHTML(context, {
          title: context.uiText("模板", "Template"),
          bodyHTML: `
            <div class="ob-bridge-actions">
              ${renderButtonHTML(context, {
                action: "open-template-editor",
                label: context.uiText("打开模板编辑器", "Open Template Editor"),
              })}
            </div>
          `,
        })}
        ${renderCardHTML(context, {
          title: context.uiText("从注释生成笔记", "Notes From Annotations"),
          bodyHTML: renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.workflowAnnotationTagSyncInputId,
            checked: workflowConfig.annotationTagSync,
            title: context.uiText(
              "保持注释生成的笔记标签与原始注释同步",
              "Keep Annotation Note Tags Synced with Source Annotations",
            ),
          }),
        })}
      </div>
    `,
  });
}

function buildObsidianNoteDesignPanelHTML(context: ObsidianPrefsLayoutContext) {
  const { ids, contentConfig, translationConfig } = context;
  return renderSectionHTML(context, {
    panel: "noteDesign",
    title: context.uiText("笔记", "Notes"),
    bodyHTML: `
      ${renderFormRowHTML(context, {
        label: context.uiText("命名模板", "Filename Template"),
        forId: ids.fileNameTemplateInputId,
        controlHTML: renderInputHTML(context, {
          id: ids.fileNameTemplateInputId,
          value: context.fileNameTemplate,
          placeholder: "{{title}} -- {{uniqueKey}}",
        }),
        hintText: context.uiText(
          "支持模板变量；悬停“当前规则”可查看可用字段。",
          "Template tokens are supported; hover the current rule to see available fields.",
        ),
      })}

      <div class="ob-bridge-inline-summary">
        <span>${context.escapeHTML(context.uiText("命名规则", "Naming Rule"))}</span>
        <span> · </span>
        <span
          id="${context.escapeHTML(ids.fileNameRuleId)}"
          data-ob-tooltip="file-name-template"
        ></span>
      </div>

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
            label: context.uiText(
              "打开属性输出工作台",
              "Open Property Output Studio",
            ),
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
            label: context.uiText(
              "打开字段分流工作台",
              "Open Field Routing Studio",
            ),
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
            title: context.uiText("同步后在 Ob 打开", "Open in Obsidian"),
          }),
          renderChoiceLineHTML(context, {
            inputType: "checkbox",
            inputId: ids.revealAfterSyncInputId,
            checked: context.revealAfterSync,
            title: context.uiText("同步后在文件夹显示", "Reveal in Folder"),
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
            title: context.uiText(
              "同步前补全缺失翻译",
              "Fill Missing Translations",
            ),
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

function buildObsidianAboutPanelHTML(context: ObsidianPrefsLayoutContext) {
  const { workflowConfig } = context;
  const aboutLinksHTML = workflowConfig.aboutLinks
    .map((link, index) => {
      const divider =
        index < workflowConfig.aboutLinks.length - 1
          ? `<span class="ob-bridge-linkDivider">|</span>`
          : "";
      return `${renderButtonHTML(context, {
        label: link.label,
        variant: "link",
        url: link.href,
      })}${divider}`;
    })
    .join("");
  return renderSectionHTML(context, {
    panel: "about",
    title: context.uiText("关于", "About"),
    bodyHTML: `
      <div class="ob-bridge-aboutPanel">
        <div class="ob-bridge-linkRow">${aboutLinksHTML}</div>
        <div class="ob-bridge-inline ob-bridge-aboutPanel__meta">${context.escapeHTML(
          workflowConfig.aboutMeta,
        )}</div>
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
      ${buildObsidianWorkflowPanelHTML(context)}
      ${buildObsidianAboutPanelHTML(context)}
    </div>
  `;
}

export { buildObsidianSettingsShellHTML };
export type { ObsidianPrefsLayoutContext };
