# 自主任务（Autonomous Workflow）功能开发文档

> 本文档面向 Claude Code / Codex 等 AI 开发 Agent，描述「自主任务」功能的完整实现规格。
> 已完成部分已标注 ✅，待实现部分标注 🔲。

---

## 一、背景与目标

SpectrAI 当前支持两种会话模式：
- **普通会话**：单 AI 对话
- **Supervisor 模式**：AI 可 spawn 子 Agent，但需用户手动驱动

本次新增第三种模式：**自主任务（Autonomous）**，实现从目标输入到交付的端到端自治闭环：

```
用户输入目标
    ↓
AI 头脑风暴分析（brainstorming）
    ↓
AI 制定执行计划（planning）
    ↓
等待用户审批（waiting_approval）← 唯一人工介入点
    ↓
团队并行执行（executing）
    ↓
验证交付（validating → delivering → done）
```

---

## 二、已完成的基础工作 ✅

### 2.1 类型定义（`src/shared/types.ts`）

已新增以下类型，可直接 import 使用：

```typescript
// SessionConfig 新增字段
autonomousMode?: boolean        // 是否为自主任务模式
autonomousGoal?: string         // 任务目标描述
allowedProviderIds?: string[]   // 允许使用的 Provider ID 列表

// 工作流阶段枚举
export type WorkflowPhase =
  | 'brainstorming'    // AI 分析阶段
  | 'confirming'       // 确认阶段
  | 'planning'         // 制定计划
  | 'waiting_approval' // 等待用户审批（门禁）
  | 'executing'        // 团队执行中
  | 'validating'       // 验证中
  | 'delivering'       // 交付中
  | 'done'             // 完成
  | 'failed'           // 失败

// 工作流状态
export interface WorkflowState {
  workflowId: string
  sessionId: string
  goal: string
  phase: WorkflowPhase
  approved: boolean
  planContent?: string
  version: number       // 乐观锁，每次 phase 变更 +1
  createdAt: string
  updatedAt: string
}

// 工作流步骤
export interface WorkflowStep {
  stepId: string
  workflowId: string
  title: string
  ownerRole?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  dependsOn?: string    // 依赖的 stepId
  evidence?: string     // 完成证据（文件路径、输出摘要等）
  createdAt: string
  updatedAt: string
}

// 交付报告
export interface DeliveryReport {
  summary: string
  keyChanges: string[]
  validationEvidence: string[]
  risks: string[]
  failedSteps: string[]
}
```

### 2.2 IPC 常量（`src/shared/constants.ts`）

已在 `IPC` 对象中新增：

```typescript
WORKFLOW_PHASE_CHANGE: 'workflow:phase-change',  // 主进程 → 渲染进程推送
WORKFLOW_APPROVE:      'workflow:approve',         // 渲染进程 → 主进程
WORKFLOW_REJECT:       'workflow:reject',          // 渲染进程 → 主进程
WORKFLOW_GET:          'workflow:get',             // 查询单个 workflow
WORKFLOW_GET_ALL:      'workflow:get-all',         // 查询会话所有 workflow
```

### 2.3 数据库迁移（`src/main/storage/migrations.ts`）

已新增 v33 迁移，创建三张表：

```sql
-- 工作流主表
team_workflows (
  workflow_id TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  goal        TEXT NOT NULL,
  phase       TEXT NOT NULL DEFAULT 'brainstorming',
  approved    INTEGER NOT NULL DEFAULT 0,
  plan_content TEXT,
  version     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
)

-- 工作流步骤表
team_workflow_steps (
  step_id     TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES team_workflows,
  title       TEXT NOT NULL,
  owner_role  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  depends_on  TEXT,   -- 依赖的 step_id
  evidence    TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
)

-- 工作流事件日志表
team_workflow_events (
  event_id    TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES team_workflows,
  type        TEXT NOT NULL,
  payload     TEXT,   -- JSON 字符串
  created_at  TEXT NOT NULL
)
```

### 2.4 WorkflowRepository（`src/main/storage/repositories/WorkflowRepository.ts`）

已创建，提供完整 CRUD：

```typescript
class WorkflowRepository {
  createWorkflow(w: WorkflowState): void
  updateWorkflowPhase(workflowId, phase, version, planContent?): boolean  // 乐观锁
  setApproved(workflowId, approved): void
  getWorkflow(workflowId): WorkflowState | undefined
  getWorkflowsBySession(sessionId): WorkflowState[]
  upsertStep(step: WorkflowStep): void
  updateStepStatus(stepId, status, evidence?): void
  getSteps(workflowId): WorkflowStep[]
  addEvent(event: WorkflowEvent): void
  getEvents(workflowId): WorkflowEvent[]
}
```

