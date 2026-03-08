import { useState, useEffect } from 'react'
import { useLaunchpadStore } from '../store'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { Select } from './Select'
import type { SelectOption } from './Select'

const COLOR_PALETTE = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#FF6B35', '#A78BFA']

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  color: '#fff',
  fontSize: 13,
  fontFamily: "'Poppins', sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s ease',
  boxSizing: 'border-box' as const,
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.55)',
  marginBottom: 6,
  display: 'block',
  fontFamily: "'Poppins', sans-serif",
}

function SectionCard({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      borderRadius: 12,
      background: danger ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
      border: danger ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(255,255,255,0.07)',
      padding: '18px 20px',
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: danger ? 'rgba(239,68,68,0.70)' : 'rgba(255,255,255,0.50)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.07em',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: "'Poppins', sans-serif",
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

const roleOptions: SelectOption[] = [
  { value: 'member', label: '✏️ Member' },
  { value: 'viewer', label: '👁️ Viewer' },
]

export function AppSettingsTab() {
  const {
    boardName, setBoardName,
    isPrivate, setPrivate,
    currentUser,
    groups, addGroup, deleteGroup,
    clearProjects,
    boardMembers, fetchBoardMembers, inviteMember, removeMember,
  } = useLaunchpadStore()

  const [editingName, setEditingName] = useState(boardName)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [newGroupEmoji, setNewGroupEmoji] = useState('✨')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState(COLOR_PALETTE[0])
  const [confirmClear, setConfirmClear] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const { permission, subscribed, subscribe } = usePushNotifications(currentUser?.username ?? null)

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchBoardMembers()
    }
  }, [currentUser?.role, fetchBoardMembers])

  useEffect(() => {
    setEditingName(boardName)
  }, [boardName])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    const result = await inviteMember(inviteEmail.trim(), inviteRole)
    setInviting(false)
    if (result.ok) {
      setInviteMsg({ ok: true, text: '✅ Invitation envoyée !' })
      setInviteEmail('')
    } else {
      setInviteMsg({ ok: false, text: `❌ ${result.error ?? 'Erreur inconnue'}` })
    }
    setTimeout(() => setInviteMsg(null), 4000)
  }

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return
    addGroup({ name: newGroupName.trim(), color: newGroupColor, emoji: newGroupEmoji })
    setNewGroupEmoji('✨')
    setNewGroupName('')
    setNewGroupColor(COLOR_PALETTE[0])
    setShowGroupForm(false)
  }

  const handleClearCanvas = () => {
    if (confirmClear) {
      clearProjects()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 24,
      alignItems: 'start',
    }}>
      {/* Left column */}
      <div>
        {/* Général */}
        <SectionCard title="📋 Général">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nom du board</label>
              <input
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onBlur={() => setBoardName(editingName)}
                onKeyDown={e => { if (e.key === 'Enter') setBoardName(editingName) }}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.40)')}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
                  Mode privé
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: "'Poppins', sans-serif" }}>
                  Protège le board avec une connexion
                </div>
              </div>
              <button
                onClick={() => setPrivate(!isPrivate)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  background: isPrivate ? '#E11F7B' : 'rgba(255,255,255,0.08)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 3,
                  left: isPrivate ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Groupes */}
        <SectionCard title="📁 Groupes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groups.map(group => (
              <div key={group.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span>{group.emoji}</span>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: group.color,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1, fontFamily: "'Poppins', sans-serif" }}>
                  {group.name}
                </span>
                <button
                  onClick={() => deleteGroup(group.id)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.25)',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    marginLeft: 'auto',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.color = '#EF4444'
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}

            {!showGroupForm ? (
              <button
                onClick={() => setShowGroupForm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 0',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.30)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                  marginTop: 8,
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.60)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
              >
                + Ajouter un groupe
              </button>
            ) : (
              <div style={{
                padding: 12,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 8,
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={newGroupEmoji}
                    onChange={e => setNewGroupEmoji(e.target.value)}
                    style={{ ...inputStyle, width: 48, textAlign: 'center', flexShrink: 0 }}
                  />
                  <input
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddGroup() }}
                    placeholder="Nom du groupe"
                    style={{ ...inputStyle, flex: 1 }}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewGroupColor(c)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: c,
                        border: newGroupColor === c ? '2px solid white' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleAddGroup}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 8,
                      background: '#E11F7B',
                      color: '#fff',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Créer
                  </button>
                  <button
                    onClick={() => { setShowGroupForm(false); setNewGroupName('') }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Right column */}
      <div>
        {/* Membres */}
        <SectionCard title="👥 Membres">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {boardMembers.map(member => {
              const roleColor = member.role === 'admin' ? '#E11F7B' : member.role === 'member' ? '#7C3AED' : 'rgba(255,255,255,0.3)'
              const isCurrentUser = member.email === currentUser?.username
              return (
                <div key={member.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 16 }}>{member.status === 'pending' ? '⏳' : '👤'}</span>
                    <span style={{
                      fontSize: 12,
                      color: '#fff',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                      fontFamily: "'Poppins', sans-serif",
                    }}>
                      {member.email}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: roleColor + '22',
                      color: roleColor,
                      flexShrink: 0,
                      fontFamily: "'Poppins', sans-serif",
                    }}>
                      {member.role}
                    </span>
                    {member.status === 'pending' && (
                      <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600, flexShrink: 0 }}>En attente</span>
                    )}
                  </div>
                  {!isCurrentUser && (
                    <button
                      onClick={() => removeMember(member.email)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(239,68,68,0.7)',
                        cursor: 'pointer',
                        padding: 4,
                        flexShrink: 0,
                        fontSize: 14,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}

            {/* Invite form */}
            <div style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 4,
            }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                placeholder="Email de l'invité..."
                type="email"
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Select
                  value={inviteRole}
                  onChange={v => setInviteRole(v as 'member' | 'viewer')}
                  options={roleOptions}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: inviting ? 'rgba(225,31,123,0.5)' : '#E11F7B',
                    border: 'none',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: inviting ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {inviting ? '⏳' : 'Inviter →'}
                </button>
              </div>
              {inviteMsg && (
                <div style={{
                  fontSize: 12,
                  color: inviteMsg.ok ? '#22C55E' : '#EF4444',
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  {inviteMsg.text}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="🔔 Notifications">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
                Alertes quand un agent termine une tâche
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: "'Poppins', sans-serif" }}>
                {permission === 'granted' ? '✅ Notifications activées' : permission === 'denied' ? '🚫 Bloquées dans le navigateur' : 'Non configurées'}
              </div>
            </div>
            {permission !== 'granted' && permission !== 'denied' && (
              <button
                onClick={subscribe}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#E11F7B',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Activer
              </button>
            )}
            {subscribed && <span style={{ fontSize: 11, color: '#22C55E', fontFamily: "'Poppins', sans-serif" }}>✓ Abonné</span>}
          </div>
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="☠️ Zone de danger" danger>
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.30)',
            marginBottom: 12,
            fontFamily: "'Poppins', sans-serif",
          }}>
            Cette action est irréversible.
          </div>
          <button
            onClick={handleClearCanvas}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: confirmClear ? '#EF4444' : 'rgba(239,68,68,0.10)',
              border: `1px solid ${confirmClear ? 'rgba(239,68,68,0.60)' : 'rgba(239,68,68,0.25)'}`,
              color: confirmClear ? '#fff' : '#EF4444',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Poppins', sans-serif",
              width: '100%',
            }}
            onMouseEnter={e => {
              if (!confirmClear) {
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.40)'
              }
            }}
            onMouseLeave={e => {
              if (!confirmClear) {
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)'
              }
            }}
          >
            {confirmClear ? '⚠️ Confirmer la réinitialisation ? (3s)' : '🗑️ Réinitialiser le canvas'}
          </button>
        </SectionCard>
      </div>
    </div>
  )
}
