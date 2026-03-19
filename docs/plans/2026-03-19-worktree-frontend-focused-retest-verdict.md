# Worktree 前端复测清单定向复验结论（任务 35069a9c）

- 执行时间：`2026-03-19 12:20~12:22 +08:00`
- 复验依据：`docs/plans/2026-03-19-frontend-worktree-final-delivery-attachment.md`
- 复验范围：
  1. 新建会话默认勾选 worktree
  2. 并行会话互不干扰
  3. 关闭勾选后的兼容行为

## 1. 定向复验矩阵（三条路径）

| 路径 | 结果 | 证据 | 判定 |
|---|---|---|---|
| 1) 默认勾选 worktree | PASS | `Sidebar.tsx` 中 `useGitWorktree` 初始值 `useState(true)`；打开弹窗时 `setUseGitWorktree(true)`；契约测试 `sessionCreateWorktreeContract` 通过（含缺省 `worktreeEnabled ?? true`） | 默认勾选链路成立 |
| 2) 并行会话互不干扰 | PASS | `bash scripts/worktree-integration-smoke.sh` 通过：A/B worktree 并行创建、未提交隔离、分支独立提交与 merge-back 成功 | 并发隔离链路成立 |
| 3) 关闭勾选后的兼容行为 | PASS（有条件） | `Sidebar.tsx` 关闭态风险提示可见；`handleCreateSession(false)` 明确传 `worktreeEnabled=false`；成功态文案区分“未启用 worktree”；契约测试覆盖“显式 false: 允许关闭” | 兼容路径成立，但受后端失败回滚缺陷影响整体放行 |

## 2. 阻断缺陷状态（与本轮复验联动）

| 缺陷ID | 级别 | 当前状态 | 对本轮三路径影响 |
|---|---|---|---|
| M2 失败回滚无残留 | P0 | Open / Blocking | 不直接破坏三条前端交互路径，但会阻断整体发布与主分支合回 |
| CRR-007 migration rollback execute | P1 | Open / Blocking | 不直接影响前端默认勾选链路，但影响发布兜底能力 |
| 阈值窗口样本不足 | P1 | Open / Blocking | 影响放行门禁证据完整性，无法解除合并暂停 |

## 3. 通过率与结论

- 本任务三条路径通过率：`3/3 = 100%`
- 但发布门禁总体结论：`NO-GO`
- 原因：存在未闭环阻断缺陷（M2/P0、CRR-007/P1、阈值证据不足/P1）

## 4. 发布风险等级

- 风险等级：`R1-阻断（Blocker）`
- 合回建议：`不允许合回主分支`

## 5. 剩余测试风险

1. 创建失败路径可能遗留分支，长时间运行会放大并发冲突概率。
2. 回滚 execute 未实证可用，迁移异常场景缺少可验证恢复手段。
3. 阈值监控缺少有效 30 分钟样本，无法以数据证据解除暂停。

## 6. 证据索引

1. [2026-03-19-frontend-worktree-final-delivery-attachment.md](./2026-03-19-frontend-worktree-final-delivery-attachment.md)
2. [src/renderer/components/layout/Sidebar.tsx](../../src/renderer/components/layout/Sidebar.tsx)
3. [tests/sessionCreateWorktreeContract.test.ts](../../tests/sessionCreateWorktreeContract.test.ts)
4. [scripts/worktree-integration-smoke.sh](../../scripts/worktree-integration-smoke.sh)
5. [2026-03-19-worktree-e2e-final-regression-review-summary.md](./2026-03-19-worktree-e2e-final-regression-review-summary.md)
6. [2026-03-19-worktree-final-regression-evidence-pack.md](./2026-03-19-worktree-final-regression-evidence-pack.md)
7. [2026-03-19-worktree-joint-blocking-status.md](./2026-03-19-worktree-joint-blocking-status.md)
