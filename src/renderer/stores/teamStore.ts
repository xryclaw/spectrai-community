/**
 * Team Agent 状态管理 Store
 */

import { create } from 'zustand'
import type { TeamTemplate, TeamInstance, TeamInstanceMember, TeamMessage } from '../../shared/types'

let _listenerUnsubs: Array<() => void> = []

interface TeamState {
  templates: TeamTemplate[]
  instances: TeamInstance[]
  selectedInstanceId: string | null
  messages: Record<string, TeamMessage[]>

  /** sessionId → teamInstanceId 映射，用于判断某个 session 是否属于团队 */
  sessionTeamMap: Record<string, string>
  /** 当前选中的团队成员 ID（用于查看单个角色对话） */
  selectedMemberId: string | null

  fetchTemplates: () => Promise<void>
  createTemplate: (data: Partial<TeamTemplate>) => Promise<void>
  updateTemplate: (id: string, updates: Partial<TeamTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>

  fetchInstances: () => Promise<void>
  createInstance: (data: { templateId: string; name: string; workingDirectory: string }) => Promise<any>
  startInstance: (id: string) => Promise<void>
  stopInstance: (id: string) => Promise<void>
  pauseInstance: (id: string) => Promise<void>
  deleteInstance: (id: string) => Promise<void>
  selectInstance: (id: string | null) => void

  sendMessage: (instanceId: string, text: string) => Promise<void>
  fetchMessages: (instanceId: string) => Promise<void>

  updateMember: (memberId: string, updates: Partial<TeamInstanceMember>) => Promise<void>
  selectMember: (id: string | null) => void

  /** 根据 sessionId 查找关联的团队实例 */
  getTeamForSession: (sessionId: string) => TeamInstance | null

  initListeners: () => void
  cleanupListeners: () => void
}

/** 从 instances 构建 sessionId → teamInstanceId 映射 */
function buildSessionTeamMap(instances: TeamInstance[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const inst of instances) {
    if (!inst.members) continue
    for (const m of inst.members) {
      if (m.sessionId) {
        map[m.sessionId] = inst.id
      }
    }
  }
  return map
}

export const useTeamStore = create<TeamState>((set, get) => ({
  templates: [],
  instances: [],
  selectedInstanceId: null,
  messages: {},
  sessionTeamMap: {},
  selectedMemberId: null,

  fetchTemplates: async () => {
    const templates = await window.spectrAI.team.getAllTemplates()
    set({ templates })
  },

  createTemplate: async (data) => {
    await window.spectrAI.team.createTemplate(data)
    await get().fetchTemplates()
  },

  updateTemplate: async (id, updates) => {
    await window.spectrAI.team.updateTemplate(id, updates)
    await get().fetchTemplates()
  },

  deleteTemplate: async (id) => {
    await window.spectrAI.team.deleteTemplate(id)
    await get().fetchTemplates()
  },

  fetchInstances: async () => {
    const instances = await window.spectrAI.team.getAllInstances()
    set({ instances, sessionTeamMap: buildSessionTeamMap(instances) })
  },

  createInstance: async (data) => {
    const result = await window.spectrAI.team.createInstance(data)
    await get().fetchInstances()
    return result
  },

  startInstance: async (id) => {
    await window.spectrAI.team.startInstance(id)
    await get().fetchInstances()
  },

  stopInstance: async (id) => {
    await window.spectrAI.team.stopInstance(id)
    await get().fetchInstances()
  },

  pauseInstance: async (id) => {
    await window.spectrAI.team.pauseInstance(id)
    await get().fetchInstances()
  },

  deleteInstance: async (id) => {
    await window.spectrAI.team.deleteInstance(id)
    set((state) => {
      const instances = state.instances.filter(i => i.id !== id)
      return {
        instances,
        sessionTeamMap: buildSessionTeamMap(instances),
        selectedInstanceId: state.selectedInstanceId === id ? null : state.selectedInstanceId,
      }
    })
  },

  selectInstance: (id) => set({ selectedInstanceId: id }),

  sendMessage: async (instanceId, text) => {
    await window.spectrAI.team.sendMessage(instanceId, text)
  },

  fetchMessages: async (instanceId) => {
    const msgs = await window.spectrAI.team.getMessages(instanceId)
    set((state) => ({ messages: { ...state.messages, [instanceId]: msgs } }))
  },

  updateMember: async (memberId, updates) => {
    await window.spectrAI.team.updateMember(memberId, updates)
    const selectedId = get().selectedInstanceId
    if (selectedId) await get().fetchInstances()
  },

  selectMember: (id) => set({ selectedMemberId: id }),

  getTeamForSession: (sessionId) => {
    const { sessionTeamMap, instances } = get()
    const teamId = sessionTeamMap[sessionId]
    if (!teamId) return null
    return instances.find(i => i.id === teamId) ?? null
  },

  initListeners: () => {
    _listenerUnsubs.forEach(fn => fn())
    _listenerUnsubs = []

    _listenerUnsubs.push(
      window.spectrAI.team.onStatusChange((instanceId, status) => {
        set((state) => ({
          instances: state.instances.map(i =>
            i.id === instanceId ? { ...i, status: status as any } : i
          ),
        }))
      })
    )

    _listenerUnsubs.push(
      window.spectrAI.team.onMemberStatusChange((instanceId, memberId, status) => {
        set((state) => {
          const instances = state.instances.map(i => {
            if (i.id !== instanceId) return i
            return {
              ...i,
              members: (i.members || []).map(m =>
                m.id === memberId ? { ...m, status: status as any } : m
              ),
            }
          })
          return { instances, sessionTeamMap: buildSessionTeamMap(instances) }
        })
      })
    )

    _listenerUnsubs.push(
      window.spectrAI.team.onMessage((instanceId, msg) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [instanceId]: [...(state.messages[instanceId] || []), msg],
          },
        }))
      })
    )
  },

  cleanupListeners: () => {
    _listenerUnsubs.forEach(fn => fn())
    _listenerUnsubs = []
  },
}))
