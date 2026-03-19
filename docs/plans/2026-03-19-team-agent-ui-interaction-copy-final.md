# Team Agent UI 交互与文案定稿（可直接开发）

> 日期：2026-03-19  
> 关联文档：`docs/plans/2026-03-19-team-agent-ui-restructure.md`  
> 目标：补齐信息架构、状态流、空态/异常态/加载态、文案键值映射与前端组件落点

## 1. 信息架构（IA）定稿

### 1.1 一级结构

1. 会话栏（TerminalTabs）：统一承载普通会话与团队会话（团队会话即 leader 的 session）。
2. 左侧边栏（Sidebar）
   - 选中普通会话：显示 `SessionsContent`
   - 选中团队会话：显示 `TeamMembersSidebar`
3. 主内容区（TerminalPanel）
   - 团队会话 + 未选成员：显示 `TeamConversation`
   - 团队会话 + 已选成员：显示该成员 `ConversationView`
   - 普通会话：显示普通 `ConversationView`

### 1.2 实体模型（前端识别口径）

1. 团队会话识别：`teamStore.sessionTeamMap[sessionId]` 命中即团队会话。
2. 团队实例：`TeamInstance`（状态：`idle/running/paused/completed/failed`）。
3. 团队成员：`TeamInstanceMember`（状态：`idle/working/reviewing/blocked/done/error`）。
4. 主内容上下文：`selectedMemberId === null` 表示团队总对话，否则为成员单聊。

## 2. 关键交互状态流

### 2.1 启动团队

1. 用户在 `TeamPanel` 点击“启动”。
2. `TeamLaunchDialog` 提交后进入 launching。
3. 成功：关闭弹窗，实例出现在“运行中的团队”，会话列表出现团队会话项。
4. 失败：保留弹窗，展示错误态（见 3.4）。

### 2.2 切换团队会话

1. 用户在会话列表点击团队会话项。
2. Sidebar 自动切换为 `TeamMembersSidebar`。
3. 主内容默认显示 `TeamConversation`。

### 2.3 成员钻取与回退

1. 点击成员项：`selectMember(member.id)`，主内容切到成员 `ConversationView`。
2. 点击“团队对话”：`selectMember(null)`，主内容回到团队总对话。
3. 点击侧栏返回：清空 `selectedMemberId` 并返回普通会话列表视图。

## 3. 状态覆盖矩阵（必须实现）

## 3.1 SessionItem（团队会话项）

| 状态 | 触发条件 | UI反馈 | 动作 |
|---|---|---|---|
| ready | `sessionTeamMap` 命中 | 显示团队 badge（Users + 成员数） | 可点击切换 |
| loading | `fetchInstances` 未完成 | 仅显示会话基础信息，不渲染成员数 | 无 |
| error | `sessionTeamMap` 命中但实例缺失 | 显示“团队数据异常”轻量标签 | 点击仍进入会话，侧栏给出错误态 |

## 3.2 TeamMembersSidebar

| 状态 | 触发条件 | UI反馈 | 主动作 |
|---|---|---|---|
| loading | 团队实例首次加载 | 骨架屏（头部+成员行） | 无 |
| empty-members | `members.length===0` | 空态说明“暂无团队成员” | “返回会话列表” |
| error-instance | 实例不存在/读取失败 | 错误态说明+重试 | “重试”/“返回会话列表” |
| ready | 实例与成员完整 | 成员列表 + 状态点 + 当前任务 | 选成员、切团队对话、停止团队 |

## 3.3 TeamConversation

| 状态 | 触发条件 | UI反馈 | 主动作 |
|---|---|---|---|
| loading | `fetchMessages` 进行中 | 消息区骨架+输入框禁用 | 无 |
| empty | `messages.length===0` | 空态文案“暂无团队消息” | 发送首条消息 |
| sending | `sendMessage` 进行中 | 发送按钮 loading/禁用 | 等待发送完成 |
| error-fetch | `getMessages` 失败 | 错误提示条 | “重试加载” |
| error-send | `sendMessage` 失败 | 输入框上方错误条 | “重试发送” |
| ready | 正常 | 消息列表+输入框 | 持续对话 |

