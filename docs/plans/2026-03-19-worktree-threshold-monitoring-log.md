# Worktree 阈值监控滚动快照（每10分钟）

- 任务ID：`8c7edd67-ceca-48b2-a642-2d0f8b2b3c17`
- 统计窗口：固定 30 分钟滚动窗口
- 指标口径：`PROVISION_FAILED` / `CLEANUP_PENDING` / `fallback 使用率`
- 阈值规则：
  - `PROVISION_FAILED >= 3`（30m）
  - `CLEANUP_PENDING > 20`
  - `fallback > 5%`（30m）

## 快照记录

| 快照时间(+08:00) | 统计窗口 | PROVISION_FAILED | CLEANUP_PENDING | fallback(rate/samples) | 触发结论 | 合并状态 | 证据 |
|---|---|---:|---:|---|---|---|---|
| 2026-03-19 12:13:39 | 11:43:39 ~ 12:13:39 | N/A（0 样本） | N/A（0 样本） | N/A（0/0） | 未触发阈值事件；但监控样本不足，维持阻断判定 | 保持暂停（按现有 P1 阻断） | [WorktreeRiskGuard.ts](../../src/main/git/WorktreeRiskGuard.ts)、[阻断回执](./2026-03-19-worktree-joint-blocking-status.md) |
| 2026-03-19 12:20:33 | 11:50:33 ~ 12:20:33 | N/A（0 样本） | N/A（0 样本） | N/A（0/0） | 未触发阈值事件；样本仍不足，不能解除阻断 | 保持暂停（按现有 P1 阻断） | [WorktreeRiskGuard.ts](../../src/main/git/WorktreeRiskGuard.ts)、[最终回归证据包](./2026-03-19-worktree-final-regression-evidence-pack.md) |

## 执行节奏

- 下一次快照计划时间：`2026-03-19 12:30:33 +08:00`
- 规则：每 10 分钟追加一行；若任一阈值触发，立即升级并在“合并状态”标注 `暂停相关合并`。
