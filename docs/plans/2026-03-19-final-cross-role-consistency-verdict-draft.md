# 封版前跨角色一致性复核与最终发布判定草案

更新时间：2026-03-19
任务ID：`91920d8b-229d-4d47-8e84-83bbd2925f2c`
终判口径：`95b0f61a`（唯一终判准则）

## 1) Go/No-Go 建议（当前）

建议：**NO-GO（不放行）**

架构依据（跨角色一致性汇总）：

1. QA 封版回归结论为 `NO-GO`，并给出阻断项：`M2(P0) + CRR-007(P1) + 阈值样本不足(P1)`。
   - 证据：[worktree-final-regression-evidence-pack.md](/Users/xry/github/spectrai-community/docs/plans/2026-03-19-worktree-final-regression-evidence-pack.md)
2. 后端合回命令复核仍未形成可审计的逐步证据闭环（尤其是回退 execute 成功证据与幂等性证据）。
   - 证据：[backend-merge-command-final-gate-review.md](/Users/xry/github/spectrai-community/docs/plans/2026-03-19-backend-merge-command-final-gate-review.md)
3. 阈值窗口仍处于样本不足态（N/A），不满足发布门禁的可审计统计要求。
   - 证据：[worktree-threshold-monitoring-log.md](/Users/xry/github/spectrai-community/docs/plans/2026-03-19-worktree-threshold-monitoring-log.md)

## 2) 若 Go 时的门禁条件（必须同时满足）

> 当前未满足，仅作为放行前置条件清单。

1. `M2(P0)` 关闭：失败注入后无分支/目录残留，回滚路径收敛为 0 残留。
2. `CRR-007(P1)` 关闭：rollback `--execute` 在受控环境至少 1 次成功，并有一致性校验证据。
3. 后端合回命令清单闭环：
   - 前置检查、冲突检查、门禁检查、合回、cleanup、回退演练均有原始输出。
   - 幂等性验证通过（关键命令重复执行无破坏性副作用）。
4. 阈值统计闭环：提供 30 分钟窗口有效样本（非 N/A），且
   - `PROVISION_FAILED < 3`
   - `CLEANUP_PENDING <= 20`
   - `fallback <= 5%`
5. 跨角色一致性闭环：frontend/backend/qa 三方结论均为可放行，且无新增 P0/P1。

## 3) 剩余风险与缓解建议

| 风险ID | 级别 | 当前状态 | 触发条件 | 缓解建议（可执行） |
|---|---|---|---|---|
| R-M2-RESIDUE | P0 | 未闭环 | 创建失败注入后残留分支/半初始化状态 | 增加失败路径分支清理与回归断言；复跑 M2 并附“残留=0”证据 |
| R-ROLLBACK-EXEC | P1 | 未闭环 | rollback execute 不可执行或无成功演练 | 在受控环境执行一次 `--execute`，输出步骤日志+回滚后一致性校验 |
| R-METRIC-NOAUDIT | P1 | 未闭环 | 30m 统计无样本（N/A） | 补采至少 1 个完整窗口，落盘原始样本与汇总表 |
| R-IDEMPOTENCY | P1 | 未闭环 | 合回命令重复执行产生副作用/状态漂移 | 对关键命令执行二次复跑并记录“第二次无破坏性变化”证据 |
| R-FE-ERR-MAPPING | P1 | 观察项 | 前端错误分级依赖 message 文本，后端文案变化导致误分级 | 后端透传稳定错误码，前端分级改为 code 驱动 |

## 4) 跨角色一致性总览（封版时点）

- frontend：基础交互链路完成，已提交交付附件；存在 P1 观察项（错误分级 code 化依赖后端）。
  - 证据：[frontend-worktree-final-delivery-attachment.md](/Users/xry/github/spectrai-community/docs/plans/2026-03-19-frontend-worktree-final-delivery-attachment.md)
- backend：核心能力具备，但合回命令与回退 execute 的审计证据闭环不足。
  - 证据：[backend-merge-command-final-gate-review.md](/Users/xry/github/spectrai-community/docs/plans/2026-03-19-backend-merge-command-final-gate-review.md)
- qa：最终封版回归结论明确为 `NO-GO`，阻断项已定位。
  - 证据：[worktree-final-regression-evidence-pack.md](/Users/xry/github/spectrai-community/docs/plans/2026-03-19-worktree-final-regression-evidence-pack.md)

## 5) 发布判定草案（可直接贴报告）

```text
【封版前架构一致性判定草案】
结论：NO-GO（暂不放行）
依据：当前存在未闭环阻断项 M2(P0)、CRR-007(P1) 与 30 分钟阈值样本不足(P1)；
后端合回命令与回退 execute 尚未形成完整可审计证据链。
动作：冻结主分支合回，仅允许阻断修复与证据补齐；完成后按 95b0f61a 立即复判。
```
