import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { WorkflowPhase, WorkflowState } from '../../shared/types'
import type { DatabaseManager } from '../storage/Database'

const VALID_TRANSITIONS: Record<WorkflowPhase, WorkflowPhase[]> = {
  brainstorming:    ['confirming', 'planning', 'failed'],
  confirming:       ['planning', 'brainstorming', 'failed'],
  planning:         ['waiting_approval', 'failed'],
  waiting_approval: ['executing', 'planning', 'failed'],
  executing:        ['validating', 'failed'],
  validating:       ['delivering', 'failed'],
  delivering:       ['done', 'failed'],
  done:             [],
  failed:           [],
}

export class AutonomousWorkflowEngine extends EventEmitter {
  private cache = new Map<string, WorkflowState>()

  constructor(private database: DatabaseManager) {
    super()
  }

  async initWorkflow(sessionId: string, goal: string): Promise<WorkflowState> {
    const now = new Date().toISOString()
    const w: WorkflowState = {
      workflowId: randomUUID(),
      sessionId,
      goal,
      phase: 'brainstorming',
      approved: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    }
    this.database.createWorkflow(w)
    this.cache.set(w.workflowId, w)
    this.logEvent(w.workflowId, 'workflow_created', { goal })
    return w
  }

  async transition(workflowId: string, toPhase: WorkflowPhase, planContent?: string): Promise<void> {
    const current = this.cache.get(workflowId) ?? this.database.getWorkflow(workflowId)
    if (!current) throw new Error(`Workflow not found: ${workflowId}`)

    const allowed = VALID_TRANSITIONS[current.phase]
    if (!allowed.includes(toPhase)) {
      throw new Error(`Invalid transition: ${current.phase} → ${toPhase}`)
    }

    const success = this.database.updateWorkflowPhase(workflowId, toPhase, current.version, planContent)
    if (!success) throw new Error(`Optimistic lock failed for workflow ${workflowId}`)

    const updated: WorkflowState = {
      ...current,
      phase: toPhase,
      version: current.version + 1,
      planContent: planContent ?? current.planContent,
      updatedAt: new Date().toISOString(),
    }
    this.cache.set(workflowId, updated)
    this.logEvent(workflowId, 'phase_changed', { from: current.phase, to: toPhase })
    this.emit('phase-change', workflowId, toPhase)
  }

  async approve(workflowId: string): Promise<void> {
    await this.transition(workflowId, 'executing')
    this.database.setWorkflowApproved(workflowId, true)
    const cached = this.cache.get(workflowId)
    if (cached) this.cache.set(workflowId, { ...cached, approved: true })
  }

  async reject(workflowId: string): Promise<void> {
    await this.transition(workflowId, 'planning')
  }

  getWorkflow(workflowId: string): WorkflowState | undefined {
    return this.cache.get(workflowId) ?? this.database.getWorkflow(workflowId)
  }

  getWorkflowsBySession(sessionId: string): WorkflowState[] {
    return this.database.getWorkflowsBySession(sessionId)
  }

  private logEvent(workflowId: string, type: string, payload?: any): void {
    try {
      this.database.addWorkflowEvent({
        eventId: randomUUID(),
        workflowId,
        type,
        payload: payload ? JSON.stringify(payload) : undefined,
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('[AutonomousWorkflowEngine] logEvent error:', err)
    }
  }
}

// 单例
let _instance: AutonomousWorkflowEngine | null = null

export function initAutonomousWorkflowEngine(database: DatabaseManager): AutonomousWorkflowEngine {
  _instance = new AutonomousWorkflowEngine(database)
  return _instance
}

export function getAutonomousWorkflowEngine(): AutonomousWorkflowEngine {
  if (!_instance) throw new Error('AutonomousWorkflowEngine not initialized')
  return _instance
}
