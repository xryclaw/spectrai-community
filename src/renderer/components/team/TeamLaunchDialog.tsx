import React, { useState } from 'react'
import { X, FolderOpen } from 'lucide-react'
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

  if (!isOpen) return null

  const handleBrowse = async () => {
    try {
      const dir = await window.spectrAI.app.selectDirectory()
      if (dir) setWorkingDirectory(dir)
    } catch {
      // user cancelled
    }
  }

  const handleLaunch = async () => {
    if (!name.trim() || !workingDirectory.trim()) return
    setLaunching(true)
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
          <button onClick={onClose} className="text-text-muted hover:text-text-primary btn-transition">
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
              onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setWorkingDirectory(e.target.value)}
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
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary rounded-lg btn-transition"
          >
            取消
          </button>
          <button
            onClick={handleLaunch}
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
