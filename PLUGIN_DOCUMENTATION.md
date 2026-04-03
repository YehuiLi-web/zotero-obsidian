# Obsidian Bridge for Zotero 功能文档（当前实现）

> 适用版本：3.0.3  
> 更新时间：2026-04-03

## 1. 项目定位

Obsidian Bridge for Zotero 是运行在 Zotero 侧的插件，用于把文献条目同步为 Obsidian 友好的 Markdown，并在可控范围内把少量字段回写到 Zotero。

核心边界：

- Zotero 是文献事实源。
- Obsidian 是阅读与整理空间。
- Markdown 是桥接格式。
- 插件不依赖 Obsidian 侧插件即可完成主同步链路。

## 2. 核心能力总览

### 2.1 受管同步（Managed Sync）

- 为每条文献生成受管 Markdown。
- 默认更新策略为 `managed`：
  - 更新 frontmatter 和 `GENERATED` 区块。
  - 优先保留用户在 `USER` 区块的内容。
  - 保留非保留 frontmatter 自定义字段。
- 另支持：
  - `overwrite`：覆盖重建整篇文档。
  - `skip`：目标文件已存在时跳过。

### 2.2 双向字段回写（受控）

插件会从 frontmatter 回写以下字段到 Zotero：

- `reading_status` / `status`
- `rating`
- `zotero_tags`（优先）
- `tags`（仅在缺少 `zotero_tags` 时作为兼容回退）
- `citation_key` / `citekey`

其中 `zotero_tags` 是标签回写的权威入口。

### 2.3 Markdown 托管结构

托管文档采用固定分段标记（`addonRef` 默认为 `ObsidianBridge`）：

- `<!-- ObsidianBridge:BEGIN GENERATED -->`
- `<!-- ObsidianBridge:END GENERATED -->`
- `<!-- ObsidianBridge:BEGIN USER -->`
- `<!-- ObsidianBridge:END USER -->`

含义：

- `GENERATED`：插件可重建区域（元数据、摘要、批注等）。
- `USER`：用户维护区域（在 `managed` 策略下尽量保留）。

### 2.4 Dashboard 初始化

可生成并维护以下文件：

- `Research Dashboard.md`
- `Topic Dashboard.md`
- `Reading Pipeline.base`

覆盖规则：

- 仅覆盖带有托管标记的同名文件。
- 无托管标记的用户文件不会被覆盖。

### 2.5 恢复与修复

提供链路修复能力：

- 修复映射与同步状态。
- 从现有 Markdown 恢复已断开的条目绑定。
- 在满足条件时重建/复活对应 Zotero note。
- 扫描并重建 frontmatter 索引。

## 3. 设置页结构

设置页分为四个功能区。

### 3.1 Connection（连接）

- 自动检测 Vault
- 运行配置向导
- 测试写入（`Obsidian Bridge Test.md`）
- 路径配置：
  - `Vault`
  - `Notes`
  - `Assets`
  - `App Path`（高级项）

### 3.2 Notes（笔记）

- 模板选择与编辑
- 文件名规则与实时预览
- 内容模块开关：
  - 元数据
  - Abstract
  - 批注
  - 隐藏字段
  - 子笔记
- 子笔记规则：匹配标签、同步时询问
- 属性输出（Frontmatter 字段选择）
- 字段分流（Metadata Preset）
- 预览弹窗

### 3.3 Sync（同步）

- 同步范围：
  - `selection`
  - `currentList`
  - `library`
- 更新策略：
  - `managed`
  - `overwrite`
  - `skip`
- 同步行为：
  - 自动同步（`autoSync`）
  - 文件监视（`watchFiles`）
  - 同步后打开 Obsidian
  - 同步后在资源管理器定位文件
- 翻译补全：
  - 同步前补全缺失翻译
  - 标题补全
  - 摘要补全

### 3.4 Tools（工具）

- Dashboard 目录配置
- 自动初始化 Dashboard
- 手动创建/更新 Dashboard
- 修复联动映射
- 重同步已联动笔记

