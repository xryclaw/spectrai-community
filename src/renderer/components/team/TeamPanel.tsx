import React, { useEffect, useState } from 'react'
import { AlertCircle, Plus, Play, Edit3, Trash2, Users, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { useTeamStore } from '../../stores/teamStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useUIStore } from '../../stores/uiStore'
import { TeamTemplateModal } from './TeamTemplateModal'
import { TeamLaunchDialog } from './TeamLaunchDialog'
import type { TeamTemplate, TeamInstanceStatus } from '../../../shared/types'

const INSTANCE_STATUS_COLORS: Record<TeamInstanceStatus, string> = {
  running: '#3FB950',
  idle: '#8B949E',
  paused: '#D29922',
  failed: '#F85149',
  completed: '#58A6FF'
}

const INSTANCE_STATUS_LABELS: Record<TeamInstanceStatus, string> = {
  running: '运行中',
  idle: '空闲',
  paused: '已暂停',
  failed: '失败',
  completed: '已完成'
}

export function TeamPanel() {
  const {
    templates,
    instances,
    fetchTemplates,
    fetchInstances,
    deleteTemplate,
    deleteInstance,
    initListeners,
    cleanupListeners
  } = useTeamStore()

  const selectSession = useSessionStore((s) => s.selectSession)
  const setActivePanelLeft = useUIStore((s) => s.setActivePanelLeft)

  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TeamTemplate | undefined>()
  const [launchTemplate, setLaunchTemplate] = useState<TeamTemplate | null>(null)
  const [templatesExpanded, setTemplatesExpanded] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = async () => {
    setLoadError(null)
    try {
      await Promise.all([fetchTemplates(), fetchInstances()])
    } catch {
      setLoadError('团队数据加载失败')
    }
  }

  useEffect(() => {
    void loadData()
    initListeners()
    return () => cleanupListeners()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEditTemplate = (t: TeamTemplate) => {
    setEditingTemplate(t)
    setShowTemplateModal(true)
  }

  const handleCloseTemplateModal = () => {
    setShowTemplateModal(false)
    setEditingTemplate(undefined)
  }

  /** 跳转到团队实例对应的 session */
  const handleJumpToInstance = (instanceId: string) => {
    const inst = instances.find(i => i.id === instanceId)
    if (!inst?.members) return
    // 找到 leader 或第一个有 sessionId 的成员
    const leader = inst.members.find(m => m.role === 'leader' && m.sessionId)
      || inst.members.find(m => m.sessionId)
    if (leader?.sessionId) {
      selectSession(leader.sessionId)
      setActivePanelLeft('sessions')
      // 切换到 tabs 视图
      const { viewMode, setViewMode } = useUIStore.getState()
      if (viewMode !== 'tabs') setViewMode('tabs')
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-r border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-text-secondary" />
          <span className="text-text-primary text-sm font-medium">团队</span>
        </div>
        <button
          onClick={() => { setEditingTemplate(undefined); setShowTemplateModal(true) }}
          className="flex items-center gap-1 text-accent-blue text-xs hover:text-accent-blue/80 btn-transition"
        >
          <Plus size={14} /> 新建模板
        </button>
      </div>

      {loadError && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-accent-red/30 bg-accent-red/10 flex items-center justify-between gap-2">
          <span className="text-accent-red text-xs flex items-center gap-1.5">
            <AlertCircle size={14} />
            {loadError}
          </span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-hover btn-transition"
          >
            重新加载
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <h4 className="text-text-muted text-xs uppercase tracking-wide mb-2">运行中的团队</h4>
          {instances.length === 0 ? (
            <p className="text-text-muted text-xs py-2">暂无运行中的团队，请从模板启动一个团队</p>
          ) : (
            <div className="space-y-1">
              {instances.map((inst) => (
                <div
                  key={inst.id}
                  onClick={() => handleJumpToInstance(inst.id)}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer btn-transition hover:bg-bg-hover border border-transparent"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: INSTANCE_STATUS_COLORS[inst.status] }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-text-primary text-sm truncate block">{inst.name}</span>
                    <span className="text-text-muted text-[11px]">
                      {INSTANCE_STATUS_LABELS[inst.status]} · {inst.members.length} 成员
                    </span>
                  </div>
                  <ExternalLink size={12} className="text-text-muted opacity-0 group-hover:opacity-100 btn-transition" />
                  <button
                    onClick={(e) => { e.stopPropagation(); void deleteInstance(inst.id) }}
                    className="text-text-muted hover:text-red-400 btn-transition p-1 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setTemplatesExpanded(!templatesExpanded)}
              className="flex items-center gap-1 text-text-muted text-xs uppercase tracking-wide hover:text-text-secondary btn-transition"
            >
              {templatesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              模板
            </button>
            <button
              onClick={() => { setEditingTemplate(undefined); setShowTemplateModal(true) }}
              className="text-text-muted text-xs hover:text-accent-blue btn-transition"
            >
              创建模板
            </button>
          </div>

          {templatesExpanded && (
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-text-muted text-xs py-2">暂无模板，点击“创建模板”开始配置</p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="bg-bg-tertiary rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="text-text-primary text-sm font-medium block truncate">{t.name}</span>
                        {t.description && (
                          <span className="text-text-muted text-xs block mt-0.5 truncate">{t.description}</span>
                        )}
                        <span className="text-text-muted text-[11px] mt-1 block">{t.members.length} 成员</span>
                      </div>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <button
                          onClick={() => setLaunchTemplate(t)}
                          className="text-accent-blue hover:text-accent-blue/80 btn-transition p-1"
                          title="启动"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => handleEditTemplate(t)}
                          className="text-text-muted hover:text-text-primary btn-transition p-1"
                          title="编辑"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => void deleteTemplate(t.id)}
                          className="text-text-muted hover:text-red-400 btn-transition p-1"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showTemplateModal && (
        <TeamTemplateModal
          isOpen={true}
          onClose={handleCloseTemplateModal}
          template={editingTemplate}
        />
      )}

      {launchTemplate && (
        <TeamLaunchDialog
          isOpen={true}
          onClose={() => setLaunchTemplate(null)}
          template={launchTemplate}
        />
      )}
    </div>
  )
}
