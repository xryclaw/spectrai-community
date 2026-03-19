# Gate-3 放行复评与合并窗口重排单（2026-03-19）

## 0. 复评输入与实时状态

### 0.1 P0 缺陷进展（DEF-001/002/003/005/007/008）

- 基线缺陷来源：`docs/plans/2026-03-19-settings-markdown-joint-walkthrough-defects.md`
- 前端闭环任务：`170a1092-4929-486f-98a0-d2d6b3caf006`（已完成）
- 设计复核任务：`27fc7d51-63ba-4c06-beba-f162060286cf`（进行中）
- QA 复测任务：`05ec46d8-aee9-45c4-94ee-0f0fc6fca9c6`（进行中）

结论：P0 缺陷“代码侧已提交完成”，但“设计+QA 关闭证据”尚未全部到位。

### 0.2 frontend/backend/qa 实时任务同步

- frontend：
  - `bc7438f8-e929-4711-adc1-fcc1f7d74177` 已完成
  - `0cbbb446-8a5f-475a-81d4-cf234c1e7eef` 已完成
- backend：
  - `237c8c34-f28a-4359-b8df-6597802caede` 进行中
  - `a97002a9-7709-4581-9422-31880a77724c` 进行中
- qa：
  - `c696957b-6639-4e60-9ad3-625c9f3cafa3` 已完成
  - `05ec46d8-aee9-45c4-94ee-0f0fc6fca9c6` 进行中

## 1. Gate-3 当前客观门禁结果（本地复核）

已执行并通过：

```bash
node scripts/check-gate1-boundaries.mjs
npm run -s typecheck:node
npm run -s typecheck:web
npm run -s test:gate2:p0
npm run -s test
npm run -s lint
```

结果摘要：
1. 边界脚本通过（无非豁免违规）。
2. typecheck node/web 均通过。
3. `test:gate2:p0` 通过（25/25）。
4. 全量 test 通过（36/36）。
5. lint：0 error，60 warning（不阻断）。

## 2. PR-B~PR-E 实际合并顺序（Gate-3 重排后）

### 窗口 W1：PR-B（设置页入口收敛）

目标：
1. 关闭豁免 `renderer-layout-sidebar-no-settings-modal`。
2. 确保设置页入口只走 AppLayout/ActivityBar 主通路。

前置门禁：
1. `node scripts/check-gate1-boundaries.mjs` 通过。
2. `npm run -s typecheck:web` 通过。
3. `npm run -s test:gate2:p0` 通过。

失败回滚点：
- 回滚到 tag：`gate3-pre-pr-b`（或最近稳定点）。

### 窗口 W2：PR-C（Sidebar 深拆）

目标：
1. 关闭豁免 `renderer-detailpanel-no-sidebar-monolith`。
2. `DetailPanel` 不再回连 `Sidebar` 单体。

前置门禁：
1. W1 已成功合并。
2. `node scripts/check-gate1-boundaries.mjs` 通过。
3. `npm run -s typecheck:web` + `npm run -s test:gate2:p0` 通过。

失败回滚点：
- 回滚到 tag：`gate3-pr-b-pass`。

### 窗口 W3：PR-D（OpenAI 客户端能力下沉）

目标：
1. 保持 IPC channel/返回结构契约不变。
2. 客户端实现从 IPC handler 继续下沉到 client/service 层。

前置门禁：
1. W2 已成功合并。
2. `npm run -s typecheck:node` 通过。
3. `node --test tests/ipcCriticalPath.test.ts tests/ipcFailurePathContract.test.ts tests/ipcErrorCodeConsistency.test.ts` 通过。
4. `tests/gate2CodexErrorGlobalHandling.test.ts` 通过。

失败回滚点：
- 回滚到 tag：`gate3-pr-c-pass`。

### 窗口 W4：PR-E（核心模块收口）

目标：
1. `main/index.ts` 收口为 bootstrap/wire。
2. 初始化与清理路径保持稳定。

前置门禁：
1. W3 已成功合并。
2. `npm run -s typecheck:node` + `npm run -s test` 通过。
3. 无新增跨层依赖或新增豁免。

失败回滚点：
- 回滚到 tag：`gate3-pr-d-pass`。

## 3. 最终 Go/No-Go 条件（Gate-3）

### Go（允许最终放行）

必须全部满足：
1. PR-B~PR-E 按 W1→W2→W3→W4 顺序完成。
2. `docs/plans/gate1-boundary-waivers.json` 为空数组 `[]`，或仅保留经 Leader 书面批准且未过期项。
3. P0 缺陷 `DEF-001/002/003/005/007/008` 在设计复核（task `27fc7d51...`）与 QA 复测（task `05ec46d8...`）均关闭。
4. 门禁命令持续通过：
   - `node scripts/check-gate1-boundaries.mjs`
   - `npm run -s typecheck:node`
   - `npm run -s typecheck:web`
   - `npm run -s test:gate2:p0`
   - `npm run -s test`
   - `npm run -s lint`（0 error）

### No-Go（任一命中即阻断）

1. 任意窗口发生跨层依赖新增且无合规豁免。
2. 任意窗口出现 typecheck 或 P0 回归失败。
3. PR-D/PR-E 提前于 PR-B/PR-C 合并。
4. P0 缺陷未完成 QA 关闭即要求最终放行。

## 4. 冲突裁决（Gate-3）

1. `src/shared/*` 与 `src/preload/*` 冲突：以后端契约为准，前端必须同批 rebase 适配。
2. `src/main/ipc/*` 冲突：backend 先合，frontend 仅做消费侧适配。
3. 涉及豁免变更冲突：以“删除豁免优先”原则裁决，不接受延期无日期。

## 5. 当前即时判定

- PR-B：`Go（可进入合并窗口）`
- PR-C：`Go（依赖 PR-B 先合）`
- PR-D：`Pending（等待 backend in-progress 完成）`
- PR-E：`Pending（等待 PR-D 先合）`
- 最终放行：`Pending`（等待 designer + QA 对 P0 缺陷关闭签字）
