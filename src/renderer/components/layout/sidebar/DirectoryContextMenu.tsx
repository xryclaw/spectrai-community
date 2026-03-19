import { Plus } from 'lucide-react'

interface DirectoryContextMenuProps {
  x: number
  y: number
  workDir: string
  menuRef: React.RefObject<HTMLDivElement>
  onCreate: () => void
}

export function DirectoryContextMenu({ x, y, workDir, menuRef, onCreate }: DirectoryContextMenuProps) {
  return (
    <div
      ref={menuRef}
      className="fixed z-[90] bg-bg-secondary border border-border rounded-lg shadow-2xl py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={onCreate}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover btn-transition text-left"
      >
        <Plus className="w-3.5 h-3.5 text-accent-green" />
        {workDir ? '在此新建对话' : '新建对话'}
      </button>
    </div>
  )
}
