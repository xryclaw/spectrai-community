# 后端合回命令清单架构复核与 Go/No-Go 判定（预置版）

更新时间：2026-03-19
判定口径：`95b0f61a` 为唯一终判准则
任务ID：`a7fad89f-cc7b-492f-9976-7d1b794c3816`

## 0. 目标

在后端提交“主分支合回命令清单 + 回退演练记录”后，按本表逐条映射验证：

1. 流程正确性（命令顺序与保护动作齐全）
2. 并发隔离不被破坏（不引入跨会话污染）
3. 回滚路径完整（可执行、可验证、可恢复）

输出：`GO / NO-GO` 与必须修复项。

## 1. 架构关键检查点（先验清单）

### 1.1 合回路径必须覆盖的检查点（Must）

| 编号 | 检查点 | 判定标准 | 架构依据 |
|---|---|---|---|
| M-01 | 合回前冲突检查 | 必须先做 merge 检查，且冲突文件可见 | [GitWorktreeService.ts](/Users/xry/github/spectrai-community/src/main/git/GitWorktreeService.ts:595) |
| M-02 | 合回入口门禁 | 合回前必须经过阈值门禁拦截（暂停时禁止合并） | [gitHandlers.ts](/Users/xry/github/spectrai-community/src/main/ipc/gitHandlers.ts:217), [AgentManagerV2.ts](/Users/xry/github/spectrai-community/src/main/agent/AgentManagerV2.ts:851) |
| M-03 | 合并串行化 | 同 repo 合并必须受 repo 锁保护，避免并发写主分支 | [GitWorktreeService.ts](/Users/xry/github/spectrai-community/src/main/git/GitWorktreeService.ts:639) |
| M-04 | cleanup 闭环 | cleanup 失败必须进入 pending + 补偿重试，不得静默吞掉 | [AgentManagerV2.ts](/Users/xry/github/spectrai-community/src/main/agent/AgentManagerV2.ts:905), [WorktreeSessionSafety.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeSessionSafety.ts:33) |
| M-05 | 阈值升级日志 | 触发/解除必须有结构化日志证据（trigger/resolved/block） | [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:139), [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:158), [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:237) |
| M-06 | 回滚入口可执行 | rollback 不仅 dry-run，必须有 execute 成功演练记录 | [db-migration-rollback.mjs](/Users/xry/github/spectrai-community/scripts/db-migration-rollback.mjs:32), [db-migration-rollback.mjs](/Users/xry/github/spectrai-community/scripts/db-migration-rollback.mjs:39) |

### 1.2 并发隔离保护点（Must）

| 编号 | 检查点 | 判定标准 | 架构依据 |
|---|---|---|---|
| I-01 | 会话唯一 worktree | 同时段并发会话不得共享 `worktreePath/branch` | [worktree-concurrency-recovery-regression.md](/Users/xry/github/spectrai-community/docs/plans/2026-03-19-worktree-concurrency-recovery-regression.md:36) |
| I-02 | 同仓 provision/cleanup 互斥 | 创建/清理路径必须串行，避免竞态残留 | [WorktreeSessionSafety.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeSessionSafety.ts:16) |
| I-03 | 合并后变更归因 | 合回文件变更需可归因（session/worktree） | [gitHandlers.ts](/Users/xry/github/spectrai-community/src/main/ipc/gitHandlers.ts:237), [FileChangeTracker.ts](/Users/xry/github/spectrai-community/src/main/tracker/FileChangeTracker.ts:195) |

## 2. 否决条件（命中任一直接 NO-GO）

1. 后端命令清单缺少“合回前冲突检查”或“门禁检查”步骤。
2. 发现绕过门禁直接执行主分支 merge 的路径（无 `assertMergeAllowed` 约束证据）。
3. cleanup 失败无补偿策略/无 pending 记录。
4. 回滚仅 dry-run，无 execute 成功演练证据。
5. 30 分钟阈值统计为 N/A（无样本）且未提供补充审计证据。
6. 并发隔离证据缺失，或出现跨会话污染风险。

## 3. 后端提交后逐条映射表（待填）

> 填写方式：后端每条命令/演练记录对应一行；架构复核列给出 `Pass/Fail` 与证据。

| 序号 | 后端命令/步骤 | 预期目的 | 复核点(M/I编号) | 证据（日志/截图/输出） | 复核结论 | 备注 |
|---|---|---|---|---|---|---|
| 1 | `<待后端填>` | `<例如：合回前冲突检测>` | `M-01` | `<link>` | `Pending` |  |
| 2 | `<待后端填>` | `<例如：执行合回>` | `M-02/M-03` | `<link>` | `Pending` |  |
| 3 | `<待后端填>` | `<例如：cleanup与补偿验证>` | `M-04` | `<link>` | `Pending` |  |
| 4 | `<待后端填>` | `<例如：阈值日志核验>` | `M-05` | `<link>` | `Pending` |  |
| 5 | `<待后端填>` | `<例如：rollback execute 演练>` | `M-06` | `<link>` | `Pending` |  |

## 4. Go/No-Go 快速判定规则

### 4.1 Go（允许进入主分支合并确认）

必须同时满足：

1. 第 3 节映射表无 `Fail`；`Pending=0`。
2. Must 项 `M-01 ~ M-06` 全部 `Pass`。
3. 隔离项 `I-01 ~ I-03` 全部 `Pass`。
4. 无命中第 2 节否决条件。
5. `95b0f61a` 的 B1-B5 不存在阻断态（Fail/N.A.）。

### 4.2 No-Go（禁止进入主分支合并确认）

命中任一即 No-Go：

1. `M-06` Fail（rollback execute 不可执行/无演练）。
2. `M-05` Fail（阈值触发/解除日志或证据链不完整）。
3. `I-01/I-02/I-03` 任一 Fail。
4. 出现第 2 节任何否决条件。

## 5. 必须修复项输出模板（No-Go 时必填）

| 风险ID | 级别 | 现象 | 影响面 | 责任方 | 修复要求 | 截止时间 |
|---|---|---|---|---|---|---|
| `R-001` | `P0/P1` | `<问题描述>` | `<范围>` | `<backend/qa/...>` | `<必须动作>` | `<YYYY-MM-DD HH:mm>` |

## 6. 当前预判（等待后端提交前）

当前状态：**预判 No-Go（待后端证据回填）**

依据：

1. 回滚 execute 路径当前在社区版仍被 guard（需后端提交受控演练证据才能翻转）。
2. 30 分钟阈值监控当前样本不足（N/A），需后端补齐审计证据。
3. 需以后端“命令清单 + 回退演练记录”完成第 3 节逐条映射后才能最终裁决。
