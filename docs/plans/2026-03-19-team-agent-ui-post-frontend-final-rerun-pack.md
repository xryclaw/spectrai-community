# Team-Agent UI 前端收口后最终回归复跑包（QA）

> 日期: 2026-03-19
> 关联任务: dcc1389a-9f9c-43fb-b9bb-71a48567ed77
> 触发条件: frontend 任务 `da9a40d0-7d3b-4631-bdbf-24a41284d0de` 状态变更为 `completed`

## 0. 当前预检快照（非最终）

- 快照时间: `2026-03-19 13:27:29 +0800`
- frontend 依赖任务状态: `da9a40d0 = in_progress`
- 预检结果:
  - `npm run build`: PASS
  - `npm run test`: PASS（63/63）
  - `node --test --experimental-strip-types tests/teamAgentUiRestructureRegression.test.ts`: PASS（5/5）

说明：该快照仅用于确认当前基线稳定，不替代“frontend 收口完成后”的最终复跑结论。

## 1. 复跑范围（必须覆盖）

- 主流程：团队会话识别、成员切换、TeamPanel 跳转 leader session
- 回退路径：成员会话缺失时返回团队对话
- 异常态：加载失败/数据缺失降级不崩溃
- 团队会话标识：SessionItem Users 图标 + 成员数 badge
- 测试稳定性：关键回归集重复执行一致性

## 2. 执行顺序（前端完成后立即执行）

1. `npm run build`
2. `npm run test`
3. `node --test --experimental-strip-types tests/teamAgentUiRestructureRegression.test.ts tests/gate2LeakRegression.test.ts tests/gate2SettingsSidebarContract.test.ts`
4. 关键回退/异常路径定向复跑（同命令再跑 1 次，验证稳定性）

## 3. 结果记录模板

- 执行时间: `<YYYY-MM-DD HH:mm:ss +0800>`
- frontend 收口版本: `<commit/说明>`
- `npm run build`: `<PASS|FAIL>`
- `npm run test`: `<PASS|FAIL>`，`<passed>/<failed>`
- 定向回归集（首轮）: `<PASS|FAIL>`，`<passed>/<failed>`
- 定向回归集（稳定性复跑）: `<PASS|FAIL>`，`<passed>/<failed>`

## 4. 缺陷分级模板

- P0: `<数量>`（阻断发布）
- P1: `<数量>`（默认阻断发布）
- P2: `<数量>`
- P3: `<数量>`

缺陷明细（如有）：

| 缺陷ID | 级别 | 现象 | 最短复现路径 | 影响范围 | 建议动作 | 状态 |
|---|---|---|---|---|---|---|
| `<DEF-XXX>` | `<P0/P1/P2/P3>` | `<描述>` | `<步骤>` | `<范围>` | `<修复建议>` | `<Open/Fixed>` |

## 5. 发布建议模板

- GO/NO-GO: `<GO | Conditional GO | NO-GO>`
- 判定依据:
  - `<依据1>`
  - `<依据2>`
- 若为 Conditional GO，触发条件:
  1. `<条件1>`
  2. `<条件2>`

## 6. 证据挂载位

- 结果文档（更新）: `docs/plans/2026-03-19-team-agent-ui-final-regression-release-verdict.md`
- 收尾证据草稿（更新）: `docs/plans/2026-03-19-team-agent-ui-qa-final-evidence-draft.md`
- 本复跑包（当前）: `docs/plans/2026-03-19-team-agent-ui-post-frontend-final-rerun-pack.md`