---

## 三、待实现任务 🔲

### Task 1：注册 WorkflowRepository 到 DatabaseManager

**文件**：`src/main/storage/Database.ts`

**操作**：
1. 在 import 区域添加：
   ```typescript
   import { WorkflowRepository } from './repositories/WorkflowRepository'
   ```
2. 在 `DatabaseManager` 类中添加私有字段：
   ```typescript
   private workflowRepo!: WorkflowRepository
   ```
3. 在构造函数 `insertBuiltinData()` 之前添加初始化：
   ```typescript
   this.workflowRepo = new WorkflowRepository(this.db, this.usingSqlite)
   ```
4. 在类末尾添加代理方法（参考其他 repo 的模式）：
   ```typescript
   createWorkflow = (...args: Parameters<WorkflowRepository['createWorkflow']>) => this.workflowRepo.createWorkflow(...args)
   updateWorkflowPhase = (...args: Parameters<WorkflowRepository['updateWorkflowPhase']>) => this.workflowRepo.updateWorkflowPhase(...args)
   setWorkflowApproved = (...args: Parameters<WorkflowRepository['setApproved']>) => this.workflowRepo.setApproved(...args)
   getWorkflow = (...args: Parameters<WorkflowRepository['getWorkflow']>) => this.workflowRepo.getWorkflow(...args)
   getWorkflowsBySession = (...args: Parameters<WorkflowRepository['getWorkflowsBySession']>) => this.workflowRepo.getWorkflowsBySession(...args)
   upsertWorkflowStep = (...args: Parameters<WorkflowRepository['upsertStep']>) => this.workflowRepo.upsertStep(...args)
   updateWorkflowStepStatus = (...args: Parameters<WorkflowRepository['updateStepStatus']>) => this.workflowRepo.updateStepStatus(...args)
   getWorkflowSteps = (...args: Parameters<WorkflowRepository['getSteps']>) => this.workflowRepo.getSteps(...args)
   addWorkflowEvent = (...args: Parameters<WorkflowRepository['addEvent']>) => this.workflowRepo.addEvent(...args)
   getWorkflowEvents = (...args: Parameters<WorkflowRepository['getEvents']>) => this.workflowRepo.getEvents(...args)
   ```

---

### Task 2：新增 AutonomousWorkflowEngine

**文件**：`src/main/agent/AutonomousWorkflowEngine.ts`（新建）

**职责**：工作流状态机，管理 phase 转换、审批门禁、事件记录。

**实现规格**：

```typescript
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { WorkflowPhase, WorkflowState } from '../../shared/types'
import type { DatabaseManager } from '../storage/Database'

// 合法的状态转换表
const VALID_TRANSITIONS: Record<WorkflowPhase, WorkflowPhase[]> = {
  brainstorming:    ['confirming', 'planning', 'failed'],
  confirming:       ['planning', 'brainstorming', 'failed'],
  planning:         ['waiting_approval', 'failed'],
  waiting_approval: ['executing', 'planning', 'failed'],  // approve→executing, reject→planning
  executing:        ['validating', 'failed'],
  validating:       ['delivering', 'failed'],
  delivering:       ['done', 'failed'],
  done:             [],
  failed:           [],
}

export class AutonomousWorkflowEngine extends EventEmitter {
  // 内存缓存（workflowId → WorkflowState）
  private cache = new Map<string, WorkflowState>()

  constructor(private database: DatabaseManager) {
    super()
  }

  // 初始化新工作流（会话创建时调用）
  async initWorkflow(sessionId: string, goal: string): Promise<WorkflowState>

  // 状态转换（带乐观锁重试）
  async transition(workflowId: string, toPhase: WorkflowPhase, planContent?: string): Promise<void>

  // 审批门禁
  async approve(workflowId: string): Promise<void>   // → transition to 'executing'
  async reject(workflowId: string): Promise<void>    // → transition to 'planning'

  // 查询
  getWorkflow(workflowId: string): WorkflowState | undefined
  getWorkflowsBySession(sessionId: string): WorkflowState[]

  // 内部：记录事件到 DB
  private logEvent(workflowId: string, type: string, payload?: any): void
}
```

