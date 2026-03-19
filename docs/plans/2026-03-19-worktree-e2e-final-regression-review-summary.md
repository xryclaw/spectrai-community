# Worktree 最终全链路回归复核摘要（任务 213e50e2）

- 执行时间：`2026-03-19 12:20 +08:00`
- 复核范围：新建会话 + worktree 默认开启、并行会话隔离、失败回滚与重试、阈值门禁证据
- 总结论：`NO-GO（不允许合回主分支）`

## 1. 通过/失败矩阵（重点路径）

| 复核项 | 级别 | 结果 | 核心证据 |
|---|---|---|---|
| 默认勾选 worktree（缺省启用） | P1 | PASS | `tests/sessionCreateWorktreeContract.test.ts`：`worktreeEnabled ?? true` 契约测试通过（13/13 总通过） |
| 并行会话隔离（A/B 未提交互不可见） | P0 | PASS | `bash scripts/worktree-integration-smoke.sh` 通过，隔离与并行提交成功 |
| 分支合回前后一致性（merge-back） | P1 | PASS | smoke 脚本 merge-back 成功，A/B 探针文件均可追溯 |
| 失败后重试可恢复 | P1 | PASS（有条件） | 定向注入失败后重试成功（`RETRY_EXIT_CODE=0`） |
| 失败回滚无残留（M2） | P0 | FAIL（阻断） | 失败注入后分支残留：`FAIL_BRANCH_EXISTS_EXIT=0` |
| migration rollback execute（CRR-007） | P1 | FAIL（阻断） | `node ... --execute` 返回 `EXECUTE_EXIT_CODE:2` |
| 阈值窗口证据完整性（30m） | P1 | BLOCKED | 两个窗口均 `N/A(0样本)`，无放行级审计样本 |

## 2. 阻断缺陷状态（更新）

| 缺陷ID | 当前状态 | 级别 | 说明 |
|---|---|---|---|
| M2（失败回滚无残留） | Open / Blocking | P0 | 失败注入后出现分支残留，未满足“残留=0” |
| CRR-007（migration rollback execute） | Open / Blocking | P1 | dry-run 可执行，execute 仍被 guard 阻断 |
| Phase4 阈值证据不足 | Open / Blocking | P1 | 30 分钟窗口样本仍为 0，无法判定未触发阈值 |

## 3. 通过率统计

- 重点场景总数：`7`
- `PASS`：`4`
- `FAIL`：`2`
- `BLOCKED`：`1`
- 通过率（PASS/总数）：`57.1%`
- 阻断率（FAIL+BLOCKED/总数）：`42.9%`

## 4. 残余测试风险

1. 失败路径清理不彻底会引入脏分支累积，影响后续并发会话创建与冲突处理。
2. rollback execute 未打通，发布后若迁移异常缺少可验证的回退兜底。
3. 阈值监控缺少有效样本，无法对“合并暂停/放行”做数据化解除判断。

## 5. 是否允许合回主分支

结论：`不允许合回主分支（NO-GO）`。

放行前最小条件：
1. M2 回归通过（失败后分支/目录/记录残留为 0）。
2. CRR-007 execute 演练至少 1 次成功并提供一致性校验日志。
3. 阈值监控提供至少 1 个有效 30 分钟样本窗口且三项均不触发阈值。

## 6. 证据索引

1. [tests/sessionCreateWorktreeContract.test.ts](../../tests/sessionCreateWorktreeContract.test.ts)
2. [tests/worktreeRiskShieldContract.test.ts](../../tests/worktreeRiskShieldContract.test.ts)
3. [scripts/worktree-preflight.sh](../../scripts/worktree-preflight.sh)
4. [scripts/worktree-integration-smoke.sh](../../scripts/worktree-integration-smoke.sh)
5. [scripts/db-migration-rollback.mjs](../../scripts/db-migration-rollback.mjs)
6. [2026-03-19-worktree-final-regression-evidence-pack.md](./2026-03-19-worktree-final-regression-evidence-pack.md)
7. [2026-03-19-worktree-threshold-monitoring-log.md](./2026-03-19-worktree-threshold-monitoring-log.md)
8. [2026-03-19-worktree-joint-blocking-status.md](./2026-03-19-worktree-joint-blocking-status.md)
