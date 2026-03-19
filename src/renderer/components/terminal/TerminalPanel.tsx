/**
 * 单个终端面板组件
 *
 * 使用结构化对话视图（SDK V2 Chat 模式）
 *
 * @author weibin
 */

import React, { useState } from 'react'
import TerminalHeader from './TerminalHeader'
import ConfirmDialog from '../common/ConfirmDialog'
import { ConversationView } from '../conversation'
import { useSessionStore } from '../../stores/sessionStore'
import { useTeamStore } from '../../stores/teamStore'
import { TeamConversation } from '../team/TeamConversation'

function emitTeamPanelUiEvent(action: string, payload: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('spectrai:team-ui', {
    detail: {
      module: 'terminal_panel',
      action,
      timestamp: Date.now(),
      ...payload,
    },
  }))
}

interface TerminalPanelProps {
  sessionId: string
  onMaximize?: () => void
  /** 会话关闭/终止后的回调，用于退出 focus 模式等视图切换 */
  onAfterClose?: () => void
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ sessionId, onMaximize, onAfterClose }) => {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId))

  // 从 Zustand store 精确订阅需要的方法（避免订阅整个 store 导致无关更新触发重渲染）
  const terminateSession = useSessionStore(state => state.terminateSession)
  const selectSession = useSessionStore(state => state.selectSession)

  // 团队相关状态
  const teamInstance = useTeamStore(state => state.getTeamForSession(sessionId))
  const mappedTeamId = useTeamStore(state => state.sessionTeamMap[sessionId])
  const selectedMemberId = useTeamStore(state => state.selectedMemberId)
  const selectMember = useTeamStore(state => state.selectMember)
  const isTeamMissing = !!mappedTeamId && !teamInstance

  // 已结束状态（无需确认可直接关闭）
  const INACTIVE_STATUSES = new Set(['completed', 'terminated', 'interrupted', 'error'])

  // 处理关闭
  const handleClose = () => {
    if (session && INACTIVE_STATUSES.has(session.status)) {
      // 已完成/已终止的会话无需确认，直接执行
      handleConfirmClose()
    } else {
      setShowCloseConfirm(true)
    }
  }

  const handleConfirmClose = async () => {
    setShowCloseConfirm(false)
    await terminateSession(sessionId)
    // 关闭后通知父层（如 focus 模式退回到原视图）
    onAfterClose?.()
  }

  // 决定主内容区渲染什么
  const renderContent = () => {
    if (teamInstance) {
      // 选中了某个成员 → 显示该成员的单独对话
      if (selectedMemberId) {
        const member = teamInstance.members?.find(m => m.id === selectedMemberId)
        if (member?.sessionId) {
          return <ConversationView sessionId={member.sessionId} />
        }
        // 成员还没有 sessionId（未启动），显示提示
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-text-muted text-sm" data-testid="team-member-session-missing">
              <span>该成员尚未启动会话</span>
              <button
                className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-hover btn-transition"
                onClick={() => {
                  emitTeamPanelUiEvent('fallback_to_team_conversation', {
                    teamInstanceId: teamInstance.id,
                    selectedMemberId,
                  })
                  selectMember(null)
                }}
              >
                返回团队对话
              </button>
            </div>
          </div>
        )
      }
      // 未选中成员 → 显示团队对话
      return <TeamConversation instanceId={teamInstance.id} />
    }
    // 普通会话
    return <ConversationView sessionId={sessionId} />
  }

  return (
    <div
      className="flex flex-col h-full bg-bg-primary rounded-lg border border-border overflow-hidden shadow-lg relative"
      onClick={() => selectSession(sessionId)}
    >
      {/* 终端头部 */}
      <TerminalHeader
        sessionId={sessionId}
        onMaximize={onMaximize}
        onClose={handleClose}
      />

      {/* 团队实例缺失时显示轻提示，内容区降级为普通会话 */}
      {isTeamMissing && (
        <div className="px-3 py-2 border-b border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow text-xs">
          团队数据缺失，已降级为普通会话视图
        </div>
      )}

      {/* 对话视图（团队/普通） */}
      {renderContent()}

      {/* 关闭确认对话框 */}
      <ConfirmDialog
        open={showCloseConfirm}
        title="关闭会话"
        message="确定要关闭此终端会话吗？正在运行的任务将被终止。"
        confirmText="关闭"
        danger
        onConfirm={handleConfirmClose}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  )
}

TerminalPanel.displayName = 'TerminalPanel'

export default TerminalPanel