**关键实现细节**：
- `transition()` 必须校验 `VALID_TRANSITIONS`，非法转换抛出错误
- `transition()` 调用 `database.updateWorkflowPhase()` 时使用乐观锁（传入当前 version）
- 成功转换后发射 `'phase-change'` 事件：`this.emit('phase-change', workflowId, toPhase)`
- 同时调用 `this.logEvent()` 写入 `team_workflow_events`
- `approve()` 内部调用 `transition(workflowId, 'executing')` + `database.setWorkflowApproved(workflowId, true)`
- `reject()` 内部调用 `transition(workflowId, 'planning')`

---

### Task 3：扩展 sessionHandlers.ts

**文件**：`src/main/ipc/sessionHandlers.ts`

**操作 A**：在 `SESSION_CREATE` 分支中，找到 `supervisorMode` 处理逻辑之后，添加 `autonomousMode` 处理：

```typescript
// 在 supervisorMode 处理块之后添加
if (config.autonomousMode) {
  // autonomous 模式复用 supervisor 的 Agent 能力
  config.enableAgent = true
  // 注入 supervisor prompt（复用现有函数）
  // 按 provider 类型分派（与 supervisorMode 相同逻辑）
  // MCP 模式设为 'supervisor'
  
  // 会话创建成功后，初始化 workflow 记录
  // const engine = getAutonomousWorkflowEngine()  // 单例获取
  // await engine.initWorkflow(sessionId, config.autonomousGoal ?? '')
}
```

**操作 B**：在文件末尾新增 WORKFLOW_* IPC handlers：

```typescript
ipcMain.handle(IPC.WORKFLOW_APPROVE, async (_event, workflowId: string) => {
  await engine.approve(workflowId)
  return { success: true }
})

ipcMain.handle(IPC.WORKFLOW_REJECT, async (_event, workflowId: string) => {
  await engine.reject(workflowId)
  return { success: true }
})

ipcMain.handle(IPC.WORKFLOW_GET, async (_event, workflowId: string) => {
  return engine.getWorkflow(workflowId)
})

ipcMain.handle(IPC.WORKFLOW_GET_ALL, async (_event, sessionId: string) => {
  return engine.getWorkflowsBySession(sessionId)
})
```

**操作 C**：监听 engine 的 `phase-change` 事件，推送到渲染进程：

```typescript
engine.on('phase-change', (workflowId: string, phase: WorkflowPhase) => {
  // 广播给所有渲染进程窗口
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send(IPC.WORKFLOW_PHASE_CHANGE, workflowId, phase)
  })
})
```

---

### Task 4：扩展 Sidebar.tsx（三态模式 UI）

**文件**：`src/renderer/components/layout/Sidebar.tsx`

**操作**：将现有的「普通/Supervisor」二态切换改为三态，新增「自主任务」选项。

**UI 规格**：

```tsx
// 新增状态
const [sessionModeType, setSessionModeType] = useState<'normal' | 'supervisor' | 'autonomous'>('normal')
const [autonomousGoal, setAutonomousGoal] = useState('')
const [allowedProviderIds, setAllowedProviderIds] = useState<string[]>([])

// 模式切换按钮区域改为 grid-cols-3：
// [普通会话 - blue] [Supervisor - green] [自主任务 - purple]

// 当 sessionModeType === 'autonomous' 时，额外显示：
// 1. Provider 多选列表（checkbox，从 providers 列表渲染）
// 2. 任务目标 textarea（placeholder="描述你的任务目标..."，必填）
// 3. 主按钮文案改为「开始规划」

// handleCreateSession 中传入新字段：
{
  ...baseConfig,
  supervisorMode: sessionModeType === 'supervisor',
  enableAgent: sessionModeType !== 'normal',
  autonomousMode: sessionModeType === 'autonomous',
  autonomousGoal: sessionModeType === 'autonomous' ? autonomousGoal.trim() : undefined,
  allowedProviderIds: sessionModeType === 'autonomous' ? allowedProviderIds : undefined,
}
```

**注意**：读取现有 Sidebar.tsx 后，找到 `supervisorMode` 相关的 state 和 UI，在其基础上扩展，不要重写整个文件。

---

### Task 5：新增 TeamExecutionOrchestrator

**文件**：`src/main/agent/TeamExecutionOrchestrator.ts`（新建）

**职责**：接收 workflow + plan，解析步骤，按依赖拓扑排序后并行 spawn Agent。

