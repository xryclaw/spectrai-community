# Team Agent UI 重构计划

> 日期: 2026-03-19
> 状态: 实施中（代码 Step 1-5 已完成，Step 6-7 待前端补齐；交互与文案终稿已完成）

## Context

Team Agent 的后端（types、IPC、DB、TeamOrchestrator、preload bridge、teamStore）已全部实现完成。当前问题是 UI 架构不符合用户预期：

**用户要求**：团队会话和普通会话是同一个东西。会话栏（TerminalTabs）用于切换整个会话（团队A → 团队B → 普通会话C）。当选中的是团队会话时，左侧边栏显示团队成员角色和状态，点击某个角色可查看该角色的单独对话。

**当前问题**：TeamPanel 把团队实例列表、成员状态、对话全部塞在侧边栏里，与普通会话完全隔离。用户无法在会话栏里切换团队会话和普通会话。

## 核心设计

团队会话 = 一个特殊的 session。在 session 列表中和普通 session 并列显示。区别在于：
- 选中团队会话时，左侧边栏自动切换显示该团队的成员列表（角色、状态、当前任务）
- 主内容区默认显示团队对话（TeamConversation），点击侧边栏某个角色后切换为该角色的单独对话
- 会话栏（TerminalTabs）统一管理所有会话的切换

## 实现步骤

### Step 1: teamStore 添加 `activeTeamForSession` 映射 ✅

`src/renderer/stores/teamStore.ts` 添加：
- `sessionTeamMap: Record<string, string>` — sessionId → teamInstanceId 映射
- `selectedMemberId: string | null` — 当前选中的成员（用于查看单个角色对话）
- `selectMember(id: string | null)` — 选中/取消选中成员
- `getTeamForSession(sessionId: string): TeamInstance | null` — 根据 session 查找关联的团队
- `buildSessionTeamMap()` 辅助函数从 instances 构建映射

### Step 2: 新建 TeamMembersSidebar 组件 ✅

`src/renderer/components/team/TeamMembersSidebar.tsx`

在侧边栏中显示团队成员列表，替代原来的 SessionsContent：
- 顶部：返回按钮（回到 session 列表）+ 团队名称 + 团队状态
- 成员列表：每个成员显示角色图标、名称、状态点、当前任务
- 点击成员 → `teamStore.selectMember(memberId)` → 主内容区切换到该成员的对话
- 点击"团队对话"按钮 → `teamStore.selectMember(null)` → 主内容区显示团队整体对话
- 底部：停止团队按钮

### Step 3: 改造 Sidebar — 团队会话时显示成员列表 ✅

`src/renderer/components/layout/Sidebar.tsx`

新增 `SessionsPanelWrapper` 组件：
- 当 `activePanelLeft === 'sessions'` 时，检测当前选中的 session 是否属于团队
- 如果是团队 session → 渲染 `<TeamMembersSidebar />`
- 如果是普通 session → 渲染 `<SessionsContent />`（保持原样）
- 初始化时 fetchInstances + initListeners

### Step 4: 改造 TerminalPanel — 团队会话渲染团队内容 ✅

`src/renderer/components/terminal/TerminalPanel.tsx`

新增 `renderContent()` 方法：
- 检测当前 sessionId 是否属于团队（通过 `useTeamStore.getTeamForSession`）
- 如果是团队 session 且选中了成员 → 渲染该成员的 `<ConversationView sessionId={member.sessionId} />`
- 如果是团队 session 但未选中成员 → 渲染 `<TeamConversation instanceId={...} />`
- 如果是普通 session → 渲染 `<ConversationView sessionId={sessionId} />`（保持原样）

### Step 5: 精简 TeamPanel 为模板管理 + 跳转 ✅

`src/renderer/components/team/TeamPanel.tsx`

移除 TeamPanel 中的 TeamDashboard 内联渲染。TeamPanel 只负责：
- 模板列表（创建、编辑、删除模板）
- 启动团队（从模板启动 → TeamLaunchDialog）
- 运行中的团队实例简要列表（点击跳转到对应 session）

点击运行中的团队实例时：
1. 找到该团队 leader 的 sessionId
2. 调用 `sessionStore.selectSession(leaderSessionId)` 切换到该会话
3. 侧边栏自动切换为 `activePanelLeft = 'sessions'`

### Step 6: 团队会话在 session 列表中的显示 🔄

`src/renderer/components/layout/sidebar/SessionItem.tsx`

团队的 leader session 已经在 session 列表中。需要：
- 识别团队 session（通过 teamStore 的 sessionTeamMap）
- 为团队 session 添加特殊标识（Users 图标 + 成员数量 badge）
- 其他团队成员的 session 仍然被 AgentSubList 过滤隐藏

### Step 7: 验证 ⏳

- `npm run build` 确认无编译错误
- 功能流程：创建模板 → 启动团队 → 团队出现在 session 列表 → 点击团队 session → 侧边栏显示成员 → 点击成员查看对话 → 切换回普通 session → 侧边栏恢复 session 列表

## 涉及的文件

| 文件 | 操作 | 状态 |
|------|------|------|
| `src/renderer/stores/teamStore.ts` | 修改 — 添加 session↔team 映射、selectedMemberId | ✅ |
| `src/renderer/components/team/TeamMembersSidebar.tsx` | 新建 — 侧边栏团队成员列表 | ✅ |
| `src/renderer/components/layout/Sidebar.tsx` | 修改 — sessions 面板内条件渲染团队成员 | ✅ |
| `src/renderer/components/terminal/TerminalPanel.tsx` | 修改 — 团队会话渲染团队内容 | ✅ |
| `src/renderer/components/team/TeamPanel.tsx` | 修改 — 精简为模板管理 + 跳转 | ✅ |
| `src/renderer/components/layout/sidebar/SessionItem.tsx` | 修改 — 团队 session 特殊标识 | 🔄 |

共修改 5 个现有文件，新建 1 个文件。后端无需改动。

## 交互与文案终稿（2026-03-19）

可直接开发的交互稿、状态覆盖矩阵、空态/异常态/加载态与文案键值映射，见：

`docs/plans/2026-03-19-team-agent-ui-interaction-copy-final.md`

