# IPC 错误态交互规范与验收标准（前端 + QA）

- 文档日期：2026-03-18
- 任务 ID：9e264d89-60f5-458a-b974-f7269c609b34
- 目标：围绕 IPC 校验加固后的失败路径，统一错误文案、恢复动作、用户引导与验收标准，保证“可理解、可恢复、可追踪”。

## 1. 适用范围与交互位

1. 新建会话弹窗（当前已支持错误块）：`src/renderer/components/layout/Sidebar.tsx:974`
2. 对话区权限确认栏：`src/renderer/components/conversation/ConversationView.tsx:487`
3. 会话头部超时/卡住提示：`src/renderer/components/terminal/TerminalHeader.tsx:225`
4. 会话恢复失败 Toast：`src/renderer/components/layout/Sidebar.tsx:1013`

## 2. 错误态分组规范

### A. 校验失败（Validation Failed）

#### A1. 触发定义

- IPC 返回 `success: false` 且错误可归因于参数/状态不合法。
- 典型来源：`SESSION_CREATE` 前置校验与资源检查（如 `SessionManager 未初始化`、并发限制）`src/main/ipc/sessionHandlers.ts:468` `:473`。

#### A2. 标准文案

- 标题：`请求校验未通过`
- 主文案模板：`{action} 失败：{reason}`
- 说明文案：`请先修正输入后重试。`

建议 reason 映射：
1. `SDK V2 SessionManager 未初始化` -> `系统尚未准备好，请稍后重试。`
2. 并发/资源限制 -> `当前会话数量已达上限，请先结束部分会话。`
3. 工作区/路径无效 -> `工作目录不可用，请重新选择。`

#### A3. 恢复动作

1. 主操作：`修正后重试`
2. 次操作：`查看配置`（跳转 provider/workspace 设置）
3. 兜底操作：`复制错误详情`

#### A4. 验收标准

1. 失败后 300ms 内出现错误反馈（弹窗内联或 Toast）。
2. 文案必须包含可执行动作，不允许只显示技术栈原文错误。
3. 点击“修正后重试”后，保留用户已输入字段（不清空表单）。

---

### B. 权限失败（Permission Denied / Permission Response Failed）

#### B1. 触发定义

- 工具权限请求被用户拒绝，或权限响应 IPC 调用失败。
- 当前权限请求来源：`permission_request` 事件 `src/main/session/SessionManagerV2.ts:1101`；前端操作入口 `ConversationView` 允许/拒绝按钮 `src/renderer/components/conversation/ConversationView.tsx:495`。

#### B2. 标准文案

- 标题：`权限未通过`
- 主文案模板：`{toolName} 需要权限才能继续。`
- 分支文案：
1. 用户主动拒绝：`你已拒绝本次权限请求，AI 将按受限模式继续。`
2. IPC 响应失败：`权限响应提交失败，请重试。`

#### B3. 恢复动作

1. 主操作：`重新授权`
2. 次操作：`改为手动执行`（提示用户可复制命令在本地执行）
3. 兜底操作：`忽略并继续`

#### B4. 验收标准

1. 拒绝权限后，对话区必须出现明确结果提示（而非仅控制台日志）。
2. 权限响应失败时，保留当前确认栏，不得静默消失。
3. “重新授权”成功后，确认栏关闭且会话恢复到可继续输入状态。

---

### C. 超时（Timeout / Stuck）

#### C1. 触发定义

- 会话创建等待超时或运行卡住。
- 等待逻辑：`waitForSessionReady(timeoutMs)` `src/main/session/SessionManagerV2.ts:856`；创建时默认 6s/12s `src/main/ipc/sessionHandlers.ts:692`。
- 当前 UI 仅显示“启动超时/可能卡住/已卡住”标签 `src/renderer/components/terminal/TerminalHeader.tsx:39` `:225`。

#### C2. 标准文案

- 标题：`会话响应超时`
- 主文案模板：`{phase} 超过 {timeout}s 未完成，可能网络波动或 Provider 忙碌。`
- 引导文案：`你可以等待、重试恢复，或切换 Provider。`

#### C3. 恢复动作

1. 主操作：`立即重试`
2. 次操作：`恢复会话`
3. 备选操作：`切换 Provider 重建会话`
4. 兜底操作：`继续等待`

#### C4. 验收标准

1. 超时后必须同时给出状态标签 + 可点击恢复动作（不能只有被动标签）。
2. 超时恢复成功时，提示自动收敛（标签消失，状态恢复 running/waiting_input）。
3. 连续 2 次超时需升级提示级别（展示“建议切换 Provider”）。

---

### D. 未知错误（Unknown Error）

#### D1. 触发定义

- IPC catch 分支返回 `error.message`，但无法映射到校验/权限/超时。
- 典型现状：多处仅 `console.error`，用户不可见（例如 `useConversation` 中权限/审批响应失败仅日志）`src/renderer/hooks/useConversation.ts:140` `:158`。

#### D2. 标准文案

- 标题：`发生未知错误`
- 主文案模板：`操作未完成，请稍后重试。`
- 附加文案：`若问题持续，请复制错误详情反馈。`

#### D3. 恢复动作

1. 主操作：`重试`
2. 次操作：`复制错误详情`
3. 备选操作：`恢复会话`

#### D4. 验收标准

1. 未知错误必须向用户可见（Toast/Inline 至少一种），禁止仅输出控制台。
2. 错误提示包含 traceId/sessionId（用于 QA 复现与日志关联）。
3. 重试按钮触发同一动作重放，不需要用户重复填写全部输入。

## 3. 前端落地规则（统一）

1. 错误文案分层：`标题（类型） + 主文案（人话） + 详情（可折叠技术信息）`。
2. 所有错误态必须包含至少 1 个恢复动作按钮。
3. 按钮优先级固定：主操作（实心） > 次操作（描边） > 文本链接（辅助）。
4. 错误详情默认收起，避免技术噪音打断主流程。
5. 输入保留策略：校验失败与未知错误默认保留输入；权限拒绝按场景保留上下文。

## 4. QA 用例清单（可直接执行）

1. 校验失败：构造 `SESSION_CREATE` 失败，验证文案分类为“请求校验未通过”，可重试且输入保留。
2. 权限拒绝：在权限确认栏点击“拒绝”，验证出现结果提示与“重新授权/手动执行”引导。
3. 权限响应异常：模拟 `respondPermission` 抛错，验证确认栏不消失并出现失败反馈。
4. 超时场景：模拟 `waitForSessionReady` 超时，验证出现可操作恢复区（重试/恢复/切换 Provider）。
5. 未知错误：制造通用 catch 错误，验证 toast 含 `sessionId` 且可复制详情。
6. 可恢复性：每类错误至少有 1 条路径可回到 `waiting_input` 或完成重建。

## 5. 与当前实现的差距（本轮需补）

1. 权限响应失败、计划审批失败当前仅控制台日志，缺少用户可见反馈（`useConversation`）。
2. 超时/卡住目前仅视觉标签，无直接恢复动作（`TerminalHeader`）。
3. 新建会话错误区未做错误类型分组与动作引导（`Sidebar`）。
4. 错误文案目前中英混杂（例如 starting placeholder），建议统一中文用户文案。
