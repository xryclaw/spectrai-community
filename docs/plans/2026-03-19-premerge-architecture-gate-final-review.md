# 发布前架构终检与主分支合并门禁复核（Worktree）

更新时间：2026-03-19
判定口径：`95b0f61a` 模板为唯一终判准则（B1-B5）

## 1. 架构总判（当前）

结论：**不放行（No-Go）**，暂不可进入主分支合并确认阶段。

原因（按 B1-B5）：

- **B1 失败**：migration rollback `--execute` 在社区版被 guard 阻断，无法完成可执行回滚演练。
- **B2 失败**：30 分钟阈值监控缺少审计级运行样本，无法给出可追溯窗口统计。
- **B3/B4 未满足**：当前仍为 P1 阻断，解除条件未闭环。
- **B5 进行中**：证据索引存在，但前端提交后链路证据尚未补齐。

## 2. 可执行门禁清单

### 2.1 合并前必过项（未满足任一即 NO-GO）

| ID | 必过项 | 当前状态 | 证据 |
|---|---|---|---|
| G1 | `CRR-007`：rollback execute 可执行并成功 | **Fail** | [db-migration-rollback.mjs](/Users/xry/github/spectrai-community/scripts/db-migration-rollback.mjs:32), [db-migration-rollback.mjs](/Users/xry/github/spectrai-community/scripts/db-migration-rollback.mjs:39) |
| G2 | 30m 阈值审计数据完整（`PROVISION_FAILED`/`CLEANUP_PENDING`/fallback） | **Fail（N/A）** | [worktree-joint-blocking-status.md](/Users/xry/github/spectrai-community/docs/plans/2026-03-19-worktree-joint-blocking-status.md:122) |
| G3 | Worktree merge 阈值门禁已在所有入口生效 | Pass | [gitHandlers.ts](/Users/xry/github/spectrai-community/src/main/ipc/gitHandlers.ts:217), [AgentManager.ts](/Users/xry/github/spectrai-community/src/main/agent/AgentManager.ts:1716), [AgentManagerV2.ts](/Users/xry/github/spectrai-community/src/main/agent/AgentManagerV2.ts:851) |
| G4 | 风险触发与解除日志可观测（trigger/resolved/block） | Pass（实现层） | [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:139), [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:158), [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:237) |
| G5 | 阈值规则与恢复条件一致（3/20/5%） | Pass（实现层） | [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:50), [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:51), [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:52), [WorktreeRiskGuard.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeRiskGuard.ts:62) |

### 2.2 可延后项（不阻断本次合并确认）

| ID | 项目 | 处理策略 |
|---|---|---|
| D1 | 阈值看板可视化（图形化报表） | 可在放行后补，不影响当前门禁裁决 |
| D2 | 风险日志聚合到统一观测平台 | 可延后到下一迭代，但不替代本次审计证据要求 |
| D3 | 非阻断 warning 清理 | 按周治理，不作为本次主分支放行条件 |

### 2.3 阻断项（必须清零）

| 阻断ID | 级别 | 描述 | 关闭标准 |
|---|---|---|---|
| B-ROLLBACK-EXEC | P1 | rollback execute 被 guard 拦截（Exit 2） | 受控环境完成一次 execute 成功演练并提供日志证据 |
| B-METRIC-30M | P1 | 无 30m 审计样本，三项阈值统计为 N/A | 提交完整窗口证据（数值 + 时间范围 + 原始日志） |

## 3. 明确放行/不放行判定条件

### 3.1 放行（可进入主分支合并确认阶段）

必须同时满足：

1. `B-ROLLBACK-EXEC` 关闭。
2. `B-METRIC-30M` 关闭。
3. `95b0f61a` 模板 B1-B5 全部为通过态（不含 N/A 阻断态）。
4. 前端提交后的一致性复核结论为“通过”，且无新增 M/S 阻断项。

### 3.2 不放行（维持冻结）

命中任一条即不放行：

1. rollback execute 仍不可执行，或无可追溯 runbook。
2. 任一阈值统计缺失（N/A）或超过阈值。
3. 前端提交后出现新增 M（Must）未闭环项。
4. QA 回归出现 P0/P1 新阻断。

## 4. 回滚触发条件（进入合并确认后同样生效）

出现任一条件，立即触发回滚并冻结后续合并：

1. 30 分钟窗口内 `PROVISION_FAILED >= 3`。
2. `CLEANUP_PENDING > 20`。
3. fallback 使用率 `> 5%`。
4. 发生跨会话污染（M1/M2/M4 任一失败）或 cleanup 无法收敛。
5. 合并后验证失败（关键链路不可用 / 回归测试出现 P0）。

回滚动作：

1. 立即暂停所有 worktree 相关 merge 操作。
2. 升级 Leader 并锁定合并窗口。
3. 按回滚 runbook 执行恢复，并补齐触发时间、阈值、影响范围、恢复条件证据。

## 5. 架构侧下一步（执行顺序）

1. 先闭环 `B-ROLLBACK-EXEC`（execute 演练 + runbook 证据）。
2. 再补齐 `B-METRIC-30M`（完整窗口统计证据）。
3. 前端提交后 10-15 分钟内按 `95b0f61a` 输出一致性结论 + M/S 清单 + 准入建议。
4. 满足 3.1 后再进入主分支合并确认。
