# Team Agent UI 重构 QA 收尾证据包（草稿，可一键转终版）

> 日期: 2026-03-19
> 版本: Draft v0.1
> 适用场景: 团队最终汇报 / Gate 裁决输入
> 当前结论: Conditional GO（QA 侧）

## 0. 终版一键更新位

- `frontend_signoff`: `<PENDING | PASS | FAIL>`
- `backend_signoff`: `<PENDING | PASS | FAIL>`
- `architect_signoff`: `<PENDING | PASS | FAIL>`
- `qa_smoke_cross_platform`: `<PENDING | PASS | FAIL>`
- `final_decision`: `<GO | NO-GO>`
- `decision_time`: `<YYYY-MM-DD HH:mm:ss>`

> 更新规则：四个 signoff 全为 `PASS` 且无 P0/P1 未闭环时，将 `final_decision` 更新为 `GO`。

## 1. 证据索引（可直接粘贴到最终总结）

| 类别 | 证据 | 路径 | 状态 |
|---|---|---|---|
| 重构方案基线 | Team Agent UI 重构计划 | `docs/plans/2026-03-19-team-agent-ui-restructure.md` | 已有 |
| 交互与文案终稿 | Team Agent UI 交互文案终稿 | `docs/plans/2026-03-19-team-agent-ui-interaction-copy-final.md` | 已有 |
| QA 验收报告 | 回归矩阵 + 缺陷分级 + go/no-go | `docs/plans/2026-03-19-team-agent-ui-regression-acceptance-report.md` | 已有 |
| QA 收尾草稿（本文件） | 证据包封版与发布建议 | `docs/plans/2026-03-19-team-agent-ui-qa-final-evidence-draft.md` | 当前 |
| QA 最终回归结论 | 最终通过率 + 缺陷分级 + GO/NO-GO | `docs/plans/2026-03-19-team-agent-ui-final-regression-release-verdict.md` | 已更新 |
| 回归测试新增 | team-agent UI 契约回归集 | `tests/teamAgentUiRestructureRegression.test.ts` | 已落地 |
| 基线修正 | Sidebar 路由契约更新 | `tests/gate2SettingsSidebarContract.test.ts` | 已落地 |

## 2. 关键通过项与通过率摘要

### 2.1 自动化门禁结果

- `npm run build`: **PASS**（无编译错误，执行时间：2026-03-19 13:23:18 +0800）
- `npm run test`: **PASS**（`63 passed / 0 failed`，执行时间：2026-03-19 13:23:18 +0800）

### 2.2 Team Agent UI 关键场景通过项

- 主流程通过：团队会话识别、Sidebar 成员视图切换、成员对话跳转、TeamPanel 跳转 leader session
- 并发/状态同步通过：listener 清理防重复订阅、成员状态变化触发映射刷新
- 异常降级通过：成员无 sessionId 时给出可预期提示，不崩溃
- 可视标识通过：Session 列表团队 badge（Users + 成员数）

### 2.3 缺陷分级结论（当前批次）

- P0: `0`
- P1: `0`
- P2: `0`
- P3: `1`（测试基线过时，已修复）

## 3. 剩余风险（待收口）

| 风险ID | 级别 | 描述 | 当前状态 | 建议动作 |
|---|---|---|---|---|
| R-CP-01 | 中 | 跨端真机一致性（macOS/Windows，窄窗口与常规窗口）尚未补充最终冒烟证据 | 待执行 | 发布前补 1 轮冒烟并回填截图/录屏 |
| R-INT-01 | 低 | 前后端收口后可能引入轻微 UI 交互偏差（文案/状态映射） | 可控 | 收口后执行一次定向回归（MF-01~MF-05 + EX-01） |

## 4. 发布建议草稿（可直接贴到团队总结）

### 4.1 推荐口径（当前）

