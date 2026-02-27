import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import { sha256 } from '../utils/hash'

const COLOR_PALETTE = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#FF6B35', '#A78BFA']

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function SettingsPanel() {
  const {
    showSettings, setShowSettings,
    boardName, setBoardName,
    isPrivate, setPrivate,
    members, addMember, removeMember,
    groups, addGroup, deleteGroup,
    clearProjects,
  } = useLaunchpadStore()

  // Board name editing
  const [editingName, setEditingName] = useState(boardName)

  // Member form
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member')
  const [copiedPassword, setCopiedPassword] = useState(false)

  // Group form
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [newGroupEmoji, setNewGroupEmoji] = useState('✨')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState(COLOR_PALETTE[0])

  // Danger zone
  const [confirmClear, setConfirmClear] = useState(false)

  const handleAddMember = useCallback(async () => {
    if (!newUsername.trim() || !newPassword.trim()) return
    const hash = await sha256(newPassword)
    addMember(newUsername.trim(), hash, newRole)
    setNewUsername('')
    setNewPassword('')
    setNewRole('member')
    setShowMemberForm(false)
  }, [newUsername, newPassword, newRole, addMember])

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return
    addGroup({ name: newGroupName.trim(), color: newGroupColor, emoji: newGroupEmoji })
    setNewGroupEmoji('✨')
    setNewGroupName('')
    setNewGroupColor(COLOR_PALETTE[0])
    setShowGroupForm(false)
  }

  const handleGeneratePassword = () => {
    const pwd = generatePassword()
    setNewPassword(pwd)
  }

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword).then(() => {
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    })
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

              {/* Section 2 — Membres (if private) */}
              {isPrivate && (
                <Section title="Membres">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {members.map(member => (
                      <div key={member.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>👤 {member.username}</span>
                          <span style={{
                            marginLeft: 8, fontSize: 10, fontWeight: 700,
                            padding: '2px 7px', borderRadius: 999,
                            background: member.role === 'admin' ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.07)',
                            color: member.role === 'admin' ? '#E11F7B' : 'rgba(255,255,255,0.5)',
                          }}>
                            {member.role}
                          </span>
                        </div>
                        {member.id !== 'member-romain' && (
                          <button
                            onClick={() => removeMember(member.id)}
                            style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', padding: 4 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}

                    {!showMemberForm ? (
                      <button
                        onClick={() => setShowMemberForm(true)}
                        style={{
                          padding: '8px 12px', borderRadius: 10,
                          background: 'rgba(225,31,123,0.1)',
                          border: '1px dashed rgba(225,31,123,0.3)',
                          color: '#E11F7B', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + Inviter un membre
                      </button>
                    ) : (
                      <div style={{
                        padding: 12, borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        <input
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          placeholder="Nom d'utilisateur"
                          style={inputStyle}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Mot de passe"
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <button
                            onClick={handleGeneratePassword}
                            style={{
                              padding: '0 10px', borderRadius: 8,
                              background: 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600,
                              cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            Générer
                          </button>
                        </div>
                        {newPassword && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <code style={{
                              flex: 1, padding: '6px 10px', borderRadius: 8,
                              background: 'rgba(255,255,255,0.05)',
                              color: '#10B981', fontSize: 11, fontFamily: 'monospace',
                            }}>
                              {newPassword}
                            </code>
                            <button
                              onClick={handleCopyPassword}
                              style={{
                                padding: '6px 10px', borderRadius: 8,
                                background: copiedPassword ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)',
                                border: 'none', color: copiedPassword ? '#10B981' : 'rgba(255,255,255,0.5)',
                                fontSize: 10, fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              {copiedPassword ? '✓ Copié' : 'Copier'}
                            </button>
                          </div>
                        )}
                        <select
                          value={newRole}
                          onChange={e => setNewRole(e.target.value as 'admin' | 'member')}
                          style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' }}
                        >
                          <option value="member">Membre</option>
                          <option value="admin">Admin</option>
                        </select>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={handleAddMember}
                            style={{
                              flex: 1, padding: '8px', borderRadius: 8,
                              background: '#E11F7B', color: '#fff',
                              border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            Ajouter
                          </button>
                          <button
                            onClick={() => { setShowMemberForm(false); setNewUsername(''); setNewPassword('') }}
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

              {/* Section 4 — Danger zone */}
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
