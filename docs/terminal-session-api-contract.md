# Terminal Session API Contract (Backend)

目标：用于前端与 QA 联调多终端窗口（新增/切换/关闭/输入输出流）。

## IPC Channels

### 创建终端会话
- Channel: `terminal:create-session`
- Request:
```ts
{
  shellType?: 'zsh' | 'bash' | 'shell'
  cwd?: string
  cols?: number // 20~400
  rows?: number // 10~200
  name?: string // 1~64
}
```
- Success:
```json
{
  "success": true,
  "session": {
    "id": "...",
    "name": "zsh-abcd1234",
    "shellType": "zsh",
    "shellCommand": "zsh",
    "cwd": "/path/to/repo",
    "pid": 12345,
    "status": "running",
    "createdAt": "2026-03-19T05:00:00.000Z",
    "updatedAt": "2026-03-19T05:00:00.000Z",
    "lastActiveAt": "2026-03-19T05:00:00.000Z"
  }
}
```

### 关闭终端会话
- Channel: `terminal:destroy-session`
- Request: `(sessionId: string)`
- Success:
```json
{ "success": true }
```

### 切换终端会话
- Channel: `terminal:switch-session`
- Request: `(sessionId: string)`
- Success:
```json
{ "success": true, "session": { "id": "...", "lastActiveAt": "..." } }
```

### 获取会话列表（标签页数据）
- Channel: `terminal:get-all-sessions`
- Success:
```json
{ "success": true, "sessions": [/* TerminalSessionMeta[] */] }
```

### 获取历史输出（回放）
- Channel: `terminal:get-output`
- Request: `(sessionId: string)`
- Success:
```json
{ "success": true, "chunks": ["...", "..."] }
```

### 写入输入
- Channel: `terminal:write-input`
- Request: `(sessionId: string, input: string)`
- 约束: `input.length <= 200000` 且不能包含 `\u0000`
- Success:
```json
{ "success": true }
```

### 调整终端尺寸
- Channel: `terminal:resize`
- Request: `(sessionId: string, cols: number, rows: number)`
- 约束: `cols 20~400`, `rows 10~200`
- Success:
```json
{ "success": true }
```

## Push Events (Main -> Renderer)

- `terminal:session-output` `(sessionId, chunk)`
- `terminal:session-status-change` `(sessionId, status, meta)`
- `terminal:session-removed` `(sessionId)`

## 错误码与前端提示映射建议

统一格式：
```json
{ "success": false, "code": "...", "error": "..." }
```

### 建议映射
- `INVALID_ARGUMENT`
  - 提示：`参数格式不正确，请检查终端配置`
  - 常见场景：`shellType` 非法、`name` 为空、`cols/rows` 越界、`input` 非法
- `PATH_NOT_FOUND`
  - 提示：`工作目录不存在或不可访问`
  - 常见场景：`cwd` 不存在或不是目录
- `NOT_FOUND`
  - 提示：`终端会话不存在，可能已关闭`
  - 常见场景：切换/关闭/写入/获取输出时 sessionId 失效
- `RESOURCE_EXHAUSTED`
  - 提示：`终端窗口数量已达上限，请先关闭部分窗口`
  - 常见场景：超过最大会话数（当前 16）
- `DEPENDENCY_UNAVAILABLE`
  - 提示：`本机缺少对应 shell，请安装后重试`
  - 常见场景：创建 `zsh`/`bash` 时系统无法 `spawn`
- `INTERNAL_ERROR`
  - 提示：`终端服务异常，请重试或重启应用`

## QA 快速检查清单

1. `shellType` 分别传 `zsh` / `bash` / `shell` 都能创建成功（环境支持时）。
2. 传非法 `shellType=fish` 返回 `INVALID_ARGUMENT`。
3. 传不存在 `cwd` 返回 `PATH_NOT_FOUND`。
4. 创建多个会话后 `terminal:get-all-sessions` 返回完整元数据。
5. `terminal:switch-session` 后 `lastActiveAt` 更新。
6. `terminal:destroy-session` 后收到 `terminal:session-removed` 事件。
7. `terminal:write-input` 能看到 `terminal:session-output` 连续输出。
