# 设置页与 Markdown 联调走查缺陷单（基于验收规范 v1.0）

- 任务ID：`cad18eb5-239c-4d99-804a-45b1748e7d0a`
- 走查基线：`docs/plans/2026-03-19-settings-markdown-unified-acceptance-spec.md`
- 走查方式：前端在途代码静态走查（SFS/MDR逐条）
- 结论：已完成全屏壳层改造，但关键交互与状态口径仍有未对齐项，需按 P0/P1 处理后再提测。

---

## 1) SFS/MDR 对齐结果总览

| 验收项 | 结果 | 说明 |
|---|---|---|
| SFS-001 全屏设置 | 通过 | 已是 `fixed inset-0` 全屏壳层 |
| SFS-002 固定结构+内容滚动 | 通过 | Header/左导航固定，内容区滚动 |
| SFS-003 Esc关闭+未保存确认 | 不通过 | 无 Esc 监听与未保存确认 |
| SFS-004 Tab切换保留未提交输入 | 不通过 | GeneralTab 卸载后本地输入丢失 |
| SFS-005 各Tab loading/empty/error 三态 | 不通过 | General/Log/Workspace 状态口径不完整 |
| SFS-006 错误态主动作按钮 | 不通过 | 多处仅“关闭错误”，无“重试” |
| SFS-007 保存中防重复点击+反馈 | 不通过 | 代理保存无 saving/disabled |
| MDR-001 完成态 Markdown 统一渲染 | 通过 | assistant 完成态走 react-markdown |
| MDR-002 流式纯文本→结束Markdown | 通过 | `isStreamingDraft` 逻辑已实现 |
| MDR-003 表格不撑破容器 | 通过 | `markdown-table-wrapper` 已包裹 |
| MDR-004 代码高亮+滚动 | 通过 | rehype-highlight + code block 样式 |
| MDR-005 外链安全属性 | 通过 | `_blank` + `noopener noreferrer` |
| MDR-006 渲染失败降级纯文本+提示 | 不通过 | 无 ErrorBoundary/降级文案 |
| MDR-007 空内容 empty 文案+操作 | 不通过 | 内容为空时直接空白 |

---

## 2) 可直接执行缺陷单

### DEF-001（SFS-003）设置页不支持 Esc 关闭，且无未保存确认
- 复现步骤：
1. 打开设置页。
2. 在“通用-代理设置”输入未保存内容。
3. 按 `Esc`。
- 期望：按 `Esc` 触发关闭；若存在未保存改动，先弹确认（离开/继续编辑）。
- 现状：无 `Esc` 监听；仅右上角关闭按钮可退出。
- 截图位点：`设置页 > 顶部右上角关闭按钮旁（键盘操作无反应）`
- 建议文案：`你有未保存的更改，确认离开吗？`（按钮：`继续编辑` / `放弃更改`）
- 优先级：`P0`
- 建议负责人：`frontend`
- 归因：`实现偏差`
- 代码证据：`src/renderer/components/settings/UnifiedSettingsModal.tsx:75`（仅 onClose 按钮，无 Esc 监听）

### DEF-002（SFS-004）Tab 切换会丢失未提交输入
- 复现步骤：
1. 进入“通用”Tab，代理类型改为 HTTP。
2. 输入 host/port，不点“保存代理设置”。
3. 切到“主题”再切回“通用”。
- 期望：本地未提交输入应保留。
- 现状：输入恢复为 store 中已保存值，未提交内容丢失。
- 截图位点：`设置页 > 通用 > 代理设置输入框（切Tab前后对比）`
- 建议文案：无需新增提示；优先保留草稿值。
- 优先级：`P0`
- 建议负责人：`frontend`
- 归因：`实现偏差`
- 代码证据：`src/renderer/components/settings/UnifiedSettingsModal.tsx:96-101`（按 activeTab 条件渲染会卸载组件）；`:148-154`（重挂载后从 settings 覆盖本地状态）

