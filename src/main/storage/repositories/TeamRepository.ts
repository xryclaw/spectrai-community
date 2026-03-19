/**
 * TeamRepository - 团队 Agent CRUD
 */
import type {
  TeamTemplate,
  TeamTemplateMember,
  TeamInstance,
  TeamInstanceMember,
  TeamMessage,
} from '../../../shared/types'

export class TeamRepository {
  constructor(private db: any, private usingSqlite: boolean) {}

  // ─── Templates ───

  createTemplate(template: TeamTemplate): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`
        INSERT INTO team_templates (id, name, description, members, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(template.id, template.name, template.description, JSON.stringify(template.members), template.createdAt, template.updatedAt)
    } catch (err) {
      console.warn('[TeamRepository] createTemplate error:', err)
    }
  }

  updateTemplate(id: string, updates: Partial<TeamTemplate>): void {
    if (!this.usingSqlite) return
    try {
      const sets: string[] = []
      const vals: any[] = []
      if (updates.name !== undefined) { sets.push('name = ?'); vals.push(updates.name) }
      if (updates.description !== undefined) { sets.push('description = ?'); vals.push(updates.description) }
      if (updates.members !== undefined) { sets.push('members = ?'); vals.push(JSON.stringify(updates.members)) }
      sets.push('updated_at = ?'); vals.push(new Date().toISOString())
      vals.push(id)
      this.db.prepare(`UPDATE team_templates SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    } catch (err) {
      console.warn('[TeamRepository] updateTemplate error:', err)
    }
  }

  deleteTemplate(id: string): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare('DELETE FROM team_templates WHERE id = ?').run(id)
    } catch (err) {
      console.warn('[TeamRepository] deleteTemplate error:', err)
    }
  }

  getTemplate(id: string): TeamTemplate | undefined {
    if (!this.usingSqlite) return undefined
    try {
      const row = this.db.prepare('SELECT * FROM team_templates WHERE id = ?').get(id) as any
      return row ? this.mapTemplate(row) : undefined
    } catch (err) {
      console.warn('[TeamRepository] getTemplate error:', err)
      return undefined
    }
  }

  getAllTemplates(): TeamTemplate[] {
    if (!this.usingSqlite) return []
    try {
      const rows = this.db.prepare('SELECT * FROM team_templates ORDER BY created_at DESC').all() as any[]
      return rows.map(this.mapTemplate)
    } catch (err) {
      console.warn('[TeamRepository] getAllTemplates error:', err)
      return []
    }
  }

  // ─── Instances ───

  createInstance(instance: TeamInstance): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`
        INSERT INTO team_instances (id, template_id, name, working_directory, status, created_at, updated_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(instance.id, instance.templateId, instance.name, instance.workingDirectory, instance.status, instance.createdAt, instance.updatedAt, instance.completedAt ?? null)
    } catch (err) {
      console.warn('[TeamRepository] createInstance error:', err)
    }
  }

  updateInstance(id: string, updates: Partial<TeamInstance>): void {
    if (!this.usingSqlite) return
    try {
      const sets: string[] = []
      const vals: any[] = []
      if (updates.name !== undefined) { sets.push('name = ?'); vals.push(updates.name) }
      if (updates.status !== undefined) { sets.push('status = ?'); vals.push(updates.status) }
      if (updates.completedAt !== undefined) { sets.push('completed_at = ?'); vals.push(updates.completedAt) }
      sets.push('updated_at = ?'); vals.push(new Date().toISOString())
      vals.push(id)
      this.db.prepare(`UPDATE team_instances SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    } catch (err) {
      console.warn('[TeamRepository] updateInstance error:', err)
    }
  }

  deleteInstance(id: string): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare('DELETE FROM team_instances WHERE id = ?').run(id)
    } catch (err) {
      console.warn('[TeamRepository] deleteInstance error:', err)
    }
  }

  getInstance(id: string): TeamInstance | undefined {
    if (!this.usingSqlite) return undefined
    try {
      const row = this.db.prepare('SELECT * FROM team_instances WHERE id = ?').get(id) as any
      if (!row) return undefined
      const members = this.getMembersByInstance(id)
      return this.mapInstance(row, members)
    } catch (err) {
      console.warn('[TeamRepository] getInstance error:', err)
      return undefined
    }
  }

  getAllInstances(): TeamInstance[] {
    if (!this.usingSqlite) return []
    try {
      const rows = this.db.prepare('SELECT * FROM team_instances ORDER BY created_at DESC').all() as any[]
      return rows.map((row: any) => {
        const members = this.getMembersByInstance(row.id)
        return this.mapInstance(row, members)
      })
    } catch (err) {
      console.warn('[TeamRepository] getAllInstances error:', err)
      return []
    }
  }

  // ─── Members ───

  upsertMember(member: TeamInstanceMember): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO team_instance_members (id, team_instance_id, role, name, system_prompt, provider_id, mode, status, agent_id, session_id, current_task, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(member.id, member.teamInstanceId, member.role, member.name, member.systemPrompt, member.providerId, member.mode, member.status, member.agentId ?? null, member.sessionId ?? null, member.currentTask ?? null, member.updatedAt)
    } catch (err) {
      console.warn('[TeamRepository] upsertMember error:', err)
    }
  }

  updateMember(memberId: string, updates: Partial<TeamInstanceMember>): void {
    if (!this.usingSqlite) return
    try {
      const sets: string[] = []
      const vals: any[] = []
      if (updates.status !== undefined) { sets.push('status = ?'); vals.push(updates.status) }
      if (updates.agentId !== undefined) { sets.push('agent_id = ?'); vals.push(updates.agentId) }
      if (updates.sessionId !== undefined) { sets.push('session_id = ?'); vals.push(updates.sessionId) }
      if (updates.currentTask !== undefined) { sets.push('current_task = ?'); vals.push(updates.currentTask) }
      if (updates.systemPrompt !== undefined) { sets.push('system_prompt = ?'); vals.push(updates.systemPrompt) }
      if (updates.providerId !== undefined) { sets.push('provider_id = ?'); vals.push(updates.providerId) }
      if (updates.mode !== undefined) { sets.push('mode = ?'); vals.push(updates.mode) }
      if (sets.length === 0) return
      sets.push('updated_at = ?'); vals.push(new Date().toISOString())
      vals.push(memberId)
      this.db.prepare(`UPDATE team_instance_members SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    } catch (err) {
      console.warn('[TeamRepository] updateMember error:', err)
    }
  }

  updateMemberStatus(memberId: string, status: string, currentTask?: string): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`UPDATE team_instance_members SET status = ?, current_task = ?, updated_at = ? WHERE id = ?`)
        .run(status, currentTask ?? null, new Date().toISOString(), memberId)
    } catch (err) {
      console.warn('[TeamRepository] updateMemberStatus error:', err)
    }
  }

  getMembersByInstance(instanceId: string): TeamInstanceMember[] {
    if (!this.usingSqlite) return []
    try {
      const rows = this.db.prepare('SELECT * FROM team_instance_members WHERE team_instance_id = ?').all(instanceId) as any[]
      return rows.map(this.mapMember)
    } catch (err) {
      console.warn('[TeamRepository] getMembersByInstance error:', err)
      return []
    }
  }

  // ─── Messages ───

  addMessage(msg: TeamMessage): void {
    if (!this.usingSqlite) return
    try {
      this.db.prepare(`
        INSERT INTO team_messages (id, team_instance_id, role, member_name, member_role, content, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(msg.id, msg.teamInstanceId, msg.role, msg.memberName ?? null, msg.memberRole ?? null, msg.content, msg.timestamp)
    } catch (err) {
      console.warn('[TeamRepository] addMessage error:', err)
    }
  }

  getMessages(instanceId: string, limit?: number): TeamMessage[] {
    if (!this.usingSqlite) return []
    try {
      const sql = limit
        ? 'SELECT * FROM team_messages WHERE team_instance_id = ? ORDER BY timestamp ASC LIMIT ?'
        : 'SELECT * FROM team_messages WHERE team_instance_id = ? ORDER BY timestamp ASC'
      const rows = limit
        ? this.db.prepare(sql).all(instanceId, limit) as any[]
        : this.db.prepare(sql).all(instanceId) as any[]
      return rows.map(this.mapMessage)
    } catch (err) {
      console.warn('[TeamRepository] getMessages error:', err)
      return []
    }
  }

  // ─── Mappers ───

  private mapTemplate(row: any): TeamTemplate {
    let members: TeamTemplateMember[] = []
    try { members = JSON.parse(row.members || '[]') } catch { /* ignore */ }
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      members,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapInstance(row: any, members: TeamInstanceMember[]): TeamInstance {
    return {
      id: row.id,
      templateId: row.template_id,
      name: row.name,
      workingDirectory: row.working_directory,
      status: row.status,
      members,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at ?? undefined,
    }
  }

  private mapMember(row: any): TeamInstanceMember {
    return {
      id: row.id,
      teamInstanceId: row.team_instance_id,
      role: row.role,
      name: row.name,
      systemPrompt: row.system_prompt ?? '',
      providerId: row.provider_id,
      mode: row.mode,
      status: row.status,
      agentId: row.agent_id ?? undefined,
      sessionId: row.session_id ?? undefined,
      currentTask: row.current_task ?? undefined,
      updatedAt: row.updated_at,
    }
  }

  private mapMessage(row: any): TeamMessage {
    return {
      id: row.id,
      teamInstanceId: row.team_instance_id,
      role: row.role,
      memberName: row.member_name ?? undefined,
      memberRole: row.member_role ?? undefined,
      content: row.content,
      timestamp: row.timestamp,
    }
  }
}
