# 发布前后端 IPC 联调结论（2026-03-18）

## 联调范围
- 前端：`src/preload/ipcValidation.ts`（参数校验 + 错误归一化）
- 后端：`task/workspace/provider` 管理链路 handler
- 共享：`src/shared/ipcErrorCodes.ts`

## 核验结果

### 1) 错误码/错误结构一致性
- 前端校验层已支持“后端业务错误码透传”：
  - 当结果为 `success:false` 且存在 `code:string`，前端直接透传。
  - 仅在后端未提供 `code` 时，才归一化为 `IPC_RESULT_ERROR`。
- 后端管理链路已统一错误结构：
  - `success:false`
  - `error:string`
  - `code:IpcErrorCode`

### 2) 后端验收断言补齐
- 新增测试：`tests/ipcErrorCodeConsistency.test.ts`
  - 断言前端透传逻辑存在
  - 断言后端关键 handler 使用统一失败 helper
  - 断言关键 handler 不再返回裸 `{ success:false, error }`
  - 断言共享错误码字典含核心枚举

### 3) 门禁回归
- `npm run typecheck`：通过
- `npm test`：通过

## 联调结论
- 前后端 IPC 校验加固链路已闭环：
  - 参数非法 -> 前端 `IPC_VALIDATION_ERROR`
  - IPC 调用异常 -> 前端 `IPC_INVOKE_ERROR`
  - 后端业务失败 -> 后端业务 `code` 透传到前端
- 当前版本可支持前端按 `code` 精准提示与重试策略，同时保留旧逻辑按 `error` 文本兜底。

## 剩余风险（发布前已知）
1. `sessionHandlers` 的 SDK V2 路径仍以既有 `{ success:false, error }` 契约为主，未全面纳入业务 `code`（为保持现有契约测试稳定）。
2. 低频/历史 IPC 通道尚未全部完成错误码迁移；当前优先保证 task/workspace/provider 主链路一致。
3. `npm test` 的 `MODULE_TYPELESS_PACKAGE_JSON` 警告仍存在（不影响功能）。
