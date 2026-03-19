import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { IPC } from '../../shared/constants'
import type { IpcDependencies } from './index'
import { sendToRenderer } from './shared'

export function registerTeamHandlers(deps: IpcDependencies): void {
  const { database, teamOrchestrator } = deps

  // Template CRUD
  ipcMain.handle(IPC.TEAM_TEMPLATE_CREATE, async (_event, data) => {
    try {
      const now = new Date().toISOString()
      const template = { id: uuidv4(), createdAt: now, updatedAt: now, ...data }
      database.createTeamTemplate(template)
      return template
    } catch (error: any) {
      throw new Error(`Failed to create template: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_TEMPLATE_UPDATE, async (_event, id, updates) => {
    try {
      return database.updateTeamTemplate(id, updates)
    } catch (error: any) {
      throw new Error(`Failed to update template: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_TEMPLATE_DELETE, async (_event, id) => {
    try {
      database.deleteTeamTemplate(id)
    } catch (error: any) {
      throw new Error(`Failed to delete template: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_TEMPLATE_GET, async (_event, id) => {
    try {
      return database.getTeamTemplate(id)
    } catch (error: any) {
      throw new Error(`Failed to get template: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_TEMPLATE_GET_ALL, async () => {
    try {
      return database.getAllTeamTemplates()
    } catch (error: any) {
      throw new Error(`Failed to get templates: ${error.message}`)
    }
  })

  // Instance lifecycle
  ipcMain.handle(IPC.TEAM_INSTANCE_CREATE, async (_event, data) => {
    try {
      const now = new Date().toISOString()
      const instanceId = uuidv4()
      // Load template to get members
      const template = database.getTeamTemplate(data.templateId)
      const instance = {
        id: instanceId,
        templateId: data.templateId,
        name: data.name,
        workingDirectory: data.workingDirectory,
        status: 'idle' as const,
        members: [] as any[],
        createdAt: now,
        updatedAt: now,
      }
      database.createTeamInstance(instance)
      // Create members from template
      if (template) {
        for (const tm of template.members) {
          const member = {
            id: uuidv4(),
            teamInstanceId: instanceId,
            role: tm.role,
            name: tm.name,
            systemPrompt: tm.systemPrompt || '',
            providerId: tm.providerId || 'claude-code',
            mode: tm.mode || 'member',
            status: 'idle' as const,
            updatedAt: now,
          }
          database.upsertTeamMember(member)
        }
      }
      return database.getTeamInstance(instanceId)
    } catch (error: any) {
      throw new Error(`Failed to create instance: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_INSTANCE_START, async (_event, instanceId) => {
    try {
      if (!teamOrchestrator) throw new Error('TeamOrchestrator not initialized')
      await teamOrchestrator.startTeam(instanceId)
    } catch (error: any) {
      throw new Error(`Failed to start team: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_INSTANCE_STOP, async (_event, instanceId) => {
    try {
      if (!teamOrchestrator) throw new Error('TeamOrchestrator not initialized')
      await teamOrchestrator.stopTeam(instanceId)
    } catch (error: any) {
      throw new Error(`Failed to stop team: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_INSTANCE_PAUSE, async (_event, instanceId) => {
    try {
      if (!teamOrchestrator) throw new Error('TeamOrchestrator not initialized')
      await teamOrchestrator.pauseTeam(instanceId)
    } catch (error: any) {
      throw new Error(`Failed to pause team: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_INSTANCE_DELETE, async (_event, instanceId) => {
    try {
      database.deleteTeamInstance(instanceId)
    } catch (error: any) {
      throw new Error(`Failed to delete instance: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_INSTANCE_GET, async (_event, instanceId) => {
    try {
      return database.getTeamInstance(instanceId)
    } catch (error: any) {
      throw new Error(`Failed to get instance: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_INSTANCE_GET_ALL, async () => {
    try {
      return database.getAllTeamInstances()
    } catch (error: any) {
      throw new Error(`Failed to get instances: ${error.message}`)
    }
  })

  // Member management
  ipcMain.handle(IPC.TEAM_MEMBER_UPDATE, async (_event, memberId, updates) => {
    try {
      if (!teamOrchestrator) throw new Error('TeamOrchestrator not initialized')
      await teamOrchestrator.updateMember(memberId, updates)
    } catch (error: any) {
      throw new Error(`Failed to update member: ${error.message}`)
    }
  })

  // Messaging
  ipcMain.handle(IPC.TEAM_SEND_MESSAGE, async (_event, instanceId, text) => {
    try {
      if (!teamOrchestrator) throw new Error('TeamOrchestrator not initialized')
      await teamOrchestrator.sendTeamMessage(instanceId, text)
    } catch (error: any) {
      throw new Error(`Failed to send message: ${error.message}`)
    }
  })

  ipcMain.handle(IPC.TEAM_GET_MESSAGES, async (_event, instanceId) => {
    try {
      return database.getTeamMessages(instanceId)
    } catch (error: any) {
      throw new Error(`Failed to get messages: ${error.message}`)
    }
  })

  // Wire push events
  if (teamOrchestrator) {
    teamOrchestrator.on('team:status-change', (instanceId, status) => {
      sendToRenderer(IPC.TEAM_STATUS_CHANGE, instanceId, status)
    })

    teamOrchestrator.on('team:member-status-change', (instanceId, memberId, status) => {
      sendToRenderer(IPC.TEAM_MEMBER_STATUS_CHANGE, instanceId, memberId, status)
    })

    teamOrchestrator.on('team:message', (instanceId, message) => {
      sendToRenderer(IPC.TEAM_MESSAGE, instanceId, message)
    })
  }
}
