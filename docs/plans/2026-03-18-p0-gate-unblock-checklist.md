# P0 测试门禁解阻清单（可执行）

日期：2026-03-18
目标：清除 `lint/typecheck` 阻塞并保持 CI 门禁可持续可用。

## P0-1（最高优先级）：恢复 lint 可执行

负责人：前端（主）+ 后端（评审）

问题现状：`npm run lint` 在 ESLint v9 下报错，缺少 `eslint.config.(js|mjs|cjs)`。

最小改动路径：
1. 新建 `eslint.config.mjs`（Flat Config）。
2. 先启用最小可运行规则：
   - 基础 JS/TS 解析（包含 `.ts/.tsx`）。
   - 先设为 warning 优先，不在首轮引入大量阻断规则。
3. 第二步再逐步收紧规则（分 PR）。

验收断言：
1. 本地 `npm run lint` 可执行并返回退出码 0。
2. CI `Lint` job 通过。
3. 对新增测试目录 `tests/*.test.ts` 生效（至少能被扫描）。

---

## P0-2：压平 typecheck 红线（先清“契约错位”）

负责人：前端（主）

问题现状：`npm run typecheck` 存在历史错误，当前高价值优先是 `preload/index.ts` 与 `preload/index.d.ts` 契约错位，导致多个调用侧报错（如 `log/settings/fs/reorder/onRefresh`）。

最小改动路径（按顺序）：
1. 先修类型契约：补齐 `SpectrAIAPI` 中已实现但未声明的字段。
   - `log`
   - `settings`
   - `fs`
   - `provider.reorder`
   - `session.onRefresh`
2. 再处理可选 API 调用保护：
   - 对 `session.sendMessage/getConversation/getQueue/...` 的调用点补可选链或守卫。
3. 最后处理组件局部错误（例如导入路径、第三方组件 prop 类型）。

验收断言：
1. `npm run typecheck:node` 通过。
2. `npm run typecheck:web` 错误数显著下降并优先清零契约相关错误。
3. `preload/index.ts` 与 `preload/index.d.ts` 的关键 API 一致（见测试断言）。

---

## P0-3：门禁稳定性策略（防回退）

负责人：后端（主）+ 前端（协作）

执行项：
1. 保持 CI 顺序：`lint -> typecheck -> test`。
2. 新增/保留失败路径回归：IPC 在 `smV2` 缺失和运行时异常时必须返回 `{ success: false, error }`。
3. 新增/保留类型边界回归：SDK V2 方法可选性与 queue 错误字段契约不可被误改。

验收断言：
1. 任一 PR 修改 IPC handler 时，失败路径断言必须继续通过。
2. 任一 PR 修改 preload d.ts 时，边界断言必须继续通过。

---

## 可直接分配的执行任务

1. 前端任务 A：新增 `eslint.config.mjs` 并让 `npm run lint` 通过。
2. 前端任务 B：补齐 `src/preload/index.d.ts` 契约缺口（`log/settings/fs/reorder/onRefresh`）。
3. 前端任务 C：修复 `session` 可选 API 调用点的类型保护。
4. 后端任务 D：评审 IPC 失败路径返回结构，确保不出现 throw 泄漏到渲染层。
5. 测试任务 E：维持并扩展 `tests/ipcFailurePathContract.test.ts` 与 `tests/typeContractBoundary.test.ts`。
