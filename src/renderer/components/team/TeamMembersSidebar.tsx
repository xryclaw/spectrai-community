/**
 * TeamMembersSidebar - 团队会话时在左侧边栏显示成员列表
 * 替代 SessionsContent，当选中的 session 属于团队时自动显示
 */

import React from 'react'
import { ArrowLeft, Shield, Star, Code2, Search, Bug, Users, Square } from 'lucide-react'
import type { TeamInstance, TeamInstanceMember, TeamRole, TeamMemberStatus, TeamInstanceStatus } from '../../../shared/types'
import { useTeamStore } from '../../stores/teamStore'

type TeamUiAction = 'sidebar_back' | 'select_team_conversation' | 'select_member' | 'stop_team'

function emitTeamUiEvent(action: TeamUiAction, payload: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('spectrai:team-ui', {
    detail: {
      module: 'team_members_sidebar',
      action,
      timestamp: Date.now(),
      ...payload,
    },
  }))
}

const STATUS_META: Record<TeamMemberStatus, { color: string; label: string }> = {
  idle: { color: '#8B949E', label: '空闲' },
  working: { color: '#3FB950', label: '工作中' },
  reviewing: { color: '#58A6FF', label: '审核中' },
  blocked: { color: '#D29922', label: '阻塞' },
  done: { color: '#58A6FF', label: '完成' },
  error: { color: '#F85149', label: '错误' },
}

const ROLE_ICONS: Record<TeamRole, React.ReactNode> = {
  leader: <Shield size={14} />,
  architect: <Star size={14} />,
  developer: <Code2 size={14} />,
  reviewer: <Search size={14} />,
  qa: <Bug size={14} />,
  custom: <Users size={14} />,
}

const ROLE_LABELS: Record<TeamRole, string> = {
  leader: '负责人',
  architect: '架构师',
  developer: '开发',
  reviewer: '审核',
  qa: '测试',
  custom: '自定义',
}

const INSTANCE_STATUS_META: Record<TeamInstanceStatus, { color: string; label: string }> = {
  running: { color: '#3FB950', label: '运行中' },
  idle: { color: '#8B949E', label: '空闲' },
  paused: { color: '#D29922', label: '已暂停' },
  failed: { color: '#F85149', label: '失败' },
  completed: { color: '#58A6FF', label: '已完成' },
}

function MemberItem({
  member,
  instanceId,
  isSelected,
  onSelect,
}: {
  member: TeamInstanceMember
  instanceId: string
  isSelected: boolean
  onSelect: () => void
}) {
  const statusMeta = STATUS_META[member.status] || { color: '#8B949E', label: member.status }

  return (
    <button
      onClick={onSelect}
      data-testid="team-member-item"
      data-team-instance-id={instanceId}
      data-team-member-id={member.id}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg btn-transition text-left ${
        isSelected
          ? 'bg-accent-blue/10 border border-accent-blue/30'
          : 'hover:bg-bg-hover border border-transparent'
      }`}
    >
      <span className="text-text-secondary flex-shrink-0">{ROLE_ICONS[member.role]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-text-primary text-sm truncate">{member.name}</span>
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusMeta.color }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-text-muted text-[11px]">{ROLE_LABELS[member.role]}</span>
          <span className="text-text-muted text-[11px]">·</span>
          <span className="text-[11px]" style={{ color: statusMeta.color }}>
            {statusMeta.label}
          </span>
        </div>
        {member.currentTask && (
          <p className="text-text-muted text-[11px] truncate mt-0.5">{member.currentTask}</p>
        )}
      </div>
    </button>
  )
}

export function TeamMembersSidebar({
  instance,
  onBack,
}: {
  instance: TeamInstance
  onBack: () => void
}) {
  const { selectedMemberId, selectMember, stopInstance } = useTeamStore()
  const instanceStatusMeta = INSTANCE_STATUS_META[instance.status] || { color: '#8B949E', label: instance.status }

  return (
    <div className="flex flex-col h-full" data-testid="team-members-sidebar" data-team-instance-id={instance.id}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => {
              emitTeamUiEvent('sidebar_back', { instanceId: instance.id })
              onBack()
            }}
            className="text-text-muted hover:text-text-primary btn-transition p-0.5"
            title="返回会话列表"
            data-testid="team-sidebar-back"
          >
            <ArrowLeft size={14} />
          </button>
          <span className="text-text-primary text-sm font-medium truncate flex-1">
            {instance.name}
          </span>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: instanceStatusMeta.color }}
            title={instanceStatusMeta.label}
          />
        </div>
        <p className="text-text-muted text-[11px] truncate pl-6">{instance.workingDirectory}</p>
      </div>

      {/* Team conversation button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => {
            emitTeamUiEvent('select_team_conversation', { instanceId: instance.id })
            selectMember(null)
          }}
          data-testid="team-conversation-button"
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg btn-transition text-left ${
            selectedMemberId === null
              ? 'bg-accent-blue/10 border border-accent-blue/30'
              : 'hover:bg-bg-hover border border-transparent'
          }`}
        >
          <Users size={14} className="text-text-secondary flex-shrink-0" />
          <span className="text-text-primary text-sm">团队对话</span>
        </button>
      </div>

      {/* Members list */}
      <div className="px-3 pt-2 pb-1">
        <span className="text-text-muted text-[11px] tracking-wide">
          成员 ({instance.members?.length || 0})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {!instance.members?.length ? (
          <div className="text-[12px] text-text-muted px-3 py-2 border border-border rounded-lg space-y-2">
            <p className="text-text-secondary">暂无团队成员</p>
            <p className="text-[11px]">请先回到模板补充成员后再启动团队。</p>
            <button
              type="button"
              onClick={onBack}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-hover btn-transition"
            >
              返回会话列表
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {(instance.members || []).map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                instanceId={instance.id}
                isSelected={selectedMemberId === member.id}
                onSelect={() => {
                  emitTeamUiEvent('select_member', { instanceId: instance.id, memberId: member.id, memberRole: member.role })
                  selectMember(member.id)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {(instance.status === 'running' || instance.status === 'paused') && (
        <div className="px-3 py-2 border-t border-border">
          <button
            onClick={() => {
              emitTeamUiEvent('stop_team', { instanceId: instance.id, status: instance.status })
              stopInstance(instance.id)
            }}
            data-testid="team-stop-button"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg btn-transition"
          >
            <Square size={12} />
            停止团队
          </button>
        </div>
      )}
    </div>
  )
}
