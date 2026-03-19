# 前端最终交付附件（Worktree 开关）

更新时间：2026-03-19

## 1. 变更范围与提交

- `895d407` feat(frontend): add worktree risk badges and actions on session page
  - `src/renderer/components/conversation/SessionToolbar.tsx`
- `0839eb3` feat(ui): finalize worktree toggle UX with risk hints, recovery actions, and status messaging
  - `src/renderer/components/layout/Sidebar.tsx`
- `c16ab58` feat(ui): show workspace/cleanup/fallback risk badges in session item
  - `src/renderer/components/layout/sidebar/SessionItem.tsx`

## 2. 核对结论（发布前收口）

### 2.1 新建会话入口与默认值

- 入口可达：顶部入口、底部入口、目录右键入口均可打开新建会话弹窗。
- `worktree` 开关默认值：`true`（默认勾选）。

代码位点：
- `src/renderer/components/layout/Sidebar.tsx:415`
- `src/renderer/components/layout/Sidebar.tsx:485`
- `src/renderer/components/layout/Sidebar.tsx:531`
- `src/renderer/components/layout/Sidebar.tsx:860`

### 2.2 开关状态流（与文案）

- 开启态标题：`使用 Git Worktree（推荐）`
- 开启态说明：`为当前会话创建独立代码目录，适合并行开发，避免互相覆盖。`
- 关闭态风险提示：`将使用当前仓库目录，可能与其他会话共享改动。`

代码位点：
- `src/renderer/components/layout/Sidebar.tsx:866`
- `src/renderer/components/layout/Sidebar.tsx:870`
- `src/renderer/components/layout/Sidebar.tsx:873`

### 2.3 创建中/失败/回退/成功

- 创建中按钮文案：`创建会话中...`
- 创建中（仅 worktree=true）附加语义：`正在创建独立工作目录与分支...`
- 失败分级：`NOT_GIT_REPO | BRANCH_CONFLICT | PERMISSION_DENIED | UNKNOWN`
- 失败动作：`重试` + `改为普通会话创建`
- 回退动作：二次确认后，以 `worktreeEnabled=false` 重建
- 成功态区分：
  - worktree 成功：`已启用独立 worktree`
  - 回退成功：`会话已创建（未启用 worktree）`

代码位点：
- `src/renderer/components/layout/Sidebar.tsx:999`
- `src/renderer/components/layout/Sidebar.tsx:1011`
- `src/renderer/components/layout/Sidebar.tsx:49`
- `src/renderer/components/layout/Sidebar.tsx:962`
- `src/renderer/components/layout/Sidebar.tsx:968`
- `src/renderer/components/layout/Sidebar.tsx:362`
- `src/renderer/components/layout/Sidebar.tsx:350`
- `src/renderer/components/layout/Sidebar.tsx:1035`

### 2.4 会话状态可见性（列表/会话页）

- SessionItem 红标：`branch/mode/cleanup/fallback`
- SessionToolbar 红标：`workspace mode/branch/cleanup/fallback` + 重试/回退动作

代码位点：
- `src/renderer/components/layout/sidebar/SessionItem.tsx:38`
- `src/renderer/components/layout/sidebar/SessionItem.tsx:183`
- `src/renderer/components/conversation/SessionToolbar.tsx:398`

## 3. QA 截图清单（B1-B5）

> 说明：当前自动化执行环境无 GUI 截图通道，以下为联调环境补拍规范。图片可保存到 `docs/screenshots/qa-worktree/`。

建议文件名：
- `B1-default-checked.png`
- `B2-toggle-off-risk.png`
- `B3-create-failed-actions.png`
- `B4-fallback-confirm-result.png`
- `B5-isolation-and-success-copy.png`

### B1 默认勾选截图

拍摄位点：新建会话弹窗开关区（默认进入）
验收点：勾选状态 + 文案 `使用 Git Worktree（推荐）` + `（默认开启）`

### B2 关闭开关风险提示截图

拍摄位点：将开关关闭后的同一区域
验收点：出现风险提示 `将使用当前仓库目录，可能与其他会话共享改动。`

### B3 创建失败提示 + 动作区截图

拍摄位点：触发创建失败后错误容器
验收点：
- 错误主文案
- 分级提示文案
- 操作按钮 `重试` / `改为普通会话创建`

### B4 回退确认与结果截图

拍摄位点：
1) 点击 `改为普通会话创建` 的确认框
2) 回退成功后右下角成功 toast
验收点：
- 确认文案包含 `不启用 worktree`
- 成功文案：`会话已创建（未启用 worktree）`

### B5 并行隔离说明/成功态文案截图

拍摄位点：
1) 开关开启态说明文案
2) worktree 成功后的 toast
验收点：
- `为当前会话创建独立代码目录，适合并行开发，避免互相覆盖。`
- `已启用独立 worktree`

## 4. 状态映射（QA 快速对照）

| 场景 | UI 状态 | 期望文案/动作 |
|---|---|---|
| 初次打开新建会话 | 开关默认 `checked=true` | `使用 Git Worktree（推荐）` |
| 手动关闭开关 | 显示风险提示 | `将使用当前仓库目录...` |
| 创建中 + worktree=true | 主按钮禁用 | `创建会话中...` + `正在创建独立工作目录与分支...` |
| 创建失败 | 错误容器可见 | 分级提示 + `重试` + `改为普通会话创建` |
| 回退创建确认 | confirm 弹窗 | 明确提示关闭 worktree 风险 |
| 回退创建成功 | 成功 toast | `会话已创建（未启用 worktree）` |
| worktree 创建成功 | 成功 toast | `已启用独立 worktree` |

## 5. 已知限制与后续建议

### 已知限制

1. 当前环境无法直接产出 GUI 截图，B1-B5 需在联调环境补拍。
2. 失败分级当前仍含 message 关键字兜底，若后端错误文案变化，分级命中可能波动。
3. `cleanup/fallback` 红标是否从 `unknown` 进入具体值，依赖后端实时透传字段。

### 后续建议

1. 后端增加稳定错误码字段（machine-readable），前端分级完全按 code 驱动。
2. 后端统一并持续透传 `workspaceMode/cleanupStatus/fallbackStatus` 字段。
3. 在可视化 CI 增加 B1-B5 快照自动回归，作为 Gate 前置校验。

## 6. 附：验证命令

```bash
npm run -s typecheck:web
```

当前结果：通过。
