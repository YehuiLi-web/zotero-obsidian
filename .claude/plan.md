# Plan: prefsUI 拆分 + metadata preset / preview / child note bridge 打磨 + 错误提示优化

## 1. 拆分 `prefsUI.ts`（3673 行 → 6 个模块）

当前 `prefsUI.ts` 包含 6 大职责，按职责拆分到 `src/modules/obsidian/prefsUI/` 目录：

| 新文件 | 来源行范围 (约) | 职责 |
|--------|----------------|------|
| `prefsUI/state.ts` | L139-223, L173-176 | `obsidianPrefsState`、类型定义 (`ObsidianPrefsTab`, `PreviewStatus`, `ConnectionStatus`)、ID 常量 (L142-171) |
| `prefsUI/helpers.ts` | L227-500 | DOM helpers (`getPrefWindowDocument`, `setPrefElementValue`, etc.)、prompt 工具 (`promptChoice`, `promptSelectIndex`)、文件夹选取 (`pickObsidianFolderManually`)、setup draft 操作 (`buildCurrentObsidianSetupDraft`, `applyObsidianSetupDraft`)、vault detection/confirm |
| `prefsUI/wizard.ts` | L505-835 | 模板选择 (`chooseObsidianItemTemplate`, `getObsidianItemTemplateCandidates`)、setup wizard (`runObsidianSetupWizard`, `maybeAutoRunObsidianSetupWizard`)、auto-detect vault |
| `prefsUI/preview.ts` | L1457-2195 | 预览系统 (`resolvePreviewTopItem`, `getPreviewSourceItem`, `generateObsidianPreview`, `renderPreviewPanel`, `markPreviewStale`, `renderFileNamePreview`)、annotation preview、child note preview markdown |
| `prefsUI/metadataPreset.ts` | L2452-2800, L3507-3600 | Metadata preset editor (`ensureMetadataPresetEditorState`, `renderMetadataPresetFieldList`, `renderMetadataPresetEditor`, `saveObsidianMetadataPreset`, `duplicateObsidianMetadataPreset`, `deleteObsidianMetadataPreset`, `resetObsidianMetadataPreset`) |
| `prefsUI/index.ts` | L839-1300, L2800-3665 | 入口：DOM 渲染 (`renderObsidianSettingsShell`)、事件绑定 (`bindObsidianPrefsEvents`)、hydrate (`hydrateStaticObsidianPrefsControls`)、`refreshObsidianPrefsUI`、tab切换、connection diagnostics、`pickObsidianPath`；re-export 公共 API |

已有的 `prefsUI/layout.ts` 和 `prefsUI/style.ts` 保持不变。

### 拆分步骤：
1. 创建 `prefsUI/state.ts` — 常量 + 状态 + 类型
2. 创建 `prefsUI/helpers.ts` — DOM helpers + prompt 工具
3. 创建 `prefsUI/wizard.ts` — 向导 + vault 检测
4. 创建 `prefsUI/preview.ts` — 预览系统
5. 创建 `prefsUI/metadataPreset.ts` — preset 编辑器
6. 重写 `prefsUI/index.ts` — 入口 + 事件绑定 + hydrate
7. 更新 `prefsUI.ts` → 改为纯 re-export 桶文件（或直接删除，更新所有引用）
8. 验证 build 通过

---

## 2. 打磨 Metadata Preset

**当前问题：**
- 保存/删除/重复 preset 无确认反馈
- 删除最后一个 preset 的提示用 `showHint` 一闪即逝
- 搜索框无 debounce，快速输入时闪烁
- preset 名称为空时保存不报错

**改进：**
- `saveObsidianMetadataPreset()`: 保存成功后显示含 preset 名称的 hint
- `deleteObsidianMetadataPreset()`: 增加二次确认 prompt（不是 alert）
- `duplicateObsidianMetadataPreset()`: 成功后 hint 含新名称
- 名称输入为空时禁用保存按钮或给出行内提示
- 搜索输入加 150ms debounce

---

## 3. 打磨 Preview

**当前问题：**
- `generateObsidianPreview()` 的 catch 块用 `String(error)` 生成 message，不够友好
- loading 状态无 "正在生成…" 文字
- 预览区没有骨架占位
- 没有当前选中条目时预览按钮未置灰

**改进：**
- loading 时 meta 区域显示 "正在为 {title} 生成预览…"
- error 时区分 "无选中条目"、"模板错误"、"路径错误" 三类错误
- 按钮在 loading 时 disabled
- 无选中条目时预览按钮 disabled + tooltip

---

## 4. 打磨 Child Note Bridge

**当前问题：**
- `promptChildNotesForSingleItemSync()` 的选择对话框内容较单调
- 子笔记为 0 时直接跳过无提示
- 子笔记标签输入框无 placeholder / 验证

**改进：**
- tags 输入框添加 placeholder 示例文本
- 如果用户输入的 tag 格式异常（如含 `#`），行内自动修正并显示 hint
- 子笔记匹配结果为 0 且 includeChildNotes 为 true 时在预览面板显示提示

---

## 5. 优化错误提示与同步反馈

**sync.ts 问题：**
- `syncSelectedItemsToObsidian()` L976: `Zotero.getMainWindow().alert(String(e))` — 原生 alert + 纯 error.toString()
- `resyncAllManagedObsidianNotes()` L619: 同样用 alert(String(e))
- 空选中时硬编码中文字符串 L930

**改进清单：**
1. 将 `alert(String(e))` 替换为结构化错误处理：
   - 提取 error.message 或特定 error code
   - 使用 locale 字符串 + `showHint` 代替 alert
   - 增加 "查看详情" 链接（写入 ztoolkit.log）
2. 同步完成后 hint 中增加文件路径缩写
3. L930 的中文硬编码改用 `uiText()` 或 locale key
4. `openItemsInObsidian()` 失败时区分 "无笔记" 和 "无文件" 两种情况
5. 连接测试 (`testObsidianConnection`) 失败时显示具体路径和权限信息

---

## 执行顺序

1. **Phase 1** — 拆分 prefsUI.ts（纯重构，不改行为）
2. **Phase 2** — 打磨 metadata preset + preview + child note
3. **Phase 3** — 优化错误提示和同步反馈
4. **Phase 4** — 验证 build + 运行测试
