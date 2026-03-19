import { Pencil, Play, RotateCcw, Sparkles, Square, Trash2 } from 'lucide-react'
import type { SessionStatus } from '../../../../shared/types'

interface SessionContextMenuProps {
  x: number
  y: number
  status: SessionStatus
  isAiRenaming: boolean
  menuRef: React.RefObject<HTMLDivElement>
  onRename: () => void
  onAiRename: () => void
  onResume: () => void
  onTerminate: () => void
  onDelete: () => void
}

export function SessionContextMenu({
  x,
  y,
  status,
  isAiRenaming,
  menuRef,
  onRename,
  onAiRename,
  onResume,
  onTerminate,
  onDelete,
}: SessionContextMenuProps) {
  return (
    <div
      ref={menuRef}
      className="fixed z-[90] bg-bg-secondary border border-border rounded-lg shadow-2xl py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={onRename}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover btn-transition text-left"
      >
        <Pencil className="w-3.5 h-3.5 text-accent-blue" />
        重命名
      </button>
      <button
        disabled={isAiRenaming}
        onClick={onAiRename}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover btn-transition text-left disabled:opacity-50"
      >
        <Sparkles className={`w-3.5 h-3.5 text-accent-purple ${isAiRenaming ? 'animate-pulse' : ''}`} />
        {isAiRenaming ? 'AI 命名中...' : 'AI 重命名'}
      </button>
      {(status === 'completed' || status === 'terminated') && (
        <button
          onClick={onResume}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover btn-transition text-left"
        >
          <Play className="w-3.5 h-3.5 text-accent-green" />
          继续任务
        </button>
      )}
      {status === 'interrupted' && (
        <button
          onClick={onResume}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover btn-transition text-left"
        >
          <RotateCcw className="w-3.5 h-3.5 text-accent-blue" />
          恢复会话
        </button>
      )}
      {(status === 'running' || status === 'idle' || status === 'waiting_input' || status === 'starting') && (
        <button
          onClick={onTerminate}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-accent-red hover:bg-bg-hover btn-transition text-left"
        >
          <Square className="w-3.5 h-3.5" />
          终止会话
        </button>
      )}
      <div className="my-1 border-t border-border" />
      <button
        onClick={onDelete}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-accent-red hover:bg-bg-hover btn-transition text-left"
      >
        <Trash2 className="w-3.5 h-3.5" />
        删除任务
      </button>
    </div>
  )
}
