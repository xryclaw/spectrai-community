import { Plus, Search, Terminal } from 'lucide-react'
import { toPlatformShortcutLabel } from '../../../utils/shortcut'

interface SessionsTopBarProps {
  onToggleSearch: () => void
  onOpenNewSession: () => void
}

export function SessionsTopBar({ onToggleSearch, onOpenNewSession }: SessionsTopBarProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-2">
        <Terminal className="w-5 h-5 text-accent-blue" />
        <h1 className="text-lg font-semibold text-text-primary">SpectrAI</h1>
      </div>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onToggleSearch}
          className="p-2 rounded hover:bg-bg-hover btn-transition text-text-secondary hover:text-text-primary"
          title={`搜索日志 (${toPlatformShortcutLabel('Ctrl+F')})`}
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenNewSession}
          className="p-2 rounded hover:bg-bg-hover btn-transition text-text-secondary hover:text-text-primary"
          title="新建会话"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
