# Team-Agent UI 重构最终架构门禁复判（architect）

> 任务ID: `bc280486-f420-4872-96cd-713e1bd02de1`
> 判定批次: `team-agent-ui-restructure-20260319-1323`
> 判定时间: `2026-03-19 13:23:59 CST`
> 判定人: `architect`
> 基线: `docs/plans/2026-03-19-team-agent-ui-restructure.md`

## 1. 结论

**最终结论：NO-GO（不放行）**

- Step6（SessionItem 团队标识）代码已落地，但 Step7（整体闭环）未满足“可审计证据闭环”要求。
- 历史高风险项中仍存在未消除项（`onBack` 空 session 哨兵、`selectedMemberId` 跨团队污染风险、TeamPanel 实例筛选语义不一致）。
- frontend/backend/qa/designer 四方证据未全部可审计落盘并签收，缺少终版 gate 证据链。

## 2. 复判输入证据

1. 重构基线：`docs/plans/2026-03-19-team-agent-ui-restructure.md`
2. QA 验收报告：`docs/plans/2026-03-19-team-agent-ui-regression-acceptance-report.md`
3. QA 收尾草稿：`docs/plans/2026-03-19-team-agent-ui-qa-final-evidence-draft.md`
4. Designer 复核清单：`docs/plans/2026-03-19-team-agent-ui-incremental-alignment-review-checklist.md`
5. Backend 迁移说明：`docs/plans/2026-03-19-team-agent-ui-backend-migration-note.md`
6. 本地复核执行：`npm run build`（PASS）、`npm run -s test -- tests/teamAgentUiRestructureRegression.test.ts`（PASS，随全量套件 63/63）

## 3. 关键复核结果

### 3.1 Step6 / Step7 完成度

- Step6（团队会话标识）: **PASS（代码层）**
  - `SessionItem` 已接入团队识别与 badge：`src/renderer/components/layout/sidebar/SessionItem.tsx:32-35,145-152`
- Step7（整体闭环）: **FAIL（门禁层）**
  - QA 仍为 `Conditional GO`，跨端真机冒烟 `XD-02` 待补：`docs/plans/2026-03-19-team-agent-ui-regression-acceptance-report.md:6,22,50-55`
  - QA 终版字段仍是占位符（未形成最终签收）：`docs/plans/2026-03-19-team-agent-ui-qa-final-evidence-draft.md:10-15`

### 3.2 历史风险覆盖复核

1. `selectedMemberId` 污染风险：**未完全覆盖（阻断）**
- 仍为全局单值：`src/renderer/stores/teamStore.ts:19,67,144`
- 未按 `teamInstanceId` 隔离存储，存在 A 团队选中成员后切换至 B 团队误命中风险。

2. `onBack` 路由回退风险：**未修复（阻断）**
- 仍使用 `selectSession('')` 哨兵清空会话：`src/renderer/components/layout/Sidebar.tsx:1093-1098`
- 该行为在历史风险中已标记为潜在非法选择态，当前仍存在。

3. TeamPanel 实例筛选风险：**未修复（阻断）**
- 标题为“运行中的团队”，但渲染直接遍历 `instances` 未筛选 `status==='running'`：`src/renderer/components/team/TeamPanel.tsx:97-104`
- 信息语义与实现不一致，影响操作预期与复测结论稳定性。

### 3.3 前后端与测试证据可审计性

- Frontend 自动化回归：**PASS**
  - 重构回归契约存在并通过：`tests/teamAgentUiRestructureRegression.test.ts:11-49`
- Backend 契约：**PASS（代码契约层）**
  - `TEAM_GET_MESSAGES` limit 透传与聚合字段存在：`src/main/ipc/teamHandlers.ts:166-172`、`src/main/storage/repositories/TeamRepository.ts:248-274`、`src/shared/types.ts:975-981`
- Designer 证据：**FAIL（不可审计）**
  - 复核清单仍为待填模板，commit/结果/结论均缺失：`docs/plans/2026-03-19-team-agent-ui-incremental-alignment-review-checklist.md:6,10-13,53-56`
- QA 终版签收：**FAIL（不可审计）**
  - 草稿未转终版，`final_decision` 及四方 signoff 未回填：`docs/plans/2026-03-19-team-agent-ui-qa-final-evidence-draft.md:10-17`

## 4. 阻断清单（NO-GO）

1. `BLK-UI-001`（P0）`onBack` 仍使用 `selectSession('')`，存在非法会话态风险。
2. `BLK-UI-002`（P0）`selectedMemberId` 仍是全局单值，缺少团队维度隔离。
3. `BLK-UI-003`（P1）TeamPanel “运行中”列表未按 running 状态筛选。
4. `BLK-EVD-001`（P0）Designer 复核结论与证据未回填，无法审计。
5. `BLK-EVD-002`（P0）QA 终版签收字段未回填，且跨端真机冒烟证据缺失。

## 5. 转 GO 的最小条件（全部满足）

1. 修复 `BLK-UI-001/002/003` 并补充对应回归用例（至少覆盖“跨团队成员选择不串扰”“返回动作不写入空 session”“TeamPanel 仅展示运行中实例”）。
2. Designer 清单完成回填并给出 `PASS/CONDITIONAL PASS/FAIL` 明确结论。
3. QA 完成 `XD-02`（macOS + Windows，窄窗口/常规窗口）并将草稿转终版，补齐 signoff 与 `final_decision`。
4. 复判时重新执行并附证据：`npm run build`、`npm run test`（或不少于 Team-Agent 相关套件 + gate 套件）。

## 6. 复判建议

- 当前动作：**保持 NO-GO，冻结该重构项合并放行**。
- 复判入口：阻断项修复并补齐证据后，按 `docs/plans/2026-03-19-team-agent-ui-restructure-gate-precheck-template.md` 触发下一轮门禁复判。