## 4. Frontmatter 规则

### 4.1 固定写入字段（核心）

- `title`
- `zotero_key`
- `zotero_note_key`
- `citation_key`
- `citekey`
- `tags`
- `reading_status`
- `bridge_managed`
- `bridge_schema`
- `$version`
- `$libraryID`

### 4.2 可选输出字段（属性输出）

可在设置页按需开启：

- `title_translation` / `aliases`
- `item_type` / `item_type_zh`
- `date` / `year`
- `doi`
- `publication`
- `item_link`
- `pdf_link`
- `authors`
- `collections`
- `zotero_tags`
- `rating`

### 4.3 字段预设

内置三套 Frontmatter 预设：

- `recommended`
- `minimal`
- `dataview`

## 5. Metadata Preset（字段分流）

字段分流用于控制“可见字段”和“隐藏字段”在不同条目类型下的输出，不等同于 frontmatter 配置。

支持条目类型分区：

- `default`
- `journalArticle`
- `conferencePaper`
- `thesis`
- `book`
- `bookSection`
- `patent`

支持预设库管理：

- 新建（复制）
- 保存
- 重置
- 删除
- 应用后批量重同步

## 6. 路径与命名

### 6.1 默认文件名模板

默认模板：`{{title}} -- {{uniqueKey}}`

说明：

- `uniqueKey` 用于稳定去重。
- 文件名会统一清理非法字符并补 `.md`。

### 6.2 默认目录推导

当已设置 `vaultRoot` 时，默认推导：

- `notesDir = <vault>/notes`
- `assetsDir = <vault>/assets/zotero`
- `dashboardDir = <vault>/dashboards/zotero`（Windows 下走默认仪表板目录推导）

## 7. 同步与恢复链路

### 7.1 同步主流程

1. 读取设置并校验路径。
2. 按范围收集条目。
3. 必要时执行翻译补全。
4. 为每条条目解析或创建 managed note。
5. 解析目标路径并导出 Markdown。
6. 更新映射、索引与同步状态。
7. 按设置执行“打开 Obsidian/定位文件/Dashboard 自动初始化”。

### 7.2 文件监视

监视器在以下条件都满足时生效：

- `autoSync = true`
- `watchFiles = true`

机制：

- 轮询扫描（约 2 秒间隔）。
- 去抖后触发导入链路。

### 7.3 Repair 行为

`repair` 会尝试：

- 扫描已同步文件并恢复同步状态。
- 从 managed frontmatter 建立候选并修复 item-note 映射。
- 处理冲突候选并选出有效绑定。
- 重建 frontmatter 索引。

## 8. 翻译补全

翻译补全为可选增强能力，不是主同步链路的硬依赖。

- 依赖外部插件实例：`PDFTranslate`（Translate for Zotero API）。
- 可分别补全：
  - `titleTranslation`
  - `abstractTranslation`
- 结果写回 Zotero `extra` 字段。

若外部翻译 API 不可用，插件仅提示，不阻断同步。

## 9. 数据存储与文件

主要持久化位置：`{Zotero.DataDirectory}`

当前数据文件：

- `obsidian-managed-note-registry.json`（主注册表）
- `obsidian-bridge-map-v2.json`（frontmatter 索引）
- `obsidian-bridge-map.json`（历史映射文件，兼容迁移）
- `obsidian-managed-path-map.json`（历史路径映射文件，兼容迁移）
- `obsidian-bridge-presets.json`（Metadata Preset 库）

说明：

- 插件会优先使用新注册表，并兼容读取旧数据后迁移。
- 同步状态仍由通用同步模块维护。

## 10. 已知边界

- 插件仅在 Zotero 侧运行，不提供独立 Obsidian 插件。
- 双向同步是“受控字段回写”，不是任意字段全量双向。
- Dashboard 依赖 Dataview/Bases 时体验更完整，但主同步不依赖它们。
- 用户应主要编辑 `USER` 区块；`GENERATED` 区块会在同步时按配置重建。
