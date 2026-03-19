# Worktree 最终回归预编排与证据模板（任务 5824c1f2）

- 更新时间：`2026-03-19`
- 适用阶段：后端“合回命令清单”提交前后的 QA 快速切换执行
- 目标：命令清单到达后，5 分钟内进入高风险回归并输出 `PASS/BLOCKED`

## 1. 当前状态与触发条件

当前状态（预编排阶段）：
1. 最终验收编排与阻断回执已存在。
2. `CRR-007 migration rollback execute` 仍为 P1 阻断（dry-run 可执行，execute 被 guard）。
3. 阈值监控滚动快照已启动（每 10 分钟记录一次）。

触发执行条件（进入实跑）：
1. 后端提交“合回命令清单”（命令 + 顺序 + 回滚点）。
2. 命令清单可在当前仓库直接执行，且包含失败回滚命令。

## 2. 最终回归执行顺序（预编排）

### A. 命令清单到达前（已完成）

1. 锁定回归基线文档与阻断标准：
   - `docs/plans/2026-03-19-worktree-final-acceptance-orchestration.md`
   - `docs/plans/2026-03-19-worktree-concurrency-recovery-regression.md`
   - `docs/plans/2026-03-19-worktree-joint-blocking-status.md`
2. 准备证据模板与回传模板（本文件）。
3. 预留命令清单接入位（见第 3 节）。

### B. 命令清单到达后（立即执行，按风险优先）

1. `HR-1 / P1`：CRR-007 migration rollback 可执行性复验（先跑）。
2. `HR-2 / P0`：M2 失败回滚无残留（worktree/branch/.spectrai-worktrees）。
3. `HR-3 / P0`：M1 并发唯一性 + M4 enter_worktree 重入隔离。
4. `HR-4 / P1`：M3 SESSION_CREATE 元数据一致性。
5. `HR-5 / P1`：CRR-005 cleanup 回收可收敛性。
6. `HR-6 / P1`：30 分钟阈值快照回填（PROVISION_FAILED/CLEANUP_PENDING/fallback）。

执行规则：
1. 出现任一 P0 失败：立即判定 `BLOCKED(P0)` 并暂停相关合并。
2. 出现任一 P1 失败：判定 `BLOCKED(P1)`，不得放行。
3. 全部通过才可给出 `PASS`。

## 3. 后端命令清单接入位（待填）

- 清单来源：`<待后端提交链接>`
- 执行批次：`<YYYY-MM-DD HH:mm +08:00>`
- 命令组：

```bash
# group-1: preflight
<待填>

# group-2: rollback / recovery
<待填>

# group-3: merge / cleanup verification
<待填>
```

- 回滚点：`<tag/commit 待填>`
- 失败回滚命令：`<待填>`

## 4. 证据模板（预填版）

| 用例ID | 风险级别 | 执行命令/步骤 | 预期 | 实际结果 | 结论(PASS/FAIL/BLOCKED) | 证据链接 |
|---|---|---|---|---|---|---|
| CRR-007 | P1 | `npm run -s db:migration:rollback` + `node scripts/db-migration-rollback.mjs --from 999 --to 998 --execute` | rollback execute 可执行并可恢复一致状态 | 预填：dry-run 通过；execute 被 guard（EXIT_CODE=2） | 预填：BLOCKED(P1) | [阻断回执](./2026-03-19-worktree-joint-blocking-status.md) |
| M2 | P0 | 注入失败并触发回滚，检查残留 | 无悬挂 worktree/脏分支/半初始化记录 | `<待执行>` | `<待填>` | `<待填>` |
| M1 | P0 | 并发创建多会话并校验唯一路径/分支 | worktreePath+branch 全唯一 | `<待执行>` | `<待填>` | `<待填>` |
| M4 | P0 | 同会话重入 + 跨会话 enter_worktree | 不破坏绑定且不串目录 | `<待执行>` | `<待填>` | `<待填>` |
| M3 | P1 | SESSION_CREATE 响应字段校验 | 返回 worktreePath/worktreeBranch/workspaceMode 且一致 | `<待执行>` | `<待填>` | `<待填>` |
| CRR-005 | P1 | 会话关闭后 remove+prune/补偿任务校验 | 资源可收敛回收 | `<待执行>` | `<待填>` | `<待填>` |
| 阈值窗口 | P1 | 30 分钟快照统计 | 三项均不触发阈值 | 预填：当前样本不足（N/A） | 预填：BLOCKED(P1) | [阈值快照日志](./2026-03-19-worktree-threshold-monitoring-log.md) |

## 5. 快速回传模板（命令清单到达后直接填）

```text
[最终回归批次回执]
- 执行时间: <YYYY-MM-DD HH:mm +08:00>
- 命令清单: <链接>
- 高风险优先执行: CRR-007 -> M2 -> M1/M4 -> M3 -> CRR-005 -> 阈值窗口
- 结果: PASS / BLOCKED
- 缺陷统计: P0=x, P1=y
- 阻断项:
  1) <ID + 现象 + 关键日志>
  2) <ID + 现象 + 关键日志>
- 合并建议: 继续 / 暂停相关合并
- 证据索引:
  - <link1>
  - <link2>
  - <link3>
```

## 6. 当前状态更新（已执行封版）

- 最终实跑已执行，封版结果见：`docs/plans/2026-03-19-worktree-final-regression-evidence-pack.md`。
- 本模板保留为后续复跑批次的预填基线。
- 当前门禁结论：`NO-GO`（阻断项：M2/CRR-007/阈值样本不足）。
