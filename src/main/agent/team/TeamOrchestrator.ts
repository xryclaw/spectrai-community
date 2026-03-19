import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import type { AgentManagerV2 } from '../AgentManagerV2'
import type { DatabaseManager } from '../../storage/Database'
import type { TeamInstance, TeamInstanceMember, TeamMessage } from '../../../shared/types'
import { TeamManager } from './TeamManager'

export class TeamOrchestrator extends EventEmitter {
  private activeTeams = new Map<string, { instance: TeamInstance; taskManager: TeamManager }>()

  constructor(
    private agentManager: AgentManagerV2,
    private database: DatabaseManager,
  ) {
    super()
    this.listenAgentEvents()
  }

  async startTeam(instanceId: string): Promise<void> {
    const instance = this.database.getTeamInstance(instanceId)
    if (!instance) throw new Error(`Team instance ${instanceId} not found`)

    const members = this.database.getTeamMembersByInstance(instanceId)
    const taskManager = new TeamManager()
    this.activeTeams.set(instanceId, { instance, taskManager })

    const parentSessionId = `team-${instanceId}`
    const teamContext = this.buildTeamContext(instance, members)

    for (const member of members) {
      const systemPrompt = member.mode === 'supervisor'
        ? this.getLeaderSystemPrompt(instance, members)
        : member.systemPrompt + '\n\n' + teamContext

      const agentInfo = this.agentManager.spawnAgent(parentSessionId, {
        name: `[Team:${instance.name}] ${member.name}`,
        prompt: systemPrompt,
        providerId: member.providerId,
        oneShot: false,
        sessionMode: member.mode,
        workDir: instance.workingDirectory,
      })

      this.database.updateTeamMember(member.id, {
        agentId: agentInfo.agentId,
        sessionId: agentInfo.childSessionId,
        status: 'idle',
      })
    }

    this.database.updateTeamInstance(instanceId, { status: 'running' })
    this.emit('team:status-change', instanceId, 'running')
  }

  async stopTeam(instanceId: string): Promise<void> {
    const team = this.activeTeams.get(instanceId)
    if (!team) return

    const members = this.database.getTeamMembersByInstance(instanceId)
    for (const member of members) {
      if (member.agentId) {
        this.agentManager.cancelAgent(member.agentId)
      }
    }

    this.database.updateTeamInstance(instanceId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
    this.activeTeams.delete(instanceId)
    this.emit('team:status-change', instanceId, 'completed')
  }

  async pauseTeam(instanceId: string): Promise<void> {
    this.database.updateTeamInstance(instanceId, { status: 'paused' })
    this.emit('team:status-change', instanceId, 'paused')
  }

  async sendTeamMessage(instanceId: string, text: string): Promise<void> {
    const message: TeamMessage = {
      id: uuidv4(),
      teamInstanceId: instanceId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    this.database.addTeamMessage(message)

    const members = this.database.getTeamMembersByInstance(instanceId)
    const leader = members.find(m => m.mode === 'supervisor')
    if (leader?.agentId) {
      this.agentManager.sendToAgent(leader.agentId, text)
    }

    this.emit('team:message', instanceId, message)
  }

  async updateMember(memberId: string, updates: Partial<TeamInstanceMember>): Promise<void> {
    this.database.updateTeamMember(memberId, updates)
  }

  private listenAgentEvents(): void {
    this.agentManager.on('agent:status-change', (agentId: string, status: string) => {
      for (const [instanceId, { instance }] of this.activeTeams) {
        const members = this.database.getTeamMembersByInstance(instanceId)
        const member = members.find(m => m.agentId === agentId)
        if (member) {
          const memberStatus = this.mapAgentStatusToMemberStatus(status)
          this.database.updateTeamMember(member.id, { status: memberStatus })
          this.emit('team:member-status-change', instanceId, member.id, memberStatus)
          break
        }
      }
    })
  }

  private getLeaderSystemPrompt(instance: TeamInstance, members: TeamInstanceMember[]): string {
    const memberList = members
      .map(m => `- ${m.name} (${m.role}): agentId=${m.agentId || 'pending'}`)
      .join('\n')

    return `You are the team leader for "${instance.name}".

Team Members:
${memberList}

Your responsibilities:
1. Use the send_to_agent MCP tool to delegate tasks to team members
2. Follow the workflow: analyze → architect → developer → reviewer → QA
3. Coordinate work and resolve blockers
4. Report progress to the user

Team Context:
${this.buildTeamContext(instance, members)}`
  }

  private buildTeamContext(instance: TeamInstance, members: TeamInstanceMember[]): string {
    return `Team: ${instance.name}
Working Directory: ${instance.workingDirectory}
Members: ${members.map(m => `${m.name} (${m.role})`).join(', ')}`
  }

  private mapAgentStatusToMemberStatus(agentStatus: string): TeamInstanceMember['status'] {
    switch (agentStatus) {
      case 'running': return 'working'
      case 'completed': return 'done'
      case 'failed': return 'error'
      case 'cancelled': return 'error'
      default: return 'idle'
    }
  }
}
