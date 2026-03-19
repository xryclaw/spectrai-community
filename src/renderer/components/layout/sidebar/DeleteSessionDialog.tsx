import { Trash2 } from 'lucide-react'

interface DeleteSessionDialogProps {
  sessionName: string
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteSessionDialog({ sessionName, isDeleting, onCancel, onConfirm }: DeleteSessionDialogProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-secondary rounded-xl shadow-2xl border border-border w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-accent-red/15 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4.5 h-4.5 text-accent-red" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">删除任务</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              确定要永久删除 <span className="font-medium text-text-primary">"{sessionName}"</span> 吗？<br />
              此操作将删除会话及其所有历史记录，且无法撤销。
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-hover hover:bg-bg-tertiary rounded btn-transition disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-3 py-1.5 text-xs text-white bg-accent-red hover:bg-accent-red/80 rounded btn-transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeleting ? (
              <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />删除中...</>
            ) : (
              <><Trash2 className="w-3 h-3" />确认删除</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
