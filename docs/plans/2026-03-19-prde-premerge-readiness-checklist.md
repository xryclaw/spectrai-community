# PR-D/PR-E 预合并校验与冲突清零证明（2026-03-19）

## 0. 约束声明

1. 严格遵守 Gate-3 顺序：`W1 PR-B -> W2 PR-C -> W3 PR-D -> W4 PR-E`。
2. 本清单目标：做到“可立即合并，但不提前合并”。
3. 当前仅处理 PR-D/PR-E 预合并准备，不改动 PR-B/PR-C 交付边界。

## 1. PR-D 当前候选改造文件（已锁定）

1. `src/main/adapter/ClaudeSdkAdapter.ts`
2. `src/main/adapter/claude/RetryStrategy.ts`
3. `src/main/adapter/claude/StreamParser.ts`
4. `src/main/adapter/claude/ToolCallAccumulator.ts`
5. `src/main/agent/AgentManagerV2.ts`
6. `src/main/agent/managerV2/TimeoutPolicy.ts`
7. `src/main/agent/team/TeamManager.ts`
8. `src/main/errors/SpectralError.ts`

说明：以上文件均在 `src/main/**`，未触达 renderer Sidebar/Settings 主战场。

## 2. 冲突预处理结果（与 PR-B/PR-C 冲突面交叉）

PR-B/PR-C 预估核心冲突面：
1. `src/renderer/components/layout/Sidebar.tsx`
2. `src/renderer/components/layout/sidebar/**`
3. `src/renderer/components/settings/UnifiedSettingsModal.tsx`
4. `src/renderer/components/layout/AppLayout.tsx`
5. `src/renderer/components/layout/DetailPanel.tsx`

执行文件交集检查：

```bash
comm -12 <(sort /tmp/prde_files.txt) <(sort /tmp/prbc_surface.txt)
```

结果：`Intersection count = 0`

结论：PR-D 当前文件级冲突为 0，可在 W3 直接进入合并窗口。

## 3. 门禁命令实测结果（本地）

已实测通过：

1. `node scripts/check-gate1-boundaries.mjs`
2. `npm run -s typecheck:node`
3. `npm run -s typecheck:web`
4. `node --test --experimental-strip-types tests/ipcCriticalPath.test.ts tests/ipcFailurePathContract.test.ts tests/ipcErrorCodeConsistency.test.ts`
5. `node --test --experimental-strip-types tests/gate2CodexErrorGlobalHandling.test.ts`
6. `npm run -s test`

结论：满足 Gate-3 文档对 W3/W4 的预检要求。

## 4. PR-E 预处理策略（避免提前冲突）

1. PR-E 暂不提前触达 `renderer/**`。
2. 若 W4 需要收口，仅允许最小范围：
   - `src/main/index.ts`
   - `src/main/ipc/*`（仅必要 wiring）
3. 若出现 `shared/preload` 契约联动，单独列入 W4 校验，且需复跑：
   - `npm run -s typecheck:node`
   - `npm run -s test`
   - `node scripts/check-gate1-boundaries.mjs`

## 5. 一键进入窗口检查清单

### W3（PR-D）

```bash
node scripts/check-gate1-boundaries.mjs && \
npm run -s typecheck:node && \
node --test --experimental-strip-types \
  tests/ipcCriticalPath.test.ts \
  tests/ipcFailurePathContract.test.ts \
  tests/ipcErrorCodeConsistency.test.ts && \
node --test --experimental-strip-types tests/gate2CodexErrorGlobalHandling.test.ts
```

### W4（PR-E）

```bash
node scripts/check-gate1-boundaries.mjs && \
npm run -s typecheck:node && \
npm run -s test
```

## 6. 冲突清零证明（结论）

1. PR-D 文件域仅在 `src/main/**`，与 PR-B/PR-C 关键冲突面（`renderer/layout/sidebar/settings`）无交集。
2. Gate-3 规定门禁命令已本地通过。
3. 当前状态满足“可立即进入 W3/W4 合并窗口，但不提前合并”的要求。
