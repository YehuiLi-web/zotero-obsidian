---
title: Obsidian Bridge for Zotero 开发说明书
date: 2026-03-23
tags:
  - prd
  - dev-guide
  - zotero
  - obsidian-bridge
status: working-draft
---

# Obsidian Bridge for Zotero 开发说明书

## 一、文档定位

这份文档不再以“对外产品宣讲”为主要目标，而是作为项目开发说明书使用。

它要回答的不是“产品是什么”，而是下面这些更具体的问题：

1. 这个项目的主链路是什么，先做哪一段，后做哪一段。
2. 每个功能应该改哪些文件，核心函数在哪里。
3. 每个功能的输入、输出、持久化对象和异常规则是什么。
4. 什么算开发完成，测试最少要覆盖哪些场景。

使用方式建议如下：

1. 先通读“二、产品定义与边界”“三、架构总览”“四、核心数据契约”。
2. 按“五、建议开发顺序”分阶段推进，不要并行大范围改动。
3. 真正编码时，逐节执行“六、功能开发说明”。
4. 每完成一个功能，就按“八、回归测试矩阵”补测试和手工验证。

## 二、产品定义与边界

### 2.1 产品定义

Obsidian Bridge for Zotero 是一个运行在 Zotero 侧的研究工作流插件。

它的职责不是替代 Better Notes 的全部历史能力，而是在现有 Zotero note / Markdown sync 基础上，提供一个“对 Obsidian 友好、对用户手写内容安全、对恢复场景可处理”的受管理桥接层。

一句话定义：

> 在不破坏用户手写 Markdown 的前提下，把 Zotero 文献、批注、状态和结构化元数据持续同步到 Obsidian，并支持少量关键字段反向写回 Zotero。

### 2.2 核心边界

本项目当前阶段的边界如下：

- Zotero 是文献事实源。
- Obsidian 是阅读、整理、链接、查询和写作准备空间。
- Markdown 是两者之间的交换格式和受管理载体。
- 插件只运行在 Zotero 侧，不开发 Obsidian 侧插件。
- 双向同步不是“所有字段强一致”，而是“少量字段受控回写”。

### 2.3 非目标

以下内容不属于当前开发主线：

- 完整替代 Better Notes 的全部历史功能。
- 实现多端协同、云同步、权限管理。
- 把 Zotero 改造成完整写作编辑器。
- 对所有 frontmatter 字段做任意双向回写。
- 为所有 Obsidian 社区插件做适配。

### 2.4 事实源矩阵

开发时必须坚持下面这张表，否则功能会互相打架。

| 对象 | 主事实源 | 插件是否可写 | 说明 |
| --- | --- | --- | --- |
| 文献标准字段 | Zotero | 是 | 标题、作者、DOI、馆藏信息等以 Zotero 为准 |
| `extra` 中的扩展字段 | Zotero | 是 | 可从 Zotero 读，也可将少量状态回写回去 |
| Managed Markdown 的 `GENERATED` 区 | 插件 | 是 | 每次同步都可重建 |
| Managed Markdown 的 `USER` 区 | 用户 / Obsidian | 否 | 插件只能读取和保留，不应主动覆盖 |
| 非保留 frontmatter 自定义字段 | 用户 / Obsidian | 否 | 同步时必须保留 |
| `reading_status` / `rating` / 用户标签 | Obsidian 可编辑，插件受控回写 | 是 | 仅限白名单字段 |
| Dashboard 托管文件 | 插件 | 是 | 仅覆盖带 managed marker 的文件 |
| item-note 映射 | 插件 | 是 | 持久化到 Zotero DataDirectory |
| sync status | 插件 | 是 | 依赖现有 Better Notes 同步体系 |

## 三、架构总览

### 3.1 模块分层

项目可以按四层理解：

1. `Better Notes 既有能力层`
   - 提供 note 创建、模板、Markdown 导入导出、同步记录、文件监视等基础设施。
2. `Obsidian Bridge 编排层`
   - 负责把现有能力串成“Obsidian 友好工作流”。
3. `Managed Markdown 契约层`
   - 负责 frontmatter、`GENERATED`、`USER` 三段结构的生成与合并。
4. `设置页与维护工具层`
   - 负责配置、预览、自动初始化、修复和用户反馈。

### 3.2 主要代码文件与职责

以下文件是本项目开发时最常用的入口：

