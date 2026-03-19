# P0 交互回归验收清单（会话入口一致性与关键流程可达性）

- 执行日期：2026-03-18
- 执行角色：交互设计师
- 任务 ID：27790bf4-f979-4f8e-8bff-9ac7764db638
- 执行方式：代码走查 + 关键链路可达性检查 + 基础类型检查（`npm run typecheck`）

## 1. 验收范围

1. 会话入口一致性（侧边栏 / 欢迎页 / 快捷键）
2. 自主任务模式入口完整性（文案、必填约束、参数透传一致）
3. 关键流程可达性（创建 → 规划审批 → 执行）
4. 结果可观测性（workflow 状态是否能被前端读取与操作）

## 2. P0 验收清单与结果

| ID | 验收项 | 结果 | 证据 |
|---|---|---|---|
| P0-01 | 所有“新建会话”入口收敛到统一弹窗 | 通过 | `WelcomeTab` 入口触发 `setShowNewSessionDialog(true)`；`Ctrl+N` 也触发同一状态；侧栏自身调用同一弹窗开关。见 `src/renderer/components/terminal/WelcomeTab.tsx:57`、`src/renderer/App.tsx:77`、`src/renderer/components/layout/Sidebar.tsx:232` |
| P0-02 | 自主任务入口显示目标输入与 Provider 多选 | 通过 | 自主任务模式下展示 `autonomousGoal` 文本域与 `allowedProviderIds` 多选。见 `src/renderer/components/layout/Sidebar.tsx:944` |
| P0-03 | 自主任务 CTA 与语义一致（应为“开始规划”） | 失败 | 当前主按钮固定为“创建/创建中”，未随自主任务模式切换。见 `src/renderer/components/layout/Sidebar.tsx:990` |
| P0-04 | 自主任务目标为必填（空目标不可提交） | 失败 | `handleCreateSession` 未校验 `autonomousGoal` 非空；按钮禁用条件也未包含目标校验。见 `src/renderer/components/layout/Sidebar.tsx:267`、`:983` |
| P0-05 | 自主任务 Provider 白名单真实生效 | 失败 | `allowedProviderIds` 仅前端透传，主进程未消费。全仓仅命中 UI 透传与类型字段。见 `src/renderer/components/layout/Sidebar.tsx:296`，`rg` 检索结果仅 UI + 类型命中 |
| P0-06 | 工作流创建后可自动推进到审批/执行关键节点 | 失败 | 仅在会话创建时 `initWorkflow`；无任何链路调用 `transition(..., 'planning'/'waiting_approval')`。见 `src/main/ipc/sessionHandlers.ts:685`、`src/main/agent/AutonomousWorkflowEngine.ts:43` |
| P0-07 | 审批动作在合法阶段可执行 | 失败 | `approve()` 强制从当前阶段转 `executing`，若停留 `brainstorming` 会触发非法状态转换。见 `src/main/agent/AutonomousWorkflowEngine.ts:6`、`:67` |
| P0-08 | 前端可观测并操作 workflow（查询/审批/拒绝） | 失败 | 主进程有 `WORKFLOW_*` IPC，但 preload 未暴露 workflow API，renderer 无消费点。见 `src/main/ipc/sessionHandlers.ts:1416`、`src/preload/index.ts:68` |
| P0-09 | 防重复创建策略对自主任务参数敏感 | 失败 | dedupe key 未包含 `autonomousMode/autonomousGoal/allowedProviderIds`，可能误判不同自主任务为重复提交。见 `src/renderer/stores/sessionStore.ts:274` |

## 3. 结论

- 通过项：2/9
- 失败项：7/9
- 结论：当前“会话入口统一性”基础可用，但“自主任务关键路径可达性”尚未形成闭环，不能作为 P0 交互验收通过。

## 4. 优先修复建议（供前端 + QA 复用）

### P0（本轮必须修）

1. 统一自主任务提交语义：按钮文案改为“开始规划/规划中”，并在自主任务模式强制 `autonomousGoal` 非空校验（前端 + 主进程双重校验）。
2. 打通 workflow 推进链路：在自治流程节点调用 `transition`，确保至少可达 `planning -> waiting_approval -> executing`。
3. 暴露 workflow API 给 renderer：在 preload 增加 `workflow.get/getAll/approve/reject/onPhaseChange`，并在会话视图接入审批入口与阶段展示。
4. 让 `allowedProviderIds` 真正参与调度约束（Leader 分配与 spawn provider 过滤）；若暂未实现，先在 UI 标记为“预留能力”。

### P1（紧随其后）

1. 修正 `createSession` 去重键：纳入 `autonomousMode/autonomousGoal/allowedProviderIds`，避免误吞提交。
2. 增加回归用例：
   - 空目标提交拦截
   - 自主任务按钮文案切换
   - workflow 状态机可达性（含 reject 回 planning）
   - provider 白名单生效性

## 5. 本次走查命令记录

```bash
rg -n "autonomous|workflow|WORKFLOW_APPROVE|WORKFLOW_REJECT|allowedProviderIds" src -S
npm run typecheck
```

> `npm run typecheck` 当前未通过，存在多处历史类型错误；本次结论以交互链路走查证据为主，不以类型检查通过作为放行条件。
