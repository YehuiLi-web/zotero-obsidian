# 评估绑定机制问题并制定整改策略

## 概述

- 梳理当前绑定与同步路径、关键数据结构、Frontmatter 用途以及用户区块读写流程，并提供精确代码定位。
- 把用户指出的五类问题逐一与实现对照，说明真实行为和触发抱怨的原因。
- 提出可落地的整改方案（含兼容/开关设计）、测试计划与前提假设，使产品重新符合“Zotero 管理元数据、Obsidian 管理笔记”的定位。

---

## 一、现状梳理（含代码引用）

### 1. 绑定与定位流程

| 环节 | 实现要点 | 代码位置 |
| --- | --- | --- |
| Zotero 条目 → 笔记映射 | 始终依赖内存/磁盘的 `itemNoteMap`，用 `libraryID/item.key` → `note.key` 查找；若命中即返回笔记，否则放弃。 | `src/modules/obsidian/paths.ts:397-421` |
| 文件路径与命名 | 同步时调用 `getManagedTargetPath`，总是取 `settings.notesDir + 模板文件名`，并通过 `maybeRenameLegacySyncedFile` 把已存在的文件强制改名。 | `src/modules/obsidian/sync.ts:279-349` |
| 文件名模板 | `getManagedFileNamePattern` 从首选项读取模板（默认 `{{title}} -- {{uniqueKey}}`），`applyManagedFileNameTemplate` 渲染并做字符清理。 | `src/modules/obsidian/paths.ts:360-395` |
| 目录配置 | `ensureObsidianSettings` 要求用户提供 `notesDir`，函数会创建目录并在所有导出中使用该路径。 | `src/modules/obsidian/settings.ts:306-348` |

### 2. Frontmatter 生成与用途

- `buildManagedFrontmatterData` 写入 `zotero_key`、`zotero_note_key`、`citation_key`（可选）、`bridge_managed` 等字段，但这些字段仅在“恢复断链”时读取。citesrc/modules/obsidian/frontmatter.ts:168-304
- `findManagedRecoveryCandidates` 与 `repairObsidianManagedLinks` 在批量扫描 `.md` 时解析 Frontmatter，以便根据 `zotero_key` 把孤立文件重新指向 Zotero 条目。常规同步入口 `syncSelectedItemsToObsidian` 并不会读取 Frontmatter。citesrc/modules/obsidian/sync.ts:97-205src/modules/obsidian/sync.ts:423-457

### 3. 用户区块读写流程

- 导出 Markdown 时固定输出：
  1. `<!-- addonRef:BEGIN/END GENERATED -->` 包含书目信息、摘要、注释等；
  2. `<!-- addonRef:BEGIN/END USER -->` 包含用户区。citesrc/modules/obsidian/markdown.ts:18-120src/modules/obsidian/managed.ts:686-829
- 导入 `fromMD` 时只要识别到 Managed 笔记，就会提取文件中的 `USER` 区块，作为 HTML 文本写回 Zotero Note 的正文，并更新 `itemNoteMap`。citesrc/modules/import/markdown.ts:90-205

### 4. 字段回写

- `applyManagedObsidianFrontmatter` 将 Frontmatter 中的 `reading_status/status` 写入条目 Extra，`rating` 写入原生字段或 Extra，`tags/zotero_tags` 同步到 Zotero 标签。即使用户在 Obsidian 端自定义 `tags`，也会被视为权威来源。citesrc/modules/obsidian/managed.ts:65-199

### 5. 模块化内容（模板）行为

- `renderManagedObsidianNoteMarkdown` 根据 `getManagedNoteContentConfig` 生成一整套 callout（元数据、标签、摘要、注释、隐藏信息等）。即使用户手动删除这些模块，只要设置里仍启用，就会在下次同步被重建。citesrc/modules/obsidian/managed.ts:784-810

---

## 二、问题对应分析

| 用户痛点 | 真实行为 | 触发原因代码 |
| --- | --- | --- |
| 1. 依赖文件名/位置绑定 | 常规同步只通过 `itemNoteMap` 获取 `note.key`，之后直接覆盖 `notesDir/模板文件名`；Frontmatter 不参与匹配，所以一旦用户重命名或移动文件，映射失效就会重新生成新文件。 | `paths.ts:397-421`；`sync.ts:308-349` |
| 2. 无“citekey + item key”双 ID | Frontmatter 虽写入 `citation_key` 与 `zotero_key`，但仅恢复流程查询 `zotero_key`。日常同步既不依赖 citekey，也没有 fallback；导致用户想手动绑笔记时无从下手。 | `frontmatter.ts:168-249`；`sync.ts:97-205` |
| 3. 强制目录/命名 | `ensureObsidianSettings` 必须配置 `notesDir`；`maybeRenameLegacySyncedFile` 会直接重命名磁盘文件；`getManagedTargetPath` 完全忽略用户当前路径。 | `settings.ts:306-348`；`sync.ts:279-349` |
| 4. 用户区块双向同步 | `fromMD` 把 `USER` 区块写回 Zotero Note；`applyManagedObsidianFrontmatter` 再将 Frontmatter 字段写回 Zotero 条目，导致 Obsidian 自由编辑区不再“只读”，冲突风险巨大。 | `import/markdown.ts:90-205`；`managed.ts:65-199` |
| 5. 布局僵化 | `renderManagedObsidianNoteMarkdown` 每次都写 callout；即便用户删除、替换或偏好纯 Frontmatter，也会被下一次同步覆盖。 | `managed.ts:784-810` |

---

## 三、整改方案（关键步骤）

