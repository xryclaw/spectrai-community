# Agent Teams 全流程自主执行功能设计文档

> 文档日期：2026-03-18  
> 目标版本：v0.5.x  
> 状态：Draft（待评审）

## 1. 背景与目标

当前 SpectrAI 已具备 Supervisor 调度、多 Provider、审批与 Agent 子任务能力，但用户仍需手动组织关键流程。新增「自主任务」模式，目标是让系统从任务目标出发，自动完成：

1. 头脑风暴（澄清目标与约束）
2. 确认（将歧义收敛为可执行定义）
3. 制定计划（生成团队执行计划）
4. 审批（人工批准/拒绝计划）
5. 团队执行（并行执行、验证、交付）

最终实现从目标输入到可交付结果的端到端自治闭环。

## 2. 关键用户故事

1. 作为用户，我在「新建会话」中选择「自主任务」，输入任务目标后点击「开始规划」，系统自动组织团队并进入流程。
2. 作为用户，我可以在「计划审批」阶段查看清晰计划，并选择批准或拒绝。
3. 作为用户，我批准后无需继续手动调度，团队自动并行执行并在最终阶段交付结果。
4. 作为用户，我能在 Agent Teams 面板实时看到成员状态、任务进度、阻塞点和当前责任人（Leader）。

## 3. 范围与非目标

### 3.1 本期范围（In Scope）

1. 新增「自主任务」会话模式（与普通会话/Supervisor 并列）。
2. 新增流程状态机：brainstorming -> confirming -> planning -> waiting_approval -> executing -> validating -> delivering -> done/failed。
3. 新增计划审批门禁：未批准不得进入执行。
4. 新增团队执行编排：Leader 自动拆分并分派给角色 Agent，支持多 Provider 混搭。
5. 新增全流程可视化：左侧团队列表、中部成员状态、右侧讨论与状态摘要。

### 3.2 非目标（Out of Scope）

1. 不在本期实现跨项目长期记忆（跨任务知识图谱）。
2. 不在本期实现自动财务/成本预算优化算法。
3. 不在本期实现「完全无人工审批」的强制模式（审批步骤保留）。

## 4. 交互设计（基于现有界面演进）

### 4.1 新建会话弹窗

在当前 `会话模式` 区域扩展为三态：

1. 普通会话
2. Supervisor
3. 自主任务（新增）

当选择「自主任务」时显示：

1. `允许的 Agent Provider`（多选）
2. `任务目标`（必填 textarea）
3. 主按钮文案切换为 `开始规划`

### 4.2 Agent Teams 主视图

新增/强化以下信息区：

1. 左侧：团队列表（活跃、暂停、已完成）
2. 中部：成员泳道（Leader / 工程实现 / 流程验证 / 质量审查）
3. 右侧：讨论 + 状态总览（当前阶段、待审批项、阻塞项、下一步）

## 5. 端到端流程状态机

```text
INIT
  -> BRAINSTORMING
  -> CONFIRMING
  -> PLANNING
  -> WAITING_APPROVAL
     -> (reject) PLANNING
     -> (approve) EXECUTING
  -> VALIDATING
  -> DELIVERING
  -> DONE
  -> FAILED (任意阶段可转入)
```

状态切换约束：

1. `WAITING_APPROVAL` 仅接受 `approve/reject` 事件。
2. `EXECUTING` 需要至少 1 个活跃成员 Agent。
3. `VALIDATING` 必须在所有关键任务完成后触发。
4. `DELIVERING` 输出最终交付摘要与证据（变更文件、命令、测试结果）。

## 6. 编排架构设计

### 6.1 核心角色

1. Leader：流程驱动、任务拆分、资源分配、风险汇总。
2. Implementer：编码/文档/脚本执行。
3. Validator：构建/测试/回归验证。
4. Reviewer：质量与安全审查。

### 6.2 核心模块

