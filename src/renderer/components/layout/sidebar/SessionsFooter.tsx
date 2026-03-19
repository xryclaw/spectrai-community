import { Terminal } from 'lucide-react'

interface SessionsFooterProps {
  onOpenNewSession: () => void
}

export function SessionsFooter({ onOpenNewSession }: SessionsFooterProps) {
  return (
    <div className="p-4 border-t border-border">
      <button
        onClick={onOpenNewSession}
        className="w-full py-2 px-4 bg-accent-blue text-white rounded hover:bg-opacity-90 btn-transition flex items-center justify-center gap-2"
      >
        <Terminal className="w-4 h-4" />
        <span>新建会话</span>
      </button>
    </div>
  )
}
