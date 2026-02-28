import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { Select } from './Select'
import type { SelectOption } from './Select'

const COLOR_PALETTE = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#FF6B35', '#A78BFA']

export function SettingsPanel() {
  const {
    showSettings, setShowSettings,
    boardName, setBoardName,
    isPrivate, setPrivate,
    currentUser,
    groups, addGroup, deleteGroup,
    clearProjects,
    boardMembers, fetchBoardMembers, inviteMember, removeMember,
  } = useLaunchpadStore()

  // Board name editing
  const [editingName, setEditingName] = useState(boardName)

  // Group form
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [newGroupEmoji, setNewGroupEmoji] = useState('✨')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState(COLOR_PALETTE[0])

  // Danger zone
  const [confirmClear, setConfirmClear] = useState(false)

  // Members section
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const roleOptions: SelectOption[] = [
    { value: 'member', label: '✏️ Member' },
    { value: 'viewer', label: '👁️ Viewer' },
  ]

  useEffect(() => {
    if (showSettings && currentUser?.role === 'admin') {
      fetchBoardMembers()
    }
  }, [showSettings, currentUser?.role, fetchBoardMembers])

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

  // Push notifications
  const currentUserId = currentUser?.username ?? null
  const { permission, subscribed, subscribe } = usePushNotifications(currentUserId)

  const handleClearCanvas = () => {
    if (confirmClear) {
      clearProjects()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  return createPortal(
    <AnimatePresence>
      {showSettings && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 490,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 380 }}
            animate={{ x: 0 }}
            exit={{ x: 380 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'fixed', top: 0, right: 0,
              width: 'min(380px, 100vw)', height: '100vh',
              background: '#13111A',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              zIndex: 500,
              overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
            }}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
              position: 'sticky', top: 0, background: '#13111A', zIndex: 10,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>⚙️ Paramètres</span>
              <button
                onClick={() => setShowSettings(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Section 1 — Général */}
              <Section title="Général">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Nom du board</label>
                    <input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => setBoardName(editingName)}
                      onKeyDown={e => { if (e.key === 'Enter') setBoardName(editingName) }}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Mode privé</span>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Protège le board avec une connexion</p>
                    </div>
                    <button
                      onClick={() => setPrivate(!isPrivate)}
                      style={{
                        width: 44, height: 24, borderRadius: 999,
                        background: isPrivate ? '#E11F7B' : 'rgba(255,255,255,0.1)',
                        border: 'none', cursor: 'pointer', position: 'relative',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 3, left: isPrivate ? 23 : 3,
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }} />
                    </button>
                  </div>
                </div>
              </Section>

              {/* Section 2 — Membres (admin only) */}
              {currentUser?.role === 'admin' && (
                <Section title="Membres">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Member list */}
                    {boardMembers.map(member => {
                      const roleColor = member.role === 'admin' ? '#E11F7B' : member.role === 'member' ? '#7C3AED' : 'rgba(255,255,255,0.3)'
                      const isCurrentUser = member.email === currentUser?.username
                      return (
                        <div key={member.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ fontSize: 16 }}>{member.status === 'pending' ? '⏳' : '👤'}</span>
                            <span style={{ fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {member.email}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                              background: roleColor + '22', color: roleColor, flexShrink: 0,
                            }}>
                              {member.role}
                            </span>
                            {member.status === 'pending' && (
                              <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600, flexShrink: 0 }}>En attente</span>
                            )}
                            {member.status === 'active' && (
                              <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600, flexShrink: 0 }}>Actif</span>
                            )}
                          </div>
                          {!isCurrentUser && (
                            <button
                              onClick={() => removeMember(member.email)}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {/* Invite form */}
                    <div style={{
                      padding: 12, borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4,
                    }}>
                      <input
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                        placeholder="Email de l'invité..."
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
                            padding: '10px 16px', borderRadius: 10,
                            background: inviting ? 'rgba(225,31,123,0.5)' : '#E11F7B',
                            border: 'none', color: '#fff', fontSize: 12, fontWeight: 700,
                            cursor: inviting ? 'not-allowed' : 'pointer', flexShrink: 0,
                          }}
                        >
                          {inviting ? '⏳' : 'Inviter →'}
                        </button>
                      </div>
                      {inviteMsg && (
                        <p style={{ margin: 0, fontSize: 12, color: inviteMsg.ok ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                          {inviteMsg.text}
                        </p>
                      )}
                    </div>
                  </div>
                </Section>
              )}

              {/* Section 3 — Groupes */}
              <Section title="Groupes">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groups.map(group => (
                    <div key={group.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{group.emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{group.name}</span>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color }} />
                      </div>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {!showGroupForm ? (
                    <button
                      onClick={() => setShowGroupForm(true)}
                      style={{
                        padding: '8px 12px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px dashed rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Ajouter un groupe
                    </button>
                  ) : (
                    <div style={{
                      padding: 12, borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', flexDirection: 'column', gap: 8,
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
                      <div style={{ display: 'flex', gap: 6 }}>
                        {COLOR_PALETTE.map(c => (
                          <button
                            key={c}
                            onClick={() => setNewGroupColor(c)}
                            style={{
                              width: 20, height: 20, borderRadius: '50%', background: c,
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
                            flex: 1, padding: '8px', borderRadius: 8,
                            background: '#E11F7B', color: '#fff',
                            border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Créer
                        </button>
                        <button
                          onClick={() => { setShowGroupForm(false); setNewGroupName('') }}
                          style={{
                            padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none', color: 'rgba(255,255,255,0.4)',
                            fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* Section 4 — Notifications push */}
              <Section title="Notifications">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                      Recevoir des alertes quand un agent termine une tâche
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
                      {permission === 'granted' ? '✅ Notifications activées' : permission === 'denied' ? '🚫 Bloquées dans le navigateur' : 'Non configurées'}
                    </p>
                  </div>
                  {permission !== 'granted' && permission !== 'denied' && (
                    <button onClick={subscribe} style={{ padding: '8px 14px', borderRadius: 8, background: '#E11F7B', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Activer
                    </button>
                  )}
                  {subscribed && <span style={{ fontSize: 11, color: '#10B981' }}>✓ Abonné</span>}
                </div>
              </Section>

              {/* Section 5 — Danger zone */}
              <Section title="Zone de danger" danger>
                <button
                  onClick={handleClearCanvas}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    background: confirmClear ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${confirmClear ? '#ef4444' : 'rgba(239,68,68,0.3)'}`,
                    color: confirmClear ? '#ef4444' : 'rgba(239,68,68,0.7)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {confirmClear ? '⚠️ Confirmer la réinitialisation ?' : '🗑️ Réinitialiser le canvas'}
                </button>
              </Section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{ paddingTop: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <h3 style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: danger ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.35)',
        marginBottom: 14,
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 6,
  letterSpacing: '0.04em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '9px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}
