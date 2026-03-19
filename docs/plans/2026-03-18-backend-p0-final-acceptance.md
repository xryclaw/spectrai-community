# 后端 P0 最终验收清单与发布说明（2026-03-18）

## 1. IPC 契约收口（后端）

### 1.1 已完成
- 新增共享错误码：`src/shared/ipcErrorCodes.ts`
- 新增主进程错误返回 helper：`src/main/ipc/errorResult.ts`
- 在关键后端管理 IPC 中补齐 `code` 字段（保留原有 `success/error` 兼容）：
  - `src/main/ipc/taskHandlers.ts`
  - `src/main/ipc/workspaceHandlers.ts`
  - `src/main/ipc/providerHandlers.ts`

### 1.2 与前端 IPC 校验层的对齐方式
- 前端 `invokeWithValidation` 在返回结果包含 `success:false` 且带 `code` 时保留后端 `code`，不再强制折叠为 `IPC_RESULT_ERROR`。
- 兼容策略：老调用方继续按 `error` 文本处理；新调用方可按 `code` 分支处理。

### 1.3 本次启用的后端业务错误码
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `RESOURCE_EXHAUSTED`
- `DEPENDENCY_UNAVAILABLE`
- `PATH_NOT_FOUND`
- `NOT_GIT_REPO`
- `EXTERNAL_OPERATION_FAILED`
- `INTERNAL_ERROR`

## 2. QA 门禁收口结果

### 2.1 类型门禁
- `npm run typecheck`：通过（node + web）

### 2.2 测试门禁
- `npm test`：通过（20/20）
- 关键 IPC 契约测试通过：
  - `ipcCriticalPath.test.ts`
  - `ipcFailurePathContract.test.ts`
  - `preloadTypeContract.test.ts`
  - `typeContractBoundary.test.ts`

## 3. 后端 P0 验收清单

- [x] shared/main/renderer 类型契约闭环（历史任务）
- [x] 主进程关键同步阻塞路径首批异步化（历史任务）
- [x] 前后端 IPC 错误契约统一（新增 `code`，保留 `error` 兼容）
- [x] typecheck 门禁清零
- [x] 核心 IPC 契约测试通过

## 4. 发布说明（Backend）

### 4.1 变更摘要
- 后端 IPC 失败返回新增 `code` 字段（不破坏旧结构）：
  - 仍返回：`{ success: false, error: string }`
  - 现在可返回：`{ success: false, error: string, code: string }`
- 管理类 IPC（task/workspace/provider）优先启用错误码，便于前端做确定性提示与重试策略。

### 4.2 对前端的建议接入
- 先按 `code` 分支，再回退 `error` 文本：
  - `NOT_FOUND` -> 资源不存在提示
  - `INVALID_ARGUMENT` -> 表单参数提示
  - `RESOURCE_EXHAUSTED` -> 并发/资源上限提示
  - `INTERNAL_ERROR` -> 通用错误 + 建议重试

## 5. 已知限制（本次不纳入 P0）

1. `sessionHandlers.ts` 的 SDK V2 路径为保持现有契约测试稳定，仍以 `{ success:false, error }` 为主；后续可在不破坏测试前提下渐进引入业务 `code`。
2. 部分历史/低频 IPC 仍未统一错误码（本次聚焦 task/workspace/provider 关键管理链路）。
3. Node `--test` 会出现 `MODULE_TYPELESS_PACKAGE_JSON` 警告，不影响功能；如需消除需单独评估 `package.json` 模块类型策略。
