import React, { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Send } from 'lucide-react'
import { useTeamStore } from '../../stores/teamStore'
import type { TeamMessage, TeamRole } from '../../../shared/types'

const ROLE_COLORS: Record<TeamRole, string> = {
  leader: '#D2A8FF',
  architect: '#79C0FF',
  developer: '#3FB950',
  reviewer: '#58A6FF',
  qa: '#D29922',
  custom: '#8B949E'
}

const ROLE_LABELS: Record<TeamRole, string> = {
  leader: '负责人',
  architect: '架构师',
  developer: '开发',
  reviewer: '审核',
  qa: '测试',
  custom: '自定义'
}

function MessageBubble({ message }: { message: TeamMessage }) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-text-muted text-xs px-3 py-1 bg-bg-tertiary rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  const isUser = message.role === 'user'
  const roleColor = message.memberRole ? ROLE_COLORS[message.memberRole] : undefined
  const roleLabel = message.memberRole ? ROLE_LABELS[message.memberRole] : undefined

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'bg-accent-blue/10' : 'bg-bg-tertiary'} rounded-lg px-3 py-2`}>
        {!isUser && message.memberName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-text-primary text-xs font-medium">{message.memberName}</span>
            {roleLabel && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${roleColor}20`, color: roleColor }}
              >
                {roleLabel}
              </span>
            )}
          </div>
        )}
        <p className="text-text-primary text-sm whitespace-pre-wrap">{message.content}</p>
        <span className="text-text-muted text-[10px] mt-1 block text-right">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

export function TeamConversation({ instanceId }: { instanceId: string }) {
  const { messages, fetchMessages, sendMessage } = useTeamStore()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const instanceMessages = messages[instanceId] || []

  const loadMessages = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      await fetchMessages(instanceId)
    } catch {
      setFetchError('消息加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMessages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [instanceMessages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || loading) return
    setSending(true)
    setSendError(null)
    try {
      await sendMessage(instanceId, text)
      setInput('')
    } catch {
      setSendError('发送失败，请检查团队状态后重试')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h4 className="text-text-primary text-sm font-medium">团队对话</h4>
      </div>

      {fetchError && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-accent-red/30 bg-accent-red/10 flex items-center justify-between gap-2">
          <span className="text-accent-red text-xs flex items-center gap-1.5">
            <AlertCircle size={14} />
            {fetchError}
          </span>
          <button
            type="button"
            onClick={() => void loadMessages()}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-hover btn-transition"
          >
            重试
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center text-text-muted text-sm gap-2">
            <Loader2 size={16} className="animate-spin" />
            加载中...
          </div>
        ) : instanceMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            暂无团队消息
          </div>
        ) : (
          instanceMessages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        {sendError && (
          <div className="mb-2 px-3 py-2 rounded-lg border border-accent-red/30 bg-accent-red/10 text-accent-red text-xs flex items-center justify-between gap-2">
            <span>{sendError}</span>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending || loading}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-hover btn-transition disabled:opacity-50"
            >
              重试
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (sendError) setSendError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-primary text-sm resize-none focus:outline-none focus:border-accent-blue disabled:opacity-60"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending || loading}
            className="px-3 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 btn-transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span className="text-xs">发送</span>
          </button>
        </div>
      </div>
    </div>
  )
}