| 路径 | 作用 | 开发时关注点 |
| --- | --- | --- |
| `src/modules/obsidian.ts` | 对外导出入口 | 看哪些 Obsidian 能力被别处调用 |
| `src/modules/obsidian/settings.ts` | 设置、默认值、存储、路径推导 | 配置项、新增持久化、默认规则 |
| `src/modules/obsidian/prefsUI.ts` | 设置页控制器 | 事件绑定、向导、预览、按钮行为 |
| `src/modules/obsidian/prefsUI/layout.ts` | 设置页 HTML 结构 | 面板布局和文案分层 |
| `src/modules/obsidian/frontmatter.ts` | frontmatter 构造、解析、合并 | 保留字段、回写字段、冲突规则 |
| `src/modules/obsidian/markdown.ts` | managed Markdown 结构定义 | 标记块、用户区提取、可见内容拼装 |
| `src/modules/obsidian/paths.ts` | 路径、文件名、URI、查找已存在 note | 命名规则、重命名、打开 Obsidian |
| `src/modules/obsidian/managed.ts` | managed note 渲染与回写逻辑 | 主体生成、用户区保留、frontmatter 回写 |
| `src/modules/obsidian/sync.ts` | 编排 create / export / repair / resync | 主链路调度、恢复、冲突选择 |
| `src/modules/obsidian/dashboard.ts` | Dashboard 与 `.base` 文件生成 | 托管 marker 和覆盖策略 |
| `src/modules/obsidian/childNotes.ts` | child note 规则与排除列表 | AI 子笔记拼接策略 |
| `src/modules/obsidian/shared.ts` | 通用清洗与 YAML/extra 工具 | 低层工具函数，不要重复造轮子 |
| `src/modules/import/markdown.ts` | Markdown 导回 Zotero 的基础能力 | 需要看回写链路时使用 |
| `src/modules/export/markdown.ts` | Markdown 导出基础能力 | 需要看导出选项时使用 |
| `src/modules/sync/*` | Better Notes 原有 sync 基础设施 | 需要看 sync status / watcher 时使用 |

### 3.3 当前对外导出能力

目前 `src/modules/obsidian.ts` 已经导出以下关键能力，后续新增功能时建议尽量沿用这套公共入口：

- `runObsidianSetupWizard`
- `writeObsidianConnectionTestFile`
- `initObsidianStorage`
- `renderManagedObsidianNoteMarkdown`
- `applyManagedObsidianFrontmatter`
- `syncSelectedItemsToObsidian`
- `repairObsidianManagedLinks`
- `setupObsidianDashboards`

### 3.4 当前工程状态

截至 `2026-03-23`，有两点必须明确：

1. `npm run build` 已通过，可以正常打包 `.xpi`。
2. `npm run test` 仍失败，当前阻塞是测试安装临时插件时 manifest 中 `homepage_url` 占位符未被替换，导致扩展被判定为 invalid。

因此后续开发的第一阶段，必须先把测试链路修通，否则功能越多，回归成本越高。

## 四、核心数据契约

这一节是整个项目最重要的技术规范。编码时如果不遵守这里的契约，就会出现“重复建 note”“覆盖用户内容”“回写冲突”“无法恢复”的问题。

### 4.1 核心实体

#### A. `topItem`

表示 Zotero 顶层文献条目，必须满足：

- `isRegularItem() === true`
- 是 managed note 的唯一父对象
- 文献标准元数据、标签、收藏夹、附件都从这里读取

#### B. `noteItem`

表示 Zotero 里的子 note，必须满足：

- `isNote() === true`
- `parentID === topItem.id`
- 对于 managed 流程，一个 `topItem` 只允许存在一个主 managed note

#### C. Managed Markdown 文件

表示写入 Obsidian 的目标 `.md` 文件。

它不是任意 Markdown，而是一个受管理文档，必须满足标准结构。

#### D. item-note 映射

作用：

- 建立 `topItem -> noteItem.key` 的稳定关系
- 避免重复创建 note
- 在恢复流程中作为第一优先级的定位依据

当前持久化位置：

- `Zotero.DataDirectory/obsidian-bridge-map.json`

#### E. metadata preset library

作用：

- 控制 metadata callout 和 hidden info 中显示哪些字段
- 允许用户按条目类型定制字段展示

当前持久化位置：

- `Zotero.DataDirectory/obsidian-bridge-presets.json`

#### F. child note exclude map

作用：

- 当一个条目命中多个 child note 时，记录用户明确排除过哪些 note

当前持久化方式：

- 仍保存在 pref 中

#### G. sync status

作用：

- 记录某个 note 当前同步到哪个文件
- 保存 md5、noteMd5、managedSourceHash 等状态

它是 repair、resync、rename、watcher 的基础。

### 4.2 Managed Markdown 标准结构

每一篇 managed note 必须生成如下结构：

```markdown
---
title: "Paper Title"
zotero_key: "ABCD1234"
zotero_note_key: "EFGH5678"
tags:
  - "literature"
  - "zotero"
status: "inbox"
reading_status: "inbox"
summary_done: false
project: []
topic: []
method: []
bridge_managed: true
bridge_schema: 1
---

<!-- ObsidianBridge:BEGIN GENERATED -->
# Paper Title
... metadata / abstract / annotations / hidden info / child notes ...
<!-- ObsidianBridge:END GENERATED -->

<!-- ObsidianBridge:BEGIN USER -->
## Workspace
... user maintained content ...
<!-- ObsidianBridge:END USER -->
```

当前代码中的硬编码标记如下：

- `<!-- ObsidianBridge:BEGIN GENERATED -->`
- `<!-- ObsidianBridge:END GENERATED -->`
- `<!-- ObsidianBridge:BEGIN USER -->`
- `<!-- ObsidianBridge:END USER -->`

这些标记定义在 `src/modules/obsidian/markdown.ts`，后续如果修改，必须同步更新：

