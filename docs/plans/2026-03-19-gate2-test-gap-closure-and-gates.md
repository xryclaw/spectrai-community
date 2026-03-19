# Gate-2 测试补洞与发布门禁收紧（2026-03-19）

## 1. 新增/更新用例清单

| 用例文件 | 风险域 | 目标 | 级别 |
|---|---|---|---|
| `tests/gate2SettingsSidebarContract.test.ts` | 设置页全屏流程、Sidebar 子组件行为一致性 | 验证 `open-settings-tab` 全链路、`UnifiedSettingsModal` `initialTab` 透传、Sidebar 路由 case 完整性 | P0 |
| `tests/gate2CodexErrorGlobalHandling.test.ts` | OpenAI/Codex 流解析异常分支、全局错误处理 | 验证 Codex 错误分支（`turn.failed` / `"type":"error"` / `[ERROR]`）、`PARSER_RULES` 合并、`ensureIpcSuccess` 统一抛错契约 | P0 |
| `tests/gate2LeakRegression.test.ts` | 泄漏回归 | 验证 sessionStore 三类监听器重复注册前清理、`cleanupListeners` 全量释放、preload 监听器均返回 unsubscribe | P0 |

## 2. CI 触发矩阵（强门禁）

触发条件：
- `push` 到任意分支
- `pull_request`

执行顺序（`.github/workflows/ci.yml`）：
1. `npm ci`
2. `npm run test:gate2:p0`  ← **P0 强门禁，失败即阻断**
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test`

`test:gate2:p0` 覆盖：
- Gate-2 三个新用例：`tests/gate2*.test.ts`
- 既有关键契约：`ipcCriticalPath` / `ipcFailurePathContract` / `ipcErrorCodeConsistency` / `typeContractBoundary` / `preloadTypeContract`

## 3. 失败即阻断的最小规则集

### P0（阻断发布）
- `npm run test:gate2:p0` 必须全绿。
- 任一关键契约失败（IPC 关键通道、失败路径契约、错误码一致性、类型边界）直接阻断。
- 任一 Gate-2 新增高风险用例失败（设置页/Sidebar、Codex 异常流、泄漏回归）直接阻断。

### P1（默认不阻断，建议在里程碑前清零）
- `npm run lint` 允许 warning，但不允许 error。
- warning 总量建议持续下降；若单次 PR 新增 warning，要求在 PR 描述给出豁免理由。

### P2（观测项）
- Node `MODULE_TYPELESS_PACKAGE_JSON`、npm unknown config 警告作为工程治理项跟踪，不作为本轮阻断条件。

## 4. P0/P1/P2 修复追踪表

| 优先级 | 项目 | 当前状态 | 建议负责人 | 备注 |
|---|---|---|---|---|
| P0 | 设置页全屏流程回归 | 已补自动化用例并纳入强门禁 | 前端 + QA | 关注 `open-settings-tab` 与 `initialTab` 回归 |
| P0 | Sidebar 子组件行为一致性 | 已补自动化用例并纳入强门禁 | 前端 + QA | 关注侧栏路由 case 漏改 |
| P0 | OpenAI/Codex 流解析异常分支 | 已补自动化用例并纳入强门禁 | 后端(解析) + QA | 关注 `turn.failed` / error 事件匹配 |
| P0 | 全局错误处理（SpectralError 语义域） | 已补统一错误处理契约测试 | 前端 + 后端 + QA | 当前以 `IpcOperationError` 作为统一错误封装 |
| P0 | 泄漏回归（监听器清理） | 已补自动化用例并纳入强门禁 | 前端 + QA | 关注重复注册与卸载清理 |
| P1 | lint warning 收敛 | 未清零（历史债） | 前端/后端各模块 owner | 建议分批治理，不阻断主线 |
| P2 | Node/npm 警告治理 | 待评估 | 构建/工程 owner | 需评估模块类型策略与 npm 配置兼容 |

## 5. 准入阈值建议

- 发布准入：`P0 强门禁全通过` + `typecheck 通过` + `lint 无 error`。
- 合并准入：至少满足 `test:gate2:p0` 全通过；不满足则拒绝合并。
- 灰度准入：若出现 P1 退化（warning 激增），需负责人签字确认并附修复计划日期。
