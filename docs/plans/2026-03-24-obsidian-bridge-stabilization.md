---
title: Obsidian Bridge 稳定化实施计划
date: 2026-03-24
tags:
  - plan
  - zotero
  - obsidian-bridge
status: active
---

# Obsidian Bridge 稳定化实施计划

> [!summary]
> 这份计划基于 2026-03-24 对当前仓库的源码、测试、构建脚本、偏好设置页和现有文档的实际扫描结果编写，不是对旧计划的直译。

## 一、基于当前仓库的事实判断

| 维度 | 当前结论 |
| --- | --- |
| 产品定位 | 这是一个运行在 Zotero 侧的 Obsidian 工作流插件，而不是一个重新包装后的通用 Better Notes 发布版 |
| 构建状态 | `npm run build` 已可成功打包 `obsidian-bridge-for-zotero.xpi` |
| 测试入口 | `npm run test:preflight` 已经存在，并且本地可以检测到 Zotero 8 可执行文件 |
| 对外入口 | `README.md`、`package.json`、`addon/manifest.json`、`src/modules/userGuide.ts` 已经以 Obsidian Bridge 为主，但 `addon/chrome/content/preferences.xhtml` 的 About 链接仍然指向 Better Notes |
| Obsidian 入口 | 公开 API 主要经由 `src/modules/obsidian.ts`、`src/api.ts` 和 `src/hooks.ts` 暴露 |
| 核心能力 | 已具备配置向导、受管 Markdown 同步、frontmatter 合并、USER 区保留、PDF 批注输出、子笔记拼接、Dashboard 初始化、映射修复与打开 Obsidian 等能力 |
| 结构风险 | `src/modules/obsidian/prefsUI.ts` 约 103 KB，`src/modules/obsidian/settings.ts` 约 47 KB，职责明显过重 |
| 仓库卫生 | `src/` 下仍保留大量 `.ts/.js` 双份源码，维护时很容易造成搜索噪音和误改 |
| 默认值漂移 | `addon/prefs.js` 里的默认文件名模板还是 `{{title}} - {{year}}`，而 `src/modules/obsidian/settings.ts` 的默认值已经是 `{{title}} -- {{uniqueKey}}`，`test/tests/obsidian-pure.spec.ts` 也锁定了后者 |
| 自动化现状 | 仓库当前没有 `.github/workflows/CI.yml`，所以验证链路仍以本地脚本和人工约定为主 |
| 回归资产 | `startup.spec.ts`、`obsidian-pure.spec.ts`、`export.spec.ts`、`import.spec.ts` 已经覆盖了身份、默认值、frontmatter、USER 区、批注、重命名和 repair 等高价值场景 |

## 二、稳定化目标

- 让仓库只讲一个一致的产品故事，不再在安装入口和偏好页里混用 Better Notes 与 Obsidian Bridge 叙事。
- 让新贡献者在不读源码的情况下也知道如何构建、怎样准备测试环境、哪些测试需要本地 Zotero。
- 清掉 `src/` 中的生成型 `.js` 双份源码，降低检索噪音和误改概率。
- 把 Obsidian 默认值、持久化、Metadata Preset 和偏好页控制逻辑从超大文件中拆出来，降低未来改动成本。
- 用现有测试资产为受管 Markdown 契约补齐更清晰的回归护栏，重点保护 frontmatter、USER 区、rename、repair 和 watcher。
- 形成一个可以持续发布的基线，让文档、构建、测试、打包产物和手工 smoke 流程彼此一致。

## 三、非目标

- 不把这个分支重新扩展成 Better Notes 的全量替代品。
- 不为 Obsidian 侧再开发一个配套插件。
- 不在稳定化阶段追加新的大型终端用户功能。
- 不把所有 frontmatter 字段都做成自由双向同步。
- 不在默认值和契约仍在漂移时大改同步行为。

## 四、建议阶段顺序

1. 产品口径与安装入口统一
2. 验证基线与贡献者体验
3. 仓库卫生与源码清理
4. 默认值与配置收束
5. `settings.ts` / `prefsUI.ts` 解耦拆分
6. Managed Markdown 契约与恢复链路加固
7. 发布收尾与手工 smoke

在第 1 到第 4 阶段完成前，不建议新增任何 Obsidian 面向用户的新能力。当前最大风险不是“功能不够多”，而是“文档、默认值、测试入口和维护结构仍在漂移”。

## 五、分阶段实施

### 阶段 1：统一产品口径与安装入口

**目标**

- 把用户第一次接触仓库、插件设置页和用户指南时看到的产品身份全部统一为 Obsidian Bridge。

**重点文件**

- `README.md`
- `package.json`
- `addon/manifest.json`
- `addon/chrome/content/preferences.xhtml`
- `addon/locale/en-US/addon.ftl`
- `addon/locale/zh-CN/addon.ftl`
- `src/modules/userGuide.ts`
- `test/tests/startup.spec.ts`

