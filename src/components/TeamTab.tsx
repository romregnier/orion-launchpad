import { useState } from 'react'
import { useLaunchpadStore } from '../store'
import { AgentDirectoryCard } from './AgentDirectoryCard'
import { HumanMemberCard } from './HumanMemberCard'
import { AgentEditModal } from './AgentEditModal'
import { Select } from './Select'
import { useAgentStatus } from '../hooks/useAgentStatus'
import { InviteMemberModal } from './InviteMemberModal'
import type { CanvasAgent } from '../types'
import type { SelectOption } from './Select'

const roleOptions: SelectOption[] = [
  { value: 'member', label: '✏️ Member' },
  { value: 'viewer', label: '👁️ Viewer' },
]

function SectionHeader({ title, count, onAction, actionLabel }: {
  title: string
  count: number
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: "'Poppins', sans-serif",
      }}>
        {title}
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '1px 7px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.09)',
          color: 'rgba(255,255,255,0.4)',
        }}>
          {count}
        </span>
      </div>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          style={{
            padding: '5px 12px',
            borderRadius: 8,
            background: 'rgba(225,31,123,0.10)',
            border: '1px solid rgba(225,31,123,0.25)',
            color: 'var(--accent)',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Poppins', sans-serif",
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(225,31,123,0.18)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(225,31,123,0.10)'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function InviteForm() {
  const { inviteMember, fetchBoardMembers } = useLaunchpadStore()
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member')
  const [inviting, setInviting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleInvite = async () => {
    if (!email.trim()) return
    setInviting(true)
    setMsg(null)
    const result = await inviteMember(email.trim(), inviteRole)
    setInviting(false)
    if (result.ok) {
      setMsg({ ok: true, text: `✅ Invitation envoyée à ${email}` })
      setEmail('')
      fetchBoardMembers()
    } else {
      setMsg({ ok: false, text: `❌ ${result.error ?? 'Erreur inconnue'}` })
    }
    setTimeout(() => setMsg(null), 4000)
  }

  return (
    <div style={{
      marginTop: 12,
      padding: '16px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') void handleInvite() }}
        placeholder="Email du membre..."
        type="email"
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          color: '#fff',
          fontSize: 13,
          fontFamily: "'Poppins', sans-serif",
          outline: 'none',
          boxSizing: 'border-box' as const,
          transition: 'border-color 0.15s ease',
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          value={inviteRole}
          onChange={v => setInviteRole(v as 'member' | 'viewer')}
          options={roleOptions}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => void handleInvite()}
          disabled={inviting || !email.trim()}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: inviting ? 'rgba(225,31,123,0.5)' : 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: inviting || !email.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            fontFamily: "'Poppins', sans-serif",
            transition: 'all 0.15s ease',
          }}
        >
          {inviting ? '⏳' : 'Inviter →'}
        </button>
      </div>
      {msg && (
        <div style={{
          fontSize: 12,
          color: msg.ok ? '#22C55E' : '#EF4444',
          fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
        }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

const editBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  padding: '4px 10px',
  borderRadius: 6,
  background: 'rgba(225,31,123,0.10)',
  border: '1px solid rgba(225,31,123,0.25)',
  color: 'var(--accent)',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'Poppins', sans-serif",
  zIndex: 1,
}

// Status dot helper
function StatusDot({ agentKey, statusMap }: { agentKey?: string | null; statusMap: Map<string, 'busy' | 'online' | 'idle'> }) {
  const status = agentKey ? (statusMap.get(agentKey) ?? 'idle') : 'idle'
  const COLOR: Record<string, string> = {
    busy: '#F59E0B',
    online: '#22C55E',
    idle: 'rgba(255,255,255,0.2)',
  }
  return (
    <span
      title={status}
      style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        background: COLOR[status],
        boxShadow: status === 'busy' ? '0 0 6px #F59E0B' : status === 'online' ? '0 0 6px #22C55E' : 'none',
        flexShrink: 0,
      }}
    />
  )
}

export function TeamTab() {
  const { canvasAgents, boardMembers, currentUser } = useLaunchpadStore()
  const [editingAgent, setEditingAgent] = useState<CanvasAgent | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const agentStatusMap = useAgentStatus()

  const aiAgents = canvasAgents.filter(a => a.entity_type === 'ai' || !a.entity_type)
  const humanAgents = canvasAgents.filter(a => a.entity_type === 'human')
  const allHumans = [...boardMembers]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Section Agents IA */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="Agents IA" count={aiAgents.length} />
        {aiAgents.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 13,
            fontFamily: "'Poppins', sans-serif",
          }}>
            Aucun agent IA configuré
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {aiAgents.map(agent => (
              <div key={agent.id} style={{ position: 'relative' }}>
                <AgentDirectoryCard agent={agent} />
                {/* Live status dot */}
                <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <StatusDot agentKey={agent.agent_key} statusMap={agentStatusMap} />
                </div>
                <button style={editBtnStyle} onClick={() => setEditingAgent(agent)}>
                  Éditer
                </button>
              </div>
            ))}
          </div>
        )}

        {humanAgents.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.30)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              marginBottom: 8,
              fontFamily: "'Poppins', sans-serif",
            }}>
              Agents humains sur canvas
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {humanAgents.map(agent => (
                <div key={agent.id} style={{ position: 'relative' }}>
                  <AgentDirectoryCard agent={agent} />
                  <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <StatusDot agentKey={agent.agent_key} statusMap={agentStatusMap} />
                  </div>
                  <button style={editBtnStyle} onClick={() => setEditingAgent(agent)}>
                    Éditer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />

      {/* Section Équipe humaine */}
      <section>
        <SectionHeader
          title="Équipe humaine"
          count={allHumans.length}
          onAction={() => setShowInviteForm(v => !v)}
          actionLabel={showInviteForm ? '✕ Fermer' : '+ Inviter'}
        />

        {showInviteForm && <InviteForm />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: showInviteForm ? 16 : 0 }}>
          {allHumans.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.25)',
              fontSize: 13,
              fontFamily: "'Poppins', sans-serif",
            }}>
              Aucun membre dans l'équipe. Invitez des collaborateurs →
            </div>
          ) : (
            allHumans.map(member => (
              <HumanMemberCard
                key={member.id}
                member={member}
                currentUserEmail={currentUser?.username}
              />
            ))
          )}
        </div>
      </section>

      {/* Agent Edit Modal */}
      <AgentEditModal agent={editingAgent} onClose={() => setEditingAgent(null)} />

      {/* InviteMemberModal — TK-0215 */}
      <InviteMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} />

      {/* Bouton flottant "Inviter un membre" */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 10,
            background: 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Poppins', sans-serif",
            boxShadow: '0 4px 16px rgba(225,31,123,0.35)',
          }}
        >
          📨 Inviter un membre
        </button>
      </div>
    </div>
  )
}
