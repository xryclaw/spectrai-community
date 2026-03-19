# 架构重构 Gate-1 评审与边界清单基线（2026-03-19）

## 1. 评审范围

本轮 Gate-1 仅固化重构边界与执行顺序，不在本文件内落具体业务重构代码。覆盖四个方向：

1. 设置页重构（`UnifiedSettingsModal` 及其 tabs）
2. Sidebar 拆分（`layout/Sidebar.tsx` 与 `layout/sidebar/*`）
3. 核心模块拆分（`src/main/index.ts`、`src/main/ipc/*`、`src/main/adapter/*`）
4. OpenAI 客户端拆分（Codex / OpenCode 相关客户端能力边界）

## 2. 目录边界（基线）

### 2.1 Renderer：设置页与布局边界

- `src/renderer/components/settings/*`
  - 只负责设置领域 UI 与状态协调。
  - 禁止反向依赖 `src/renderer/components/layout/*`。
- `src/renderer/components/layout/sidebar/*`
  - 只负责 Sidebar 子组件、分组与列表展示。
  - 禁止直接依赖 `src/renderer/components/settings/*`。
- `src/renderer/components/layout/Sidebar.tsx`
  - 作为过渡层，允许组装 Sidebar 子模块；
  - Gate-1 起不再新增任何 settings 领域逻辑。

### 2.2 Main：IPC / Adapter / 客户端边界

- `src/main/ipc/*`
  - 负责 IPC 入参校验、错误码映射、调用编排。
  - 禁止直接依赖具体 adapter 实现细节（例如 providerHandlers 直接引用某个 adapter）。
- `src/main/adapter/*`
  - 负责 provider 协议适配与事件标准化。
  - 禁止反向依赖 `src/main/ipc/*`。
- OpenAI 相关客户端能力（Codex / OpenCode）
  - 归属 adapter 或独立 client 模块，禁止散落在 ipc handler。

## 3. 接口契约（Gate-1 冻结）

### 3.1 Renderer 事件契约

- 设置入口统一通过 `open-settings-tab` 事件打开并可指定 tab。
- `UnifiedSettingsModal` 对外仅暴露：
  - `onClose: () => void`
  - `initialTab?: string`
- Sidebar 侧不新增设置相关 props 透传，避免未来继续耦合。

### 3.2 Main Provider 契约

- Provider 管理 IPC 契约保持：
  - `provider:get-all/get/create/update/delete/reorder`
  - `provider:check-cli`
  - `provider:test-executable`
- 约束：IPC handler 返回值保持可序列化与错误码可识别（沿用 `errorResult.ts`）。
- 新增客户端拆分时，不允许更改 renderer 已依赖的 IPC channel 名称与返回结构。

## 4. 依赖规则（禁止跨层调用）

以下规则从 Gate-1 生效：

1. `renderer` 禁止 import `main`。
2. `main` 禁止 import `renderer`。
3. `settings/*` 禁止 import `layout/*`。
4. `layout/sidebar/*` 禁止 import `settings/*`。
5. `DetailPanel.tsx` 禁止依赖 `Sidebar.tsx` 单体文件（应依赖独立 sessions 组件）。
6. `providerHandlers.ts` 禁止 import `adapter/*` 具体实现。
7. `adapter/*` 禁止 import `ipc/*`。

## 5. 临时绕过方案（必须登记、必须到期）

当前存在的历史耦合通过白名单临时豁免，文件：

- `docs/plans/gate1-boundary-waivers.json`

现有豁免：

1. `Sidebar.tsx -> UnifiedSettingsModal.tsx`
2. `DetailPanel.tsx -> Sidebar.tsx`

管理规则：

1. 每条豁免必须带 `reason` 与 `expiresOn`。
2. 过期后必须在 PR 中移除或延期并说明风险。
3. 禁止新增无到期时间的永久豁免。

## 6. 合并顺序（建议）

1. **PR-A：边界基线先行**
   - 合入本文档、检查脚本、豁免清单。
   - 目标：先把“红线”落地，避免后续 PR 扩散耦合。
2. **PR-B：设置页入口收敛**
   - 设置弹窗入口只保留在 AppLayout/ActivityBar 主通路。
   - 移除 `Sidebar -> UnifiedSettingsModal` 豁免。
3. **PR-C：Sidebar 会话内容彻底拆分**
   - `SessionsContent` 下沉为独立模块（非 Sidebar 内导出）。
   - 移除 `DetailPanel -> Sidebar` 豁免。
4. **PR-D：OpenAI 客户端能力下沉**
   - 将 providerHandlers 中与 provider client 探测相关逻辑按职责拆入 client/service 层（保持 IPC 契约不变）。
5. **PR-E：核心模块收口**
   - 对 `main/index.ts` 初始化做工厂化收口，避免入口文件继续膨胀。

## 7. 可执行检查方式

### 7.1 本地检查命令

```bash
node scripts/check-gate1-boundaries.mjs
```

- 通过条件：输出 `Gate-1 boundary check passed`
- 失败条件：输出 non-waived violation 列表并返回退出码 1

### 7.2 CI 接入建议

在 CI 增加步骤：

```bash
npm run lint
node scripts/check-gate1-boundaries.mjs
npm run test
```

### 7.3 日常评审准入

PR 若涉及以下目录，必须附边界检查结果：

- `src/renderer/components/layout/**`
- `src/renderer/components/settings/**`
- `src/main/ipc/**`
- `src/main/adapter/**`

## 8. 风险汇总（向 Leader 汇报）

1. `Sidebar.tsx` 仍是高耦合点，继续堆逻辑会放大后续拆分成本。
2. `providerHandlers.ts` 已承载较多探测逻辑，若不下沉将继续扩大 IPC 层职责。
3. `main/index.ts` 入口体量较大，新增 provider 时存在初始化回归风险。
4. 当前两条豁免需在 2026-03-31 前清理，否则 Gate-2 会失去约束力。