**关键动作**

- 统一 add-on 名称、仓库地址、发布资产名、支持的 Zotero 版本范围和功能定位。
- 清理 `preferences.xhtml` About 区域里仍指向 Better Notes 的链接。
- 保留历史背景说明，但只允许它出现在明确的“历史说明”语境里，不允许出现在安装、设置和帮助入口。
- 保留 `README.md` 中首条发布下载行的格式为 `- [Version ...](...)`，因为 `zotero-plugin.config.ts` 的构建钩子会自动替换这一行。
- 扩展或保留 `startup.spec.ts` 对插件身份和偏好页入口的断言。

**验证**

- `npm run build`
- 检查 `build/addon/manifest.json`
- 检查生成的 `.xpi` 文件名和 manifest 元数据

**完成标准**

- 主安装入口、偏好页、帮助文本、README 和打包产物不再出现冲突品牌。

### 阶段 2：明确验证基线与贡献者体验

**目标**

- 让本地构建、预检和运行时测试的前提条件清楚可见，避免贡献者把环境问题误判成代码问题。

**重点文件**

- `README.md`
- `package.json`
- `scripts/test-preflight.cjs`
- `zotero-plugin.config.ts`
- 如准备补 CI：新建 `.github/workflows/build.yml` 或 `.github/workflows/test.yml`

**关键动作**

- 明确区分三类验证：静态构建、运行时预检、Zotero 集成测试。
- 保持 `npm run test` 先经过 `test:preflight`，不要回退到直接给出 scaffold 的底层报错。
- 在 README 中写清楚 Node、npm、Zotero 8、本地环境变量和 Windows 下的常见命令。
- 如果准备开放协作，再新增 GitHub Actions；由于仓库里目前没有现成 workflow，计划应以“新建”而不是“修改”来描述。

**验证**

- `npm run build`
- `npm run test:preflight`
- 在具备本地 Zotero 环境的机器上运行 `npm run test`

**完成标准**

- 新贡献者能在第一次运行命令前就知道自己是否具备完整测试环境。

### 阶段 3：清理仓库中的生成型 JavaScript 双份源码

**目标**

- 让仓库重新回到 TypeScript-first 的可维护状态，避免 `src/**/*.js` 与 `src/**/*.ts` 双份实现长期并存。

**重点文件**

- `.gitignore`
- `tsconfig.json`
- `zotero-plugin.config.ts`
- `src/**/*.js`

**关键动作**

- 列出并审查所有已签入的 `src/**/*.js` 文件，确认它们是 `.ts` 的伴生生成物而不是独立源码。
- 搜索是否仍有显式依赖 `src/` 内部 `.js` 文件名的导入路径。
- 删除冗余 `.js` 双份文件，并更新忽略规则，防止它们再次回到仓库。
- 保留 `.gitignore` 本身，因为当前使用的 `zotero-plugin-scaffold` 在构建后阶段会读取它。

**验证**

- `npm run build`
- `npx tsc --noEmit`

**完成标准**

- `src/` 中不再保留无必要的生成型 `.js` 双份实现，搜索结果不再被重复实现污染。

### 阶段 4：收束默认值与配置来源

**目标**

- 让偏好设置默认值、运行时默认值、预览逻辑和测试基线使用同一套规则，不再出现“设置页显示一种、实际导出另一种”的情况。

**重点文件**

- `addon/prefs.js`
- `src/modules/obsidian/settings.ts`
- `src/modules/obsidian/prefsUI.ts`
- `src/modules/obsidian/paths.ts`
- `test/tests/obsidian-pure.spec.ts`
- `test/tests/export.spec.ts`

**关键动作**

- 先修复当前最明显的默认值漂移：
- `addon/prefs.js` 的默认文件名模板仍是 `{{title}} - {{year}}`
- `settings.ts` 的默认模板已经是 `{{title}} -- {{uniqueKey}}`
- `obsidian-pure.spec.ts` 已经把 unique key 规则写成了测试契约
- 确认哪些默认值必须留在 `addon/prefs.js` 作为启动前 bootstrap，哪些默认值应该只由 `settings.ts` 维护。
- 让预览面板、路径推导、真实导出和重命名逻辑全部走同一套 helper。
- 审视 `autoSync`、`watchFiles`、`openAfterSync` 等主动行为默认值，至少在文档和 UI 文案中把后果解释清楚。

**验证**

- `npm run build`
- `npm run test`

**完成标准**

- 默认文件名、路径推导和内容开关只由一套权威来源控制，UI 与实际写盘结果一致。

### 阶段 5：拆分 `settings.ts` 与 `prefsUI.ts`

**目标**

- 把当前超大文件降成更容易审阅和测试的模块，而不破坏外部 API 和主工作流。

**重点文件**

