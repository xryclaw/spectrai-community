# Worktree 定向复测快照（并行会话隔离）

- 任务ID：`89e77af6-e026-4e76-965b-3fc2db0c7c1b`
- 执行时间：`2026-03-19 12:24 +08:00`
- 复测主线：默认勾选 / 并行隔离 / 失败回滚

## 通过

1. 默认勾选 worktree：`PASS`
- 证据：`node --test --experimental-strip-types tests/sessionCreateWorktreeContract.test.ts` -> `5/5 PASS`
- 关键点：缺省 `worktreeEnabled ?? true` 契约存在且测试通过。

2. 并行会话互不干扰：`PASS`
- 证据：`bash scripts/worktree-integration-smoke.sh` -> Smoke verification passed
- 关键点：A/B worktree 并行创建成功，未提交隔离成立，分支提交与 merge-back 成功。

## 失败

1. 失败回滚无残留（M2）：`FAIL (P0)`
- 现象：故障注入后 `worktree add` 失败，但分支仍被创建。
- 实测关键行：`BRANCH_EXISTS_EXIT=0`

最短复现路径：

```bash
TMP=$(mktemp -d -t wt-dir-retest-XXXX)
git clone --quiet --no-hardlinks . "$TMP/repo"
BASE=$(git -C "$TMP/repo" rev-parse --abbrev-ref HEAD)
BR=feat/qa-m2-repro-$(date +%s)
mkdir -p "$TMP/wt-fail" && touch "$TMP/wt-fail/.occupied"
git -C "$TMP/repo" worktree add -b "$BR" "$TMP/wt-fail" "$BASE"   # 预期失败
git -C "$TMP/repo" show-ref --verify --quiet "refs/heads/$BR"; echo $?  # 实测 0（分支残留）
```

## 阻断风险

- 当前阻断等级：`R1-阻断（Blocker）`
- 阻断项：`M2(P0)` 失败回滚残留仍未闭环。
- 发布建议：`NO-GO`，不允许合回主分支。

## 证据索引

1. [tests/sessionCreateWorktreeContract.test.ts](../../tests/sessionCreateWorktreeContract.test.ts)
2. [scripts/worktree-integration-smoke.sh](../../scripts/worktree-integration-smoke.sh)
3. [2026-03-19-worktree-final-regression-evidence-pack.md](./2026-03-19-worktree-final-regression-evidence-pack.md)
4. [2026-03-19-worktree-e2e-final-regression-review-summary.md](./2026-03-19-worktree-e2e-final-regression-review-summary.md)
5. [2026-03-19-worktree-joint-blocking-status.md](./2026-03-19-worktree-joint-blocking-status.md)