- 渲染逻辑
- 提取逻辑
- repair 逻辑
- 测试样本

### 4.3 Frontmatter 规则

#### 系统保留字段

以下字段属于保留字段，不能按“普通自定义字段”处理：

- `title`
- `aliases`
- `title_translation`
- `zotero_key`
- `zotero_note_key`
- `item_type`
- `item_type_zh`
- `date`
- `year`
- `doi`
- `citation_key`
- `publication`
- `item_link`
- `pdf_link`
- `authors`
- `collections`
- `zotero_tags`
- `tags`
- `status`
- `reading_status`
- `rating`
- `bridge_managed`
- `bridge_schema`
- `$version`
- `$libraryID`
- `$itemKey`

#### 固定工作流字段

以下字段虽然会出现在 managed frontmatter 中，但属于“允许用户持续维护”的工作流字段：

- `status`
- `reading_status`
- `summary_done`
- `project`
- `topic`
- `method`

开发时要保证：

1. 用户在 Obsidian 中改这些字段，下次同步不会被无条件覆盖。
2. 只有白名单字段才允许回写回 Zotero。
3. 非保留自定义字段必须完整保留。

#### 当前合并规则

同步时 frontmatter 的合并规则必须固定为：

1. 先生成新的系统 frontmatter。
2. 再把旧 frontmatter 里“非保留字段”完整并回去。
3. `aliases` 按列表去重合并。
4. `tags` 按列表去重合并。
5. YAML 解析失败时回退为空对象，而不是中断整个同步。

### 4.4 USER 区规则

USER 区是用户在 Obsidian 中真正维护的空间。

开发时必须满足：

1. 默认同步策略下，USER 区不允许被插件主动重写。
2. 如果已有 Markdown 文件且有 USER 区，则优先保留文件中的 USER 区。
3. 只有在 `overwrite` 策略下，才允许直接采用当前 Zotero note 导出的用户区。
4. 为兼容历史结构，提取用户区时要识别 legacy heading。

### 4.5 标签与状态规则

当前设计中：

- 系统标签固定包含 `literature` 和 `zotero`
- Zotero tags 可以同步到 `zotero_tags`
- `tags` 主要用于 Obsidian 原生标签展示，可包含系统标签与用户工作流标签
- 当 `zotero_tags` 存在时，回写 Zotero 只认 `zotero_tags`
- 只有在缺少 `zotero_tags` 的兼容场景下，才回退使用 `tags`
- 回写 Zotero 时，需要排除系统标签，避免误删或误写

状态规则必须固定为：

1. `reading_status` 和 `status` 视为同义入口。
2. 若两者同时存在，以 `reading_status` 优先。
3. 缺省值为 `inbox`。

### 4.6 存储与迁移规则

大体积、长期数据不应继续只存 pref，应按以下原则处理：

- item-note map：存 JSON 文件
- metadata preset library：存 JSON 文件
- 小型布尔配置：可继续存 pref
- 一次性 UI 状态：可继续存 pref

初始化时必须遵循：

1. 先尝试读取 DataDirectory 文件。
2. 若文件不存在，再回退旧 pref。
3. 若存在 legacy pref，则迁移写回 JSON 文件。
4. 迁移成功后清理旧 pref。

## 五、建议开发顺序

不要一开始就同时做设置页、同步、回写、Dashboard、修复。建议分四个阶段。

### 阶段 0：工程基线

目标：

- 保证仓库可构建、可测试、名称统一。

必须完成：

1. 修复测试安装失败问题。
2. 统一 README、manifest、package、对外命名和兼容性叙事。
3. 确认当前只支持 Zotero 8，或重新恢复 Zotero 7 兼容方案。

未完成这一阶段前，不建议继续大改产品逻辑。

### 阶段 1：最小闭环

目标：

- 让用户完成设置，并把单篇文献稳定同步到 Obsidian。

范围：

- F-01 首次连接与配置
- F-02 Managed Note 生成
- F-03 安全同步
- F-05 稳定命名与路径

### 阶段 2：双向闭环

目标：

- 用户在 Obsidian 里改状态和内容后，能把必要信息带回 Zotero。

范围：

- F-04 反向导入
- F-08 Metadata Preset
- F-09 Child Note Bridge
- F-10 PDF Annotation Bridge

### 阶段 3：维护与放大

目标：

- 让项目从“能用”升级为“可维护、可恢复、可放大”。

范围：

- F-06 Dashboard 初始化
- F-07 修复与恢复
- F-11 同步历史
- F-12 更强的文件监听
- F-13 API 平台化

## 六、功能开发说明

这一节是编码主说明。每个功能都按统一模板描述。

---

## F-01 首次连接与配置

### 目标

让用户在 5 分钟内完成：

1. 找到或指定 Obsidian vault。
2. 自动生成推荐的 `notesDir`、`assetsDir`、`dashboardDir`。
3. 选择默认模板。
4. 写入测试文件验证权限。

### 用户入口

- Zotero 偏好设置中的 Obsidian Bridge 设置页
- 自动运行的 setup wizard
- 设置页中的 `Auto Detect Vault`
- 设置页中的 `Write a Test File`