### DEF-003（SFS-005）Workspace 加载失败被误判为空态，缺少错误态
- 复现步骤：
1. 断开 workspace.list 对应 IPC（或模拟抛错）。
2. 打开“工作区”Tab。
- 期望：显示错误态文案 + `重新加载` 主按钮。
- 现状：catch 后直接 `setWorkspaces([])`，展示“还没有工作区”空态。
- 截图位点：`设置页 > 工作区 > 空态卡片（实际为请求失败场景）`
- 建议文案：`工作区列表加载失败`；按钮：`重新加载`
- 优先级：`P0`
- 建议负责人：`frontend`
- 归因：`数据态缺失`
- 代码证据：`src/renderer/components/settings/WorkspaceManager.tsx:28-37, 78-82`

### DEF-004（SFS-005/SFS-006）日志 Tab 无错误态与重试主按钮
- 复现步骤：
1. 模拟 `window.spectrAI.log.getRecent` 抛错。
2. 打开“日志”Tab。
- 期望：显示 `日志读取失败`，提供 `重新读取` 主动作。
- 现状：仅 `console.error`，页面无错误反馈；用户无法判断失败原因。
- 截图位点：`设置页 > 日志Tab > 内容区（无错误提示）`
- 建议文案：`日志读取失败`；按钮：`重新读取`
- 优先级：`P1`
- 建议负责人：`frontend`
- 归因：`数据态缺失`
- 代码证据：`src/renderer/components/settings/UnifiedSettingsModal.tsx:619-627`

### DEF-005（SFS-007）代理保存缺少 saving 态与防重复提交
- 复现步骤：
1. 在“通用-代理设置”连续快速点击“保存代理设置”。
- 期望：进入保存中态，按钮禁用，防止重复提交。
- 现状：按钮始终可点；只在完成后显示“已保存”。
- 截图位点：`设置页 > 通用 > 保存代理设置按钮`
- 建议文案：按钮态切换 `保存中...`。
- 优先级：`P0`
- 建议负责人：`frontend`
- 归因：`实现偏差`
- 代码证据：`src/renderer/components/settings/UnifiedSettingsModal.tsx:291-304`

### DEF-006（SFS-006）错误条缺少统一主动作，仍以“关闭错误”替代“重试”
- 复现步骤：
1. 在 MCP/技能页制造加载错误。
2. 观察错误条操作。
- 期望：错误态必须有主动作（如 `重试加载` / `重新获取`）。
- 现状：仅 `✕` 清除错误，无重试入口（依赖用户手动其他操作）。
- 截图位点：
  - `设置页 > MCP > 顶部错误条`
  - `设置页 > 技能 > 顶部错误条`
- 建议文案：
  - MCP：`MCP 服务加载失败` + `重试加载`
  - 技能：`技能列表加载失败` + `重新获取`
- 优先级：`P1`
- 建议负责人：`frontend`
- 归因：`设计差异`
- 代码证据：
  - `src/renderer/components/settings/McpManager.tsx:160-164`
  - `src/renderer/components/settings/SkillManager.tsx:460-464`

### DEF-007（MDR-007）assistant 空内容时无 empty 文案与操作入口
- 复现步骤：
1. 构造 assistant 消息 `content=""`（或 parse 后 textContent 为空）。
2. 打开会话。
- 期望：显示 `模型未返回可显示内容`，并给出 `重试` 或 `复制原始消息`。
- 现状：消息主体直接不渲染，用户看到空白气泡或无内容区域。
- 截图位点：`会话区 > assistant 消息气泡（空内容）`
- 建议文案：`模型未返回可显示内容`
- 优先级：`P0`
- 建议负责人：`frontend`（`qa` 补回归用例）
- 归因：`数据态缺失`
- 代码证据：`src/renderer/components/conversation/MessageBubble.tsx:280`（仅在 textContent 存在时渲染内容）

