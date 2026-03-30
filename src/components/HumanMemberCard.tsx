import { useState } from 'react'
import { useLaunchpadStore } from '../store'
import type { BoardMember } from '../types'

interface HumanMemberCardProps {
  member: BoardMember
  currentUserEmail?: string
}

export function HumanMemberCard({ member, currentUserEmail }: HumanMemberCardProps) {
  const { removeMember, updateMemberRole } = useLaunchpadStore()
  const [hovering, setHovering] = useState(false)
  const isCurrentUser = member.email === currentUserEmail

  const roleBadgeStyle = (role: string): React.CSSProperties => ({
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    background:
      role === 'admin'
        ? 'rgba(225,31,123,0.15)'
        : role === 'member'
        ? 'rgba(124,58,237,0.15)'
        : 'rgba(255,255,255,0.06)',
    border: `1px solid ${
      role === 'admin'
        ? 'rgba(225,31,123,0.30)'
        : role === 'member'
        ? 'rgba(124,58,237,0.30)'
        : 'rgba(255,255,255,0.10)'
    }`,
    color:
      role === 'admin'
        ? 'var(--accent)'
        : role === 'member'
        ? '#A78BFA'
        : 'rgba(255,255,255,0.45)',
    fontFamily: "'Poppins', sans-serif",
  })

  const statusColor =
    member.status === 'active' ? '#22C55E' : member.status === 'pending' ? '#F59E0B' : '#EF4444'

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: '100%',
        padding: '14px 18px',
        borderRadius: 12,
        border: '1px solid rgba(245,158,11,0.20)',
        borderLeft: '2px solid #F59E0B',
        background: hovering ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'default',
        boxSizing: 'border-box',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, rgba(245,158,11,0.35), rgba(245,158,11,0.10))',
        border: '2px solid #F59E0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}>
        👤
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: "'Poppins', sans-serif",
        }}>
          {member.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          {/* Human badge */}
          <span style={{
            fontSize: 8,
            fontWeight: 700,
            padding: '2px 5px',
            borderRadius: 4,
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.30)',
            color: '#F59E0B',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            fontFamily: "'Poppins', sans-serif",
          }}>
            HUMAN
          </span>
          {/* Role badge */}
          <span style={roleBadgeStyle(member.role)}>{member.role}</span>
          {/* Status */}
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: statusColor,
            fontFamily: "'Poppins', sans-serif",
          }}>
            {member.status === 'active' ? '✅ actif' : member.status === 'pending' ? '⏳ en attente' : '✕ révoqué'}
          </span>
        </div>
      </div>

      {/* Actions */}
      {!isCurrentUser && member.role !== 'admin' && hovering && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {/* Change role */}
          <select
            value={member.role}
            onChange={e => updateMemberRole(member.email, e.target.value as 'admin' | 'member' | 'viewer')}
            onClick={e => e.stopPropagation()}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>

          {/* Revoke */}
          <button
            onClick={() => removeMember(member.email)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.20)',
              color: 'rgba(239,68,68,0.7)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Poppins', sans-serif",
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'
              ;(e.currentTarget as HTMLElement).style.color = '#EF4444'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)'
            }}
          >
            Révoquer
          </button>
        </div>
      )}
    </div>
  )
}