### 代码归属

- `src/modules/obsidian/settings.ts`
- `src/modules/obsidian/prefsUI.ts`
- `src/modules/obsidian/prefsUI/layout.ts`
- `src/modules/obsidian/prefsUI/helpers.ts`

### 输入

- `obsidian.appPath`
- `obsidian.vaultRoot`
- 手工选择的目录
- 常见目录扫描结果
- 当前模板列表

### 输出

- 写入 pref 的路径配置
- 推荐目录默认值
- `setupWizardShown` 状态
- 测试 Markdown 文件
- UI 连接状态提示

### 处理流程

1. 在 `settings.ts` 中实现路径默认值推导。
   - 入口函数：`deriveObsidianPathDefaults`
   - 根据 `vaultRoot` 派生 `notes/`、`assets/zotero/`、`dashboards/zotero/`
2. 在 `settings.ts` 中实现 vault 自动检测。
   - 搜索根目录：`getObsidianVaultSearchRoots`
   - 目录判断：`pathIsDirectory`、`isObsidianVaultDirectory`
3. 在 `layout.ts` 中输出连接、路径、测试连接、向导按钮的 UI。
4. 在 `prefsUI.ts` 中绑定按钮行为。
   - `detect-vault`
   - `run-setup-wizard`
   - `pick-vault`
   - `pick-notes`
   - `pick-assets`
   - `pick-dashboard`
5. setup wizard 完成后把 draft 应用到 pref，并刷新 UI。
6. 点击“测试连接”时调用 `writeObsidianConnectionTestFile`。
7. 如果 `dashboardAutoSetup = true`，后续同步完成后可自动初始化 dashboard。

### 开发要求

1. 不要求用户手工编辑配置文件。
2. `appPath` 可以为空。
   - 为空时仍允许同步文件
   - 但“同步后打开 Obsidian”不保证成功
3. `vaultRoot` 必须尽量确认是 Obsidian vault，而不是任意目录。
4. 所有路径展示必须是最终落地路径，不要让用户猜。

### 异常规则

1. 未检测到 vault 时，允许手动选择。
2. 用户选择非 vault 目录时，必须二次确认。
3. `notesDir` 写入失败时，不允许标记连接成功。
4. 测试文件写入后找不到，直接抛错，不要静默失败。

### 测试点

- 自动检测到常见目录中的 vault
- 自动检测失败后手动选择成功
- 选择 vault 后默认目录正确生成
- 用户自定义 `notesDir` 后不被错误覆盖
- `appPath` 为空仍能成功写测试文件
- 无权限目录写入失败时 UI 有明确反馈
- 向导完成后刷新 UI 与 pref 一致

### 完成定义

- 全新环境下，用户通过一次设置流程即可成功写入测试文件。
- 用户能明确看到 vault、notes、assets、dashboard 的最终路径。

---

## F-02 Managed Note 生成

### 目标

为每个 Zotero 顶层文献生成唯一、稳定、可持续更新的 managed note。

### 用户入口

- 手动同步当前选中文献
- 批量同步
- resync / repair 后重新导出

### 代码归属

- `src/modules/obsidian/sync.ts`
- `src/modules/obsidian/managed.ts`
- `src/modules/obsidian/frontmatter.ts`
- `src/modules/obsidian/markdown.ts`
- `src/modules/obsidian/paths.ts`
- `src/modules/obsidian/childNotes.ts`

### 关键函数

- `createObsidianNote`
- `ensureManagedObsidianNote`
- `renderManagedObsidianNoteMarkdown`
- `buildManagedFrontmatterData`
- `mergeManagedFrontmatter`
- `buildItemContext`
- `buildManagedObsidianFileName`

### 输入

- `topItem` 的标准字段
- `extra` 扩展字段
- tags / collections / attachments / annotations
- 当前模板渲染结果
- 当前 metadata preset
- 当前内容开关
- 目标路径上的既有 Markdown 文件

### 输出

- Zotero 子 note
- item-note 映射
- managed Markdown 文件
- sync status 更新

### 处理流程

1. 根据 `topItem` 查找是否已有 managed note。
   - 先查 item-note map
   - 再查现有 note
   - 再查 Markdown 恢复候选
2. 若没有，则调用 `createObsidianNote` 创建新的 Zotero 子 note。
3. 读取当前 note 对应的 Zotero HTML note，并通过 `note2md` 转成 Markdown。
4. 从当前 Markdown 中提取用户区结构。
5. 若目标路径已存在 Markdown 文件，解析其 frontmatter 和 USER 区。
6. 构建 item context。
   - 标准字段
   - `extra` 映射
   - 作者
   - tags
   - collections
   - item / pdf link
7. 根据 metadata preset 和内容开关生成 frontmatter 与 GENERATED 区。
8. 合并旧 frontmatter 与新 frontmatter。
9. 在 USER 区保留用户内容。
10. 输出完整 Markdown：
    - YAML frontmatter
    - GENERATED block
    - USER block
11. 写入目标路径，并更新 sync status。

### 生成内容要求

默认 GENERATED 区应按以下顺序输出：