### DEF-008（MDR-006）Markdown 渲染异常无降级策略与提示文案
- 复现步骤：
1. 注入可触发渲染链异常的数据（例如插件异常或非法节点组合）。
2. 观察消息渲染。
- 期望：捕获异常后降级纯文本，并显示 `内容渲染失败，已切换为纯文本`。
- 现状：组件内无错误边界与降级提示，异常会中断当前渲染路径。
- 截图位点：`会话区 > assistant 消息（渲染异常场景）`
- 建议文案：`内容渲染失败，已切换为纯文本`
- 优先级：`P0`
- 建议负责人：`frontend`（`qa` 补异常注入用例）
- 归因：`实现偏差`
- 代码证据：`src/renderer/components/conversation/MessageBubble.tsx:289-297`（直接渲染 Markdown，无错误兜底）

### DEF-009（MDR-Loading）流式阶段缺少统一 loading 文案
- 复现步骤：
1. 触发 assistant 流式输出，且初始 token 尚未到达。
2. 观察气泡区域。
- 期望：显示 `正在生成内容…`。
- 现状：未提供统一 loading 文案（仅依赖已有文本流本身）。
- 截图位点：`会话区 > assistant 首包前`
- 建议文案：`正在生成内容…`
- 优先级：`P1`
- 建议负责人：`frontend`
- 归因：`设计差异`
- 代码证据：`src/renderer/components/conversation/MessageBubble.tsx`（无对应 loading 文案分支）

### DEF-010（组件库样式偏差）状态表达未统一为 StateBanner 组件语义
- 复现步骤：
1. 对比 Workspace/MCP/Skill/Log 各 Tab 的空态与错误态。
- 期望：统一结构（图标+主文案+辅助文案+主动作），避免每页风格/动作不一致。
- 现状：文案风格、动作位、图标大小与交互不统一；影响 QA 标准化验收。
- 截图位点：
  - `设置页 > 工作区空态`
  - `设置页 > MCP空态/错误条`
  - `设置页 > 技能空态/错误条`
- 建议文案：沿用验收文档既定文案库，不新增自由文案。
- 优先级：`P2`
- 建议负责人：`frontend`（`designer` 辅助样式 token 对齐）
- 归因：`设计差异`
- 代码证据：
  - `src/renderer/components/settings/WorkspaceManager.tsx:79-82`
  - `src/renderer/components/settings/McpManager.tsx:160-210`
  - `src/renderer/components/settings/SkillManager.tsx:460-499`

---

## 3) 缺陷归因矩阵

| 归因类型 | 缺陷ID | 数量 | 说明 |
|---|---|---:|---|
| 设计差异 | DEF-006, DEF-009, DEF-010 | 3 | 状态动作与文案未按统一规范收敛 |
| 实现偏差 | DEF-001, DEF-002, DEF-005, DEF-008 | 4 | 关键交互缺失或实现未达成验收要求 |
| 数据态缺失 | DEF-003, DEF-004, DEF-007 | 3 | 错误/空态被吞并或缺失分支 |

---

## 4) 修复优先级与执行顺序（前端+QA可直接执行）

1. P0（本轮提测前必须关闭）：`DEF-001, DEF-002, DEF-003, DEF-005, DEF-007, DEF-008`
2. P1（次轮回归前关闭）：`DEF-004, DEF-006, DEF-009`
3. P2（样式一致性收敛）：`DEF-010`

建议分工：
- frontend：完成所有缺陷修复
- qa：新增/更新 SFS-003/004/005/006/007 与 MDR-006/007 回归用例
- backend：本轮无强依赖，仅在 workspace/log IPC 错误码细化时配合

---

## 5) 给 QA 的最小回归用例清单

1. 设置页 Esc 关闭与未保存确认
2. 通用Tab代理输入跨Tab草稿保留
3. Workspace 列表失败 vs 空列表区分
4. 日志读取失败错误态与重试
5. 代理保存按钮 saving/disabled 防重入
6. assistant 空消息 empty 文案与操作
7. Markdown 渲染异常降级纯文本提示
8. 流式首包前 loading 文案显示

以上作为本次联调走查结果，已可直接转为开发与测试执行单。