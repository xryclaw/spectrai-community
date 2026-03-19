# Team Agent UI 重构回归与验收报告

> 日期: 2026-03-19
> 任务ID: 0694305b-d3ba-4ed2-8680-993268eedcc3
> 角色: 测试工程师
> 结论: Conditional GO（可合并，发布前需补 1 轮跨端手工冒烟）

## 1. 验收矩阵与执行计划

| 用例ID | 维度 | 验收点 | 方法 | 结果 |
|---|---|---|---|---|
| MF-01 | 主流程 | teamStore 建立 session↔team 映射，并可按 session 反查团队 | 自动化契约测试 | 通过 |
| MF-02 | 主流程 | 选中团队会话时，Sidebar 切换为 TeamMembersSidebar；非团队会话回退 SessionsContent | 自动化契约测试 | 通过 |
| MF-03 | 主流程 | TerminalPanel：团队会话默认团队对话，选成员后切到成员 ConversationView | 自动化契约测试 | 通过 |
| MF-04 | 主流程 | TeamPanel 点击运行实例可跳转 leader session，并切回 sessions + tabs 视图 | 自动化契约测试 | 通过 |
| MF-05 | 主流程 | Session 列表中团队会话显示 Users 图标与成员数 badge | 自动化契约测试 | 通过 |
| CC-01 | 并发场景 | 重复 initListeners 前先清理旧订阅，避免重复监听泄漏 | 既有回归测试 | 通过 |
| CC-02 | 并发场景 | 团队成员状态变化后，sessionTeamMap 跟随实例数据重建 | 自动化契约测试 | 通过 |
| EX-01 | 异常场景 | 选中成员但成员无 sessionId 时，主区显示“尚未启动会话”降级提示 | 自动化契约测试 | 通过 |
| EX-02 | 异常场景 | TeamMembersSidebar 返回动作：清空 selectedMember + 取消当前 session 选中 | 自动化契约测试 | 通过 |
| XD-01 | 跨端一致性 | 构建产物可在当前环境完成打包（无编译错误） | `npm run build` | 通过 |
| XD-02 | 跨端一致性 | 桌面端/窄窗口视觉与交互一致性（真机） | 手工冒烟（待执行） | 待补 |

## 2. 自动化执行证据

### 2.1 执行命令

```bash
npm run build
npm run test
```

### 2.2 结果摘要

- `npm run build`: 通过（无编译错误）
- `npm run test`: 通过（60 passed, 0 failed）
- 新增回归用例文件：`tests/teamAgentUiRestructureRegression.test.ts`
- 更新旧基线测试：`tests/gate2SettingsSidebarContract.test.ts`

## 3. 缺陷分级与处理

| 缺陷ID | 级别 | 类型 | 描述 | 状态 |
|---|---|---|---|---|
| DEF-TEST-001 | S3（低） | 测试基线过时 | Sidebar 旧契约测试仍断言 `default -> SessionsContent`，与新重构 `SessionsPanelWrapper` 不一致，导致误报失败 | 已修复（更新测试） |

说明：本轮未发现 team-agent UI 功能性阻塞缺陷（S0/S1/S2）。

## 4. 发布建议（Go/No-Go）

- 建议: **Conditional GO**
- 依据:
  - 关键主流程/并发/异常契约均已自动化覆盖并通过。
  - 构建与全量测试均通过。
  - 仍缺跨端真机冒烟（XD-02），建议在发布前补 1 轮（macOS + Windows，窄窗口/常规窗口）。

## 5. 后续动作建议

1. 发布前补执行 XD-02 手工冒烟并回填截图/录屏证据。
2. 将 `tests/teamAgentUiRestructureRegression.test.ts` 纳入后续 gate 套件，防止重构回归。