```text
【QA 收尾建议】
结论：Conditional GO（QA 侧）
依据：Team Agent UI 关键回归项已自动化覆盖并通过；构建与全量测试通过（build PASS，test 63/63 PASS）；当前无 P0/P1 未闭环缺陷。
保留条件：发布前补齐跨端真机冒烟证据（macOS + Windows，窄窗口/常规窗口），完成后可升级为 GO。
```

### 4.2 升级为 GO 的触发条件

1. frontend/backend/architect 三方收口完成并回填签收。
2. QA 完成跨端冒烟（R-CP-01 关闭）。
3. 无新增 P0/P1 缺陷。

## 5. Conditional GO -> GO 一页式升级检查表（跨端真机冒烟）

> 目标：关闭 `R-CP-01`，将 `qa_smoke_cross_platform` 从 `PENDING` 升级为 `PASS`。

| 检查项ID | 平台 | 窗口 | 检查项 | 执行步骤（最短） | 证据文件命名（必须） | 通过标准 |
|---|---|---|---|---|---|---|
| CP-01 | macOS | 常规窗口 | 团队会话识别 + SessionItem 团队标识（Users + 成员数） | 启动应用 -> 进入团队会话列表 -> 截图团队会话行 | `team-agent-ui-smoke-20260319-macos-normal-session-badge.png` | 团队会话可见且标识正确，无错位/无丢失 |
| CP-02 | macOS | 常规窗口 | Sidebar 成员视图切换 + 成员对话切换 | 选中团队会话 -> 点击成员 -> 返回团队对话 | `team-agent-ui-smoke-20260319-macos-normal-sidebar-switch.mp4` | 切换链路完整，无白屏/无卡死 |
| CP-03 | macOS | 窄窗口 | 回退路径（成员无 sessionId -> 返回团队对话） | 构造成员无 sessionId 场景 -> 触发回退按钮 | `team-agent-ui-smoke-20260319-macos-narrow-fallback.png` | 出现可用回退动作且可回到团队对话 |
| CP-04 | windows | 常规窗口 | 团队会话标识 + 主流程一致性 | 同 CP-01/CP-02 | `team-agent-ui-smoke-20260319-windows-normal-mainflow.mp4` | 与 macOS 常规窗口行为一致 |
| CP-05 | windows | 窄窗口 | 异常态/回退路径可用 | 同 CP-03 | `team-agent-ui-smoke-20260319-windows-narrow-fallback.png` | 回退可用，界面无截断不可操作区 |

### 5.1 证据目录与归档要求

- 证据目录：`docs/plans/evidence/team-agent-ui-cross-platform/2026-03-19/`
- 每个检查项至少提供 1 份截图或录屏；文件名必须与上表命名一致（允许后缀 `_v2`）。
- 证据引用需回填到本文件“3.剩余风险”与“0.终版一键更新位（qa_smoke_cross_platform）”。

### 5.2 通过阈值与升级判定语句

- 通过阈值（全部必须满足）：
  1. `CP-01 ~ CP-05` 全部 PASS；
  2. 跨端真机冒烟新增 P0/P1 缺陷为 `0`；
  3. `frontend_signoff/backend_signoff/architect_signoff` 全部为 `PASS`。

- 升级 GO 判定语句（可直接贴最终报告）：

```text
【QA 升级判定】
跨端真机冒烟检查表（macOS/Windows，常规/窄窗口）已全部通过，且未新增 P0/P1 缺陷；三方签收均为 PASS。
据此将发布结论由 Conditional GO 升级为 GO。
```

## 6. 终版更新清单（收口后仅改这几处）

1. 更新“0.终版一键更新位”中的 6 个字段。
2. 在“2.1 自动化门禁结果”补充收口后最新一次执行时间戳。
3. 在“3.剩余风险”将已关闭风险标记为 `Closed` 并附证据链接。
4. 按“5.Conditional GO -> GO 一页式升级检查表”回填证据并执行阈值判定。
5. 将“4.1 推荐口径”中的 `Conditional GO` 改为 `GO`（若触发条件满足）。
