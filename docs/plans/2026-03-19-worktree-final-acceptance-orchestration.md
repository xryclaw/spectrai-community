# Worktree 前端合入前最终验收执行编排

## 1. 目标与触发条件

目标：在前端功能分支合入前，完成 worktree 功能的最终验收回归，输出可发布/不可发布结论与缺陷分级。

触发条件（全部满足后立即执行）：

1. 前端提交“workspace mode/branch/cleanup/fallback 红标展示”已完成并可运行。
2. 后端已开启同 repo provision/cleanup 互斥锁。
3. fallback 自动降级已关闭或改为审批。
4. cleanup 补偿任务已启用。

## 2. 最终验收顺序（固定执行）

### Phase 0：环境与数据准备（阻断）

| 顺序 | 用例/步骤 | 阻断级别 | 输入 | 通过标准 |
|---|---|---|---|---|
| 0-1 | preflight 检查（`scripts/worktree-preflight.sh`） | P0 | repo 路径 | 无 `[FAIL]` |
| 0-2 | 测试数据装载（`tests/fixtures/worktree-integration-data.json`） | P1 | A/B 会话、分支前缀、探针文件 | 参数齐全且可用 |

### Phase 1：主链路功能验收（阻断）

| 顺序 | 用例ID | 阻断级别 | 验收点 | 通过标准 |
|---|---|---|---|---|
| 1-1 | WT-001 | P1 | 默认勾选 | 新建会话默认启用 worktree |
| 1-2 | WT-002 | P1 | 关闭开关 | 关闭后走主工作区旧路径 |
| 1-3 | U4/WT-008 | P1 | 分支提交链路 | commit 落在会话分支，不在 base |
| 1-4 | WT-009 | P1 | 回合并路径 | 合并记录可追溯，主分支可构建/测试 |
| 1-5 | M3 | P1 | SESSION_CREATE 元数据返回 | 返回包含 worktreePath/worktreeBranch/workspaceMode（或等效字段）且与实际一致 |

### Phase 2：并发隔离与冲突验收（强阻断）

| 顺序 | 用例ID | 阻断级别 | 验收点 | 通过标准 |
|---|---|---|---|---|
| 2-1 | CRR-001 | P0 | A/B 并发创建隔离 | 未提交改动互不可见 |
| 2-2 | CRR-002 | P0 | 同文件并行改动隔离 | 不交叉覆盖，仅在合并期冲突 |
| 2-3 | CRR-003 | P1 | 分支命名冲突 | 显式拒绝或自动重命名，不得静默覆盖 |
| 2-4 | M1 | P0 | 并发唯一性 | 每个并发会话必须唯一 worktreePath + branch，不得共享 |
| 2-5 | M4 | P0 | enter_worktree 重入隔离 | 重入与跨会话调用均不得破坏隔离绑定 |

### Phase 3：失败恢复与回收验收（阻断）

| 顺序 | 用例ID | 阻断级别 | 验收点 | 通过标准 |
|---|---|---|---|---|
| 3-1 | CRR-004 | P1 | 创建失败后重试 | 重试成功且无僵尸状态 |
| 3-2 | CRR-005 | P1 | 会话关闭后 cleanup 回收 | worktree 可收敛清理，补偿任务有效 |
| 3-3 | CRR-007 | P1 | migration 回滚可执行 | 回滚入口可执行，回滚后状态一致 |
| 3-4 | M2 | P0 | 失败回滚无残留 | 失败后无悬挂 worktree/脏分支/半初始化记录 |

### Phase 4：观测与阈值监控（阻断）

| 顺序 | 指标 | 阻断级别 | 触发条件 | 动作 |
|---|---|---|---|---|
| 4-1 | `PROVISION_FAILED` | P1 | 30 分钟内 >= 3 | 立即升级 Leader，暂停放行 |
| 4-2 | `CLEANUP_PENDING` | P1 | > 20 | 立即升级 Leader，暂停放行 |
| 4-3 | fallback 使用率 | P1 | > 5% | 立即升级 Leader，暂停放行 |

## 3. 执行命令与证据要求

执行命令（最小集合）：

```bash
bash scripts/worktree-preflight.sh
bash scripts/worktree-integration-smoke.sh
```

证据要求：

1. 每个用例至少 1 条证据（终端输出/日志截图/UI截图）。
2. 每条缺陷必须关联用例ID（WT/CRR/U/S）。
3. 阻断级缺陷（P0/P1）需包含复现输入、错误码/日志关键行、修复后回归结果。

## 4. 通过门槛（发布判定）

同时满足以下条件才可放行：

1. Phase 1~3 全部执行完成。
2. P0 缺陷 = 0。
3. P1 缺陷 = 0（含 `CRR-007 migration 回滚可执行` 与 `M3 元数据一致性`）。
4. M1/M2/M4 强校验全部通过（任一失败直接 No-Go）。
5. 阈值监控未触发（`PROVISION_FAILED` / `CLEANUP_PENDING` / fallback）。

否则结论为“不可发布”，并附阻断缺陷列表。

## 5. 前端完成后的即时执行模板

前端完成后 5 分钟内执行：

1. 运行 Phase 0 与 Phase 1（确认 UI 与基础链路）。
2. 运行 Phase 2（并发隔离与冲突）。
3. 运行 Phase 3（失败恢复与 cleanup 回收、migration 回滚）。
4. 汇总缺陷分级与发布结论，回传 Leader。

回传模板：

```text
[最终验收回执]
- 执行批次: YYYY-MM-DD HH:mm
- 覆盖用例: WT-001/WT-002/WT-008/WT-009/M1/M2/M3/M4/CRR-001..CRR-007
- 结果: PASS/FAIL/BLOCKED
- 缺陷统计: P0=x, P1=y, P2=z, P3=w
- 阈值监控: PROVISION_FAILED=?, CLEANUP_PENDING=?, fallback=?
- 发布结论: 可发布 / 不可发布
- 阻断项: <若有，列出ID与现象>
```
