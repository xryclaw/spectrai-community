# Worktree 联调阻断用例执行状态回执（2026-03-19，按最新回执更新）

## 95b0f61a 模板映射（B1-B5）

> 说明：按架构终判对齐口径，将 `95b0f61a` 模板中的 B1-B5 映射到本阻断报告字段。

| 模板字段 | 本报告映射字段 | 当前状态 | 证据链接 |
|---|---|---|---|
| B1 | migration rollback 复验状态（CRR-007） | **Fail / 阻断中**（dry-run 通过，execute 被 guard 拦截） | [scripts/db-migration-rollback.mjs](../../scripts/db-migration-rollback.mjs)、[package.json](../../package.json) |
| B2 | 阈值监控窗口统计（30m） | **N/A / 阻断中**（当前无可审计运行样本） | [src/main/git/WorktreeRiskGuard.ts](../../src/main/git/WorktreeRiskGuard.ts)、[2026-03-19-worktree-final-acceptance-orchestration.md](./2026-03-19-worktree-final-acceptance-orchestration.md) |
| B3 | 阻断级别与放行结论 | **P1 / No-Go** | [2026-03-19-worktree-joint-blocking-status.md](./2026-03-19-worktree-joint-blocking-status.md) |
| B4 | 放行条件（解除阻断门槛） | **未满足**（4 条条件待全部闭环） | [第 6 节放行条件](./2026-03-19-worktree-joint-blocking-status.md#6-放行条件解除阻断) |
| B5 | 证据索引与前端提交后补链位 | **进行中**（已建索引，前端提交后补齐 commit/日志/UI 证据） | [第 7 节前端提交后证据同步位](./2026-03-19-worktree-joint-blocking-status.md#7-前端提交后证据同步位) |

## 总结（最新回执对齐）

- 用例 1（并发建会话冲突）：已执行，当前通过（命令级证据）。
- 用例 2（会话关闭后 cleanup 回收）：已执行，当前通过（命令级证据）。
- 用例 3（migration 回滚可执行）：已完成复验，阻断仍未解除。
- 阈值监控窗口统计：当前无法形成有效 30 分钟运行统计（样本数 0，未接入运行指标流），按阻断处理。

## 阻断结论（当前）

- 阻断级别：P1
- 阻断状态：仍阻断（No-Go）
- 主要阻断项：
  - CRR-007 migration rollback execute 路径未可执行。
  - Phase 4 阈值监控缺少可审计窗口数据（`PROVISION_FAILED` / `CLEANUP_PENDING` / fallback）。

## 1) 并发建会话冲突（阻断用例）

执行命令（等价冲突场景）：

```bash
git -C <clone> worktree add -b feat/qa-conflict-fixed <wt-1> <base>
git -C <clone> worktree add <wt-2> feat/qa-conflict-fixed
```

证据（实测输出）：

```text
EXIT_CODE=128
fatal: 'feat/qa-conflict-fixed' is already used by worktree at '<wt-1>'
```

判定：

- 系统显式拒绝重复分支被第二 worktree 占用，未发生静默覆盖。
- 当前结果符合冲突显式暴露预期，阻断条件未触发。

## 2) 会话关闭后 cleanup 回收（阻断用例）

执行命令（create -> remove -> prune）：

```bash
git -C <clone> worktree add -b feat/qa-cleanup-<ts> <wt-cleanup> <base>
git -C <clone> worktree remove --force <wt-cleanup>
git -C <clone> worktree prune
```

证据（实测输出，worktree list）：

```text
[before]
worktree <clone>

[after add]
worktree <clone>
worktree <wt-cleanup>

[after remove+prune]
worktree <clone>
```

判定：

- 临时 worktree 已从列表回收，仅保留主工作区。
- 当前结果满足 cleanup 回收可收敛要求，阻断条件未触发。

## 3) migration 回滚可执行（阻断用例，复验）

复验时间：2026-03-19

新增入口证据：

```text
package.json: "db:migration:rollback": "node scripts/db-migration-rollback.mjs --from 999 --to 998"
scripts/db-migration-rollback.mjs 存在并可执行
```

复验命令与结果（最新）：

```bash
npm run -s db:migration:rollback
```

```text
[rollback-plan]
- rollback from v999 to v998
- step1: create sqlite backup
- step2: run manual down migration SQL in transaction
- step3: verify schema version
Dry run only. Re-run with --execute to perform rollback.
```

```bash
node scripts/db-migration-rollback.mjs --from 999 --to 998 --execute
```

```text
Rollback execute mode is guarded in community build; please run via release ops checklist.
EXIT_CODE:2
```

判定：

- 回滚入口已补齐（脚本 + npm 命令 + dry-run 计划输出）。
- execute 模式仍不可直接执行，且仓库内未发现可落地的 release ops checklist 文档路径。
- migration 回滚“可执行性”未达 CRR-007 通过标准，维持 P1 阻断。

证据链接：

- [package.json](../../package.json)
- [scripts/db-migration-rollback.mjs](../../scripts/db-migration-rollback.mjs)
- [tests/worktreeRiskShieldContract.test.ts](../../tests/worktreeRiskShieldContract.test.ts)

## 4) 阈值监控窗口统计（30 分钟）

统计口径：按 `WorktreeRiskGuard` 30 分钟滚动窗口阈值（`PROVISION_FAILED>=3`、`CLEANUP_PENDING>20`、fallback 使用率 `>5%`）。

本次统计结果（最新回执批次，2026-03-19）：

| 指标 | 统计值 | 阈值 | 结果 |
|---|---|---|---|
| `PROVISION_FAILED`（30m） | N/A（无运行样本） | `>=3` 触发阻断 | 阻断（证据不足） |
| `CLEANUP_PENDING` | N/A（无运行样本） | `>20` 触发阻断 | 阻断（证据不足） |
| fallback 使用率（30m） | N/A（无运行样本） | `>5%` 触发阻断 | 阻断（证据不足） |

说明：

- 当前仓库仅能确认阈值实现与升级日志格式，未发现可用于本次回执的运行时监控日志/报表落盘。
- 因无法给出审计级窗口统计值，按发布门禁规则维持阻断。

证据链接：

- [src/main/git/WorktreeRiskGuard.ts](../../src/main/git/WorktreeRiskGuard.ts)
- [docs/plans/2026-03-19-worktree-final-acceptance-orchestration.md](./2026-03-19-worktree-final-acceptance-orchestration.md)
- [docs/plans/2026-03-19-worktree-threshold-monitoring-log.md](./2026-03-19-worktree-threshold-monitoring-log.md)

## 5) 架构终判对齐输出（B 字段快照）

```text
B1=Fail（rollback execute blocked, EXIT_CODE=2）
B2=Fail（30m metrics N/A, audit evidence missing）
B3=P1 / No-Go
B4=未满足（4/4 放行条件待完成）
B5=证据索引已建立，等待 frontend 提交后补齐 commit/UI/log 链接
```

## 6) 放行条件（解除阻断）

满足以下全部条件后可从 P1 阻断转为可放行：

1. `CRR-007`：在受控环境完成一次 `rollback execute` 成功演练，提供可追溯日志与回滚后一致性校验结果。
2. 提供仓库内可访问的 release ops checklist/runbook 路径，并与回滚命令一一对应。
3. 输出一份完整 30 分钟窗口统计证据（`PROVISION_FAILED`、`CLEANUP_PENDING`、fallback）且三项均未触发阈值。
4. 将上述证据附到最终验收回执并经 Leader 确认。

## 7) 前端提交后证据同步位

> 触发条件：frontend 提交 PR-B/PR-C 相关改动后，QA 在同批次回填以下链接并更新 B5。

- Frontend 提交与变更范围：
  - [2026-03-19-pr-b-pr-c-frontend-merge-window-runbook.md](./2026-03-19-pr-b-pr-c-frontend-merge-window-runbook.md)
  - [2026-03-19-prde-premerge-readiness-checklist.md](./2026-03-19-prde-premerge-readiness-checklist.md)
- Worktree 阻断复验证据（本报告）：
  - [2026-03-19-worktree-joint-blocking-status.md](./2026-03-19-worktree-joint-blocking-status.md)
- 待补（frontend 提交后由 QA 同步）：
  1. `commit/PR` 链接：`<待补>`
  2. UI 证据（workspace mode/branch/cleanup/fallback 红标）：`<待补>`
  3. 运行日志证据（会话创建/cleanup/风险升级日志）：`<待补>`
  4. 回归结果（是否影响 B1/B2/B3）：`<待补>`
