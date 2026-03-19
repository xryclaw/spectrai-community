import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTeamStore } from '../../stores/teamStore'
import type { TeamInstanceMember } from '../../../shared/types'

export function TeamMemberEditor({
  isOpen,
  onClose,
  member
}: {
  isOpen: boolean
  onClose: () => void
  member: TeamInstanceMember
}) {
  const { updateMember } = useTeamStore()
  const [systemPrompt, setSystemPrompt] = useState(member.systemPrompt)
  const [providerId, setProviderId] = useState(member.providerId)
  const [mode, setMode] = useState<'supervisor' | 'member'>(member.mode)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSystemPrompt(member.systemPrompt)
    setProviderId(member.providerId)
    setMode(member.mode)
  }, [member])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateMember(member.id, { systemPrompt, providerId, mode })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-bg-secondary rounded-xl border border-border p-6 w-[480px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-primary text-lg font-medium">编辑成员 - {member.name}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary btn-transition">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-1">系统提示词</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-primary text-sm resize-y focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-1">Provider</label>
            <input
              type="text"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-1">模式</label>
            <div className="flex gap-2">
              {(['supervisor', 'member'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-lg text-sm btn-transition ${
                    mode === m
                      ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                      : 'bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover'
                  }`}
                >
                  {m === 'supervisor' ? '主管' : '成员'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary rounded-lg btn-transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-accent-blue hover:bg-accent-blue/80 rounded-lg btn-transition disabled:opacity-50"
          >
            {saving ? '保存中...' : '应用'}
          </button>
        </div>
      </div>
    </div>
  )
}