1. `AutonomousWorkflowEngine`（新增）：驱动状态机与阶段切换。
2. `PlanApprovalGateway`（复用并增强）：承接现有 ExitPlanMode 审批能力。
3. `TeamExecutionOrchestrator`（新增）：将计划拆成并行子任务并调度 Agent。
4. `DeliveryAggregator`（新增）：汇总产物并生成最终交付报告。

### 6.3 与现有能力的映射

1. 复用 `SessionManagerV2` 的会话状态与消息分发。
2. 复用 `AgentMCPServer` 的工具分级能力（supervisor/member/awareness）。
3. 复用 `spawn_agent / wait_agent_idle / get_agent_output` 作为执行原语。
4. 复用现有 `SESSION_APPROVE_PLAN` IPC，新增自治流程事件。

## 7. 数据模型扩展

建议新增（或等效扩展）表：

1. `team_workflows`：workflowId、sessionId、goal、phase、approved、createdAt、updatedAt
2. `team_workflow_steps`：stepId、workflowId、title、ownerRole、status、dependsOn、evidence
3. `team_workflow_events`：eventId、workflowId、type、payload、createdAt

说明：若当前已有团队/任务表可覆盖，可先以最小增量字段实现，避免重复建模。

## 8. 关键实现点（按代码目录）

1. `src/renderer/components/layout/Sidebar.tsx`  
   新增「自主任务」模式 UI、Provider 多选、目标输入与按钮文案切换。
2. `src/shared/types.ts`  
   扩展会话配置与流程状态类型（新增 autonomous 配置与 phase 枚举）。
3. `src/shared/constants.ts`  
   新增自治流程相关 IPC 常量。
4. `src/main/ipc/sessionHandlers.ts`  
   在 SESSION_CREATE 分支中识别 autonomous 模式，初始化流程上下文与 MCP 模式。
5. `src/main/session/SessionManagerV2.ts`  
   增加自治流程生命周期管理与审批后继续执行入口。
6. `src/main/agent/`（新增模块）  
   实现 `AutonomousWorkflowEngine` / `TeamExecutionOrchestrator` / `DeliveryAggregator`。

## 9. 验收标准（Definition of Done）

1. 用户可在新建会话选择「自主任务」，并成功发起规划。
2. 系统会按顺序进入 brainstorming/confirming/planning/waiting_approval。
3. 用户拒绝审批后，流程返回 planning 并可再次提交审批。
4. 用户批准后，团队自动执行并可在 UI 实时看到成员状态变化。
5. 执行完成后输出交付报告，至少包含：结果摘要、关键变更、验证证据、风险提示。
6. 任意子任务失败时，Leader 能汇总失败原因并给出重试或人工介入建议。

## 10. 风险与对策

1. 风险：多 Agent 并发导致状态竞争。  
   对策：状态机写入采用原子更新，关键阶段增加乐观锁版本号。
2. 风险：Provider 额度/认证失败导致流程中断。  
   对策：内置 provider fallback 策略，并记录 `failedProvider` 供重试。
3. 风险：计划质量不稳定。  
   对策：在 planning 阶段引入固定模板与最小字段校验（目标、步骤、验收、回滚）。
4. 风险：用户感知黑盒。  
   对策：在每个阶段输出可读进展与下一步动作，暴露“人工接管”入口。

## 11. 里程碑建议

1. M1（UI + 状态机骨架）：支持自主任务入口、阶段切换、审批门禁。
2. M2（团队执行）：支持 Leader 分派与成员执行、基础进度可视化。
3. M3（验证与交付）：接入验证环节、交付报告、失败恢复策略。

## 12. 发布后度量指标

1. 从目标到首版计划的平均耗时（TTP: Time To Plan）。
2. 计划审批一次通过率。
3. 自动执行完成率（无人工接管）。
4. 平均交付周期与失败重试次数。
5. 用户主动中断率（用于评估流程可用性与可信度）。
