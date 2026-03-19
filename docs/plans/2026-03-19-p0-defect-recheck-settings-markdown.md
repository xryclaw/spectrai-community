# P0 缺陷文案与交互一致性复核（DEF-001/002/003/005/007/008）

- 任务ID：`27fc7d51-63ba-4c06-beba-f162060286cf`
- 复核范围：`DEF-001/002/003/005/007/008`
- 复核依据：
  - `docs/plans/2026-03-19-settings-markdown-unified-acceptance-spec.md`
  - `docs/plans/2026-03-19-settings-markdown-joint-walkthrough-defects.md`
- 复核方式：当前前端代码静态复核（用于 QA 复测前对齐）

结论：本轮 6 条 P0 **均未达到“可判通过”**，建议先完成修复再进入 QA 复测。

---

## 1) 逐条复核结果（通过/不通过）

| 缺陷ID | 结果 | 结论 |
|---|---|---|
| DEF-001 | 不通过 | 设置页仍无 Esc 关闭 + 未保存确认链路 |
| DEF-002 | 不通过 | Tab 切换仍会卸载通用表单，未提交输入可能丢失 |
| DEF-003 | 不通过 | Workspace 请求失败仍被吞并为空态 |
| DEF-005 | 不通过 | 代理保存按钮仍无 saving/disabled 防重入 |
| DEF-007 | 不通过 | assistant 空内容仍无 empty 文案与操作 |
| DEF-008 | 不通过 | Markdown 渲染异常仍无降级提示与兜底路径 |

---

## 2) 剩余偏差清单（可直接给前端改）

### DEF-001 不通过
- 当前表现：`UnifiedSettingsModal` 仅右上角按钮关闭，无 `Esc` 监听，也无“未保存确认”。
- 证据：`src/renderer/components/settings/UnifiedSettingsModal.tsx:75`
- 修订建议文案：
  - 标题：`你有未保存的更改`
  - 正文：`当前修改尚未保存，确认离开设置页吗？`
  - 按钮：`继续编辑` / `放弃更改`

### DEF-002 不通过
- 当前表现：按 `activeTab` 条件渲染 Tab 内容，切换会卸载 `GeneralTab`；`useEffect` 重新以 store 值覆盖本地输入。
- 证据：
  - `src/renderer/components/settings/UnifiedSettingsModal.tsx:96-101`
  - `src/renderer/components/settings/UnifiedSettingsModal.tsx:148-154`
- 修订建议：
  - 方案A：保活各 Tab 内容（CSS 隐藏而非卸载）
  - 方案B：将代理草稿状态提升到 Modal 级别按 tab 缓存

### DEF-003 不通过
- 当前表现：Workspace `load()` catch 分支直接 `setWorkspaces([])`，UI 显示空态而非错误态。
- 证据：`src/renderer/components/settings/WorkspaceManager.tsx:28-35, 78-82`
- 修订建议文案：
  - 主文案：`工作区列表加载失败`
  - 辅助文案：`请检查服务状态后重试`
  - 主按钮：`重新加载`

### DEF-005 不通过
- 当前表现：代理保存按钮始终可点击，未提供 `saving` 状态与防重入。
- 证据：`src/renderer/components/settings/UnifiedSettingsModal.tsx:291-298`
- 修订建议文案：
  - 按钮默认：`保存代理设置`
  - 提交中：`保存中...`
  - 成功提示：`代理设置已保存`

### DEF-007 不通过
- 当前表现：assistant 内容区域仅在 `parsedContent.textContent` 存在时渲染；空内容无提示与操作。
- 证据：`src/renderer/components/conversation/MessageBubble.tsx:280`
- 修订建议文案：
  - empty 文案：`模型未返回可显示内容`
  - 操作：`重试` / `复制原始消息`

### DEF-008 不通过
- 当前表现：Markdown 直接渲染，无异常兜底提示；未看到降级纯文本提示文案分支。
- 证据：`src/renderer/components/conversation/MessageBubble.tsx:289-297`
- 修订建议文案：`内容渲染失败，已切换为纯文本`

---

## 3) 组件库/SFS/MDR 对齐复核结论

1. SFS 对齐状态：
- 壳层结构（全屏、左侧导航、右侧滚动）已对齐
- 关键交互（Esc/未保存确认、草稿保持、错误态可操作）未对齐

2. MDR 对齐状态：
- 正常渲染链路（GFM + 高亮）已对齐
- 异常与空态（MDR-006/007）未对齐

3. 组件库一致性：
- 未看到统一 `StateBanner/MarkdownFallbackNotice` 级别的状态组件落地
- 仍是分散条件渲染，导致文案与动作一致性不足

---

## 4) QA 复测前可直接执行清单（最终版）

> 使用方式：前端每关闭一条，QA 即按对应条目复测并打勾。

1. `RET-001`（对应 DEF-001）
- 步骤：打开设置页，修改任一可编辑项不保存，按 `Esc`
- 通过标准：出现未保存确认弹层；选择“继续编辑”不关闭；选择“放弃更改”关闭

2. `RET-002`（对应 DEF-002）
- 步骤：通用Tab输入代理 host/port，不保存；切到主题再切回
- 通过标准：输入值仍保留，不被已保存值覆盖

3. `RET-003`（对应 DEF-003）
- 步骤：模拟 workspace.list 失败
- 通过标准：出现错误态（非空态），并有“重新加载”按钮可触发 load

4. `RET-005`（对应 DEF-005）
- 步骤：连续快速点击“保存代理设置”
- 通过标准：按钮进入 `保存中...` 且 disabled；完成后恢复并出现成功反馈

5. `RET-007`（对应 DEF-007）
- 步骤：注入 assistant 空内容消息
- 通过标准：出现 `模型未返回可显示内容`，且至少一个可操作入口（重试/复制原始消息）

6. `RET-008`（对应 DEF-008）
- 步骤：注入 Markdown 渲染异常场景
- 通过标准：出现 `内容渲染失败，已切换为纯文本`，消息可继续展示且会话不中断

---

## 5) 本轮复核判定

- 当前是否可进入 QA 复测：`否`
- 阻塞项：`DEF-001/002/003/005/007/008` 全部未闭环
- 建议：前端先完成上述6条后，按本清单进行二次复核，再交 QA 执行回归。