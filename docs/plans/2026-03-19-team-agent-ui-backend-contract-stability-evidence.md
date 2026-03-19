# Team Agent UI 后端契约稳定性复核证据归档

日期：2026-03-19  
角色：backend

## 复核范围
本次仅覆盖 Team Agent UI 依赖的后端契约稳定性关键点：
- `TEAM_GET_MESSAGES(instanceId, limit?)` 的 `limit` 归一化与透传
- `TeamInstance` 聚合字段完整性（`leaderMemberId`/`leaderSessionId`/`teamSessionId`/`memberCount`/`activeMemberCount`/`memberSessionIds`）
- 成员排序稳定性（supervisor 优先 + 时间顺序 + 兜底顺序）
- `shared/types.ts` 中聚合字段保持可选（向后兼容）

## 结论（签收）
后端契约稳定，无缺口，无需代码变更。

## 证据（代码位点）
- `src/main/ipc/teamHandlers.ts`
  - `TEAM_GET_MESSAGES` 对 `limit` 做正数且有限值校验，`Math.floor(limit)` 归一化后透传 `database.getTeamMessages(instanceId, resolvedLimit)`。
- `src/main/storage/repositories/TeamRepository.ts`
  - `getMembersByInstance` 排序：`ORDER BY CASE WHEN mode = 'supervisor' THEN 0 ELSE 1 END, updated_at ASC, id ASC`。
  - `mapInstance` 返回聚合字段：`leaderMemberId`、`leaderSessionId`、`teamSessionId`、`memberCount`、`activeMemberCount`、`memberSessionIds`。
- `src/shared/types.ts`
  - `TeamInstance` 声明上述字段均为可选，兼容旧调用方。

## 验证命令与结果
1. 定向契约测试
   - 命令：`node --test tests/teamAgentUiBackendContract.test.ts`
   - 结果：`pass 3 / fail 0`
2. 全量回归
   - 命令：`npm test -- --runInBand`
   - 结果：`pass 63 / fail 0`
3. 工作区改动检查
   - 命令：`git status --short`
   - 结果：无改动

## 风险评估
- 当前风险级别：低
- 已覆盖风险：
  - `limit` 失效或异常值导致消息接口行为漂移
  - 团队会话映射字段缺失导致 UI 无法稳定定位 leader 会话
  - 成员排序不稳定导致 UI 抖动/顺序跳变
- 残余风险（非阻断）：
  - 现有测试以契约/静态断言为主，未引入端到端真实 IPC 压测场景

## 前端/QA 发现问题时的后端快速修复入口
发现联调问题时，按以下最小入口定位与修复：

1. 消息分页/条数异常（`TEAM_GET_MESSAGES`）
   - 入口文件：`src/main/ipc/teamHandlers.ts`、`src/main/storage/repositories/TeamRepository.ts`
   - 快速校验：
     - 确认 `resolvedLimit` 仍按正数有限值归一化并透传
     - 确认 repository `LIMIT ?` 分支仍生效
   - 修复后最小回归：`node --test tests/teamAgentUiBackendContract.test.ts`

2. 团队会话映射异常（leader/team session）
   - 入口文件：`src/main/storage/repositories/TeamRepository.ts`
   - 快速校验：
     - `mapInstance` 的 leader 选择优先级是否被改坏
     - 聚合字段是否仍稳定回传
   - 修复后最小回归：`node --test tests/teamAgentUiBackendContract.test.ts`

3. 成员顺序异常（UI 显示抖动）
   - 入口文件：`src/main/storage/repositories/TeamRepository.ts`
   - 快速校验：
     - `getMembersByInstance` 的 SQL 排序键是否变化
   - 修复后最小回归：
     - `node --test tests/teamAgentUiBackendContract.test.ts`
     - `npm test -- --runInBand`

## 待命说明
已完成证据归档并进入联调待命状态。若前端/QA 报告后端问题，可在上述入口进行最小修复并在同轮补齐回归结果。