1. **以 Frontmatter ID 为权威匹配**
   - 新增 `resolveNoteByFrontmatter`（优先使用 `app.metadataCache`，否则构建增量索引）：
     1. 通过 `citekey`→`zotero_key` 组合定位笔记。
     2. 命中后更新 `itemNoteMap`，作为缓存。
   - 同步入口的查找顺序调整为：Frontmatter → `itemNoteMap` → `syncStatus.path+filename` → 新建。
   - 迁移：首次升级时扫描 `notesDir`，将现有 `zotero_key/citation_key` 写入新索引文件（`obsidian-bridge-map-v2.json`）。

2. **引入 citekey + item key 双 ID 兜底**
   - `buildManagedFrontmatterData` 强制输出 `citation_key` 字段（若缺失自动生成）；在恢复与新解析器中先匹配 citekey，再匹配 `zotero_key`。
   - 允许用户在模板/Frontmatter 中自定义字段名称（提供设置项），但存储时仍保留默认键以便兼容。

3. **解耦文件名/目录强制**
   - `getManagedTargetPath`：若 `syncStatus` 里已有可用 `path + filename` 且文件存在，则尊重当前路径；否则落到 `notesDir`。
   - `maybeRenameLegacySyncedFile` 默认关闭，并在设置中暴露“自动整理命名/路径”开关与模板预览。
   - `ensureObsidianSettings` 支持 `notesDir` 为空：若用户只想“跟随现有路径”，插件只在初次生成笔记时提示选择目录，不再强制所有文件集中到单一文件夹。

4. **划清用户区块所有权**
   - 默认关闭“Zotero 笔记镜像”：`fromMD` 在 Managed 笔记中仅导入 Frontmatter + 托管块（GENERATED 区），`USER` 区保持 Obsidian 独占。
   - 仅允许受控字段回写（`rating`、`zotero_tags`、`reading_status` 等），并提供白名单设置；默认不读取 `tags`。
   - 提供明确开关：只有在用户主动启用“镜像 Zotero Note”时才会回写 `USER` 区，并在 UI 中展示冲突警告。

5. **放宽模板与模块约束**
   - 在 `renderManagedObsidianNoteMarkdown` 中检测用户是否删除某个 callout 或关闭模块：除非设置明确启用，否则不再重建。
   - 支持“仅 Frontmatter 模式”：用户可以选择仅输出 Frontmatter + 占位注释，插件照样维护 `bridge_managed` 与索引。
   - 对 `USER` 区块允许保留任意 Markdown，不再强制写入默认“工作区/摘要/方法/结论”等骨架。

6. **架构与兼容性**
   - 新建 `obsidian-bridge-map-v2.json`：结构为 `{ itemMapKey: { noteKey, citekey, filePath, mtime } }`，作为 Frontmatter 索引缓存。
   - 提供迁移脚本：遍历旧 `itemNoteMap` → 加载对应 Markdown → 补齐缺失 `citation_key` 与索引项；无法匹配时写入日志。
   - 升级提示：首次启动显示对话框，说明新行为（Frontmatter 绑定、可选镜像、自主命名），并允许选择“保持旧模式”。

---

## 四、测试计划

### 手动用例

1. **改名 + 移动**：用户把笔记重命名并移动到自定义目录→再次同步同一条目，应通过 Frontmatter 命中旧文件并原地更新。
2. **citekey 修改/删除**：手动编辑 Frontmatter 的 `citation_key`，同步时应自动填回最新值；若缺失则使用 `zotero_key` 兜底。
3. **多笔记共享**：多篇 Markdown 使用同一 citekey，插件应允许“一对多”同步并在 UI 中提示（而非强制合并）。
4. **关闭自动重命名**：在设置里关闭重命名，验证 `maybeRenameLegacySyncedFile` 不再触发，插件保持用户自定义文件名。
5. **关闭镜像**：停用 Zotero 笔记镜像后，在 Obsidian 修改 `USER` 区，Zotero Note 保持不变；仅 `rating/zotero_tags` 等字段回写。
6. **恢复旧版笔记**：使用 `repairManagedLinks` 对旧库运行一次，确认能根据 Frontmatter 重新建立映射并填充索引文件。

### 自动化

- **解析器单元测试**：覆盖有/无 `citation_key`、有/无 `zotero_key`、多 citekey、Frontmatter 损坏等场景的匹配结果。
- **同步集成测试**：使用 mock vault，模拟改名、移动、关闭镜像等流程，确认输出文件路径与写回行为符合设置。
- **回归测试**：确保 `repairManagedLinks` 仍然能够修复断链，`syncSelectedItemsToObsidian` 在旧模式（兼容开关）下行为不变。

---

## 五、前提假设

1. **Frontmatter 结构沿用现有键**：即使允许用户自定义显示字段，内部仍保留 `zotero_key`、`zotero_note_key` 和新的 `citation_key`，避免破坏旧文件。
2. **大规模 Vault 性能**：Frontmatter 索引需缓存并支持增量更新，避免每次同步都对数千文件做完全扫描。
3. **托管笔记已有存量**：所有新行为必须提供开关或平滑迁移，确保用户可以在新旧模式间切换。
4. **现有 `addon.api.sync` 可复用**：继续依赖现有的文件监控、历史记录与导入导出 API，不额外引入第三方服务。

---

## 后续落地建议

1. 先实现索引&匹配链路（风险最高），并提供 CLI/设置项可回滚。
2. 再改造镜像/写回逻辑，确保默认情况下用户区块完全由 Obsidian 控制。
3. 最后迭代模板与 UI 开关，提供升级提示与帮助文档，指导用户理解新模式。

