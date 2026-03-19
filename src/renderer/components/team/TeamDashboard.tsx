import React, { useState } from 'react'
import { Edit3, Users, Shield, Code2, Search, Bug, Star } from 'lucide-react'
import type { TeamInstance, TeamInstanceMember, TeamRole, TeamMemberStatus } from '../../../shared/types'
import { TeamConversation } from './TeamConversation'
import { TeamMemberEditor } from './TeamMemberEditor'

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
  leader: <Shield size={16} />,
  architect: <Star size={16} />,
  developer: <Code2 size={16} />,
  reviewer: <Search size={16} />,
  qa: <Bug size={16} />,
  custom: <Users size={16} />
}

const ROLE_LABELS: Record<TeamRole, string> = {
  leader: '负责人',
  architect: '架构师',
  developer: '开发',
  reviewer: '审核',
  qa: '测试',
  custom: '自定义'
}

function MemberCard({
  member,
  onEdit
}: {
  member: TeamInstanceMember
  onEdit: () => void
}) {
  const statusColor = STATUS_COLORS[member.status]

  return (
    <div className="bg-bg-tertiary rounded-lg border border-border p-3 hover:border-accent-blue/30 btn-transition">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-text-secondary">{ROLE_ICONS[member.role]}</span>
          <span className="text-text-primary text-sm font-medium">{member.name}</span>
        </div>
        <button
          onClick={onEdit}
          className="text-text-muted hover:text-text-primary btn-transition p-1"
        >
          <Edit3 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          {STATUS_LABELS[member.status]}
        </span>
        <span className="text-text-muted text-[11px]">{ROLE_LABELS[member.role]}</span>
      </div>

      {member.currentTask && (
        <p className="text-text-secondary text-xs truncate">{member.currentTask}</p>
      )}

      <div className="mt-2 flex items-center gap-1">
        <span className="text-[10px] text-text-muted px-1.5 py-0.5 bg-bg-secondary rounded">
          {member.providerId || '未设置'}
        </span>
        <span className="text-[10px] text-text-muted px-1.5 py-0.5 bg-bg-secondary rounded">
          {member.mode === 'supervisor' ? '主管' : '成员'}
        </span>
      </div>
    </div>
  )
}

export function TeamDashboard({ instance }: { instance: TeamInstance }) {
  const [editingMember, setEditingMember] = useState<TeamInstanceMember | null>(null)

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <h3 className="text-text-primary font-medium">{instance.name}</h3>
          <p className="text-text-muted text-xs mt-1">{instance.workingDirectory}</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {instance.members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onEdit={() => setEditingMember(member)}
            />
          ))}
        </div>
      </div>

      <div className="w-[400px] border-l border-border flex flex-col">
        <TeamConversation instanceId={instance.id} />
      </div>

      {editingMember && (
        <TeamMemberEditor
          isOpen={true}
          onClose={() => setEditingMember(null)}
          member={editingMember}
        />
      )}
    </div>
  )
}
