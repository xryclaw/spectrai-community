import React, { useState } from 'react'
import { AlertCircle, FolderOpen, X } from 'lucide-react'
import { useTeamStore } from '../../stores/teamStore'
import type { TeamTemplate } from '../../../shared/types'

export function TeamLaunchDialog({
  isOpen,
  onClose,
  template
}: {
  isOpen: boolean
  onClose: () => void
  template: TeamTemplate
}) {
  const { createInstance, startInstance } = useTeamStore()
  const [name, setName] = useState(template.name)
  const [workingDirectory, setWorkingDirectory] = useState('')
  const [launching, setLaunching] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleBrowse = async () => {
    try {
      const dir = await window.spectrAI.app.selectDirectory()
      if (dir) {
        setWorkingDirectory(dir)
        setFormError(null)
      }
    } catch {
      // user cancelled
    }
  }

  const handleLaunch = async () => {
    if (!name.trim()) {
      setFormError('请输入团队名称')
      return
    }
    if (!workingDirectory.trim()) {
      setFormError('请选择工作目录')
      return
    }

    setLaunching(true)
    setFormError(null)
    try {
      const instance = await createInstance({
        templateId: template.id,
        name: name.trim(),
        workingDirectory: workingDirectory.trim()
      })
      if (instance?.id) {
        await startInstance(instance.id)
      }
      onClose()
    } catch {
      setFormError('团队启动失败，请重试')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-bg-secondary rounded-xl border border-border p-6 w-[480px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-text-primary text-lg font-medium">启动团队</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary btn-transition" disabled={launching}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-1">模板</label>
            <div className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-muted text-sm">
              {template.name}
            </div>
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-1">团队名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (formError) setFormError(null)
              }}
              placeholder="输入团队名称"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-1">工作目录</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={workingDirectory}
                onChange={(e) => {
                  setWorkingDirectory(e.target.value)
                  if (formError) setFormError(null)
                }}
                placeholder="选择工作目录"
                className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-blue"
              />
              <button
                onClick={handleBrowse}
                className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-secondary hover:bg-bg-hover btn-transition"
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent-red/30 bg-accent-red/10 text-accent-red text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={launching}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary rounded-lg btn-transition disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={() => void handleLaunch()}
            disabled={launching || !name.trim() || !workingDirectory.trim()}
            className="px-4 py-2 text-sm text-white bg-accent-blue hover:bg-accent-blue/80 rounded-lg btn-transition disabled:opacity-50"
          >
            {launching ? '启动中...' : '启动团队'}
          </button>
        </div>
      </div>
    </div>
  )
}
