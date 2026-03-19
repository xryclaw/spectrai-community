# Worktree 最终回归执行与证据包（封版）

- 任务ID：`b03b8488-a2a8-4ec4-9be0-636baf78b430`
- 执行时间：`2026-03-19 12:17~12:18 +08:00`
- 执行环境：`/Users/xry/github/spectrai-community`
- 结论级别：`NO-GO（阻断）`

## 1. 本轮执行范围（高风险优先）

1. 并行会话隔离与分支合回一致性（脚本 + 命令级复验）
2. 失败回滚路径（创建失败后的残留检查）
3. migration rollback 可执行性（dry-run + execute）
4. 阈值门禁契约回归（risk shield contract）

## 2. 执行命令清单

```bash
bash scripts/worktree-preflight.sh
bash scripts/worktree-integration-smoke.sh
npm run -s db:migration:rollback
node scripts/db-migration-rollback.mjs --from 999 --to 998 --execute
node --test --experimental-strip-types tests/worktreeRiskShieldContract.test.ts
```

补充定向复验（命令级）：

```bash
# 分支命名冲突显式拒绝（CRR-003）
git worktree add ... && git worktree add ... <same-branch>

# cleanup 回收可收敛（CRR-005）
git worktree add -> git worktree remove --force -> git worktree prune

# 失败注入后残留检查（M2 定向）
mkdir occupied-path && git worktree add -b <branch> <occupied-path> <base>
# 检查 refs/heads/<branch> 与 worktree list
```

## 3. 通过/失败矩阵（封版）

| 用例/校验项 | 级别 | 结果 | 关键证据 | 判定 |
|---|---|---|---|---|
| Phase0 preflight | P0 | PASS | `Summary: failures=0 warnings=1` | 环境可执行，允许继续 |
| CRR-001 并发隔离（未提交互不可见） | P0 | PASS | `worktree-integration-smoke.sh` 中隔离检查通过 | 无串扰 |
| WT-008/WT-009 分支提交与回合并一致性 | P1 | PASS | smoke 脚本完成 A/B 提交并 merge-back 成功 | 合回前后一致 |
| CRR-003 分支命名冲突 | P1 | PASS | `fatal: '<branch>' is already used by worktree ...` + 退出码 128 | 冲突显式暴露，无静默覆盖 |
| CRR-005 cleanup 回收 | P1 | PASS | `[after remove+prune]` 仅保留主 worktree | 回收可收敛 |
| M2 失败回滚无残留（定向注入） | P0 | FAIL | `worktree add` 因路径已存在失败后，`refs/heads/<branch>` 仍存在（BRANCH_EXISTS_EXIT=0） | 存在分支残留风险，阻断 |
| CRR-007 migration rollback 可执行性 | P1 | FAIL | dry-run 正常；`--execute` 返回 `EXIT_CODE:2`（guard） | 回滚 execute 不可执行，阻断 |
| 风险门禁契约回归 | P1 | PASS | `tests/worktreeRiskShieldContract.test.ts` 8/8 PASS | 门禁逻辑存在且测试通过 |
| 阈值窗口证据 | P1 | BLOCKED | 30m 快照当前 `N/A(0样本)` | 样本不足，不满足放行证据 |

## 4. 重点路径结论

### 4.1 并行会话隔离（重点）

- 结果：`PASS`
- 依据：A/B worktree 可并行创建，未提交改动隔离，分支提交互不污染。

### 4.2 失败回滚路径（重点）

- 结果：`FAIL / BLOCKED(P0)`
- 现象：注入“目标目录已占用”失败后，分支仍被创建，说明失败路径存在残留风险。
- 影响：若应用层未覆盖该回滚分支清理，可能导致脏分支累积与后续冲突。

### 4.3 分支合回前后一致性（重点）

- 结果：`PASS`
- 依据：smoke 脚本中 A/B 分支提交并成功 merge-back 到基线分支，探针文件均可追溯。

## 5. 最终测试结论与主分支合回建议

最终结论：`NO-GO`

阻断项：
1. `M2 / P0`：失败回滚残留风险（命令级注入后分支残留）。
2. `CRR-007 / P1`：migration rollback execute 不可执行（guard 拦截，退出码 2）。
3. `阈值证据 / P1`：30 分钟窗口仍无审计级样本，无法给出放行级统计证据。

主分支合回建议：`不允许合回主分支`。

放行前最小闭环条件：
1. 补齐失败路径分支清理证据（M2 回归通过，残留=0）。
2. 完成一次可追溯的 rollback execute 演练并通过一致性校验（CRR-007 通过）。
3. 提供 30 分钟阈值监控有效样本（非 N/A）且三项不触发阈值。

## 6. 证据索引

1. [scripts/worktree-preflight.sh](../../scripts/worktree-preflight.sh)
2. [scripts/worktree-integration-smoke.sh](../../scripts/worktree-integration-smoke.sh)
3. [scripts/db-migration-rollback.mjs](../../scripts/db-migration-rollback.mjs)
4. [tests/worktreeRiskShieldContract.test.ts](../../tests/worktreeRiskShieldContract.test.ts)
5. [2026-03-19-worktree-joint-blocking-status.md](./2026-03-19-worktree-joint-blocking-status.md)
6. [2026-03-19-worktree-threshold-monitoring-log.md](./2026-03-19-worktree-threshold-monitoring-log.md)
7. [2026-03-19-worktree-final-regression-preplan-and-evidence-template.md](./2026-03-19-worktree-final-regression-preplan-and-evidence-template.md)
8. [2026-03-19-worktree-e2e-final-regression-review-summary.md](./2026-03-19-worktree-e2e-final-regression-review-summary.md)