- `src/modules/obsidian/settings.ts`
- `src/modules/obsidian/prefsUI.ts`
- `src/modules/obsidian.ts`
- 建议新增：
- `src/modules/obsidian/defaults.ts`
- `src/modules/obsidian/storage.ts`
- `src/modules/obsidian/metadataPresets.ts`
- `src/modules/obsidian/prefsUI/actions.ts`
- `src/modules/obsidian/prefsUI/renderers.ts`
- `src/modules/obsidian/prefsUI/state.ts`

**关键动作**

- 先从纯函数和常量抽离开始，避免一开始就改 UI 编排。
- 把 JSON 文件存取、迁移、缓存协调从 `settings.ts` 中分离出来。
- 把 Metadata Preset 的标准化、克隆、字段目录和标签逻辑独立成单元模块。
- 让 `prefsUI.ts` 只保留初始化、绑定和协调，把按钮动作、渲染刷新、诊断更新和预览生成分拆出去。
- 保持 `src/modules/obsidian.ts` 的公共入口稳定，避免外部调用点大面积改名。

**验证**

- `npm run build`
- `npm run test`

**完成标准**

- `settings.ts` 与 `prefsUI.ts` 的职责边界清晰，后续新增配置或 UI 行为不再需要在单文件内横跳。

### 阶段 6：加固 Managed Markdown 契约与恢复链路

**目标**

- 用测试把“哪些内容由插件托管、哪些内容必须保留、何时应该重命名或修复”的规则固定下来。

**重点文件**

- `src/modules/obsidian/frontmatter.ts`
- `src/modules/obsidian/markdown.ts`
- `src/modules/obsidian/managed.ts`
- `src/modules/obsidian/sync.ts`
- `src/modules/import/markdown.ts`
- `src/modules/export/markdown.ts`
- `src/modules/sync/history.ts`
- `src/modules/sync/watcher.ts`
- `test/tests/export.spec.ts`
- `test/tests/import.spec.ts`
- `test/tests/obsidian.spec.ts`
- `test/tests/obsidian-pure.spec.ts`

**关键动作**

- 补强以下场景的回归覆盖：
- USER 区缺失、legacy heading、frontmatter 非法时的保底行为
- 受管 frontmatter 与用户自定义 frontmatter 的合并边界
- 标题或父条目元数据变化后的 rename 与 repair
- `managed`、`overwrite`、`skip` 三种更新策略
- PDF 批注、子笔记拼接、Metadata Preset 切换后的重同步
- watcher 去抖、外部文件写入、导回 Zotero 时的循环保护
- sync history 在导出、导入、repair 后是否仍保留可读的前后对比
- 对真正暴露出契约漂移的行为，只改最小必要路径，不顺手重写整条链路。

**验证**

- `npm run build`
- `npm run test`
- 在 Zotero 8 中手工执行至少一次同步、修改 USER 区、重新同步、repair 链路

**完成标准**

- managed note 的 frontmatter、GENERATED 区、USER 区、rename 与 repair 规则都能被测试明确保护。

### 阶段 7：发布收尾与手工 smoke

**目标**

- 在一次真实的 Zotero 8 使用流程中确认文档承诺、打包结果和主工作流完全一致。

**重点文件**

- `README.md`
- `package.json`
- `addon/manifest.json`
- `docs/obsidian-bridge-mvp.md`
- `docs/obsidian-bridge-prd.md`

**关键动作**

- 复核 README、MVP、PRD 和包元数据中的所有公开承诺是否与当前仓库行为一致。
- 确认 release asset 名、最低 Zotero 版本、安装方法、测试说明和 Dashboard 依赖描述都没有过时。
- 做一轮手工 smoke：
- 偏好页打开正常
- Vault 检测与测试写入可用
- 选中文献同步到 Obsidian 可用
- 修改 USER 区后二次同步不丢内容
- 修复联动映射可用
- Dashboard 初始化不覆盖非托管文件

**验证**

- `npm run build`
- `npm run test`
- 手工 smoke 记录

**完成标准**

- 文档、构建、测试、打包产物和手工实际体验指向同一套产品事实。

## 六、退出标准

- 仓库内外只保留一套一致的 Obsidian Bridge 产品叙事。
- README 能让新贡献者独立完成构建、预检和运行时测试准备。
- `src/` 不再保留无必要的 `.ts/.js` 双份实现。
- Obsidian 默认值只来自一个权威来源。
- `settings.ts` 与 `prefsUI.ts` 明显变小，且职责更加单一。
- frontmatter、USER 区、rename、repair、watcher 和 sync history 都有清晰的回归护栏。
- 构建验证与运行时验证都变得明确、可重复、可解释。

## 七、执行原则

- 每个阶段尽量拆成小提交，不要把品牌清理、仓库卫生和行为改动混在同一个提交里。
- 先写失败的测试，再做默认值收束和行为修复。
- 在默认值漂移未解决前，不要继续叠加新的同步策略变化。
- 文档必须服从仓库现实，不要让 README 和计划文档去描述一个代码里并不存在的架构。