```typescript
import { randomUUID } from 'crypto'
import type { WorkflowStep } from '../../shared/types'
import type { AgentManagerV2 } from './AgentManagerV2'
import type { AutonomousWorkflowEngine } from './AutonomousWorkflowEngine'
import type { DatabaseManager } from '../storage/Database'

export class TeamExecutionOrchestrator {
  constructor(
    private engine: AutonomousWorkflowEngine,
    private agentManager: AgentManagerV2,
    private database: DatabaseManager
  ) {}

  // 主入口：解析 plan → 创建 steps → 执行
  async execute(workflowId: string, plan: string, parentSessionId: string): Promise<void>

  // 解析 plan 文本为步骤列表（简单实现：按 ## 标题分割）
  private parsePlanToSteps(workflowId: string, plan: string): WorkflowStep[]

  // 拓扑排序（按 dependsOn 字段）
  private topoSort(steps: WorkflowStep[]): WorkflowStep[][]  // 返回并行批次

  // 执行单个步骤（spawn agent + wait）
  private async executeStep(step: WorkflowStep, parentSessionId: string): Promise<void>
}
```

**执行逻辑**：
1. `parsePlanToSteps()` 将 plan 文本按 `## ` 标题分割为步骤
2. `topoSort()` 按 `dependsOn` 构建 DAG，返回可并行执行的批次数组
3. 按批次顺序执行，每批内并行 `Promise.all(batch.map(executeStep))`
4. `executeStep()` 调用 `agentManager.spawnAgent()` + `agentManager.waitAgent()`
5. 步骤完成后调用 `database.updateWorkflowStepStatus()`
6. 所有步骤完成后调用 `engine.transition(workflowId, 'validating')`
7. 任意步骤失败时调用 `engine.transition(workflowId, 'failed')`

---

### Task 6：新增 workflowStore.ts

**文件**：`src/renderer/stores/workflowStore.ts`（新建）

```typescript
import { create } from 'zustand'
import { ipcRenderer } from 'electron'  // 或通过 window.electron
import type { WorkflowState } from '../../shared/types'
import { IPC } from '../../shared/constants'

interface WorkflowStore {
  workflows: Record<string, WorkflowState>   // workflowId → state
  loadWorkflows: (sessionId: string) => Promise<void>
  approveWorkflow: (workflowId: string) => Promise<void>
  rejectWorkflow: (workflowId: string) => Promise<void>
  _handlePhaseChange: (workflowId: string, phase: string) => void
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: {},

  loadWorkflows: async (sessionId) => {
    const list = await window.electron.ipcRenderer.invoke(IPC.WORKFLOW_GET_ALL, sessionId)
    const map: Record<string, WorkflowState> = {}
    for (const w of list ?? []) map[w.workflowId] = w
    set({ workflows: map })
  },

  approveWorkflow: async (workflowId) => {
    await window.electron.ipcRenderer.invoke(IPC.WORKFLOW_APPROVE, workflowId)
  },

  rejectWorkflow: async (workflowId) => {
    await window.electron.ipcRenderer.invoke(IPC.WORKFLOW_REJECT, workflowId)
  },

  _handlePhaseChange: (workflowId, phase) => {
    set(state => ({
      workflows: {
        ...state.workflows,
        [workflowId]: state.workflows[workflowId]
          ? { ...state.workflows[workflowId], phase: phase as any }
          : state.workflows[workflowId]
      }
    }))
  },
}))

// 订阅主进程推送（在 App 初始化时调用一次）
export function initWorkflowStoreListeners() {
  window.electron.ipcRenderer.on(IPC.WORKFLOW_PHASE_CHANGE, (_event, workflowId, phase) => {
    useWorkflowStore.getState()._handlePhaseChange(workflowId, phase)
  })
}
```

---

### Task 7：新增 AgentTeamsPanel.tsx

**文件**：`src/renderer/components/panels/AgentTeamsPanel.tsx`（新建）

**布局**（三栏）：

```
┌─────────────┬──────────────────────┬──────────────┐
│  工作流列表  │    成员泳道           │  状态总览     │
│  (左 20%)   │    (中 50%)          │  (右 30%)    │
│             │  Leader              │  当前阶段     │
│  活跃        │  工程实现            │  待审批项     │
│  已完成      │  质量审查            │  阻塞项       │
└─────────────┴──────────────────────┴──────────────┘
```

**数据来源**：
- 左栏：`useWorkflowStore` 的 `workflows`
- 中栏：`useSessionStore` 的 `agents`（按 parentSessionId 过滤）
- 右栏：当前选中 workflow 的 phase + steps

