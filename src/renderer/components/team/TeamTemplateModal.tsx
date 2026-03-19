import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useTeamStore } from '../../stores/teamStore'
import type { TeamTemplate, TeamTemplateMember, TeamRole, AIProvider } from '../../../shared/types'

const ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: 'leader', label: '负责人' },
  { value: 'architect', label: '架构师' },
  { value: 'developer', label: '开发工程师' },
  { value: 'reviewer', label: '代码审核员' },
  { value: 'qa', label: '测试工程师' },
  { value: 'custom', label: '自定义' }
]

const DEFAULT_PROMPTS: Record<string, string> = {
  leader: '你是团队负责人，负责分析任务、分配工作给团队成员、跟踪进度。使用 send_to_agent 工具向成员分派任务。',
  architect: '你是架构师，负责分析需求、设计技术方案、定义模块划分和接口。',
  developer: '你是开发工程师，负责根据架构方案实现代码。注重代码质量和可维护性。',
  reviewer: '你是代码审核员，负责审查代码是否满足需求、是否有潜在问题。',
  qa: '你是测试工程师，负责编写和运行测试，确保功能正确性和回归测试。'
}

const DEFAULT_MEMBERS: TeamTemplateMember[] = [
  { role: 'leader', name: 'Leader', systemPrompt: DEFAULT_PROMPTS.leader, providerId: 'claude-code', mode: 'supervisor' },
  { role: 'architect', name: 'Architect', systemPrompt: DEFAULT_PROMPTS.architect, providerId: 'claude-code', mode: 'member' },
  { role: 'developer', name: 'Developer', systemPrompt: DEFAULT_PROMPTS.developer, providerId: 'claude-code', mode: 'member' },
  { role: 'reviewer', name: 'Reviewer', systemPrompt: DEFAULT_PROMPTS.reviewer, providerId: 'claude-code', mode: 'member' },
  { role: 'qa', name: 'QA', systemPrompt: DEFAULT_PROMPTS.qa, providerId: 'claude-code', mode: 'member' }
]

export function TeamTemplateModal({
  isOpen,
  onClose,
  template
}: {
  isOpen: boolean
  onClose: () => void
  template?: TeamTemplate
}) {
  const { createTemplate, updateTemplate } = useTeamStore()
  const isEdit = !!template

  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [members, setMembers] = useState<TeamTemplateMember[]>(
    template?.members?.length ? template.members : DEFAULT_MEMBERS
  )
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [providers, setProviders] = useState<AIProvider[]>([])

  useEffect(() => {
    window.spectrAI.provider.getAll().then(setProviders).catch(() => {})
  }, [])

  if (!isOpen) return null

  const updateMemberField = (idx: number, field: keyof TeamTemplateMember, value: string) => {
    setMembers((prev) => prev.map((m, i) => {
      if (i !== idx) return m
      const updated = { ...m, [field]: value }
      if (field === 'role' && DEFAULT_PROMPTS[value]) {
        updated.systemPrompt = DEFAULT_PROMPTS[value]
      }
      return updated
    }))
  }

  const toggleMode = (idx: number) => {
    setMembers((prev) => prev.map((m, i) =>
      i === idx ? { ...m, mode: m.mode === 'supervisor' ? 'member' : 'supervisor' } : m
    ))
  }

  const addMember = () => {
    setMembers((prev) => [...prev, {
      role: 'custom' as TeamRole,
      name: '',
      systemPrompt: '',
      providerId: providers[0]?.id || 'claude-code',
      mode: 'member' as const
    }])
  }

  const removeMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx))
    if (expandedIdx === idx) setExpandedIdx(null)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (isEdit && template) {
        await updateTemplate(template.id, { name, description, members })
      } else {
        await createTemplate({ name, description, members })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-bg-primary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-secondary">
        <h2 className="text-text-primary text-lg font-medium">
          {isEdit ? '编辑团队模板' : '创建团队模板'}
        </h2>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary btn-transition">
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 max-w-5xl mx-auto w-full">
        <div className="space-y-5">
          <div>
            <label className="block text-text-secondary text-sm mb-1">模板名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：全栈开发团队"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个团队模板的用途"
              rows={3}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-primary text-sm resize-y focus:outline-none focus:border-accent-blue"
            />
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-text-secondary text-sm">成员列表 ({members.length})</label>
              <button
                onClick={addMember}
                className="flex items-center gap-1 text-accent-blue text-sm hover:text-accent-blue/80 btn-transition"
              >
                <Plus size={14} /> 添加成员
              </button>
            </div>

            <div className="space-y-2">
              {members.map((member, idx) => (
                <div key={idx} className="bg-bg-tertiary border border-border rounded-lg">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                      className="text-text-muted hover:text-text-primary btn-transition"
                    >
                      {expandedIdx === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <select
                      value={member.role}
                      onChange={(e) => updateMemberField(idx, 'role', e.target.value)}
                      className="bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary text-sm focus:outline-none"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateMemberField(idx, 'name', e.target.value)}
                      placeholder="名称"
                      className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary text-sm focus:outline-none"
                    />

                    <select
                      value={member.providerId}
                      onChange={(e) => updateMemberField(idx, 'providerId', e.target.value)}
                      className="w-[140px] bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary text-sm focus:outline-none"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => toggleMode(idx)}
                      className={`px-2 py-1 rounded text-xs btn-transition ${
                        member.mode === 'supervisor'
                          ? 'bg-accent-blue/20 text-accent-blue'
                          : 'bg-bg-secondary text-text-secondary'
                      }`}
                    >
                      {member.mode === 'supervisor' ? '主管' : '成员'}
                    </button>

                    <button
                      onClick={() => removeMember(idx)}
                      className="text-text-muted hover:text-red-400 btn-transition p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {expandedIdx === idx && (
                    <div className="px-4 pb-3 pt-0">
                      <label className="block text-text-muted text-xs mb-1">系统提示词</label>
                      <textarea
                        value={member.systemPrompt}
                        onChange={(e) => updateMemberField(idx, 'systemPrompt', e.target.value)}
                        rows={4}
                        className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary text-sm resize-y focus:outline-none focus:border-accent-blue"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-bg-secondary">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary rounded-lg btn-transition"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 text-sm text-white bg-accent-blue hover:bg-accent-blue/80 rounded-lg btn-transition disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
