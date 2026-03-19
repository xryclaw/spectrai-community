# Team-Agent UI 最终门禁复判清单与判定模板（architect）

> 任务ID: `e2a02aa6-d4a9-4fce-be04-d076df002a77`
> 基线文档: `docs/plans/2026-03-19-team-agent-ui-restructure.md`
> 模板时间: `2026-03-19 13:26:00 CST`

## 0. 复判前置状态（任务态）

- frontend: `da9a40d0-7d3b-4631-bdbf-24a41284d0de`（`in_progress`，待最终收口证据）
- designer: `0c56c165-ab50-4fb3-8930-2fa1c73ca978`（`completed`）
- backend: `da228980-2ac7-4ab4-840e-9645f2492ff6`（`completed`）
- qa: `8e3d0047-98d1-4d30-8e8c-8ef58549eb9a`（`completed`）

## 1. 准入硬条件（全部满足才可 GO）

### 1.1 Step 闭环

- [ ] Step6 已完成（SessionItem 团队标识）
- [ ] Step7 已完成（重构全链路 + 差异闭环）

### 1.2 历史风险闭环

- [ ] `selectedMemberId` 无跨团队污染风险
- [ ] `onBack` 不再写入空 session 哨兵
- [ ] TeamPanel 运行中实例筛选语义与实现一致

### 1.3 跨角色证据可审计

- [ ] frontend 最终收口文档已落盘（含文件清单 + 验证命令 + 结果）
- [ ] designer 差异复核结论为 PASS/CONDITIONAL PASS 且可追溯
- [ ] backend 契约稳定性证据存在且可复验
- [ ] qa 最终回归证据存在且无 P0/P1 未闭环

### 1.4 工程门禁

- [ ] `npm run build` PASS
- [ ] `npm run test` PASS（或不低于当前全量基线）

## 2. 阻断判定规则（命中任一即 NO-GO）

- [ ] frontend 最终收口证据缺失或任务未完成
- [ ] 任一 P0 未闭环
- [ ] 任一“历史风险项”仍保留高风险实现
- [ ] 证据文档仅口头结论、缺可追溯位点（代码/日志/测试）

## 3. P0/P1 分级模板（复判时填写）

| ID | 级别 | 问题 | 影响 | 证据 | 最小修复路径 |
|---|---|---|---|---|---|
| BLK-001 | P0/P1 | `<待填>` | `<待填>` | `<file:line/doc>` | `<待填>` |
| BLK-002 | P0/P1 | `<待填>` | `<待填>` | `<file:line/doc>` | `<待填>` |

## 4. 可延后项模板（非阻断）

| ID | 级别 | 项目 | 原因 | 最晚补齐时间 | 责任人 |
|---|---|---|---|---|---|
| DEF-001 | P2 | `<待填>` | `<待填>` | `<待填>` | `<待填>` |

## 5. 最终判定模板

```text
[Team-Agent UI 最终门禁复判]
- 时间: <YYYY-MM-DD HH:mm:ss>
- 结论: GO / NO-GO
- 阻断项: <0 or n>
- 可延后项: <0 or n>
- 关键依据:
  1) docs/plans/2026-03-19-team-agent-ui-restructure.md
  2) <frontend final evidence>
  3) <designer closure evidence>
  4) <backend stability evidence>
  5) <qa final verdict>
- 发布建议:
  - GO: <执行动作>
  - NO-GO: <冻结动作 + 最小修复路径>
```

## 6. 当前轮备注（待 frontend 收口后刷新）

- 目前 `frontend da9a40d0` 仍 in_progress，按门禁规则暂不满足 GO 判定前置。
- frontend 回传后 10 分钟内完成最终复判并更新为裁决文档。