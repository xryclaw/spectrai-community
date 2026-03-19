import React, { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const instanceMessages = messages[instanceId] || []

  useEffect(() => {
    fetchMessages(instanceId)
  }, [instanceId, fetchMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [instanceMessages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    try {
      await sendMessage(instanceId, text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h4 className="text-text-primary text-sm font-medium">团队对话</h4>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {instanceMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            暂无消息
          </div>
        ) : (
          instanceMessages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-text-primary text-sm resize-none focus:outline-none focus:border-accent-blue"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-3 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 btn-transition disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