1. 标题
2. Metadata callout
3. Tags callout
4. Abstract
5. Abstract translation
6. PDF annotations
7. Hidden info
8. Bridged child notes

### 文件名规则

当前默认规则：

- `{{title}} -- {{uniqueKey}}`

开发要求：

1. 文件名必须稳定。
2. 文件名必须可去歧义。
3. 文件名模板的 UI 展示、预览和真实逻辑必须一致。
4. 所有文件名都必须经过安全清洗。
5. 最终统一补 `.md` 扩展名。

### 异常规则

1. 标题为空时，文件名必须回退到 `uniqueKey` 或其他稳定标识。
2. YAML 解析失败时，不得中断整个同步流程，应回退为 `{}`。
3. 遇到 legacy USER 区结构时，必须尽量提取，不直接丢弃。
4. 已有 managed file 但映射丢失时，应优先恢复，而不是盲目新建。
5. child note 匹配到多条时，不允许默默全部拼进去，必须走规则或提示流程。

### 测试点

- 首次同步时创建新 note 和新 Markdown
- 重复同步时不重复创建 note
- 已存在 file 且 frontmatter 正常时能复用
- 已存在 file 且 YAML 非法时仍能生成
- USER 区已有手写内容时再次同步不丢失
- `includeAnnotations = false` 时不输出批注块
- `includeChildNotes = false` 时不输出 child notes
- 标题重复的两篇文献文件名仍不冲突

### 完成定义

- 同一顶层条目重复同步不会生成重复 note 或重复 Markdown 文件。
- 生成文件具备固定结构，并对 Dataview/Bases 友好。

---

## F-03 安全同步

### 目标

让同步默认安全，并把“覆盖风险”压缩到最小。

### 用户入口

- 设置页中的 `Update Strategy`
- 设置页中的 `Sync Now`
- 批量同步入口
- 自动同步和文件监视触发

### 代码归属

- `src/modules/obsidian/sync.ts`
- `src/modules/obsidian/managed.ts`
- `src/modules/obsidian/frontmatter.ts`
- `src/modules/obsidian/prefsUI.ts`

### 策略定义

#### `managed`

推荐默认值。

行为：

- 只更新托管区
- 保留 USER 区
- 保留非保留 frontmatter
- 合并必要的工作流字段

#### `overwrite`

危险模式。

行为：

- 忽略目标文件里的既有 frontmatter 与 USER 区
- 重新以当前 Zotero note 内容为准生成整篇文档

#### `skip`

保守模式。

行为：

- 已存在目标文件时不改动
- 仅为新条目创建文件

### 处理流程

1. 根据 sync scope 计算本次条目集合。
2. 对每个条目解析当前 update strategy。
3. 解析目标文件是否存在。
4. `skip` 下若文件已存在，直接跳过。
5. `managed` 下读取目标文件中的：
   - frontmatter
   - USER 区
6. `overwrite` 下忽略目标文件内容。
7. 重新渲染 Markdown。
8. 保存到目标文件。
9. 更新 sync status。
10. 根据偏好设置决定是否 `openAfterSync` / `revealAfterSync`。

### 开发要求

1. 所有 destructive 行为都必须有安全默认值。
2. 设置页必须用清楚文案说明三种策略差异。
3. `managed` 必须是默认策略。
4. 同步摘要必须让用户知道“会同步什么”和“会写到哪里”。

### 异常规则

1. 若文件存在但无法读取，不允许直接按 `overwrite` 回退，除非用户明确选的是 `overwrite`。
2. 若 sync status 与文件实际位置不一致，应优先尝试修复，不直接创建新文件。
3. 若 note 自身在 Zotero 侧已改动，应避免拿旧文件 USER 区反向覆盖当前有效内容。

### 测试点

- `managed` 下保留 USER 区和自定义 frontmatter
- `overwrite` 下完整重建文档
- `skip` 下已有文件完全不动
- scope 为 `selection` 时只同步选中条目
- scope 为 `currentList` / `library` 时结果集正确
- `openAfterSync` 能触发打开 URI
- `revealAfterSync` 能触发定位文件

### 完成定义

- 默认策略下重复同步不误覆盖用户手写内容。
- 用户能明确理解每种策略会带来的后果。

---

## F-04 反向导入

### 目标

允许用户在 Obsidian 中维护少量状态和内容，并把必要信息受控写回 Zotero。

### 用户入口

- 文件监视触发的 Markdown 导回
- 手工修复 / 恢复时的文件导回
- 后续可扩展的手动“Import from Obsidian”

### 代码归属

- `src/modules/obsidian/managed.ts`
- `src/modules/import/markdown.ts`
- `src/modules/obsidian/frontmatter.ts`
- `src/modules/obsidian/sync.ts`

### 当前允许回写的字段

- `reading_status`
- `status`
- `rating`
- `zotero_tags`

兼容规则：

- 若缺少 `zotero_tags`，可回退使用 `tags`

### 回写原则

1. 只回写白名单字段。
2. `GENERATED` 区绝不导回 Zotero note 正文。
3. 对 managed note，只导回 USER 区正文。
4. 回写时使用 `skipOB` 之类的 notifier 标记，避免自触发循环同步。

