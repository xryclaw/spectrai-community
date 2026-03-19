# Gate-2 合并运行单（PR-B ~ PR-E）

## 0. 当前状态快照（2026-03-19）

- 基线边界脚本：`node scripts/check-gate1-boundaries.mjs` 通过。
- 当前阻断：`npm run typecheck:web` 失败，报错 `src/renderer/components/layout/Sidebar.tsx:510 TS1005 '}' expected`。
- 即时裁决：PR-B / PR-C 当前 `No-Go`，需先恢复 frontend 可编译基线。

## 1. 合并总顺序（强制）

1. PR-B：设置页入口收敛（移除 Sidebar 对 UnifiedSettingsModal 直接耦合）
2. PR-C：Sidebar 会话内容进一步拆分（DetailPanel 不再回连 Sidebar 单体）
3. PR-D：OpenAI 客户端能力下沉（IPC 与 client/service 职责解耦，保持 IPC 契约）
4. PR-E：核心模块收口（main/index.ts 初始化编排收敛）

禁止跳序：PR-D/PR-E 不得先于 PR-B/PR-C 合并入主干。

## 2. 角色同步约束（每个 PR 合并前必须完成）

- frontend in-progress 任务：
  - `bc7438f8-e929-4711-adc1-fcc1f7d74177`
  - `0cbbb446-8a5f-475a-81d4-cf234c1e7eef`
- backend in-progress 任务：
  - `237c8c34-f28a-4359-b8df-6597802caede`
  - `a97002a9-7709-4581-9422-31880a77724c`
- qa in-progress 任务：
  - `c696957b-6639-4e60-9ad3-625c9f3cafa3`

每次进入合并窗口前，必须更新这三方的 in-progress 任务状态；若任一方声明“关键文件仍在重写/未过编译”，该 PR 自动 `No-Go`。

## 3. 每步前置检查（命令级）

以下检查在每个 PR merge 前执行；任一失败则 `No-Go`：

```bash
# 0) 同步主干
git fetch origin

# 1) 边界闸门（必须）
node scripts/check-gate1-boundaries.mjs

# 2) 类型闸门（必须）
npm run -s typecheck:node
npm run -s typecheck:web

# 3) 最小回归（必须）
npm run -s test
```

针对不同 PR 的增量检查：

- PR-B / PR-C（前端主导）
```bash
npm run -s lint
```

- PR-D / PR-E（后端主导）
```bash
npm run -s typecheck:node
node --test tests/ipcCriticalPath.test.ts tests/ipcFailurePathContract.test.ts tests/ipcErrorCodeConsistency.test.ts
```

## 4. PR 级 Go/No-Go 判定

### PR-B（设置页入口收敛）

Go 条件：
1. `Sidebar.tsx` 不再直接渲染 `UnifiedSettingsModal`。
2. `gate1-boundary-waivers.json` 中 `renderer-layout-sidebar-no-settings-modal` 被删除。
3. 全部门禁命令通过。

No-Go 条件：
1. 出现新豁免而无到期日。
2. 为绕过重构新增跨层 import（即便脚本被手工放行也不允许）。

回退点：
- 回退到“仅保留 AppLayout/ActivityBar 打开设置页”的最后稳定提交。

### PR-C（Sidebar 深拆）

Go 条件：
1. `DetailPanel.tsx` 不再 import `layout/Sidebar.tsx`。
2. `gate1-boundary-waivers.json` 中 `renderer-detailpanel-no-sidebar-monolith` 被删除。
3. `Sidebar` 子模块文件可独立编译并通过 typecheck。

No-Go 条件：
1. 为复用方便重新把 `SessionsContent` 回挂到 Sidebar 单体导出。

回退点：
- 回退到“SessionsContent 独立模块化”前一提交，保留 PR-B 已完成内容。

### PR-D（OpenAI 客户端能力下沉）

Go 条件：
1. provider IPC 契约 channel 与返回结构不变。
2. `providerHandlers.ts` 不新增对 adapter 实现的直接依赖。
3. 与 OpenAI/Codex/OpenCode 相关 client 逻辑下沉后，IPC 错误码映射仍通过现有契约测试。

No-Go 条件：
1. IPC 层出现协议拼装细节或 provider 私有重试逻辑回灌。
2. 修改 renderer 侧已依赖字段但未给兼容层。

回退点：
- 回退到“仅内部重构不改契约”的标签提交；保留 PR-B/C。

### PR-E（核心模块收口）

Go 条件：
1. `main/index.ts` 仅负责 bootstrap/wire，不再承载新增业务分支。
2. 初始化顺序可验证（AdapterRegistry -> SessionManagerV2 -> AgentManagerV2 -> IPC 注册）。
3. 退出清理路径保持（adapter cleanup / manager shutdown）无回归。

No-Go 条件：
1. 为“快速打通”恢复入口文件巨型条件分支。
2. 生命周期清理链路出现丢失（如退出时未 cleanup）。

回退点：
- 回退到 PR-D merge 后 tag，保留 D 前全部结果。

## 5. 冲突裁决规则（发现即执行）

优先级：
1. 边界规则 > 交付速度
2. 契约稳定 > 内部实现优雅
3. 主干可编译 > 局部重构完整性

具体裁决：
1. 前后端同时改 `src/shared/*`、`src/preload/*`：以后端契约为准，前端同批次跟进适配。
2. frontend 与 backend 同时改 `src/main/ipc/*`：禁止并行直接合并，先合 backend，再由 frontend rebase 验证。
3. 任何 PR 引入新豁免：必须附 `reason + expiresOn`；否则拒绝合并。

## 6. 豁免收敛与关闭条件

文件：`docs/plans/gate1-boundary-waivers.json`

收敛策略：
1. PR-B 必须关闭 `renderer-layout-sidebar-no-settings-modal`。
2. PR-C 必须关闭 `renderer-detailpanel-no-sidebar-monolith`。
3. PR-D/PR-E 禁止新增豁免；若确需新增，必须在同 PR 内给出“下一 PR 关闭计划”。

Gate-2 完成判定：
1. 豁免文件为空数组 `[]`，或仅保留未过期且经 Leader 明确批准项。
2. 边界脚本在无豁免情况下可通过。

## 7. 失败回退总策略

- 每个 PR 合并后立即打 tag：`gate2-pr-b-pass` / `gate2-pr-c-pass` / `gate2-pr-d-pass` / `gate2-pr-e-pass`。
- 下一个 PR 失败且 30 分钟内无法恢复时，回退到最近 pass tag。
- 回退后只允许修复性 PR 进入，不允许继续功能扩展。

## 8. 本轮执行结论（当前）

- PR-B：`No-Go`（frontend typecheck 阻断未清）
- PR-C：`No-Go`（依赖 PR-B 先完成）
- PR-D：`Pending`（可准备，不可先合）
- PR-E：`Pending`（依赖 PR-D）
