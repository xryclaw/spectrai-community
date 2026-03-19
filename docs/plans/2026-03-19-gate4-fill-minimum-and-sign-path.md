# Gate-4 待填项最小集合与签署关键路径（并行收口版）

> 基线：`docs/plans/2026-03-19-gate4-final-release-package-draft.md`
> 目标：frontend `624c...` 与 qa `7b60...` 结果到达后，5 分钟内完成最终判定发布。
> 约束：不改变当前门禁结论（当前仍为 `NO-GO`）。

## 0. 当前状态快照

- frontend 关键任务：`624c30b5-4a00-46c5-9e51-c027c9e6f671`（in_progress）
- qa 关键任务：`7b6086dd-04db-4c80-8b77-221c9f0fca33`（completed，二轮复测 6/6 PASS）
- 当前结论保持：`NO-GO`

## 1. 最小待填字段清单（按角色）

### 1.1 frontend（依赖 624c）

必须回填（最小集）：
1. `624c` 任务状态：`completed`（系统状态）
2. 复验摘要：
   - `node scripts/check-gate1-boundaries.mjs`
   - `npm run -s typecheck:node`
   - `npm run -s typecheck:web`
   - `npm run -s test`
3. 若有连锁改动：影响文件清单 + 回滚点

回填位置：
- `docs/plans/2026-03-19-gate4-final-release-package-draft.md` 第 2 节（frontend 行）

### 1.2 qa（依赖 7b60）

必须回填（最小集）：
1. 二轮复测结论：RET-001/002/003/005/007/008 通过率
2. 最终放行意见：`GO / CONDITIONAL-GO / NO-GO`
3. 证据文档链接：
   - `docs/plans/2026-03-19-p0-ret-second-pass-evidence.md`
   - `docs/plans/2026-03-19-p0-ret-second-pass-gatekeeper-summary.md`

回填位置：
- `docs/plans/2026-03-19-gate4-final-release-package-draft.md` 第 1/2/3 节（DEF状态、qa签字、证据快照）

### 1.3 architect（可立即执行）

必须回填（最小集）：
1. 汇总 DEF-001/002/003/005/007/008 最终关闭状态
2. 生成最终窗口建议（冻结/解冻）
3. 发布最终裁决语句

回填位置：
- `docs/plans/2026-03-19-gate4-final-release-package-draft.md` 第 0/1/4/6 节

### 1.4 leader（最终签发）

必须回填（最小集）：
1. 最终判定：`GO / CONDITIONAL-GO / NO-GO`
2. 风险接受声明（若为 GO/CONDITIONAL-GO）
3. 执行窗口授权（PR-B~PR-E）

回填位置：
- `docs/plans/2026-03-19-gate4-final-release-package-draft.md` 第 0 节与签字矩阵

## 2. 签署顺序预排（最短可执行）

顺序（严格）：
1. frontend 完成 `624c` 并回填最小证据
2. qa 确认 `7b60` 结论并回填最终意见
3. architect 更新 Gate-4 最终版并给出建议
4. leader 一键签发最终判定

## 3. 最长路径耗时评估（从“两个结果都到齐”开始）

### 3.1 关键路径（最慢链路）

1. architect 回填 Gate-4 文档：2 分钟
2. leader 审阅 + 选择模板：2 分钟
3. 发布团队裁决消息：1 分钟

总计：`5 分钟`

### 3.2 并行项

- frontend/qa 在结果到齐前可并行准备证据链接与摘要
- designer/backend 无阻塞项（仅参考态）

## 4. 仅依赖 624c + 7b60 的即时触发动作

当以下条件同时成立：
1. `624c` 状态 = completed
2. `7b60` 状态 = completed（已满足）

立即执行：
1. architect 在 Gate-4 文档回填 frontend+qa 两行状态（2 分钟）
2. architect 根据模板生成最终判定块（1 分钟）
3. leader 使用一键模板签发（2 分钟）

## 5. Leader 一键判定模板（可直接复制）

### 5.1 GO

```text
【Gate-4 最终判定】
结论：GO
时间：<YYYY-MM-DD HH:mm +08:00>
依据：frontend(624c) 与 qa(7b60) 结果已回填；DEF-001/002/003/005/007/008 闭环完成；门禁持续全绿。
窗口：按 W1(PR-B) -> W2(PR-C) -> W3(PR-D) -> W4(PR-E) 执行。
风险接受：<leader填写>
```

### 5.2 CONDITIONAL-GO

```text
【Gate-4 最终判定】
结论：CONDITIONAL-GO
时间：<YYYY-MM-DD HH:mm +08:00>
条件：
1) <条件1>
2) <条件2>
执行窗口：仅开放 W1/W2；W3/W4 待条件满足后再开。
风险接受：<leader填写>
```

### 5.3 NO-GO

```text
【Gate-4 最终判定】
结论：NO-GO
时间：<YYYY-MM-DD HH:mm +08:00>
原因：frontend(624c) 或 qa(7b60) 关键结果未达放行标准。
窗口建议：继续冻结 PR-B/PR-C；PR-D/PR-E 维持准备态。
下一触发点：待 624c+7b60 结果回填后重新判定。
```
