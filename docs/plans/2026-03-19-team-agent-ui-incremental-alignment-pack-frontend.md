# Team Agent UI 增量对齐包（Frontend）

> 日期：2026-03-19
> 负责人：frontend
> 目标：在不阻塞主流程前提下，先落地可确定项；依赖设计定稿项先占位并标注。

## 已先行落地

1. 团队成员侧边栏状态映射兜底
- 文件：`src/renderer/components/team/TeamMembersSidebar.tsx`
- 内容：成员状态/团队状态统一走 `*_META` 映射；未知状态降级显示原始值 + 默认色，避免联调阶段字段波动导致空白。

2. 交互埋点接线（前端事件）
- 文件：`src/renderer/components/team/TeamMembersSidebar.tsx`
- 文件：`src/renderer/components/terminal/TerminalPanel.tsx`
- 内容：通过 `window.dispatchEvent(new CustomEvent('spectrai:team-ui', ...))` 上报关键交互事件：
  - `sidebar_back`
  - `select_team_conversation`
  - `select_member`
  - `stop_team`
  - `fallback_to_team_conversation`

3. 可测试标识（便于 QA 自动化）
- 文件：`src/renderer/components/team/TeamMembersSidebar.tsx`
- 文件：`src/renderer/components/terminal/TerminalPanel.tsx`
- 内容：补充 `data-testid`：
  - `team-members-sidebar`
  - `team-sidebar-back`
  - `team-conversation-button`
  - `team-member-item`
  - `team-stop-button`
  - `team-member-session-missing`

4. 空态与回退引导
- 文件：`src/renderer/components/team/TeamMembersSidebar.tsx`
- 文件：`src/renderer/components/terminal/TerminalPanel.tsx`
- 内容：
  - 团队无成员时显示 `暂无成员`。
  - 选中成员但该成员尚无会话时，提供 `返回团队对话` 动作，避免死路。

## 待设计定稿占位（未阻塞）

1. 角色中文文案终稿
- 当前：`reviewer -> 审核`、`leader -> 负责人`。
- 待定：是否统一为 `评审` / `组长`（以设计稿为准）。

2. 侧边栏头部视觉细节
- 当前：状态点 + 团队名 + 路径文本。
- 待定：状态标签是否显式文案、路径行字号/行高与截断策略。

3. 成员卡片密度与信息层级
- 当前：姓名 + 角色 + 状态 + 当前任务单行。
- 待定：任务文案是否支持两行、是否引入优先级或阻塞图标。

## 联调注意点

1. 若后端团队状态/成员状态新增枚举值，当前前端会降级展示，不会崩溃；定稿后可补精确映射。
2. 埋点事件已在 Renderer 侧发出，消费端（日志/分析）若未接入，不影响主流程。
