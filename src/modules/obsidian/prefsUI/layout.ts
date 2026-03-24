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

function renderChoiceCardHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    inputType: "radio" | "checkbox";
    name?: string;
    value?: string;
    inputId?: string;
    checked: boolean;
    disabled?: boolean;
    title: string;
    description: string;
    badge?: string;
  },
) {
  const esc = context.escapeHTML;
  const inputAttrs = [
    options.inputId ? `id="${esc(options.inputId)}"` : "",
    options.name ? `name="${esc(options.name)}"` : "",
    options.value ? `value="${esc(options.value)}"` : "",
    checkedAttr(options.checked),
    options.disabled ? `disabled="disabled"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <label class="ob-bridge-choice">
      <input type="${options.inputType}" ${inputAttrs}/>
      <span class="ob-bridge-choice__body">
        ${
          options.badge
            ? `<span class="ob-bridge-choice__badge">${esc(options.badge)}</span>`
            : ""
        }
        <span class="ob-bridge-choice__title">${esc(options.title)}</span>
        <span class="ob-bridge-choice__desc">${esc(options.description)}</span>
      </span>
    </label>
  `;
}

function renderPathFieldHTML(
  context: ObsidianPrefsLayoutContext,
  options: {
    label: string;
    inputId: string;
    value: string;
    action: string;
    buttonLabel: string;
    hintId: string;
  },
) {
  const esc = context.escapeHTML;
  return `
    <div class="ob-bridge-field">
      <label class="ob-bridge-field__label" for="${esc(options.inputId)}">${esc(
        options.label,
      )}</label>
      <div class="ob-bridge-field__row">
        <input class="ob-bridge-input" id="${esc(options.inputId)}" value="${esc(
          options.value,
        )}" />
        <button type="button" class="ob-bridge-button" data-ob-action="${esc(
          options.action,
        )}">${esc(options.buttonLabel)}</button>
      </div>
      <div class="ob-bridge-hint" id="${esc(options.hintId)}"></div>
    </div>
  `;
}

function buildObsidianConnectionPanelHTML(context: ObsidianPrefsLayoutContext) {
  const esc = context.escapeHTML;
  const { appPath, vaultRoot, notesDir, assetsDir } = context.resolvedPaths;
  const { ids } = context;

  return `
    <section class="ob-bridge-panel" data-ob-panel="connection">
      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("连接状态", "Connection Status"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "先确认插件现在能不能写入你的 Obsidian 工作区。这里会告诉你路径是否有效，以及默认目录会落到哪里。",
            "Confirm that the plugin can write into your Obsidian workspace. This section shows whether the paths are valid and where default folders will resolve.",
          ),
        )}</p>
        <div id="${esc(ids.connectionStatusId)}"></div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("路径设置", "Paths"),
        )}</h3>
        <div class="ob-bridge-stack">
          <div class="ob-bridge-field">
            <label class="ob-bridge-field__label" for="${esc(
              ids.appPathInputId,
            )}">${esc(context.uiText("Obsidian 路径", "Obsidian Path"))}</label>
            <div class="ob-bridge-field__row">
              <input class="ob-bridge-input" id="${esc(
                ids.appPathInputId,
              )}" value="${esc(appPath)}" />
              <button type="button" class="ob-bridge-button" data-ob-action="pick-app">${esc(
                context.getString("obsidian-pickFile", "label"),
              )}</button>
            </div>
            <div class="ob-bridge-hint">${esc(
              context.uiText(
                "不填也能同步文件，但“同步后打开 Obsidian”体验会更不确定。",
                "Syncing files can still work without this, but opening Obsidian after sync may be less reliable.",
              ),
            )}</div>
          </div>

          ${renderPathFieldHTML(context, {
            label: context.uiText("Vault 目录", "Vault Folder"),
            inputId: ids.vaultRootInputId,
            value: vaultRoot,
            action: "pick-vault",
            buttonLabel: context.getString("obsidian-pickFolder", "label"),
            hintId: ids.vaultRootHintId,
          })}

          ${renderPathFieldHTML(context, {
            label: context.uiText("笔记目录", "Notes Folder"),
            inputId: ids.notesDirInputId,
            value: notesDir,
            action: "pick-notes",
            buttonLabel: context.getString("obsidian-pickFolder", "label"),
            hintId: ids.notesDirHintId,
          })}

          ${renderPathFieldHTML(context, {
            label: context.uiText("资源目录", "Assets Folder"),
            inputId: ids.assetsDirInputId,
            value: assetsDir,
            action: "pick-assets",
            buttonLabel: context.getString("obsidian-pickFolder", "label"),
            hintId: ids.assetsDirHintId,
          })}
        </div>
        <div class="ob-bridge-inline-summary">${esc(
          context.uiText(
            "不想手动填完整路径时，可以先自动检测 Vault，再用向导补完推荐目录和模板。",
            "If you do not want to fill every path manually, auto-detect a vault first and let the wizard finish the recommended folders and template.",
          ),
        )}</div>
        <div class="ob-bridge-button-row">
          <button type="button" class="ob-bridge-button" data-ob-action="detect-vault">${esc(
            context.uiText("自动检测 Vault", "Auto Detect Vault"),
          )}</button>
          <button type="button" class="ob-bridge-button ob-bridge-button--primary" data-ob-action="run-setup-wizard">${esc(
            context.uiText("运行配置向导", "Run Setup Wizard"),
          )}</button>
        </div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("测试连接", "Test Connection"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "点击后会尝试在文献笔记目录写入一个测试 Markdown 文件，用最直接的方式验证权限。",
            "This writes a small Markdown file into the literature note folder to verify permissions directly.",
          ),
        )}</p>
        <div class="ob-bridge-button-row">
          <button type="button" class="ob-bridge-button ob-bridge-button--primary" id="${esc(
            ids.connectionTestButtonId,
          )}">${esc(
            context.uiText("测试写入一个文件", "Write a Test File"),
          )}</button>
        </div>
        <div id="${esc(ids.connectionTestResultId)}" class="ob-bridge-feedback"></div>
      </div>
    </section>
  `;
}

function buildObsidianNoteDesignPanelHTML(context: ObsidianPrefsLayoutContext) {
  const esc = context.escapeHTML;
  const { ids, contentConfig, fileNameTemplate } = context;

  return `
    <section class="ob-bridge-panel" data-ob-panel="noteDesign">
      <div class="ob-bridge-note-design">
        <div class="ob-bridge-stack">
          <div class="ob-bridge-card">
            <h3 class="ob-bridge-card__title">${esc(
              context.uiText("文件命名与位置", "Filename & Location"),
            )}</h3>
            <p class="ob-bridge-card__help">${esc(
              context.uiText(
                "文件名现在固定为“标题 + 稳定短哈希”，避免不同条目生成同名文件，也不会随着内容改动而漂移。",
                "Filenames are now fixed to “title + stable short hash”, avoiding collisions without drifting when note content changes.",
              ),
            )}</p>
            <div class="ob-bridge-inline-summary">${esc(
              context.uiText(
                `固定规则：${fileNameTemplate}。其中 uniqueKey 基于 libraryID + item.key 生成。`,
                `Fixed rule: ${fileNameTemplate}. uniqueKey is derived from libraryID + item.key.`,
              ),
            )}</div>
            <div class="ob-bridge-preview-section">
              <div class="ob-bridge-preview-label">${esc(
                context.uiText("实时文件名预览", "Live Filename Preview"),
              )}</div>
              <div class="ob-bridge-preview-value" id="${esc(
                ids.fileNamePreviewId,
              )}"></div>
              <div class="ob-bridge-hint" id="${esc(
                ids.fileNameContextId,
              )}"></div>
            </div>
          </div>

          <div class="ob-bridge-card">
            <h3 class="ob-bridge-card__title">${esc(
              context.uiText("笔记内容结构", "Note Structure"),
            )}</h3>
            <p class="ob-bridge-card__help">${esc(
              context.uiText(
                "用模块来控制文献笔记里真正会出现的内容，而不是把一堆零散复选框堆在一起。",
                "Control the actual sections of the literature note with modules instead of a flat list of checkboxes.",
              ),
            )}</p>
            <div class="ob-bridge-choice-grid">
              ${renderChoiceCardHTML(context, {
                inputType: "checkbox",
                inputId: ids.includeMetadataInputId,
                checked: contentConfig.includeMetadata,
                title: context.uiText("元数据", "Metadata"),
                description: context.uiText(
                  "作者、期刊、标签与基础书目信息块。",
                  "Authors, publication, tags, and core bibliographic blocks.",
                ),
              })}
              ${renderChoiceCardHTML(context, {
                inputType: "checkbox",
                inputId: ids.includeAbstractInputId,
                checked: contentConfig.includeAbstract,
                title: "Abstract",
                description: context.uiText(
                  "原摘要与摘要翻译块。",
                  "Original abstract and translated abstract blocks.",
                ),
              })}
              ${renderChoiceCardHTML(context, {
                inputType: "checkbox",
                inputId: ids.includeAnnotationsInputId,
                checked: contentConfig.includeAnnotations,
                title: context.uiText("PDF 批注", "PDF Annotations"),
                description: context.uiText(
                  "把高亮、批注和评论整理到联动笔记里。",
                  "Bring highlights, annotations, and comments into the managed note.",
                ),
              })}
              <div class="ob-bridge-choice">
                <span class="ob-bridge-choice__body">
                  <span class="ob-bridge-choice__title">${esc(
                    context.uiText("我的笔记区", "My Notes"),
                  )}</span>
                  <span class="ob-bridge-choice__desc">${esc(
                    context.uiText(
                      "用户手写内容始终保留，不会被托管区覆盖。",
                      "Your handwritten note sections are always preserved.",
                    ),
                  )}</span>
                </span>
              </div>
            </div>

            <details class="ob-bridge-details">
              <summary>${esc(
                context.uiText(
                  "展开高级内容模块",
                  "Show Advanced Content Modules",
                ),
              )}</summary>
              <div class="ob-bridge-choice-grid">
                ${renderChoiceCardHTML(context, {
                  inputType: "checkbox",
                  inputId: ids.includeHiddenInfoInputId,
                  checked: contentConfig.includeHiddenInfo,
                  title: context.uiText("隐藏字段", "Hidden Fields"),
                  description: context.uiText(
                    "保留更多供 Dataview 或脚本使用的附加字段。",
                    "Keep extra fields that are useful for Dataview or scripts.",
                  ),
                })}
                ${renderChoiceCardHTML(context, {
                  inputType: "checkbox",
                  inputId: ids.includeChildNotesInputId,
                  checked: contentConfig.includeChildNotes,
                  title: context.uiText("子笔记嫁接", "Child Note Stitching"),
                  description: context.uiText(
                    "把命中规则的子笔记内容拼进文献笔记。",
                    "Stitch matching child notes into the literature note.",
                  ),
                })}
              </div>
            </details>
          </div>

          <div class="ob-bridge-card">
            <h3 class="ob-bridge-card__title">${esc(
              context.uiText("模板", "Template"),
            )}</h3>
            <p class="ob-bridge-card__help">${esc(
              context.uiText(
                "模板决定新建联动笔记的用户笔记区初始结构。预览面板会尽量按当前模板一起展示最终结果。",
                "The template defines the initial user-note structure for a new managed note. The preview tries to reflect that template in the final result.",
              ),
            )}</p>
            <div class="ob-bridge-field">
              <label class="ob-bridge-field__label" for="${esc(
                ids.itemTemplateDisplayId,
              )}">${esc(context.getString("obsidian-itemTemplate-label"))}</label>
              <input class="ob-bridge-input" id="${esc(
                ids.itemTemplateDisplayId,
              )}" readonly="readonly" value="" />
            </div>
            <div class="ob-bridge-button-row">
              <button type="button" class="ob-bridge-button" data-ob-action="pick-template">${esc(
                context.getString("obsidian-itemTemplate-pick", "label"),
              )}</button>
              <button type="button" class="ob-bridge-button" data-ob-action="edit-template">${esc(
                context.uiText("编辑模板", "Edit Template"),
              )}</button>
            </div>
          </div>
        </div>

        <aside class="ob-bridge-card ob-bridge-preview">
          <h3 class="ob-bridge-card__title">${esc(
            context.uiText("生成预览", "Generated Preview"),
          )}</h3>
          <p class="ob-bridge-card__help">${esc(
            context.uiText(
              "预览会优先使用当前选中的 Zotero 文献。这样你能在真正同步前看到文件名、frontmatter 和 Markdown 结果。",
              "The preview uses the currently selected Zotero item whenever possible, so you can inspect the filename, frontmatter, and Markdown before syncing.",
            ),
          )}</p>
          <div class="ob-bridge-button-row">
            <button type="button" class="ob-bridge-button ob-bridge-button--primary" id="${esc(
              ids.previewTriggerId,
            )}">${esc(context.uiText("生成预览", "Generate Preview"))}</button>
          </div>
          <div id="${esc(ids.previewMetaId)}" class="ob-bridge-preview-meta"></div>
          <div class="ob-bridge-preview-section">
            <div class="ob-bridge-preview-label">${esc(
              context.uiText("文件名", "Filename"),
            )}</div>
            <div class="ob-bridge-preview-value" id="${esc(
              ids.previewFileId,
            )}"></div>
          </div>
          <div class="ob-bridge-preview-section">
            <div class="ob-bridge-preview-label">Frontmatter</div>
            <pre class="ob-bridge-code" id="${esc(
              ids.previewFrontmatterId,
            )}"></pre>
          </div>
          <div class="ob-bridge-preview-section">
            <div class="ob-bridge-preview-label">Markdown</div>
            <pre class="ob-bridge-code" id="${esc(ids.previewBodyId)}"></pre>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function buildObsidianSyncPanelHTML(context: ObsidianPrefsLayoutContext) {
  const esc = context.escapeHTML;
  const { ids, groupNames, translationConfig } = context;

  return `
    <section class="ob-bridge-panel" data-ob-panel="sync">
      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("同步范围", "Sync Scope"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "决定点击“立即同步”时会处理哪些文献。",
            "Decide which items are processed when you click Sync Now.",
          ),
        )}</p>
        <div class="ob-bridge-choice-grid">
          ${renderChoiceCardHTML(context, {
            inputType: "radio",
            name: groupNames.syncScope,
            value: "selection",
            checked: context.syncScope === "selection",
            title: context.uiText("当前选中", "Current Selection"),
            description: context.uiText(
              "适合单篇文献或小范围调试。",
              "Best for one paper or small-scale testing.",
            ),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "radio",
            name: groupNames.syncScope,
            value: "currentList",
            checked: context.syncScope === "currentList",
            title: context.uiText("当前列表", "Current List"),
            description: context.uiText(
              "把当前列表或搜索结果里的文献一起处理。",
              "Process the items in the current list or search result.",
            ),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "radio",
            name: groupNames.syncScope,
            value: "library",
            checked: context.syncScope === "library",
            title: context.uiText("整个库", "Whole Library"),
            description: context.uiText(
              "适合大批量初始化或全量重同步。",
              "Best for initial bulk setup or full re-syncs.",
            ),
          })}
        </div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("同步内容", "Sync Content"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "同步页只负责告诉你“会同步什么”；真正的结构调整留在“笔记结构”里完成。",
            "This page summarizes what will be synced; detailed structure changes stay in Note Design.",
          ),
        )}</p>
        <div id="${esc(ids.contentSummaryId)}" class="ob-bridge-inline-summary"></div>
        <div class="ob-bridge-button-row">
          <button type="button" class="ob-bridge-button" data-ob-action="open-note-design">${esc(
            context.uiText("去笔记结构调整", "Adjust in Note Design"),
          )}</button>
        </div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("更新策略", "Update Strategy"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "这是最关键的安全设置之一。默认推荐只更新插件托管区，尽量不碰你的手写内容。",
            "This is one of the most important safety settings. The recommended mode updates only the managed blocks and avoids touching your own writing.",
          ),
        )}</p>
        <div class="ob-bridge-choice-grid">
          ${renderChoiceCardHTML(context, {
            inputType: "radio",
            name: groupNames.updateStrategy,
            value: "managed",
            checked: context.updateStrategy === "managed",
            title: context.uiText("只更新托管区", "Update managed blocks only"),
            description: context.uiText(
              "推荐。保留用户笔记区，只刷新插件生成的内容。",
              "Recommended. Preserve user sections and refresh only generated blocks.",
            ),
            badge: context.uiText("推荐", "Recommended"),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "radio",
            name: groupNames.updateStrategy,
            value: "overwrite",
            checked: context.updateStrategy === "overwrite",
            title: context.uiText("覆盖全部内容", "Overwrite everything"),
            description: context.uiText(
              "危险。会按当前结果重写整篇笔记，适合强制重建。",
              "Dangerous. Rewrites the whole note using the current output.",
            ),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "radio",
            name: groupNames.updateStrategy,
            value: "skip",
            checked: context.updateStrategy === "skip",
            title: context.uiText("跳过已有笔记", "Skip existing notes"),
            description: context.uiText(
              "只为新文献创建联动笔记，已存在的笔记不动。",
              "Only create notes for new items and leave existing notes untouched.",
            ),
          })}
        </div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("自动行为", "Automatic Behaviors"),
        )}</h3>
        <div class="ob-bridge-choice-grid">
          ${renderChoiceCardHTML(context, {
            inputType: "checkbox",
            inputId: ids.autoSyncInputId,
            checked: context.autoSync,
            title: context.uiText("自动同步", "Auto Sync"),
            description: context.uiText(
              "保存或批量处理时尽量自动写入 Obsidian 目录。",
              "Try to write into the Obsidian folder automatically during saves or bulk operations.",
            ),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "checkbox",
            inputId: ids.watchFilesInputId,
            checked: context.watchFiles,
            title: context.uiText("主动监视文件变化", "Watch File Changes"),
            description: context.uiText(
              "主动感知 Obsidian 侧文件修改，并自动触发受影响笔记的同步。",
              "Actively detect file changes from Obsidian and trigger sync for affected notes.",
            ),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "checkbox",
            inputId: ids.openAfterSyncInputId,
            checked: context.openAfterSync,
            title: context.uiText(
              "同步后打开 Obsidian",
              "Open Obsidian After Sync",
            ),
            description: context.uiText(
              "同步完成后直接切到 Obsidian 对应笔记。",
              "Jump to the corresponding Obsidian note after syncing.",
            ),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "checkbox",
            inputId: ids.revealAfterSyncInputId,
            checked: context.revealAfterSync,
            title: context.uiText("同步后定位文件", "Reveal File After Sync"),
            description: context.uiText(
              "在系统文件夹中定位刚生成的 Markdown 文件。",
              "Reveal the generated Markdown file in the system file explorer.",
            ),
          })}
        </div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("缺失翻译补全", "Missing Translation Autofill"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "同步前可调用 Translate for Zotero 为缺失的标题或摘要翻译补齐 extra 字段。未安装外部翻译插件时，会直接跳过，不影响主同步。",
            "Before syncing, call Translate for Zotero to backfill missing title or abstract translations into item extra fields. If the external plugin is unavailable, syncing continues normally.",
          ),
        )}</p>
        <div class="ob-bridge-choice-grid">
          ${renderChoiceCardHTML(context, {
            inputType: "checkbox",
            inputId: ids.translateMissingMetadataInputId,
            checked: translationConfig.enabled,
            title: context.uiText("同步前自动补齐缺失翻译", "Autofill missing translations before sync"),
            description: context.uiText(
              "总开关。启用后，才会尝试调用外部翻译插件。",
              "Master switch. When enabled, the plugin may call the external translator.",
            ),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "checkbox",
            inputId: ids.translateMissingTitleInputId,
            checked: translationConfig.includeTitle,
            disabled: !translationConfig.enabled,
            title: context.uiText("补标题翻译", "Fill title translations"),
            description: context.uiText(
              "仅当 titleTranslation 为空时翻译标题并回写。",
              "Translate and write back the title only when titleTranslation is empty.",
            ),
          })}
          ${renderChoiceCardHTML(context, {
            inputType: "checkbox",
            inputId: ids.translateMissingAbstractInputId,
            checked: translationConfig.includeAbstract,
            disabled: !translationConfig.enabled,
            title: context.uiText("补摘要翻译", "Fill abstract translations"),
            description: context.uiText(
              "仅当 abstractTranslation 为空时翻译摘要并回写。",
              "Translate and write back the abstract only when abstractTranslation is empty.",
            ),
          })}
        </div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("执行前摘要", "Before You Sync"),
        )}</h3>
        <div id="${esc(ids.syncSummaryId)}" class="ob-bridge-inline-summary"></div>
        <div class="ob-bridge-button-row">
          <button type="button" class="ob-bridge-button ob-bridge-button--primary ob-bridge-button--cta" data-ob-action="sync-now">${esc(
            context.getString("obsidian-syncNow", "label"),
          )}</button>
        </div>
      </div>
    </section>
  `;
}

function buildObsidianAdvancedPanelHTML(context: ObsidianPrefsLayoutContext) {
  const esc = context.escapeHTML;
  const { ids } = context;

  return `
    <section class="ob-bridge-panel" data-ob-panel="advanced">
      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("属性字段预设", "Frontmatter Presets"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "这里控制 Obsidian frontmatter 里显示哪些托管字段。普通用户通常只需要推荐预设。",
            "Control which managed fields appear in the Obsidian frontmatter. Most people can stay on the recommended preset.",
          ),
        )}</p>
        <div id="${esc(ids.frontmatterSummaryId)}" class="ob-bridge-inline-summary"></div>
        <div id="${esc(ids.frontmatterFieldListId)}"></div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("Metadata 字段控制", "Metadata Field Control"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "按条目类型精细控制哪些字段进 Metadata、哪些字段进隐藏区；适合 Dataview / Bases 工作流。",
            "Fine-tune which fields go into Metadata and which stay hidden for each item type. Useful for Dataview and Bases workflows.",
          ),
        )}</p>
        <div class="ob-bridge-metadataGrid">
          <div class="ob-bridge-field">
            <label class="ob-bridge-field__label" for="${esc(
              ids.metadataPresetSelectId,
            )}">${esc(
              context.getString("obsidian-metadataPreset-active-label"),
            )}</label>
            <select class="ob-bridge-select" id="${esc(
              ids.metadataPresetSelectId,
            )}"></select>
          </div>
          <div class="ob-bridge-field">
            <label class="ob-bridge-field__label" for="${esc(
              ids.metadataPresetNameInputId,
            )}">${esc(
              context.getString("obsidian-metadataPreset-name-label"),
            )}</label>
            <input class="ob-bridge-input" id="${esc(
              ids.metadataPresetNameInputId,
            )}" />
          </div>
          <div class="ob-bridge-field">
            <label class="ob-bridge-field__label" for="${esc(
              ids.metadataPresetSectionId,
            )}">${esc(
              context.getString("obsidian-metadataPreset-itemType-label"),
            )}</label>
            <select class="ob-bridge-select" id="${esc(
              ids.metadataPresetSectionId,
            )}"></select>
          </div>
          <div class="ob-bridge-field">
            <label class="ob-bridge-field__label" for="${esc(
              ids.metadataPresetSearchId,
            )}">${esc(
              context.getString("obsidian-metadataPreset-search-label"),
            )}</label>
            <input class="ob-bridge-input" id="${esc(
              ids.metadataPresetSearchId,
            )}" />
          </div>
        </div>
        <div class="ob-bridge-button-row">
          <button type="button" class="ob-bridge-button" id="${esc(
            ids.metadataPresetSaveButtonId,
          )}">${esc(
            context.getString("obsidian-metadataPreset-save", "label"),
          )}</button>
          <button type="button" class="ob-bridge-button" id="${esc(
            ids.metadataPresetDuplicateButtonId,
          )}">${esc(
            context.getString("obsidian-metadataPreset-saveAs", "label"),
          )}</button>
          <button type="button" class="ob-bridge-button" id="${esc(
            ids.metadataPresetResetButtonId,
          )}">${esc(
            context.getString("obsidian-metadataPreset-reset", "label"),
          )}</button>
          <button type="button" class="ob-bridge-button" id="${esc(
            ids.metadataPresetDeleteButtonId,
          )}">${esc(
            context.getString("obsidian-metadataPreset-delete", "label"),
          )}</button>
          <button type="button" class="ob-bridge-button" id="${esc(
            ids.metadataPresetResyncButtonId,
          )}">${esc(
            context.getString("obsidian-metadataPreset-resync", "label"),
          )}</button>
        </div>
        <div id="${esc(ids.metadataPresetSummaryId)}" class="ob-bridge-inline-summary"></div>
        <div id="${esc(ids.metadataPresetFieldListId)}"></div>
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("子笔记规则", "Child Note Rules"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "这是 expert 功能。只有命中这些标签的子笔记，才会被嫁接进文献主笔记里。",
            "This is an expert feature. Only child notes carrying these tags are stitched into the main literature note.",
          ),
        )}</p>
        <div class="ob-bridge-field">
          <label class="ob-bridge-field__label" for="${esc(
            ids.childNoteTagsInputId,
          )}">${esc(
            context.getString("obsidian-childNotes-tags-label"),
          )}</label>
          <input class="ob-bridge-input" id="${esc(
            ids.childNoteTagsInputId,
          )}" value="${esc(context.childNoteTags)}" />
        </div>
        ${renderChoiceCardHTML(context, {
          inputType: "checkbox",
          inputId: ids.childNotePromptSelectInputId,
          checked: context.childNotePrompt,
          title: context.getString("obsidian-childNotes-promptSelect", "label"),
          description: context.getString(
            "obsidian-childNotes-prompt-help",
            "value",
          ),
        })}
      </div>

      <div class="ob-bridge-card">
        <h3 class="ob-bridge-card__title">${esc(
          context.uiText("维护工具", "Maintenance"),
        )}</h3>
        <p class="ob-bridge-card__help">${esc(
          context.uiText(
            "把不常用但很重要的能力放在这里：统计面板、修复映射、以及自动初始化。",
            "Less frequently used but important tools live here: dashboards, link repair, and automatic setup.",
          ),
        )}</p>
        <div class="ob-bridge-field">
          <label class="ob-bridge-field__label" for="${esc(
            ids.dashboardDirInputId,
          )}">${esc(context.uiText("统计面板目录", "Dashboard Folder"))}</label>
          <div class="ob-bridge-field__row">
            <input class="ob-bridge-input" id="${esc(
              ids.dashboardDirInputId,
            )}" value="${esc(context.resolvedPaths.dashboardDir)}" />
            <button type="button" class="ob-bridge-button" data-ob-action="pick-dashboard">${esc(
              context.getString("obsidian-pickFolder", "label"),
            )}</button>
          </div>
          <div class="ob-bridge-hint" id="${esc(ids.dashboardDirHintId)}"></div>
        </div>
        ${renderChoiceCardHTML(context, {
          inputType: "checkbox",
          inputId: ids.dashboardAutoSetupInputId,
          checked: context.dashboardAutoSetup,
          title: context.getString("obsidian-dashboardAutoSetup", "label"),
          description: context.getString("obsidian-dashboard-help", "value"),
        })}
        <div class="ob-bridge-button-row">
          <button type="button" class="ob-bridge-button" data-ob-action="setup-dashboard">${esc(
            context.getString("obsidian-setupDashboards", "label"),
          )}</button>
          <button type="button" class="ob-bridge-button" data-ob-action="repair-links">${esc(
            context.getString("obsidian-repairManagedLinks", "label"),
          )}</button>
        </div>
      </div>
    </section>
  `;
}

function buildObsidianSettingsShellHTML(context: ObsidianPrefsLayoutContext) {
  const esc = context.escapeHTML;
  return `
      <div class="ob-bridge-settings">
        <div class="ob-bridge-hero">
          <div class="ob-bridge-hero__eyebrow">${esc(
            context.uiText("研究工作流配置中心", "Research Workflow Setup"),
          )}</div>
          <div class="ob-bridge-hero__title">${esc(
            context.uiText(
              "按“连接 → 笔记结构 → 同步行为”完成联动配置",
              "Set up the bridge in Connection → Note Design → Sync Behavior",
            ),
          )}</div>
          <div class="ob-bridge-hero__desc">${esc(
            context.uiText(
              "这页不再只是配置项堆叠，而是按真实研究流程组织：先连上，再看笔记会长什么样，最后决定如何同步。",
              "This page now follows the real workflow: connect first, preview the note shape, then decide how syncing should behave.",
            ),
          )}</div>
        </div>

        <div class="ob-bridge-tabs" role="tablist">
          <button type="button" class="ob-bridge-tab" data-ob-tab="connection" aria-selected="false">
            <span class="ob-bridge-tab__step">Step 1</span>
            <span class="ob-bridge-tab__label">${esc(
              context.uiText("连接", "Connection"),
            )}</span>
          </button>
          <button type="button" class="ob-bridge-tab" data-ob-tab="noteDesign" aria-selected="false">
            <span class="ob-bridge-tab__step">Step 2</span>
            <span class="ob-bridge-tab__label">${esc(
              context.uiText("笔记结构", "Note Design"),
            )}</span>
          </button>
          <button type="button" class="ob-bridge-tab" data-ob-tab="sync" aria-selected="false">
            <span class="ob-bridge-tab__step">Step 3</span>
            <span class="ob-bridge-tab__label">${esc(
              context.uiText("同步行为", "Sync Behavior"),
            )}</span>
          </button>
          <button type="button" class="ob-bridge-tab" data-ob-tab="advanced" aria-selected="false">
            <span class="ob-bridge-tab__step">Expert</span>
            <span class="ob-bridge-tab__label">${esc(
              context.uiText("高级", "Advanced"),
            )}</span>
          </button>
        </div>

        ${buildObsidianConnectionPanelHTML(context)}
        ${buildObsidianNoteDesignPanelHTML(context)}
        ${buildObsidianSyncPanelHTML(context)}
        ${buildObsidianAdvancedPanelHTML(context)}
      </div>
    `;
}

export { buildObsidianSettingsShellHTML };
export type { ObsidianPrefsLayoutContext };
