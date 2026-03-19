# Team-Agent 前端增量对齐复核清单（designer）

> 日期：2026-03-19  
> 关联任务：`fd18e15c-ab6a-432c-9bd9-d9ce78bdd3d4`（frontend）  
> 复核基线：`docs/plans/2026-03-19-team-agent-ui-interaction-copy-final.md`（任务 `5ea1b3c9`）  
> 当前状态：待 frontend 提交增量变更后执行

## A. 复核输入（由 frontend 回传）

1. Commit/PR 标识：`<待填>`
2. 变更文件列表：`<待填>`
3. 自测结果（build/test）：`<待填>`
4. 说明未覆盖项与原因：`<待填>`

## B. 关键差异点复核（必须覆盖）

### B1. 文案键值（teamAgent.*）

| 检查项 | 期望 | 结果（PASS/FAIL/N.A） | 证据 |
|---|---|---|---|
| 团队 session 标识键 | `teamAgent.session.badge` / `teamAgent.session.membersCount` 已接线或有明确占位 | `<待填>` | `<待填>` |
| TeamMembersSidebar 关键键 | `teamAgent.sidebar.*` 核心键（teamConversation/membersTitle/empty/error）有落点 | `<待填>` | `<待填>` |
| TeamConversation 关键键 | `teamAgent.conversation.*` 核心键（empty/fetchError/sendError）有落点 | `<待填>` | `<待填>` |
| Launch/Terminal 关键键 | `teamAgent.launch.*`、`teamAgent.terminal.*` 落点明确 | `<待填>` | `<待填>` |

### B2. 状态映射与分支

| 检查项 | 期望 | 结果（PASS/FAIL/N.A） | 证据 |
|---|---|---|---|
| SessionItem 团队态 | 团队会话有 Users + 成员数 badge；非团队会话不受影响 | `<待填>` | `<待填>` |
| TeamMembersSidebar 三态 | 至少覆盖 `loading/empty-members/error-instance/ready` 分支 | `<待填>` | `<待填>` |
| TeamConversation 三态 | 至少覆盖 `loading/empty/error-fetch/error-send/ready` | `<待填>` | `<待填>` |
| TeamLaunchDialog 异常态 | 启动失败不直接关闭弹窗，具备错误提示 | `<待填>` | `<待填>` |
| TerminalPanel 未就绪态 | `member.sessionId` 缺失时有可操作反馈 | `<待填>` | `<待填>` |

### B3. 样式与交互细节

| 检查项 | 期望 | 结果（PASS/FAIL/N.A） | 证据 |
|---|---|---|---|
| 成员选中态样式 | 选中态延续 `bg-accent-blue/10` + `border-accent-blue/30` 体系 | `<待填>` | `<待填>` |
| 成员状态点颜色 | `idle/working/reviewing/blocked/done/error` 色板一致 | `<待填>` | `<待填>` |
| 错误动作样式 | 错误动作颜色与 hover 态一致，不与主 CTA 混淆 | `<待填>` | `<待填>` |

## C. 差异清单（如有）

| ID | 严重级别（P0/P1/P2） | 差异描述 | 建议修复 | 责任 |
|---|---|---|---|---|
| D-01 | `<待填>` | `<待填>` | `<待填>` | frontend |
| D-02 | `<待填>` | `<待填>` | `<待填>` | frontend |

## D. 复核结论

1. 结论：`<PASS / CONDITIONAL PASS / FAIL>`
2. 阻断项（若有）：`<待填>`
3. 可延期项（若有）：`<待填>`
4. 是否可纳入最终收口引用：`<是/否>`

## E. 快速判定口径（执行时使用）

1. 若存在 P0 差异（状态分支缺失、关键交互不可恢复、错误态无动作），结论直接 `FAIL`。
2. 若仅剩 P1 文案键未全量替换但已有稳定落点与占位，可给 `CONDITIONAL PASS` 并列出补齐窗口。
3. 所有关键态与关键键完成且无回归风险，给 `PASS`。

## F. 快速执行命令模板（frontend 提交后）

```bash
# 1) 查看本轮前端改动文件

git show --name-only --pretty=oneline <frontend_commit>

# 2) 检索 teamAgent 文案键接入

rg -n "teamAgent\." src/renderer -S

# 3) 检索关键状态分支

rg -n "loading|empty|error|fetchError|sendError|selectedMemberId|sessionTeamMap" src/renderer/components/team src/renderer/components/layout/sidebar src/renderer/components/terminal -S

# 4) 最小构建验证

npm run build
```