### 处理流程

1. 读取 Markdown 文件。
2. 解析 frontmatter。
3. 调用 `applyManagedObsidianFrontmatter`：
   - 状态写回 `extra`
   - `rating` 优先写原生字段，失败再写 `extra`
   - 标签差异同步回 Zotero tags
4. 提取 USER 区正文。
5. 将 USER 区导回对应的 Zotero note。
6. 保存 topItem / noteItem。
7. 更新 sync status。

### 状态与评分规则

1. 若同时存在 `reading_status` 和 `status`，以 `reading_status` 优先。
2. `rating` 应归一化为 `1-5` 或空值。
3. 当前 item type 若不支持原生 `rating` 字段，则回写到 `extra`。

### 标签规则

1. `literature`、`zotero` 属于系统标签，回写时不能作为普通用户标签误操作。
2. `zotero_tags` 是受管理 note 的标签回写主入口。
3. `tags` 主要用于 Obsidian 原生标签与工作流展示，不应在 `zotero_tags` 存在时覆盖它。
4. 仅当缺少 `zotero_tags` 时，才回退使用 `tags` 做兼容导回。
5. 删除标签时要小心，只移除不在期望列表里的用户标签。

### 异常规则

1. frontmatter 非法时，不得清空 Zotero 字段。
2. 若 USER 区无法提取，则不应把 Zotero note 直接写为空。
3. 若 Markdown 与 noteItem 已失配，先进入 repair / resolve 流程，不直接写错对象。

### 测试点

- 修改 `reading_status` 后 Zotero `extra` 更新
- 修改 `rating` 后写回原生字段
- 原生 rating 不可用时写回 `extra`
- 添加标签后 Zotero tags 增加
- 删除标签后 Zotero tags 正确移除
- 修改 USER 区内容后 Zotero note 更新
- frontmatter 非法时不破坏已有数据

### 完成定义

- 用户在 Obsidian 中改白名单字段后，Zotero 端能看到一致结果。
- 非白名单字段不会被错误导回。

---

## F-05 稳定命名与路径

### 目标

保证条目元数据变化后，插件仍能稳定找到旧文件、必要时安全重命名，而不是生成重复文件。

### 代码归属

- `src/modules/obsidian/paths.ts`
- `src/modules/obsidian/sync.ts`
- `src/modules/obsidian/settings.ts`

### 关键函数

- `buildManagedFileNameTemplateContext`
- `applyManagedFileNameTemplate`
- `buildManagedObsidianFileName`
- `ensureMarkdownExtension`
- `maybeRenameLegacySyncedFile`
- `resolveManagedObsidianTargetPath`

### 处理流程

1. 从 `topItem` 生成文件名模板上下文。
2. 渲染文件名模板。
3. 清洗非法字符。
4. 统一补 `.md`。
5. 若已有 sync status，比较当前文件名与目标文件名。
6. 若文件仅名称变化且目标路径未被占用，则执行 rename。
7. 若 rename 不可执行，再走恢复或重新绑定流程。

### 开发要求

1. 命名规则在三个地方必须保持一致：
   - 设置页输入
   - 设置页预览
   - 真正导出逻辑
2. 命名模板中必须始终能得到稳定唯一标识。
3. Windows 和非 Windows 的路径比较规则要分开处理。

### 异常规则

1. 目标文件名已存在时，不允许直接覆盖非托管文件。
2. 当前 sync status 指向文件不存在时，应先检查是否已被重命名，再考虑创建新文件。
3. 路径跨卷或跨根目录时，不能用相对路径假设。

### 测试点

- 标题变化触发 rename 而不是重复创建
- 文件名模板变化后能正确落地
- Windows 下大小写差异不造成误判
- 已存在同名文件时不覆盖用户文件
- `.md` 扩展名统一正确

### 完成定义

- 条目元数据变化后，旧文件可被安全重命名，新文件不重复生成。

---

## F-06 Dashboard 初始化

### 目标

为 Obsidian 用户提供开箱即用的研究看板，但不覆盖用户自己维护的非托管文件。

### 用户入口

- 设置页中的 `Setup Dashboard`
- 首次配置后自动初始化

### 代码归属

- `src/modules/obsidian/dashboard.ts`
- `src/modules/obsidian/settings.ts`
- `src/modules/obsidian/prefsUI.ts`

### 目标文件

- `Research Dashboard.md`
- `Topic Dashboard.md`
- `Reading Pipeline.base`

### 处理流程

1. 确定 `dashboardDir`。
2. 若目录不存在，则递归创建。
3. 生成三个默认文件的内容。
4. 对每个文件检查是否已存在。
5. 若不存在，直接写入。
6. 若存在但不含 managed marker，跳过。
7. 若存在且含 managed marker：
   - 内容相同则标记 `unchanged`
   - 内容不同则覆盖更新

### 开发要求

1. 所有托管 dashboard 必须带 marker。
2. `.base` 文件也必须可识别为托管文件。
3. dashboard 内容必须默认面向 Dataview / Bases 工作流。
4. 必须说明 Dataview 与 Bases 是体验增强依赖，而不是同步主链路依赖。

