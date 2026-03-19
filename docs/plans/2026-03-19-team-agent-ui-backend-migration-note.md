# Team Agent UI 重构后端迁移说明

日期：2026-03-19

## 目标
为 Team Agent UI 重构补齐后端契约，保证新旧调用方兼容：
- 新 UI：需要快速从团队实例定位团队会话与成员统计
- 旧调用方：继续使用原有 `members` 结构，不受破坏

## 字段变更（向后兼容）
`TeamInstance` 新增可选聚合字段：
- `leaderMemberId?: string`
- `leaderSessionId?: string`
- `teamSessionId?: string`
- `memberCount?: number`
- `activeMemberCount?: number`
- `memberSessionIds?: string[]`

说明：以上字段均为**可选**，不影响旧调用方；旧逻辑可继续仅依赖 `members`。

## IPC 契约修复
- `TEAM_GET_MESSAGES(instanceId, limit?)` 现在会把 `limit` 正确传递到 Repository。
- 入参处理：仅当 `limit` 为正数且有限值时生效，最终向下取整；其余情况按不限制处理。

## 聚合逻辑与顺序稳定性
- `TeamRepository.getMembersByInstance` 新增稳定排序：
  - `supervisor` 优先
  - 然后按 `updated_at ASC`
  - 最后按 `id ASC`
- `mapInstance` 在返回 `members` 的同时生成 leader/session/统计聚合字段。

## 兼容性结论
- 不涉及数据库 schema 变更，无需执行迁移脚本。
- 新字段均为可选，不影响旧版本前端读取。
- `TEAM_GET_MESSAGES` 的 `limit` 生效后，只会减少返回数据量，不改变消息结构。
