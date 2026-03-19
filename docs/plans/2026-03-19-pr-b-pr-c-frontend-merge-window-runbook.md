# PR-B / PR-C 前端合并窗口执行与回滚 Runbook（Gate-4）

- 基线：`docs/plans/2026-03-19-gate3-release-reassessment-and-window-replan.md`
- Gate-4 参考：`docs/plans/2026-03-19-gate4-final-release-package-draft.md`
- 执行顺序（强制）：`W1 PR-B -> W2 PR-C`
- 适用角色：`leader / frontend / qa`

## 0. 执行前冻结条件（不满足即停止）

1. Gate-4 最终裁决为 `GO` 或明确 `CONDITIONAL-GO` 且允许进入窗口。
2. 禁止跳序：`PR-C` 不得先于 `PR-B`。
3. 工作树干净或已记录当前变更快照（防止误回滚）：

```bash
git status --short
```

4. 记录当前基线提交（用于失败回退定位）：

```bash
git rev-parse --short HEAD
```

5. 同步远端并确认目标分支最新：

```bash
git fetch origin --prune
```

## 1. 窗口 W1：PR-B（设置页入口收敛）

### 1.1 合并前检查（全部通过才可继续）

```bash
# 切到目标集成分支（示例：main，按实际分支替换）
git checkout main
git pull --ff-only origin main

# 前端门禁最小集
node scripts/check-gate1-boundaries.mjs
npm run -s typecheck:web
npm run -s test

# P0 二轮复测脚本（QA 对齐触点）
node scripts/run-ret-second-pass.mjs
```

### 1.2 W1 执行步骤（命令级）

```bash
# 合并 PR-B 对应分支/提交（示例）
git merge --no-ff <pr-b-branch-or-sha>

# 合并后立即复验（必须重复执行）
node scripts/check-gate1-boundaries.mjs
npm run -s typecheck:web
npm run -s test
node scripts/run-ret-second-pass.mjs

# 打 pass 标签（供 W2 失败回滚）
git tag gate3-pr-b-pass
```

### 1.3 W1 关键验收点（人工 + 脚本）

1. `docs/plans/gate1-boundary-waivers.json` 中 `renderer-layout-sidebar-no-settings-modal` 已删除或失效。
2. 设置页入口仅通过 AppLayout/ActivityBar 主通路触发，不再由 Sidebar 直接耦合弹出。
3. `typecheck:web` 无新增错误。
4. `run-ret-second-pass` 维持 `6/6 PASS`（DEF-001/002/003/005/007/008 无回归）。

### 1.4 W1 失败回滚步骤

触发条件（任一命中即回滚）：
1. `typecheck:web` 失败。
2. `test` 或 `run-ret-second-pass` 失败。
3. 边界脚本出现非豁免违规。

回滚命令：

```bash
# 若 W1 未成功（尚未产生 gate3-pr-b-pass），回到预设稳定点
git reset --hard gate3-pre-pr-b

# 若团队禁用 hard reset，则使用反向回滚提交
git revert -m 1 <merge-commit-of-pr-b>
```

回滚后复验：

```bash
node scripts/check-gate1-boundaries.mjs
npm run -s typecheck:web
npm run -s test
node scripts/run-ret-second-pass.mjs
```

## 2. 窗口 W2：PR-C（Sidebar 深拆）

### 2.1 合并前检查（W1 成功后执行）

```bash
# 必须从 W1 成功基线开始
git checkout main
git pull --ff-only origin main

# 二次确认 W1 基线可用
node scripts/check-gate1-boundaries.mjs
npm run -s typecheck:web
npm run -s test
node scripts/run-ret-second-pass.mjs
```

### 2.2 W2 执行步骤（命令级）

```bash
# 合并 PR-C 对应分支/提交（示例）
git merge --no-ff <pr-c-branch-or-sha>

# 合并后立即复验
node scripts/check-gate1-boundaries.mjs
npm run -s typecheck:web
npm run -s test
node scripts/run-ret-second-pass.mjs

# 打 pass 标签（供后续窗口使用）
git tag gate3-pr-c-pass
```

### 2.3 W2 关键验收点（人工 + 脚本）

1. `docs/plans/gate1-boundary-waivers.json` 中 `renderer-detailpanel-no-sidebar-monolith` 已删除或失效。
2. `DetailPanel` 不再回连 `Sidebar` 单体依赖（契约按 PR-C 目标完成）。
3. `typecheck:web`、`test` 全通过且无新增阻断。
4. `run-ret-second-pass` 继续 `6/6 PASS`。

### 2.4 W2 失败回滚步骤

触发条件（任一命中即回滚）：
1. `typecheck:web` 失败。
2. `test` 或 `run-ret-second-pass` 失败。
3. 新增豁免或跨层依赖违反 Gate-1。

回滚命令：

```bash
# 回退到 W1 pass 标签
git reset --hard gate3-pr-b-pass

# 若团队禁用 hard reset，则反向回滚 PR-C merge commit
git revert -m 1 <merge-commit-of-pr-c>
```

回滚后复验：

```bash
node scripts/check-gate1-boundaries.mjs
npm run -s typecheck:web
npm run -s test
node scripts/run-ret-second-pass.mjs
```

## 3. DEF 验收触点（供 QA 一一复核）

| DEF | RET | 触点命令 | 期望结果 | 证据文件 |
|---|---|---|---|---|
| DEF-001 | RET-001 | `node scripts/run-ret-second-pass.mjs` | PASS | `docs/plans/2026-03-19-p0-ret-second-pass-evidence.md` |
| DEF-002 | RET-002 | `node scripts/run-ret-second-pass.mjs` | PASS | `docs/plans/2026-03-19-p0-ret-second-pass-evidence.md` |
| DEF-003 | RET-003 | `node scripts/run-ret-second-pass.mjs` | PASS | `docs/plans/2026-03-19-p0-ret-second-pass-evidence.md` |
| DEF-005 | RET-005 | `node scripts/run-ret-second-pass.mjs` | PASS | `docs/plans/2026-03-19-p0-ret-second-pass-evidence.md` |
| DEF-007 | RET-007 | `node scripts/run-ret-second-pass.mjs` | PASS | `docs/plans/2026-03-19-p0-ret-second-pass-evidence.md` |
| DEF-008 | RET-008 | `node scripts/run-ret-second-pass.mjs` | PASS | `docs/plans/2026-03-19-p0-ret-second-pass-evidence.md` |

补充前端门禁：
1. `npm run -s typecheck:web`：两窗口每次 merge 前后都执行，必须 PASS。
2. `npm run -s test`：两窗口每次 merge 前后都执行，必须 PASS。
3. `node scripts/check-gate1-boundaries.mjs`：两窗口每次 merge 前后都执行，必须 PASS。

## 4. Leader 可直接使用的执行摘要

1. 先跑第 0 节冻结检查，满足后进入 W1。
2. W1 按 1.1 -> 1.2 -> 1.3 执行；失败即 1.4 回滚。
3. W1 成功后进入 W2，按 2.1 -> 2.2 -> 2.3 执行；失败即 2.4 回滚。
4. 每个窗口必须产出同一组证据：`boundary + typecheck:web + test + RET 6/6`。
5. 任一窗口回滚后，当日不继续下一个窗口，先提交修复 PR 再重开窗口。