### 异常规则

1. dashboardDir 不可写时，只提示失败，不影响主同步流程。
2. 用户自己创建的同名文件，只要没有 marker，就不能覆盖。

### 测试点

- 目录不存在时自动创建
- 首次写入三个文件成功
- 已存在托管文件时可更新
- 已存在非托管同名文件时跳过
- `openAfterSetup` 为 true 时可打开主 dashboard

### 完成定义

- Dashboard 能成功初始化，并对用户自建文件保持安全。

---

## F-07 修复与恢复

### 目标

在映射丢失、sync status 丢失、Markdown 文件仍在但 Zotero note 丢失等异常情况下，恢复到可继续同步的状态。

### 用户入口

- 设置页中的 `Repair Links`
- 后续可扩展的自动检测恢复

### 代码归属

- `src/modules/obsidian/sync.ts`
- `src/modules/obsidian/settings.ts`
- `src/modules/obsidian/managed.ts`

### 关键函数

- `repairObsidianManagedLinks`
- `findManagedRecoveryCandidates`
- `recoverManagedObsidianNoteFromFile`
- `resyncAllManagedObsidianNotes`

### 处理流程

1. 读取当前 item-note map。
2. 扫描 `notesDir` 下所有同步文件，恢复 sync status。
3. 扫描带 `bridge_managed` frontmatter 的 Markdown 文件，寻找恢复候选。
4. 如果 topItem 还在、Markdown 还在、noteItem 不在：
   - 创建新的 Zotero 子 note
   - 把 Markdown 导回该 note
   - 再刷新导出，重建同步关系
5. 遍历所有候选 note，构建 `itemMapKey -> candidate` 的候选映射。
6. 如果同一条目出现多个候选：
   - 根据修改时间等规则选出胜者
   - 记录 conflict 计数
7. 重建 item-note map。
8. 为所有候选重算 `managedSourceHash`。

### 开发要求

1. repair 必须是可重复执行的。
2. repair 不应因为单个坏文件而整体失败。
3. 恢复流程必须优先保留 USER 区内容。
4. 冲突选择规则必须固定，不可依赖偶然顺序。

### 冲突规则建议

当前实现可以继续沿用：

1. 优先保留最近修改的 Markdown 文件。
2. 若修改时间相同，再按更稳定的次级规则选择。
3. 任何自动选择都必须可统计 conflict 数。

### 异常规则

1. Markdown frontmatter 中缺少 `zotero_key` 或 `$libraryID` 时，不能作为恢复候选。
2. 找到文件但对应 topItem 不存在时，不自动绑定到别的条目。
3. 恢复途中若导入失败，应跳过该候选并继续。

### 测试点

- item-note map 丢失后可恢复
- sync status 丢失后可扫描恢复
- noteItem 被删但 Markdown 仍在时可重建
- 同一条目对应多个候选时有稳定结果
- 非 managed 文件不会被误纳入恢复

### 完成定义

- repair 后，用户能继续正常同步和打开 note。

---

## F-08 Metadata Preset

### 目标

让用户按 item type 控制哪些字段进入 Metadata、哪些字段进入 Hidden Info。

### 代码归属

- `src/modules/obsidian/settings.ts`
- `src/modules/obsidian/prefsUI.ts`
- `src/modules/obsidian/prefsUI/layout.ts`

### 开发重点

1. preset library 必须有默认预设。
2. 预设支持保存、另存、删除、重置、批量重同步。
3. 预设编辑器必须按 item type 提供字段目录。
4. 渲染时通过 `getConfiguredFields` 驱动，而不是在模板里硬编码字段。

### 测试点

- 默认预设正确生成
- 另存后新预设可切换
- 删除非默认预设后能回退
- 修改预设后重新渲染 Metadata/Hidden Info 生效

---

## F-09 Child Note Bridge

### 目标

将命中特定标签规则的 child note 拼接进 managed note，但保持可控、可排除、可提示。

### 代码归属

- `src/modules/obsidian/childNotes.ts`
- `src/modules/obsidian/managed.ts`
- `src/modules/obsidian/prefsUI.ts`

### 开发重点

1. `matchTags` 规则来源于设置页。
2. `promptSelect` 为 true 时，命中多条 child note 必须给用户选择机会。
3. 用户排除结果要持久化。
4. 插入 child note 时，若内容没有 heading，需要补 heading。

### 测试点

- 命中单条 child note 正常拼接
- 命中多条时进入选择
- 排除记录保存后下次不再重复打扰
- 未命中标签时不拼接

---

## F-10 PDF Annotation Bridge

### 目标

将 PDF 批注以 Obsidian 友好的 Markdown 块形式输出到 GENERATED 区。

### 代码归属

- `src/modules/obsidian/managed.ts`
- `src/utils/annotation.ts`

### 开发重点

1. 注释输出必须稳定排序。
2. 每条批注应至少包含页码、类型、文本、评论、标签。
3. 是否输出批注必须受内容开关控制。

### 测试点

- 无批注时不输出空块
- 多页批注顺序稳定
- 评论与标签正确呈现

