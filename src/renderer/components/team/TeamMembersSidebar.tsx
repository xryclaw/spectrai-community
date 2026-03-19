/**
 * TeamMembersSidebar - 团队会话时在左侧边栏显示成员列表
 * 替代 SessionsContent，当选中的 session 属于团队时自动显示
 */

import React from 'react'
import { ArrowLeft, Shield, Star, Code2, Search, Bug, Users, Square, Edit3 } from 'lucide-react'
import type { TeamInstance, TeamInstanceMember, TeamRole, TeamMemberStatus } from '../../../shared/types'
import { useTeamStore } from '../../stores/teamStore'

const STATUS_COLORS: Record<TeamMemberStatus, string> = {
  idle: '#8B949E',
  working: '#3FB950',
  reviewing: '#58A6FF',
  blocked: '#D29922',
  done: '#58A6FF',
  error: '#F85149'
}

const STATUS_LABELS: Record<TeamMemberStatus, string> = {
  idle: '空闲',
  working: '工作中',
  reviewing: '审核中',
  blocked: '阻塞',
  done: '完成',
  error: '错误'
}

const ROLE_ICONS: Record<TeamRole, React.ReactNode> = {
  leader: <Shield size={14} />,
  architect: <Star size={14} />,
  developer: <Code2 size={14} />,
  reviewer: <Search size={14} />,
  qa: <Bug size={14} />,
  custom: <Users size={14} />
}

const ROLE_LABELS: Record<TeamRole, string> = {
  leader: '负责人',
  architect: '架构师',
  developer: '开发',
  reviewer: '审核',
  qa: '测试',
  custom: '自定义'
}

const INSTANCE_STATUS_COLORS: Record<string, string> = {
  running: '#3FB950',
  idle: '#8B949E',
  paused: '#D29922',
  failed: '#F85149',
  completed: '#58A6FF'
}

function MemberItem({
  member,
  isSelected,
  onSelect,
}: {
  member: TeamInstanceMember
  isSelected: boolean
  onSelect: () => void
}) {
  const statusColor = STATUS_COLORS[member.status]

  return (
    <button
      onClick={onSelect}
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
            style={{ backgroundColor: statusColor }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-text-muted text-[11px]">{ROLE_LABELS[member.role]}</span>
          <span className="text-text-muted text-[11px]">·</span>
          <span className="text-[11px]" style={{ color: statusColor }}>
            {STATUS_LABELS[member.status]}
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
  const instanceStatusColor = INSTANCE_STATUS_COLORS[instance.status] || '#8B949E'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text-primary btn-transition p-0.5"
            title="返回会话列表"
          >
            <ArrowLeft size={14} />
          </button>
          <span className="text-text-primary text-sm font-medium truncate flex-1">
            {instance.name}
          </span>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: instanceStatusColor }}
          />
        </div>
        <p className="text-text-muted text-[11px] truncate pl-6">{instance.workingDirectory}</p>
      </div>

      {/* Team conversation button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => selectMember(null)}
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
        <span className="text-text-muted text-[11px] uppercase tracking-wide">
          成员 ({instance.members?.length || 0})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-0.5">
          {(instance.members || []).map((member) => (
            <MemberItem
              key={member.id}
              member={member}
              isSelected={selectedMemberId === member.id}
              onSelect={() => selectMember(member.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer actions */}
      {(instance.status === 'running' || instance.status === 'paused') && (
        <div className="px-3 py-2 border-t border-border">
          <button
            onClick={() => stopInstance(instance.id)}
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
