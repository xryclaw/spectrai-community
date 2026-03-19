/**
 * SDK V2 对话管理 Hook
 *
 * 使用 Zustand store 作为唯一数据源（消息由 initConversationListeners 统一管理）。
 * 替代 PTY 模式下的 useTerminal Hook。
 *
 * @author weibin
 */

import { useEffect, useCallback, useRef } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { ensureIpcSuccess, extractIpcErrorMessage } from '../utils/ipcError'

export interface QueuedMessage {
  id: string
  text: string
  queuedAt: string
  strategy?: string
}

export interface MessageDispatchResult {
  dispatched: boolean
  scheduled: boolean
  strategy?: 'interrupt_now' | 'queue_after_turn'
  queueLength?: number
  reason?: 'session_starting' | 'session_running'
}

interface UseConversationReturn {
  messages: import('../../shared/types').ConversationMessage[]
  isStreaming: boolean
  isLoading: boolean
  sendMessage: (text: string) => Promise<MessageDispatchResult | undefined>
  respondPermission: (accept: boolean) => Promise<void>
  respondQuestion: (answers: Record<string, string>) => Promise<void>
  approvePlan: (approved: boolean) => Promise<void>
  abortSession: () => Promise<void>
}

const TERMINAL_STATUSES = new Set(['completed', 'terminated', 'error', 'interrupted'])

export function useConversation(sessionId: string): UseConversationReturn {
  const sessionIdRef = useRef(sessionId)

  // 保持 sessionId 引用最新
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  // ★ 从 Zustand store 获取消息（唯一数据源，避免双监听丢消息）
  const messages = useSessionStore(
    state => state.conversations[sessionId] || []
  )

  // 流式状态
  const isStreaming = useSessionStore(
    state => state.streamingSessions.has(sessionId)
  )

  // 加载状态
  const isLoading = useSessionStore(
    state => !!state.conversationLoading[sessionId]
  )

  // 首次挂载时，从主进程加载历史对话到 store（如果 store 中还没有）
  useEffect(() => {
    const store = useSessionStore.getState()
    const existing = store.conversations[sessionId]
    if (!existing || existing.length === 0) {
      store.setConversationLoading(sessionId, true)
      window.spectrAI.session.getConversation(sessionId)
        .then((history: any[]) => {
          if (history && history.length > 0) {
            // 批量添加到 store（一次 set，避免逐条触发重渲染）
            store.bulkAddConversationMessages(sessionId, history)
          }
        })
        .catch((err: Error) => {
          console.error('[useConversation] Failed to load history:', err)
        })
        .finally(() => {
          store.setConversationLoading(sessionId, false)
        })
    }
  }, [sessionId])

  // 发送消息
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return

    let targetSessionId = sessionIdRef.current
    const store = useSessionStore.getState()
    const currentSession = store.sessions.find(s => s.id === targetSessionId)
    if (currentSession && TERMINAL_STATUSES.has(currentSession.status)) {
      const resumeResult = await store.resumeSession(targetSessionId)
      if (!resumeResult.success) {
        console.error('[useConversation] Failed to resume before sending:', resumeResult.error)
        return undefined
      }
      targetSessionId = resumeResult.sessionId || targetSessionId
      store.selectSession(targetSessionId)
      console.log(`[useConversation] Lazy resume triggered by first message: ${sessionIdRef.current} -> ${targetSessionId}`)
    }

    // 标记流式状态
    // 注意：用户消息由各 Adapter 的 sendMessage() 统一 emit conversation-message，
    // 前端不做乐观更新，避免与后端 emit 产生重复消息（ID 不同导致去重失效）
    useSessionStore.setState(state => ({
      streamingSessions: new Set([...state.streamingSessions, targetSessionId])
    }))

    let wasScheduled = false
    try {
      const rawResult = await window.spectrAI.session.sendMessage(targetSessionId, text)
      const result = ensureIpcSuccess(rawResult, '消息发送失败')
      if (result && typeof result === 'object' && 'dispatch' in result) {
        const dispatch = (result as any).dispatch as MessageDispatchResult
        wasScheduled = dispatch.scheduled
        return dispatch
      }
      return undefined
    } catch (err) {
      const message = extractIpcErrorMessage(err, '消息发送失败')
      console.error('[useConversation] Failed to send message:', message)
      throw new Error(message)
    } finally {
      // 消息被排队时，会话仍在运行中，streaming 状态由 sessionStore 的
      // onStatusChange 监听器维护，这里不应清除，否则会导致停止按钮闪消
      if (!wasScheduled) {
        useSessionStore.setState(state => {
          const next = new Set(state.streamingSessions)
          next.delete(targetSessionId)
          return { streamingSessions: next }
        })
      }
    }
  }, [])

  // 响应权限请求
  const respondPermission = useCallback(async (accept: boolean) => {
    try {
      const result = await window.spectrAI.session.respondPermission(sessionIdRef.current, accept)
      ensureIpcSuccess(result, '权限响应失败')
    } catch (err) {
      console.error('[useConversation] Failed to respond permission:', extractIpcErrorMessage(err, '权限响应失败'))
    }
  }, [])

  // 回答 AskUserQuestion 问题
  const respondQuestion = useCallback(async (answers: Record<string, string>) => {
    try {
      const result = await window.spectrAI.session.answerQuestion(sessionIdRef.current, answers)
      ensureIpcSuccess(result, '问题回答失败')
    } catch (err) {
      console.error('[useConversation] Failed to answer question:', extractIpcErrorMessage(err, '问题回答失败'))
    }
  }, [])

  // 审批 ExitPlanMode 计划
  const approvePlan = useCallback(async (approved: boolean) => {
    try {
      const result = await window.spectrAI.session.approvePlan(sessionIdRef.current, approved)
      ensureIpcSuccess(result, '计划审批失败')
    } catch (err) {
      console.error('[useConversation] Failed to approve plan:', extractIpcErrorMessage(err, '计划审批失败'))
    }
  }, [])

  // 软中断：停止当前正在执行的 AI 轮次
  const abortSession = useCallback(async () => {
    try {
      const result = await window.spectrAI.session.abortSession(sessionIdRef.current)
      ensureIpcSuccess(result, '停止会话失败')
    } catch (err) {
      console.error('[useConversation] Failed to abort session:', extractIpcErrorMessage(err, '停止会话失败'))
    }
  }, [])

  return { messages, isStreaming, isLoading, sendMessage, respondPermission, respondQuestion, approvePlan, abortSession }
}