---

## F-11 同步历史

### 目标

记录导入导出的变更历史，支持差异预览和按 note 清理。

### 代码归属

- `src/modules/sync/history.ts`
- `src/modules/obsidian/sync.ts`

### 开发重点

1. export/import/repair 都要带上 history reason。
2. 历史记录要能定位到具体 note 和文件。
3. 差异视图要区分 frontmatter、GENERATED、USER 的变化。

---

## F-12 更强的文件监听

### 目标

降低轮询 watcher 的延迟和误判，提高 Obsidian 侧改动的响应速度。

### 代码归属

- `src/modules/sync/watcher.ts`
- `src/modules/obsidian/sync.ts`

### 开发重点

1. 先保持现有轮询方案可用。
2. 在不破坏 Zotero 运行环境兼容性的前提下，评估更实时方案。
3. 监听改进必须配合去抖和循环写保护。

---

## F-13 更明确的 API 平台化

### 目标

把 Obsidian Bridge 的核心能力整理成可被其他 Zotero 插件复用的 API。

### 代码归属

- `src/api.ts`
- `src/modules/obsidian.ts`

### 开发重点

1. 暴露渲染、同步、repair、dashboard 初始化等高价值能力。
2. 保持输入输出结构稳定。
3. 为公共 API 补文档和最小示例。

## 七、跨模块开发规范

### 7.1 安全优先

任何会导致“覆盖用户内容”“删文件”“改映射”的功能，都必须满足：

1. 默认安全。
2. 行为可解释。
3. 失败可回退。
4. 有日志可追踪。

### 7.2 配置与持久化规范

新增配置时按下面规则选择存储位置：

- 简单开关、短字符串：pref
- 大对象、列表、用户配置库：DataDirectory JSON
- 同步过程临时状态：内存

### 7.3 文案与 UI 规范

1. 设置页按“连接 / 笔记结构 / 同步 / 进阶维护”分层。
2. 错误提示优先使用非阻塞 hint，不直接用原生 `alert()`。
3. 中英文文案都要保持一致含义。

### 7.4 I18N 规范

如果新增设置项、标题、提示、按钮：

1. 必须同步加 locale key。
2. 不要把用户可见长文案硬编码在业务逻辑里。
3. 对关键功能说明可允许先以中英双语直接内嵌，再逐步抽离。

### 7.5 变更原则

1. 低层工具优先复用 `shared.ts`，不要重复写清洗逻辑。
2. frontmatter 规则集中在 `frontmatter.ts`。
3. Markdown 结构规则集中在 `markdown.ts`。
4. 同步编排集中在 `sync.ts`。
5. UI 布局在 `layout.ts`，事件行为在 `prefsUI.ts`，不要混写。

## 八、回归测试矩阵

开发每个阶段结束后，至少跑完下面这些场景。

### 8.1 设置链路

- 新装插件首次打开设置页
- 自动检测 vault
- 手动选择 vault
- 测试文件写入成功
- 不填 `appPath` 仍可同步

### 8.2 单篇同步链路

- 首次同步一篇文献
- 二次同步同一文献
- 修改 USER 区后二次同步
- 修改 frontmatter 自定义字段后二次同步
- 改标题后触发 rename

### 8.3 双向链路

- 修改 `reading_status`
- 修改 `rating`
- 修改用户标签
- 修改 USER 区正文
- 非白名单字段不回写

### 8.4 批量链路

- 选中若干条目同步
- 当前列表同步
- 全库同步
- 已存在文件下的 `managed` / `overwrite` / `skip`

### 8.5 Dashboard 与修复链路

- 初始化 dashboard
- 不覆盖非托管 dashboard
- 删除映射后 repair
- 删除 sync status 后 repair
- 删除 Zotero note 但保留 Markdown 后恢复

## 九、发布门槛

一个可以对外稳定宣传的版本，至少要满足：

1. `npm run build` 通过。
2. `npm run test` 通过。
3. README、manifest、package、插件名称和对外表述完全统一。
4. 首次配置、单篇同步、反向导入、Dashboard、修复映射五条主流程可手工回归。
5. 默认文件名规则、UI 展示和实际生成逻辑一致。

## 十、当前开发建议

如果现在立刻开始推进项目，建议按下面顺序开工：

1. 先修测试链路与品牌统一。
2. 再稳定 F-01 / F-02 / F-03 / F-05 主闭环。
3. 再做 F-04 双向回写。
4. 再补 F-06 / F-07 维护能力。
5. 最后再做 watcher、历史、API 平台化。

## 十一、结论

这个项目最核心的开发难点，不是“怎么导出 Markdown”，而是“怎么在用户持续编辑的前提下，维持一个安全、稳定、可恢复的 managed 桥接模型”。

因此整个开发过程必须始终围绕三件事：

1. 契约清晰：frontmatter、GENERATED、USER 的边界固定。
2. 同步安全：默认不覆盖用户内容。
3. 恢复可靠：映射、状态、文件关系出现损坏时仍可回到可用状态。

只要这三件事守住，后面的 Dashboard、Dataview、AI 子笔记、批量工作流才会真正有价值。