## 3.4 TeamPanel / TeamLaunchDialog

| 组件 | 状态 | 触发条件 | UI反馈 |
|---|---|---|---|
| TeamPanel 运行中实例 | empty | `instances.length===0` | “暂无运行中的团队” + 引导“从模板启动一个团队” |
| TeamPanel 模板区 | empty | `templates.length===0` | “暂无模板” + “创建模板”按钮 |
| TeamPanel | error | 拉取实例或模板失败 | 行内错误条 + 重试按钮 |
| TeamLaunchDialog | loading | 点击启动后 | 主按钮显示“启动中...”并禁用 |
| TeamLaunchDialog | error | create/start 抛错 | 字段下错误文案，不关闭弹窗 |

## 3.5 TerminalPanel（团队上下文）

| 状态 | 触发条件 | UI反馈 |
|---|---|---|
| member-unready | 已选成员但 `member.sessionId` 缺失 | “该成员尚未启动会话” + “返回团队对话”按钮 |
| team-missing | `getTeamForSession` 命中后实例消失 | 降级显示普通 `ConversationView` + 顶部轻提示 |

## 4. 文案键值映射（i18n 口径）

> 说明：当前代码中存在硬编码中文，以下键值为本次重构建议的统一映射；前端可按命名直接替换。

| key | 默认文案（zh-CN） | 组件落点 | 触发条件 |
|---|---|---|---|
| `teamAgent.session.badge` | 团队 | `SessionItem.tsx` | 会话为团队会话 |
| `teamAgent.session.membersCount` | `{count} 成员` | `SessionItem.tsx` | 团队会话且成员数可得 |
| `teamAgent.sidebar.backToSessions` | 返回会话列表 | `TeamMembersSidebar.tsx` | 返回按钮 hover/title |
| `teamAgent.sidebar.teamConversation` | 团队对话 | `TeamMembersSidebar.tsx` | 团队总对话入口 |
| `teamAgent.sidebar.membersTitle` | 成员（{count}） | `TeamMembersSidebar.tsx` | 成员区标题 |
| `teamAgent.sidebar.emptyMembers.title` | 暂无团队成员 | `TeamMembersSidebar.tsx` | `members.length===0` |
| `teamAgent.sidebar.emptyMembers.desc` | 请先回到模板补充成员后再启动团队。 | `TeamMembersSidebar.tsx` | `members.length===0` |
| `teamAgent.sidebar.error.title` | 团队信息加载失败 | `TeamMembersSidebar.tsx` | 读取实例失败 |
| `teamAgent.sidebar.error.retry` | 重试 | `TeamMembersSidebar.tsx` | error 态动作 |
| `teamAgent.sidebar.stopTeam` | 停止团队 | `TeamMembersSidebar.tsx` | 运行中/暂停中 |
| `teamAgent.conversation.title` | 团队对话 | `TeamConversation.tsx` | 头部 |
| `teamAgent.conversation.empty` | 暂无团队消息 | `TeamConversation.tsx` | 空态 |
| `teamAgent.conversation.inputPlaceholder` | 输入消息... | `TeamConversation.tsx` | 输入框 |
| `teamAgent.conversation.fetchError` | 消息加载失败，请重试 | `TeamConversation.tsx` | 拉取失败 |
| `teamAgent.conversation.sendError` | 发送失败，请检查团队状态后重试 | `TeamConversation.tsx` | 发送失败 |
| `teamAgent.conversation.retry` | 重试 | `TeamConversation.tsx` | 错误态按钮 |
| `teamAgent.conversation.send` | 发送 | `TeamConversation.tsx` | 发送按钮可见文案（无图标方案） |
| `teamAgent.panel.runningTitle` | 运行中的团队 | `TeamPanel.tsx` | 模块标题 |
| `teamAgent.panel.runningEmpty` | 暂无运行中的团队 | `TeamPanel.tsx` | 实例空态 |
| `teamAgent.panel.templatesTitle` | 模板 | `TeamPanel.tsx` | 模块标题 |
| `teamAgent.panel.templatesEmpty` | 暂无模板 | `TeamPanel.tsx` | 模板空态 |
| `teamAgent.panel.loadError` | 团队数据加载失败 | `TeamPanel.tsx` | fetch 异常 |
| `teamAgent.panel.retry` | 重新加载 | `TeamPanel.tsx` | 异常重试按钮 |
| `teamAgent.launch.title` | 启动团队 | `TeamLaunchDialog.tsx` | 弹窗标题 |
| `teamAgent.launch.cta` | 启动团队 | `TeamLaunchDialog.tsx` | 主按钮默认 |
| `teamAgent.launch.loading` | 启动中... | `TeamLaunchDialog.tsx` | 启动中 |
| `teamAgent.launch.error.requiredDir` | 请选择工作目录 | `TeamLaunchDialog.tsx` | 目录为空 |
| `teamAgent.launch.error.failed` | 团队启动失败，请重试 | `TeamLaunchDialog.tsx` | create/start 异常 |
| `teamAgent.terminal.memberUnready` | 该成员尚未启动会话 | `TerminalPanel.tsx` | 成员 session 缺失 |
| `teamAgent.terminal.backToTeamConversation` | 返回团队对话 | `TerminalPanel.tsx` | member-unready 动作 |

