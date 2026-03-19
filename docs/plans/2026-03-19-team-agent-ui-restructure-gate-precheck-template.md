# Team Agent UI 重构收口门禁预审模板（architect）

> 适用范围：`docs/plans/2026-03-19-team-agent-ui-restructure.md` 对应改造
> 使用时机：backend / qa 在途任务陆续回填时，作为统一放行判定底稿
> 目标：证据到齐后 5 分钟内输出 `GO / NO-GO`

## 0. 判定元信息

- 判定批次：`team-agent-ui-restructure-<YYYYMMDD-HHMM>`
- 判定时间：`<YYYY-MM-DD HH:mm:ss>`
- 判定人：`<architect/leader>`
- 基线分支/提交：`<branch>@<commit>`
- 证据冻结时间：`<YYYY-MM-DD HH:mm:ss>`

## 1. 放行条件（全部满足才可 GO）

### 1.1 架构与实现一致性（P0）

- [ ] 团队会话与普通会话统一由 `TerminalTabs` 切换，无平行入口冲突
- [ ] 选中团队会话时，左侧边栏稳定切换为成员侧栏；切回普通会话后恢复会话列表
- [ ] 团队会话识别逻辑以 `sessionTeamMap/getTeamForSession` 为唯一真源，无重复判定分支

证据：
- 代码引用：`teamStore` / `Sidebar` / `TerminalPanel`
- 冒烟录像或截图：团队A -> 团队B -> 普通会话C 全链路

### 1.2 交互正确性与状态隔离（P0）

- [ ] 团队成员切换只影响当前团队，不污染其他团队/普通会话视图
- [ ] 返回操作不引入非法 session 选择态（如空字符串哨兵）
- [ ] TeamPanel 跳转会话后，UI 面板状态与主内容区一致

证据：
- 关键用例：`TEAM-UI-ROUTE-001~003`
- 关键日志：store 状态快照（切换前后）

### 1.3 后端契约与数据映射（P0）

- [ ] 团队成员 `sessionId` 回填后，可被前端映射并消费
- [ ] 团队状态/成员状态/消息事件可持续推送且前端可见
- [ ] 团队停止后状态收敛，未出现僵尸成员状态

证据：
- IPC/事件链日志：`team:status-change`、`team:member-status-change`、`team:message`
- DB 或 store 快照：`instance -> members -> sessionId`

### 1.4 工程门禁（P1）

- [ ] `npm run build` 通过（零编译错误）
- [ ] frontend 定向回归通过（团队会话主链路）
- [ ] qa 阻断级用例通过（P0=0, P1=0）

证据：
- 构建日志链接
- 测试报告/回归记录链接

## 2. 阻断条件（任一命中即 NO-GO）

- [ ] 出现会话路由错乱：团队会话无法稳定进入成员侧栏
- [ ] 出现跨团队状态污染：A 团队成员选择影响 B 团队或普通会话
- [ ] 出现契约断裂：成员 `sessionId` 缺失或事件链不完整导致视图不可用
- [ ] 出现 P0/P1 未闭环缺陷
- [ ] 缺少可追溯证据（仅口头结论，无日志/截图/commit 佐证）

## 3. 证据清单模板（backend / qa / frontend 回填）

### 3.1 frontend 回填

- 任务ID：`<id>`
- 结论：`PASS / FAIL / BLOCKED`
- 覆盖范围：`Sidebar / TerminalTabs / TerminalPanel / TeamPanel / SessionItem`
- 证据：
  - 构建日志：`<link>`
  - 关键交互截图/录屏：`<link>`
  - 代码提交：`<commit/pr>`
- 遗留问题：`<none or list>`

### 3.2 backend 回填

- 任务ID：`<id>`
- 结论：`PASS / FAIL / BLOCKED`
- 覆盖范围：`TeamOrchestrator / AgentManagerV2 / IPC Team Handlers`
- 证据：
  - 事件链日志：`<link>`
  - 成员 session 映射证据：`<link>`
  - 异常与恢复日志：`<link>`
- 遗留问题：`<none or list>`

### 3.3 qa 回填

- 任务ID：`<id>`
- 结论：`PASS / FAIL / BLOCKED`
- 用例批次：`TEAM-UI-ROUTE / TEAM-UI-MEMBER / TEAM-UI-REGRESSION`
- 证据：
  - 测试报告：`<link>`
  - 阻断缺陷清单：`<link>`
  - 复测结论：`<link>`
- 遗留问题：`<none or list>`

## 4. 最终判定格式（统一输出）

```text
[Team Agent UI 重构收口判定]
- 批次: <team-agent-ui-restructure-YYYYMMDD-HHMM>
- 时间: <YYYY-MM-DD HH:mm:ss>
- 结论: GO / NO-GO
- 放行条件达成: <x>/<total>
- 阻断条件命中: <0 or n>
- 缺陷统计: P0=<n>, P1=<n>, P2=<n>
- 关键证据:
  1) <frontend evidence link>
  2) <backend evidence link>
  3) <qa evidence link>
- 判定理由:
  1) <reason 1>
  2) <reason 2>
- 决策动作:
  - GO: 按窗口合并与发布
  - NO-GO: 冻结合并，仅允许阻断修复后复判
```

## 5. 复判规则

- 触发条件：任一阻断项标记为“已修复并附新证据”
- 复判时限：收到复判请求后 30 分钟内完成
- 复判输出：沿用第 4 节格式，必须标注“复判第 N 轮”

## 6. architect 预审结论位（当前轮填写）

- 预审结论：`READY_FOR_EVIDENCE / NOT_READY`
- 当前主要风险（最多 3 条）：
  1. `<risk-1>`
  2. `<risk-2>`
  3. `<risk-3>`
- 对 backend 要求：`<必须补齐的证据>`
- 对 qa 要求：`<必须覆盖的用例>`
