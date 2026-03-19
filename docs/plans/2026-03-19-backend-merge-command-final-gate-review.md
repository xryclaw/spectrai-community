# 架构复核最终合回命令与回退步骤（最终复核）

更新时间：2026-03-19
任务ID：`3b0bd9cd-457e-45e4-96d3-3ec2580fc517`
终判口径：`95b0f61a`（唯一终判准则）

## 1. 结论

**当前结论：NO-GO（阻断）**

原因：后端“主分支合回命令清单 + 回退演练记录”尚未形成可审计的逐条证据包，无法完成本任务要求的逐条校验（前置条件、幂等性、失败回退可执行性）。

## 2. 已核对到的基础能力（代码侧）

以下能力在代码中可见，但不足以替代“命令清单执行证据”：

1. 合并入口阈值门禁拦截已接入：
   - [gitHandlers.ts](/Users/xry/github/spectrai-community/src/main/ipc/gitHandlers.ts:217)
   - [AgentManager.ts](/Users/xry/github/spectrai-community/src/main/agent/AgentManager.ts:1716)
   - [AgentManagerV2.ts](/Users/xry/github/spectrai-community/src/main/agent/AgentManagerV2.ts:851)
2. 合并串行化（repo lock）已存在：
   - [GitWorktreeService.ts](/Users/xry/github/spectrai-community/src/main/git/GitWorktreeService.ts:639)
3. cleanup 补偿机制已存在：
   - [WorktreeSessionSafety.ts](/Users/xry/github/spectrai-community/src/main/git/WorktreeSessionSafety.ts:33)

## 3. 阻断项（必须修复）

| 阻断ID | 级别 | 触发条件 | 现状 | 结论 |
|---|---|---|---|---|
| BLK-CMD-EVIDENCE | P0 | 无“主分支合回命令清单+逐步输出”证据 | 后端任务 `53c633be...` 仍 in_progress，仓库无最终命令清单落盘 | 阻断 |
| BLK-IDEMPOTENCY | P1 | 无幂等性验证证据（同命令重复执行结果一致） | 未提供二次执行日志（含无副作用校验） | 阻断 |
| BLK-ROLLBACK-EXEC | P1 | 回退 execute 无成功演练证据 | 当前仅可确认 execute 被 guard 拦截 | 阻断 |
| BLK-METRIC-30M | P1 | 30m 阈值统计为 N/A 或缺原始样本 | 现有快照为 0 样本，不能放行 | 阻断 |

## 4. 可执行修复命令（后端回填用）

> 要求：按顺序执行，产出原始输出日志并回填到同一文档/附件。

### 4.1 前置条件检查（必须）

```bash
set -euo pipefail

git status --porcelain
git branch --show-current
git worktree list --porcelain

git fetch --all --prune
```

### 4.2 合回前冲突与门禁检查（必须）

```bash
# 以实际变量替换
REPO_PATH="<repo_path>"
WORKTREE_PATH="<worktree_path>"
BRANCH_NAME="<worktree_branch>"
TARGET_BRANCH="<main_or_target_branch>"

git -C "$REPO_PATH" checkout "$TARGET_BRANCH"
git -C "$REPO_PATH" merge-base "$TARGET_BRANCH" "$BRANCH_NAME"
# 预测冲突（不改工作区）
git -C "$REPO_PATH" merge-tree --write-tree "$TARGET_BRANCH" "$BRANCH_NAME"
```

### 4.3 合回命令（必须给出一次成功执行日志）

```bash
# 仅示例，按实际 runbook 与产品流程执行
# 如使用平台 IPC/Agent merge_worktree，请附调用参数与返回结果

git -C "$REPO_PATH" merge --squash "$BRANCH_NAME"
git -C "$REPO_PATH" commit -m "Merge branch $BRANCH_NAME via SpectrAI"
```

### 4.4 cleanup 与补偿验证（必须）

```bash
# 清理 worktree 并验证回收
git -C "$REPO_PATH" worktree remove --force "$WORKTREE_PATH"
git -C "$REPO_PATH" worktree prune
git -C "$REPO_PATH" worktree list --porcelain
```

### 4.5 失败回退演练（必须包含 execute 成功证据）

```bash
# dry-run
npm run -s db:migration:rollback

# execute（必须在受控环境成功一次）
node scripts/db-migration-rollback.mjs --from 999 --to 998 --execute
```

## 5. 复判准入条件（从 NO-GO -> GO）

必须同时满足：

1. 后端提交“完整命令清单 + 每步原始输出 + 回退演练记录”并落盘。
2. 幂等性验证通过（关键步骤二次执行无破坏性副作用）。
3. rollback execute 在受控环境至少 1 次成功。
4. 30 分钟阈值统计提供可审计样本，且不触发阻断阈值。

## 6. 发布报告可直接引用（仅在通过后使用）

```text
【架构复核结论】
基于后端主分支合回命令清单与回退演练记录，前置条件、幂等性、失败回退可执行性均已逐条校验通过；
worktree 并发隔离与合并门禁链路未被破坏，阈值监控窗口未触发阻断条件。
结论：GO，可进入主分支合并确认阶段。
```