**审批 UI**：当 `phase === 'waiting_approval'` 时，右栏显示：
```tsx
<div className="approval-banner">
  <p>计划已就绪，等待审批</p>
  <pre>{workflow.planContent}</pre>
  <button onClick={() => approveWorkflow(workflowId)}>批准执行</button>
  <button onClick={() => rejectWorkflow(workflowId)}>重新规划</button>
</div>
```

**Agent 卡片**（中栏每个成员）：
```tsx
<AgentCard
  name={agent.name}
  status={agent.status}          // pending/running/completed/failed
  providerId={agent.providerId}
/>
```

---

### Task 8：新增 DeliveryAggregator

**文件**：`src/main/agent/DeliveryAggregator.ts`（新建）

```typescript
import type { DeliveryReport } from '../../shared/types'
import type { DatabaseManager } from '../storage/Database'
import type { SessionManagerV2 } from '../session/SessionManagerV2'

export class DeliveryAggregator {
  constructor(
    private database: DatabaseManager,
    private sessionManager: SessionManagerV2
  ) {}

  async aggregate(workflowId: string, parentSessionId: string): Promise<DeliveryReport>
}
```

**实现逻辑**：
1. 从 `database.getWorkflowSteps(workflowId)` 获取所有步骤
2. 汇总 `evidence` 字段
3. 区分 completed / failed 步骤
4. 构建 `DeliveryReport` 对象
5. 将报告序列化为 Markdown，通过 `sessionManager.sendMessage(parentSessionId, reportMarkdown)` 注入父会话对话

---

### Task 9：接入 AppLayout.tsx

**文件**：`src/renderer/components/layout/AppLayout.tsx`

**操作**：找到 DetailPanel 渲染区域，当选中会话的 `config.autonomousMode === true` 时，渲染 `AgentTeamsPanel`：

```tsx
import { AgentTeamsPanel } from '../panels/AgentTeamsPanel'

// 在 DetailPanel 区域：
{selectedSession?.config?.autonomousMode ? (
  <AgentTeamsPanel sessionId={selectedSession.id} />
) : (
  // 原有的 DetailPanel 内容
)}
```

---

## 四、实现顺序建议

```
Task 1 (Database.ts)
    ↓
Task 2 (AutonomousWorkflowEngine)
    ↓
Task 3 (sessionHandlers.ts)        Task 4 (Sidebar.tsx)
    ↓                                   ↓
Task 5 (TeamExecutionOrchestrator)  Task 6 (workflowStore.ts)
    ↓                                   ↓
Task 8 (DeliveryAggregator)         Task 7 (AgentTeamsPanel.tsx)
    ↓                                   ↓
                Task 9 (AppLayout.tsx)
```

Tasks 3+4、5+6、7+8 可以并行执行。

---

## 五、关键约定

1. **IPC 通信**：渲染进程通过 `window.electron.ipcRenderer.invoke()` 调用主进程，参考现有代码中的用法
2. **数据库访问**：所有 DB 操作通过 `DatabaseManager` 的代理方法，不直接操作 `db`
3. **Agent spawn**：通过 `AgentManagerV2.spawnAgent()` 创建子会话，不直接调用 `SessionManagerV2`
4. **错误处理**：所有 DB 操作包裹在 try/catch 中，失败时 `console.warn` 不抛出
5. **类型安全**：所有新代码使用 TypeScript，从 `../../shared/types` 导入共享类型

---

## 六、文件路径速查

| 文件 | 状态 |
|------|------|
| `src/shared/types.ts` | ✅ 已修改 |
| `src/shared/constants.ts` | ✅ 已修改 |
| `src/main/storage/migrations.ts` | ✅ 已修改（v33） |
| `src/main/storage/repositories/WorkflowRepository.ts` | ✅ 已创建 |
| `src/main/storage/Database.ts` | 🔲 Task 1 |
| `src/main/agent/AutonomousWorkflowEngine.ts` | 🔲 Task 2 |
| `src/main/ipc/sessionHandlers.ts` | 🔲 Task 3 |
| `src/renderer/components/layout/Sidebar.tsx` | 🔲 Task 4 |
| `src/main/agent/TeamExecutionOrchestrator.ts` | 🔲 Task 5 |
| `src/renderer/stores/workflowStore.ts` | 🔲 Task 6 |
| `src/renderer/components/panels/AgentTeamsPanel.tsx` | 🔲 Task 7 |
| `src/main/agent/DeliveryAggregator.ts` | 🔲 Task 8 |
| `src/renderer/components/layout/AppLayout.tsx` | 🔲 Task 9 |
