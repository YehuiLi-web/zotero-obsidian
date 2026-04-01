# Obsidian Bridge for Zotero — 完整功能文档

> 版本 3.0.3 | 适用 Zotero 8+
> 文档生成日期：2026-03-27

---

## 目录

1. [项目总览](#1-项目总览)
2. [核心功能：Obsidian 同步](#2-核心功能obsidian-同步)
3. [设置页详解](#3-设置页详解)
   - 3.1 连接 (Connection)
   - 3.2 笔记设计 (Note Design)
   - 3.3 同步 (Sync)
   - 3.4 工具 (Tools)
4. [Frontmatter 系统](#4-frontmatter-系统)
5. [元数据字段分流 (Metadata Preset)](#5-元数据字段分流-metadata-preset)
6. [模板系统](#6-模板系统)
7. [子笔记嫁接](#7-子笔记嫁接)
8. [仪表板 (Dashboard)](#8-仪表板-dashboard)
9. [翻译补全](#9-翻译补全)
10. [数据持久化与存储](#10-数据持久化与存储)
11. [内部架构速览](#11-内部架构速览)

---

## 1. 项目总览

**Obsidian Bridge for Zotero** 是一个 Zotero 8 插件，用途是把 Zotero 文献库中的条目自动生成并维护为 Obsidian Vault 里的 Markdown 文件。

核心价值主张：

- **托管同步**：插件管理笔记的"生成区"（frontmatter + 书目信息），用户手写内容在"我的笔记区"里永不被覆盖。
- **双向写回**：Obsidian 里修改的 `rating`、`zotero_tags` 字段可写回 Zotero 条目。
- **高度可定制**：frontmatter 字段、内容模块、文件名模板、笔记模板等均可按需配置。
- **Dataview / Bases 友好**：元数据字段分流机制让 Dataview 查询和 Obsidian Bases 开箱可用。

---

## 2. 核心功能：Obsidian 同步

### 2.1 同步触发方式

| 方式 | 说明 |
|------|------|
| 右键菜单 → 同步到 Obsidian | 对当前选中条目执行同步 |
| 工具栏按钮 | 一键同步当前视图范围 |
| 自动同步 (Auto Sync) | 条目更新时自动触发 |
| 文件监视 (Watch Files) | 监听 vault 文件变化 |

### 2.2 同步策略 (Update Strategy)

| 策略 | 行为 |
|------|------|
| **Managed（托管）** | 默认策略。插件更新 frontmatter 和 GENERATED 区块，保留 USER 区块和用户自定义 frontmatter 字段 |
| **Overwrite（覆盖）** | 完全重新生成文件，丢弃所有用户内容 |
| **Skip（跳过）** | 文件已存在时跳过，不做任何修改 |

### 2.3 生成的 Markdown 文件结构

```
---
title: 论文标题
zotero_key: XXXXXXXX
bridge_managed: true
bridge_schema: "3"
# ... 其他 frontmatter 字段
---

<!-- ObsidianBridge:GENERATED_BLOCK_START -->
## 书目信息

| 字段   | 值    |
|--------|-------|
| 作者   | ...   |
| 期刊   | ...   |
...

## Abstract
> 原文摘要...

## PDF 批注
...
<!-- ObsidianBridge:GENERATED_BLOCK_END -->

<!-- ObsidianBridge:USER_BLOCK_START -->
## 我的笔记

（用户手写内容在这里，永不被覆盖）

<!-- ObsidianBridge:USER_BLOCK_END -->
```

### 2.4 文件名规则

默认模板：`{{title}} -- {{uniqueKey}}`

- `title`：条目标题（清理特殊字符）
- `uniqueKey`：基于 `libraryID + item.key` 生成的稳定短哈希，避免重名、不随内容变化

---

## 3. 设置页详解

设置页位于 Zotero → 首选项 → Obsidian Bridge，分为四个标签页。

---

### 3.1 连接 (Connection)

#### 连接状态

- 实时显示 vault 路径有效性
- 显示写入权限状态

#### 按钮

| 按钮 | 功能 |
|------|------|
| **自动检测 Vault** | 在常见位置（Documents、iCloud、Dropbox 等）扫描 Obsidian vault |
| **运行配置向导** | 引导式初始化流程，适合新用户首次配置 |

#### 工作区路径

| 字段 | 说明 |
|------|------|
| **Vault 目录** | Obsidian Vault 根目录，所有其他路径从此派生 |
| **Obsidian 路径（可选）** | Obsidian.exe / .app 路径，用于"同步后自动打开" |
| **笔记目录** | 文献笔记写入位置（默认为 vault 内 `Literature` 子目录） |
| **资源目录** | 附件等资源文件目录 |
| **仪表板目录** | Dashboard 文件写入位置 |

> 展开"高级路径"后可见笔记目录、资源目录等精细路径设置。

#### 连接诊断（可展开）

- **测试写入一个文件**：向笔记目录写入 `Obsidian Bridge Test.md`，验证实际写入权限

---

### 3.2 笔记设计 (Note Design)

分为左侧配置栏和右侧实时预览区。

#### 文件命名与位置

- 显示当前文件名规则（`{{title}} -- {{uniqueKey}}`）
- **实时文件名预览**：基于当前选中的 Zotero 条目展示实际文件名

#### 笔记内容结构

以"卡片式多选"控制笔记内容模块：

| 模块 | 内容 |
|------|------|
| **元数据** | 作者、期刊、标签、基础书目信息表格 |
| **Abstract** | 原文摘要 + 翻译摘要 |
| **PDF 批注** | 高亮、批注、评论 |
| **我的笔记区** | 用户手写内容（始终保留，不可关闭） |

展开"高级内容模块"：

| 模块 | 内容 |
|------|------|
| **隐藏字段** | 供 Dataview/脚本使用的附加字段（JCRQ、QNKey 等） |
| **子笔记嫁接** | 把命中规则的 Zotero 子笔记内容拼入主文献笔记 |

#### 模板

- 显示当前选用的笔记模板
- **选择模板** 按钮：打开模板选择器
- **编辑模板** 按钮：打开 Monaco 编辑器直接编辑

#### 属性输出

- 显示当前 frontmatter 字段配置摘要
- **编辑属性输出...** 按钮：打开 Field Studio 窗口，管理哪些托管字段写入 Obsidian Properties

#### 字段分流

- 显示元数据预设摘要
- **编辑字段分流...** 按钮：打开 Field Studio 窗口，按条目类型细化字段路由

#### 子笔记规则（仅在开启子笔记嫁接时显示）

- 显示当前匹配标签
- 显示是否"同步时询问"或"自动嫁接"
- **配置子笔记规则** 按钮

#### 右侧预览面板

- 点击"生成预览"按钮，基于当前选中 Zotero 条目即时渲染
- 分三个区块展示：
  - **文件名**
  - **Frontmatter**（YAML 代码块）
  - **Markdown 正文**（代码块）

---

### 3.3 同步 (Sync)

#### 同步范围

三选一（Radio Card）：

| 选项 | 说明 |
|------|------|
| **当前选中** | 仅处理在 Zotero 主界面选中的条目，适合单篇调试 |
| **当前列表** | 处理当前激活的文献列表（Collection / 搜索结果） |
| **整个库** | 全库同步，适合批量初始化 |

#### 更新策略

三选一（Radio Card）：

| 策略 | 说明 |
|------|------|
| **Managed（托管）** | 默认，保留用户内容 |
| **Overwrite（覆盖）** | 强制覆盖 |
| **Skip（跳过）** | 已存在则跳过 |

#### 同步行为

| 选项 | 说明 |
|------|------|
| **自动同步** | 条目修改时自动触发同步 |
| **文件监视** | 监听 vault 文件变化以触发写回 |
| **同步后在 Finder/资源管理器中显示** | 同步完成后定位文件 |
| **同步后打开 Obsidian** | 自动跳转 Obsidian |

#### 内容摘要

- 显示当前内容模块配置的简洁摘要

#### 同步摘要

- 显示同步范围 + 策略组合的说明

#### 翻译补全

需要安装 Translate for Zotero 插件：

| 选项 | 说明 |
|------|------|
| **启用翻译补全** | 主开关 |
| **补全中文标题** | 为英文条目自动填充中文标题 |
| **补全中文摘要** | 为英文条目自动填充中文摘要翻译 |

---

### 3.4 工具 (Tools)

#### Obsidian 仪表板

- **Dashboard 目录**：仪表板 Markdown 文件的存放位置
- **自动初始化仪表板**：Vault 配置完成后自动生成仪表板文件
- **创建/更新仪表板** 按钮：手动触发仪表板生成

#### 子笔记嫁接

- **子笔记标签**：输入匹配用的标签（多个用逗号分隔）
- **同步时询问**：是否在同步时显示子笔记选择对话框

#### 维修工具

| 按钮 | 功能 |
|------|------|
| **修复断开的联动** | 重新扫描 vault 修复 item-note 映射关系 |
| **重新同步所有托管笔记** | 强制重新生成所有已托管的笔记 |

---

## 4. Frontmatter 系统

### 4.1 固定字段（始终写入）

```yaml
title:            # 条目标题
zotero_key:       # Zotero item key
zotero_note_key:  # Zotero note item key
tags:             # 供 Obsidian 展示的标签
status:           # 阅读状态
reading_status:   # 阅读进度
bridge_managed:   true
bridge_schema:    "3"
```

### 4.2 可选 Frontmatter 字段

通过"属性输出"（Field Studio - Frontmatter）选择，共 12 个：

| 字段键 | 说明 | Frontmatter Key |
|--------|------|-----------------|
| `titleTranslation` | 中文标题与别名 | `title_translation`, `aliases` |
| `itemType` | 文献类型（中英） | `item_type`, `item_type_zh` |
| `date` | 日期与年份 | `date`, `year` |
| `doi` | DOI | `doi` |
| `citationKey` | Citation Key | `citation_key` |
| `publication` | 刊物 / 来源 | `publication` |
| `itemLink` | Zotero 条目链接 | `item_link` |
| `pdfLink` | PDF 附件链接 | `pdf_link` |
| `authors` | 作者列表 | `authors` |
| `collections` | 所在分类 | `collections` |
| `zoteroTags` | Zotero 标签（支持写回） | `zotero_tags` |
| `rating` | 评分（支持写回） | `rating` |

### 4.3 内置预设

| 预设 | 包含字段 |
|------|---------|
| **推荐 (Recommended)** | 全部 12 个字段 |
| **最小 (Minimal)** | 仅固定字段 |
| **Dataview** | titleTranslation, itemType, date, doi, publication |

### 4.4 双向写回机制

`zotero_tags` 和 `rating` 字段在重新同步时会从 Obsidian 文件读回并更新 Zotero 条目，实现双向同步。

---

## 5. 元数据字段分流 (Metadata Preset)

### 5.1 概念

区别于 Frontmatter 配置，**字段分流**决定每种 Zotero 条目类型（期刊文章、会议论文、学位论文、书籍等）的具体字段如何处置：

- **可见字段**：写入 frontmatter（Obsidian Properties 可见）
- **隐藏字段**：写入隐藏 callout 块（仅供 Dataview/脚本读取）

### 5.2 支持的条目类型

- `default`（默认，适用所有未单独配置的类型）
- `journalArticle`（期刊文章）
- `conferencePaper`（会议论文）
- `thesis`（学位论文）
- `book`（书籍）
- `bookSection`（书籍章节）
- `patent`（专利）

### 5.3 可路由的派生字段

```
itemTypeZh, itemType, title, titleTranslation,
abstract, abstractNote, abstractTranslation,
shortTitle, creators, collection, tags, related,
itemLink, pdfLink, qnkey, date, dateY,
dateAdded, datetimeAdded, dateModified, datetimeModified,
citationKey, JCRQ, ...（以及各类型专属字段）
```

### 5.4 预设 CRUD

- **新建**：复制当前预设为新预设
- **编辑**：在 Field Studio 窗口中拖拽/勾选字段
- **保存/重置/删除**：完整 CRUD 操作
- **重新同步**：用新预设重新生成所有已托管笔记
- **持久化**：保存到 `{ZoteroDataDir}/obsidian-bridge-presets.json`

---

## 6. 模板系统

### 6.1 作用

模板决定新建托管笔记时 **USER 区块**（我的笔记区）的初始内容结构。

### 6.2 内置默认模板

`[Item] Obsidian Literature Workbench` — 提供标准的文献阅读笔记结构

### 6.3 模板变量

模板引擎支持 `{{变量}}` 语法，可用变量包括：
- `title`、`authors`、`year`、`publication`、`doi`
- `abstract`、`tags`、`collections`
- `itemLink`、`pdfLink`
- 以及所有 Zotero 标准字段

### 6.4 模板编辑器

使用 **Monaco Editor**（VS Code 同款）：
- 自定义 `template-markdown` 语言，支持语法高亮
- 自动补全（变量名、函数等）
- TypeScript 类型定义加载

---

## 7. 子笔记嫁接

### 7.1 功能

将 Zotero 条目的子笔记（child notes）内容嵌入到主文献笔记中，例如：
- AI 阅读摘要
- 手动读书笔记
- 章节整理

### 7.2 配置

1. 设置**匹配标签**（如 `ai-reading`），带有该标签的子笔记会被选中
2. 选择**同步时询问**或**自动嫁接**

### 7.3 排除机制

每个条目可单独设置排除某些子笔记，存储在 item-note 映射中。

---

## 8. 仪表板 (Dashboard)

### 8.1 功能

自动生成 Obsidian Dataview / Bases 兼容的仪表板文件，用于组织和浏览文献笔记。

### 8.2 仪表板类型

| 仪表板 | 内容 |
|--------|------|
| **研究仪表板** | 按项目/主题聚合文献，Dataview 查询 |
| **阅读仪表板** | 按阅读状态分组（待读/在读/完成） |

### 8.3 托管标记

仪表板文件带有 `ObsidianBridge:MANAGED DASHBOARD` 标记，插件可识别并安全更新，同时保留用户手动添加的内容。

---

## 9. 翻译补全

### 9.1 依赖

需要安装 **Translate for Zotero** 插件（第三方），并通过其 API 调用翻译服务。

### 9.2 自动补全逻辑

- 同步时检测条目是否缺少中文标题/摘要
- 若缺少，调用 Translate for Zotero API 获取翻译
- 将翻译结果写入条目的 Extra 字段（`titleTranslation:` / `abstractTranslation:`）
- 后续同步时从 Extra 读取并写入 frontmatter

### 9.3 配置项

| 选项 | 说明 |
|------|------|
| 启用翻译补全 | 主开关 |
| 补全中文标题 | 翻译并补全 `titleTranslation` |
| 补全中文摘要 | 翻译并补全 `abstractTranslation` |

---

## 10. 数据持久化与存储

| 数据 | 存储位置 |
|------|---------|
| 所有设置项 | Zotero 偏好设置（`extensions.zotero.ObsidianBridge.*`） |
| Item-Note 映射 | `{ZoteroDataDir}/obsidian-bridge-map.json` |
| 元数据预设库 | `{ZoteroDataDir}/obsidian-bridge-presets.json` |
| 同步历史 | `{ZoteroDataDir}/obsidian-bridge-syncHistory.json` |

### 迁移说明

旧版使用 Zotero pref 存储 item-note 映射，新版首次启动时自动迁移到 JSON 文件。

---

## 11. 内部架构速览

```
src/
├── index.ts          # 插件引导，注册全局变量
├── addon.ts          # Addon 类，全局状态容器
├── hooks.ts          # 生命周期钩子（启动/关闭/通知/偏好设置）
├── api.ts            # 公开 API（供脚本/外部插件调用）
│
└── modules/
    ├── preferences/         # 偏好页域（注册、区块渲染、兼容层）
    │   ├── index.ts         # 注册 pane、事件分发、刷新调度
    │   ├── state.ts         # window/document 缓存、section 运行时
    │   ├── compat/obsidian.ts # 兼容旧 API（api.obsidian.* 等）
    │   └── sections/
    │       ├── basic/       # 基础设置区块
    │       ├── editor/      # 编辑器相关设置
    │       ├── sync/        # 同步周期/入口
    │       ├── template/    # 模板入口
    │       ├── annotation/  # 注释同步开关
    │       ├── about/       # 链接与版本信息
    │       └── obsidian/    # Obsidian 设置 UI、Field Studio、向导
    │
    ├── obsidian/             # Obsidian 同步核心
    │   ├── types.ts          # TypeScript 类型
    │   ├── constants.ts      # 常量（pref key、字段列表等）
    │   ├── settings.ts       # 设置读取、路径派生、初始化
    │   ├── itemNoteMap.ts    # item↔note 映射持久化
    │   ├── metadataPreset.ts # 元数据预设 CRUD
    │   ├── paths.ts          # 路径工具、Obsidian URI
    │   ├── shared.ts         # 通用工具函数
    │   ├── frontmatter.ts    # YAML frontmatter 构建/解析
    │   ├── markdown.ts       # Markdown 内容区块生成
    │   ├── managed.ts        # 托管笔记生命周期
    │   ├── sync.ts           # 同步编排（主入口）
    │   ├── childNotes.ts     # 子笔记嫁接逻辑
    │   ├── dashboard.ts      # 仪表板生成
    │   └── translation.ts    # 翻译补全集成
    │
    ├── template/             # 模板系统
    │   ├── monacoEditor.ts   # Monaco 编辑器集成
    │   ├── editorWindow.ts   # 编辑器窗口
    │   ├── api.ts            # 模板执行引擎
    │   ├── controller.ts     # 模板 CRUD
    │   └── picker.ts         # 模板选择器
    │
    ├── sync/                 # 同步状态管理
    │   ├── history.ts        # 同步历史 & 撤销
    │   └── watcher.ts        # 文件变化监听
    │
    └── export/               # 导出（MD/PDF/DOCX/LaTeX）
        └── ...
```

### 关键数据流

```
用户触发同步
    ↓
sync.ts: syncSelectedItemsToObsidian()
    ↓
settings.ts: ensureObsidianSettings() — 验证路径、创建目录
    ↓
managed.ts: renderManagedObsidianNoteMarkdown()
    ├── frontmatter.ts: buildManagedFrontmatterData()
    ├── markdown.ts: buildItemContext() / buildAbstractCallout() / ...
    └── translation.ts: autofillMissingMetadataTranslations()（可选）
    ↓
写入 vault 文件
    ↓
itemNoteMap.ts: setObsidianItemNoteMap() — 更新映射
    ↓
（可选）paths.ts: openObsidianNote() — 打开 Obsidian
```
