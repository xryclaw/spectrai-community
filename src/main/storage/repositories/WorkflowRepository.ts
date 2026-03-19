/**
 * WorkflowRepository - 自主任务工作流 CRUD
 */
import type { WorkflowState, WorkflowStep, WorkflowEvent } from '../../../shared/types'

export class WorkflowRepository {
  constructor(private db: any, private usingSqlite: boolean) {}

  createWorkflow(w: WorkflowState): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`
        INSERT INTO team_workflows (workflow_id, session_id, goal, phase, approved, plan_content, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(w.workflowId, w.sessionId, w.goal, w.phase, w.approved ? 1 : 0, w.planContent ?? null, w.version, w.createdAt, w.updatedAt)
    } catch (err) {
      console.warn('[WorkflowRepository] createWorkflow error:', err)
    }
  }

  updateWorkflowPhase(workflowId: string, phase: string, version: number, planContent?: string): boolean {
    if (!this.usingSqlite) return false
    try {
      const now = new Date().toISOString()
      const result = this.db.prepare(`
        UPDATE team_workflows
        SET phase = ?, version = ?, plan_content = COALESCE(?, plan_content), updated_at = ?
        WHERE workflow_id = ? AND version = ?
      `).run(phase, version + 1, planContent ?? null, now, workflowId, version)
      return result.changes > 0
    } catch (err) {
      console.warn('[WorkflowRepository] updateWorkflowPhase error:', err)
      return false
    }
  }

  setApproved(workflowId: string, approved: boolean): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`UPDATE team_workflows SET approved = ?, updated_at = ? WHERE workflow_id = ?`)
        .run(approved ? 1 : 0, new Date().toISOString(), workflowId)
    } catch (err) {
      console.warn('[WorkflowRepository] setApproved error:', err)
    }
  }

  getWorkflow(workflowId: string): WorkflowState | undefined {
    if (!this.usingSqlite) return undefined
    try {
      const row = this.db.prepare('SELECT * FROM team_workflows WHERE workflow_id = ?').get(workflowId) as any
      return row ? this.mapWorkflow(row) : undefined
    } catch (err) {
      console.warn('[WorkflowRepository] getWorkflow error:', err)
      return undefined
    }
  }

  getWorkflowsBySession(sessionId: string): WorkflowState[] {
    if (!this.usingSqlite) return []
    try {
      const rows = this.db.prepare('SELECT * FROM team_workflows WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as any[]
      return rows.map(this.mapWorkflow)
    } catch (err) {
      console.warn('[WorkflowRepository] getWorkflowsBySession error:', err)
      return []
    }
  }

  // ---- Steps ----

  upsertStep(step: WorkflowStep): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO team_workflow_steps (step_id, workflow_id, title, owner_role, status, depends_on, evidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(step.stepId, step.workflowId, step.title, step.ownerRole ?? null, step.status, step.dependsOn ?? null, step.evidence ?? null, step.createdAt, step.updatedAt)
    } catch (err) {
      console.warn('[WorkflowRepository] upsertStep error:', err)
    }
  }

  updateStepStatus(stepId: string, status: string, evidence?: string): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`UPDATE team_workflow_steps SET status = ?, evidence = COALESCE(?, evidence), updated_at = ? WHERE step_id = ?`)
        .run(status, evidence ?? null, new Date().toISOString(), stepId)
    } catch (err) {
      console.warn('[WorkflowRepository] updateStepStatus error:', err)
    }
  }

  getSteps(workflowId: string): WorkflowStep[] {
    if (!this.usingSqlite) return []
    try {
      const rows = this.db.prepare('SELECT * FROM team_workflow_steps WHERE workflow_id = ? ORDER BY created_at ASC').all(workflowId) as any[]
      return rows.map(this.mapStep)
    } catch (err) {
      console.warn('[WorkflowRepository] getSteps error:', err)
      return []
    }
  }

  // ---- Events ----

  addEvent(event: WorkflowEvent): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`
        INSERT INTO team_workflow_events (event_id, workflow_id, type, payload, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(event.eventId, event.workflowId, event.type, event.payload ?? null, event.createdAt)
    } catch (err) {
      console.warn('[WorkflowRepository] addEvent error:', err)
    }
  }

  getEvents(workflowId: string): WorkflowEvent[] {
    if (!this.usingSqlite) return []
    try {
      const rows = this.db.prepare('SELECT * FROM team_workflow_events WHERE workflow_id = ? ORDER BY created_at ASC').all(workflowId) as any[]
      return rows.map((r: any) => ({ eventId: r.event_id, workflowId: r.workflow_id, type: r.type, payload: r.payload ?? undefined, createdAt: r.created_at }))
    } catch (err) {
      console.warn('[WorkflowRepository] getEvents error:', err)
      return []
    }
  }

  // ---- Mappers ----

  private mapWorkflow(row: any): WorkflowState {
    return {
      workflowId: row.workflow_id,
      sessionId: row.session_id,
      goal: row.goal,
      phase: row.phase,
      approved: row.approved === 1,
      planContent: row.plan_content ?? undefined,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapStep(row: any): WorkflowStep {
    return {
      stepId: row.step_id,
      workflowId: row.workflow_id,
      title: row.title,
      ownerRole: row.owner_role ?? undefined,
      status: row.status,
      dependsOn: row.depends_on ?? undefined,
      evidence: row.evidence ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
