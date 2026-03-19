# 封版门禁终审：后端里程碑与合回条件复核（任务 44b124e9）

更新时间：2026-03-19 12:25 +08:00  
任务ID：`44b124e9-c659-4da2-8aca-fe6ec194251a`  
终判口径：`95b0f61a`（唯一终判准则）

## 1. 当前结论

**结论：NO-GO（继续冻结主分支合回）**

原因（命中任一即阻断）：
1. 后端“里程碑补充任务”`48de443b-2690-44ca-8a50-e35818ad4838` 当前仍 `in_progress`，尚无可审计里程碑落盘证据。
2. `CRR-007` 仍未闭环：rollback `--execute` 在社区版仍被 guard 拦截（exit 2）。
3. 30 分钟阈值窗口仍为 `N/A(0样本)`，无法形成放行级审计证据。

## 2. 重点复核项结论

### 2.1 每会话独立 worktree 隔离边界

结论：**有进展，但未完成最终放行闭环**。

已覆盖的关键点：
1. 会话启动改为按仓库集合加锁串行创建，降低并发污染风险：`withRepoProvisionCleanupLock(...)`（`src/main/ipc/taskHandlers.ts:304`）。
2. 多仓创建采用隔离 worktree + 唯一分支名策略：`createIsolatedWorktree(...)`（`src/main/ipc/taskHandlers.ts:346`，`src/main/git/GitWorktreeService.ts:516`）。
3. 分支唯一性包含本地与远程引用检查，避免并发/历史分支冲突：`branchExistsAnywhere(...)`（`src/main/git/GitWorktreeService.ts:408`）。
4. 失败回滚改为精确删除 + pending 持久化 + 补偿任务：`removeWorktree(... deleteBranch: true ...)`（`src/main/ipc/taskHandlers.ts:389`），`scheduleCleanupCompensation(...)`（`src/main/ipc/taskHandlers.ts:410`）。

仍需闭环：
1. 以上修复尚未由最新 QA 封版复测快照确认闭环（QA 任务 `89e77af6...` 进行中）。

### 2.2 推送新分支并审阅后合回主分支门禁完整性

结论：**门禁框架在，但审计链仍缺关键闭环证据**。

已覆盖的关键点：
1. 合回入口增加风险门禁拦截，阈值触发时直接暂停合并：
   - IPC 入口：`worktreeRiskGuard.assertMergeAllowed('IPC.WORKTREE_MERGE')`（`src/main/ipc/gitHandlers.ts:217`）
   - Agent 入口：`assertMergeAllowed('AgentManagerV2.merge_worktree')`（`src/main/agent/AgentManagerV2.ts:856`）
2. 合回后 cleanup 失败进入 pending 并启动补偿，不再静默失败：`recordCleanupPending + scheduleCleanupCompensation`（`src/main/agent/AgentManagerV2.ts:910`、`src/main/agent/AgentManagerV2.ts:911`）。

仍缺失/未验证：
1. `CRR-007` execute 演练成功证据缺失（脚本仍显式退出 2）：`scripts/db-migration-rollback.mjs:39`、`scripts/db-migration-rollback.mjs:40`。
2. 30 分钟阈值监控仍无有效样本（`N/A`），无法证明“可恢复放行”。
3. 后端里程碑任务 `48de443b` 尚未完成，缺“阶段验收信号 + 失败回退触发条件”最终版落盘。

### 2.3 里程碑缺口与阻断结论

结论：**存在里程碑缺口，维持阻断（NO-GO）**。

当前阻断项：
1. `B-MILESTONE-EVIDENCE`（P0）：后端里程碑补充任务未完成（任务状态仍 in_progress）。
2. `B-ROLLBACK-EXEC`（P1）：rollback execute 不可执行。
3. `B-METRIC-30M`（P1）：阈值窗口证据不足（0样本）。

## 3. Go/No-Go 判定条件

### 3.1 转 GO 的硬条件（必须同时满足）

1. backend 完成 `48de443b` 并提交可审计里程碑文档：
   - 阶段里程碑（M1..Mn）
   - 每阶段验收信号（命令/日志/状态）
   - 失败回退触发条件与执行命令
2. QA 完成最终定向复测快照（任务 `89e77af6...`）并确认：
   - 隔离边界无跨会话污染
   - M2（失败回滚残留）= 0 残留
3. `CRR-007` execute 演练至少 1 次成功，且附一致性校验日志。
4. 30 分钟阈值窗口至少 1 个有效样本（非 N/A），并满足：
   - `PROVISION_FAILED < 3`
   - `CLEANUP_PENDING <= 20`
   - `fallback <= 5%`
5. 复判时无新增 P0/P1 阻断。

### 3.2 维持 NO-GO 的触发条件（任一命中）

1. backend 里程碑任务仍未完成或无落盘证据。
2. rollback execute 仍失败/被拦截。
3. 30 分钟阈值仍为 N/A 或任一指标触发阈值。
4. QA 新增任意 P0/P1 缺陷。

## 4. 最小修复建议（按优先级）

1. **P0（立即）**：backend 完成 `48de443b` 文档落盘并附证据索引（命令、日志、回退脚本）。
2. **P1（立即）**：打通或替代 `CRR-007` execute 演练路径（受控环境可执行），并附回滚后一致性校验。
3. **P1（立即）**：补采 30 分钟有效窗口样本，输出审计表并复判。
4. **P1（并行）**：QA 基于最新后端修复结果复验 M2/CRR-007/阈值门禁三项并回填结论。

## 5. 可直接贴发布报告的结论段

```text
【封版门禁终审（后端里程碑与合回条件）】
结论：NO-GO（继续冻结主分支合回）。
依据：后端里程碑补充任务仍未完成，且 rollback execute 与 30 分钟阈值样本两项关键门禁未闭环。
动作：仅允许阻断修复与证据补齐；待 backend 里程碑落盘 + QA 复验通过后按 95b0f61a 立即复判。
```
