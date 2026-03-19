import { EventEmitter } from 'events'
import { SpectralError } from '../../errors/SpectralError'

export type TeamTaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export interface TeamTaskRecord {
  taskId: string
  role: string
  title?: string
  status: TeamTaskStatus
  summary?: string
  updatedAt: string
}

/**
 * TeamManager（第一批）
 * - 输入：任务认领/完成/阻塞事件
 * - 输出：标准化任务状态 + 事件广播
 * - 错误语义：统一抛 SpectralError（NOT_FOUND / INVALID_STATE）
 */
export class TeamManager extends EventEmitter {
  private tasks = new Map<string, TeamTaskRecord>()

  registerTask(taskId: string, role: string, title?: string): TeamTaskRecord {
    const now = new Date().toISOString()
    const task: TeamTaskRecord = { taskId, role, title, status: 'todo', updatedAt: now }
    this.tasks.set(taskId, task)
    this.emit('task:registered', task)
    return task
  }

  claimTask(taskId: string): TeamTaskRecord {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new SpectralError(`Task ${taskId} not found`, { code: 'NOT_FOUND', details: { taskId } })
    }
    if (task.status === 'done') {
      throw new SpectralError(`Task ${taskId} is already done`, { code: 'INVALID_STATE', details: { taskId } })
    }

    const next = { ...task, status: 'in_progress' as const, updatedAt: new Date().toISOString() }
    this.tasks.set(taskId, next)
    this.emit('task:claimed', next)
    return next
  }

  completeTask(taskId: string, summary: string): TeamTaskRecord {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new SpectralError(`Task ${taskId} not found`, { code: 'NOT_FOUND', details: { taskId } })
    }

    const next = {
      ...task,
      status: 'done' as const,
      summary,
      updatedAt: new Date().toISOString(),
    }
    this.tasks.set(taskId, next)
    this.emit('task:completed', next)
    return next
  }

  reportBlocked(taskId: string, summary: string): TeamTaskRecord {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new SpectralError(`Task ${taskId} not found`, { code: 'NOT_FOUND', details: { taskId } })
    }

    const next = {
      ...task,
      status: 'blocked' as const,
      summary,
      updatedAt: new Date().toISOString(),
    }
    this.tasks.set(taskId, next)
    this.emit('task:blocked', next)
    return next
  }

  getTask(taskId: string): TeamTaskRecord | undefined {
    return this.tasks.get(taskId)
  }

  listTasks(): TeamTaskRecord[] {
    return Array.from(this.tasks.values())
  }

  cleanup(): void {
    this.tasks.clear()
  }
}