## 5. 前端组件落点（开发任务拆解）

1. `src/renderer/components/layout/sidebar/SessionItem.tsx`
   - 增加团队会话识别（读取 `sessionTeamMap`）
   - 增加团队 badge（Users 图标 + 成员数）
   - 增加 team-missing 异常轻标签

2. `src/renderer/components/team/TeamMembersSidebar.tsx`
   - 补 loading/empty/error 三态分支
   - 增加重试动作（触发 `fetchInstances`）

3. `src/renderer/components/team/TeamConversation.tsx`
   - 增加 `loading/fetchError/sendError` 状态
   - 发送失败时保留输入文本并支持重试

4. `src/renderer/components/team/TeamPanel.tsx`
   - 为模板/实例加载增加错误态
   - 空态补引导性 CTA

5. `src/renderer/components/team/TeamLaunchDialog.tsx`
   - 增加表单级错误展示（required / failed）
   - create/start 失败不关闭弹窗

6. `src/renderer/components/terminal/TerminalPanel.tsx`
   - `member.sessionId` 缺失时补可操作引导按钮

7. 可复用状态组件（建议新增）
   - `src/renderer/components/common/StateBlock.tsx`
   - `src/renderer/components/common/InlineAlert.tsx`

## 6. 设计验收清单（给前端+QA）

1. 团队会话在会话列表可被一眼识别（图标+成员数）。
2. 侧栏与主内容在“普通会话/团队会话/成员会话”三种上下文切换无错位。
3. TeamPanel、TeamMembersSidebar、TeamConversation 全覆盖 `loading/empty/error/ready`。
4. 所有错误态都具备至少一个恢复动作（重试/返回）。
5. 文案键覆盖率 100%，无新增硬编码中文（调试日志除外）。
6. 已完成态（团队 completed/成员 done）与运行态视觉差异明确，且不误导可操作性。

## 7. 与重构计划的闭环关系

1. Step 6（团队会话在 session 列表中的显示）：本稿已给出实现口径（SessionItem 团队 badge + 异常标签）。
2. Step 7（验证）：本稿第 6 节可直接作为交互验收脚本。
3. 本文可作为前端实现与 QA 回归的单一设计基线。