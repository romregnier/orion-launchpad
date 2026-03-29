import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { Select } from './Select'
import { IntegrationCard } from './IntegrationCard'
import { supabase } from '../lib/supabase'
import type { SelectOption } from './Select'
import { logAuditEvent } from '../lib/auditLog'

const COLOR_PALETTE = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#FF6B35', '#A78BFA']

const EMOJI_LIST = [
  '🚀', '⚡', '🌟', '🎯', '🔧', '🎨', '🛡️', '📊', '📣', '🤝', '🔍', '💡',
  '🏆', '🚂', '🌊', '🔥', '💎', '🤖', '🧠', '🌈', '🦁', '🐉', '🦋', '🌸',
  '🍀', '🌙', '☀️', '⭐', '🎵', '🎮', '🏄', '🚀', '💼', '🏗️', '🧩', '🔮',
  '🎭', '🗺️', '🧪', '📡', '🏰', '🌍', '🦊', '🐺', '🦅', '🐬', '🌺', '🍁',
]

const TIMEZONES = [
  'UTC', 'Europe/Paris', 'Europe/London', 'Europe/Berlin', 'Europe/Madrid',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Singapore', 'Asia/Dubai', 'Asia/Kolkata', 'Australia/Sydney',
  'Pacific/Auckland', 'Africa/Cairo', 'Africa/Nairobi',
]

const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  custom: [],
}

// SettingsSection kept for type reference (used via AllSettingsSections)

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#fff',
  fontSize: 13,
  fontFamily: "'Poppins', sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s ease',
  boxSizing: 'border-box' as const,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 6,
  letterSpacing: '0.04em',
  fontFamily: "'Poppins', sans-serif",
}

// Inline save feedback indicator
function SaveIndicator({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <AnimatePresence>
      {(saving || saved) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 12,
          }}
        >
          {saving ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              ⏳
            </motion.span>
          ) : (
            <span style={{ color: '#10B981' }}>✓</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook for auto-saving capsule settings
function useAutoSaveCapsuleSetting(capsuleId: string | null, section: string, key: string, delay = 800) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = async (value: string) => {
    if (!capsuleId) return
    setSaving(true)
    await supabase.from('capsule_settings').upsert(
      { capsule_id: capsuleId, section, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'capsule_id,section,key' }
    )
    // TK-0157 — Audit log: settings changed
    logAuditEvent({
      capsule_id: capsuleId,
      event_type: 'settings_change',
      event_data: { section, field: key, value: key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('password') ? '[redacted]' : value },
      severity: 'info',
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const debouncedSave = (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(value), delay)
  }

  return { save, debouncedSave, saving, saved }
}

// ── General Section ────────────────────────────────────────────────────────────
function GeneralSection() {
  const { currentCapsule, activeCapsuleId } = useLaunchpadStore()
  const [name, setName] = useState(currentCapsule?.name || '')
  const [description, setDescription] = useState(currentCapsule?.description || '')
  const [emoji, setEmoji] = useState(currentCapsule?.emoji || '🚀')
  const [color, setColor] = useState(currentCapsule?.color || '#E11F7B')
  const [baseUrl, setBaseUrl] = useState('')
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearch, setEmojiSearch] = useState('')

  const nameSave = useAutoSaveCapsuleSetting(activeCapsuleId, 'general', '_capsule_name')
  const descSave = useAutoSaveCapsuleSetting(activeCapsuleId, 'general', '_capsule_description')
  const baseUrlSave = useAutoSaveCapsuleSetting(activeCapsuleId, 'general', 'base_url')
  const tzSave = useAutoSaveCapsuleSetting(activeCapsuleId, 'general', 'timezone')

  // Load settings from DB
  useEffect(() => {
    if (!activeCapsuleId) return
    supabase.from('capsule_settings')
      .select('key, value')
      .eq('capsule_id', activeCapsuleId)
      .eq('section', 'general')
      .in('key', ['base_url', 'timezone'])
      .then(({ data }) => {
        if (data) {
          data.forEach(row => {
            if (row.key === 'base_url') setBaseUrl(row.value)
            if (row.key === 'timezone') setTimezone(row.value)
          })
        }
      })
  }, [activeCapsuleId])

  // Save capsule name/emoji/color directly to capsules table
  const saveCapsuleField = async (field: string, value: string) => {
    if (!activeCapsuleId) return
    await supabase.from('capsules').update({ [field]: value }).eq('id', activeCapsuleId)
  }

  const filteredEmojis = emojiSearch
    ? EMOJI_LIST.filter(e => e.includes(emojiSearch))
    : EMOJI_LIST

  const timezoneOptions: SelectOption[] = TIMEZONES.map(tz => ({ value: tz, label: tz }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Emoji + Name row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Emoji picker button */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              width: 44, height: 44,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              cursor: 'pointer',
              fontSize: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {emoji}
          </button>
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  background: '#1E1B22',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 12,
                  padding: 12,
                  zIndex: 100,
                  width: 240,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <input
                  value={emojiSearch}
                  onChange={e => setEmojiSearch(e.target.value)}
                  placeholder="Rechercher..."
                  style={{
                    ...inputStyle,
                    marginBottom: 8,
                    fontSize: 12,
                  }}
                  autoFocus
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                  {filteredEmojis.map((e, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setEmoji(e)
                        saveCapsuleField('emoji', e)
                        setShowEmojiPicker(false)
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 18, borderRadius: 6, padding: 4,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = 'none')}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Name input */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>NOM DE LA CAPSULE</label>
          <div style={{ position: 'relative' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => {
                saveCapsuleField('name', name)
                nameSave.save(name)
              }}
              style={{ ...inputStyle, paddingRight: 32 }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
              placeholder="Mon Launchpad"
            />
            <SaveIndicator saving={nameSave.saving} saved={nameSave.saved} />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>DESCRIPTION</label>
        <div style={{ position: 'relative' }}>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => {
              saveCapsuleField('description', description)
              descSave.save(description)
            }}
            rows={3}
            maxLength={200}
            placeholder="Description de la capsule..."
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: 72,
              paddingRight: 32,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
          />
          <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            {description.length}/200
          </div>
        </div>
      </div>

      {/* Color swatches */}
      <div>
        <label style={labelStyle}>COULEUR D'ACCENT</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COLOR_PALETTE.map(c => (
            <button
              key={c}
              onClick={() => {
                setColor(c)
                saveCapsuleField('color', c)
              }}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: c,
                border: color === c ? '2px solid white' : '2px solid transparent',
                cursor: 'pointer',
                boxShadow: color === c ? `0 0 0 1px rgba(255,255,255,0.3)` : 'none',
                transition: 'all 0.15s ease',
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Base URL */}
      <div>
        <label style={labelStyle}>BASE URL</label>
        <div style={{ position: 'relative' }}>
          <input
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            onBlur={() => baseUrlSave.save(baseUrl)}
            type="url"
            placeholder="https://orion-launchpad.surge.sh"
            style={{ ...inputStyle, paddingRight: 32 }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
          />
          <SaveIndicator saving={baseUrlSave.saving} saved={baseUrlSave.saved} />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'Poppins', sans-serif" }}>
          Pour les redirects OAuth et emails
        </p>
      </div>

      {/* Timezone */}
      <div>
        <label style={labelStyle}>FUSEAU HORAIRE</label>
        <Select
          value={timezone}
          onChange={v => {
            setTimezone(v)
            tzSave.save(v)
          }}
          options={timezoneOptions}
        />
      </div>

      {/* Existing board settings preserved */}
      <ExistingBoardSettings />
    </div>
  )
}

// Preserved existing settings (private mode, groups, members, notifications, danger zone)
function ExistingBoardSettings() {
  const {
    isPrivate, setPrivate, currentUser,
    groups, addGroup, deleteGroup, clearProjects, boardMembers, fetchBoardMembers,
    inviteMember, removeMember,
  } = useLaunchpadStore()

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

  const roleOptions: SelectOption[] = [
    { value: 'member', label: '✏️ Member' },
    { value: 'viewer', label: '👁️ Viewer' },
  ]

  useEffect(() => { if (currentUser?.role === 'admin') fetchBoardMembers() }, [currentUser?.role, fetchBoardMembers])
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteMsg(null)
    const result = await inviteMember(inviteEmail.trim(), inviteRole)
    setInviting(false)
    if (result.ok) { setInviteMsg({ ok: true, text: '✅ Invitation envoyée !' }); setInviteEmail('') }
    else setInviteMsg({ ok: false, text: `❌ ${result.error ?? 'Erreur'}` })
    setTimeout(() => setInviteMsg(null), 4000)
  }

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return
    addGroup({ name: newGroupName.trim(), color: newGroupColor, emoji: newGroupEmoji })
    setNewGroupEmoji('✨'); setNewGroupName(''); setNewGroupColor(COLOR_PALETTE[0]); setShowGroupForm(false)
  }

  return (
    <>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontFamily: "'Poppins', sans-serif" }}>
          Configuration board
        </div>
        {/* Mode privé */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>Mode privé</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: "'Poppins', sans-serif" }}>Protège le board avec une connexion</div>
          </div>
          <button
            onClick={() => setPrivate(!isPrivate)}
            style={{ width: 44, height: 24, borderRadius: 999, background: isPrivate ? '#E11F7B' : 'rgba(255,255,255,0.10)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <div style={{ position: 'absolute', top: 3, left: isPrivate ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          </button>
        </div>
      </div>

      {/* Groupes */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: "'Poppins', sans-serif" }}>📁 Groupes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {groups.map(group => (
            <div key={group.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span>{group.emoji}</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1, fontFamily: "'Poppins', sans-serif" }}>{group.name}</span>
              <button onClick={() => deleteGroup(group.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
              >🗑️</button>
            </div>
          ))}
          {!showGroupForm ? (
            <button onClick={() => setShowGroupForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 0', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
            >+ Ajouter un groupe</button>
          ) : (
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newGroupEmoji} onChange={e => setNewGroupEmoji(e.target.value)} style={{ ...inputStyle, width: 48, textAlign: 'center', flexShrink: 0 }} />
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddGroup() }} placeholder="Nom du groupe" style={{ ...inputStyle, flex: 1 }} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLOR_PALETTE.map(c => <button key={c} onClick={() => setNewGroupColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: newGroupColor === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />)}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleAddGroup} style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#E11F7B', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Créer</button>
                <button onClick={() => { setShowGroupForm(false); setNewGroupName('') }} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Membres */}
      {currentUser?.role === 'admin' && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: "'Poppins', sans-serif" }}>👥 Membres</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {boardMembers.map(member => {
              const roleColor = member.role === 'admin' ? '#E11F7B' : member.role === 'member' ? '#7C3AED' : 'rgba(255,255,255,0.3)'
              const isCurrentUser = member.email === currentUser?.username
              return (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 16 }}>{member.status === 'pending' ? '⏳' : '👤'}</span>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Poppins', sans-serif" }}>{member.email}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: roleColor + '22', color: roleColor, flexShrink: 0, fontFamily: "'Poppins', sans-serif" }}>{member.role}</span>
                    {member.status === 'pending' && <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600, flexShrink: 0 }}>En attente</span>}
                  </div>
                  {!isCurrentUser && <button onClick={() => removeMember(member.email)} style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', padding: 4, flexShrink: 0, fontSize: 14 }}>✕</button>}
                </div>
              )
            })}
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleInvite() }} placeholder="Email de l'invité..." type="email" style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Select value={inviteRole} onChange={v => setInviteRole(v as 'member' | 'viewer')} options={roleOptions} style={{ flex: 1 }} />
                <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} style={{ padding: '8px 14px', borderRadius: 8, background: inviting ? 'rgba(225,31,123,0.5)' : '#E11F7B', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: inviting ? 'not-allowed' : 'pointer', flexShrink: 0, fontFamily: "'Poppins', sans-serif" }}>
                  {inviting ? '⏳' : 'Inviter →'}
                </button>
              </div>
              {inviteMsg && <div style={{ fontSize: 12, color: inviteMsg.ok ? '#22C55E' : '#EF4444', fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>{inviteMsg.text}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: "'Poppins', sans-serif" }}>🔔 Notifications</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>Alertes quand un agent termine une tâche</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: "'Poppins', sans-serif" }}>
              {permission === 'granted' ? '✅ Notifications activées' : permission === 'denied' ? '🚫 Bloquées dans le navigateur' : 'Non configurées'}
            </div>
          </div>
          {permission !== 'granted' && permission !== 'denied' && (
            <button onClick={subscribe} style={{ padding: '8px 14px', borderRadius: 8, background: '#E11F7B', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Activer</button>
          )}
          {subscribed && <span style={{ fontSize: 11, color: '#22C55E', fontFamily: "'Poppins', sans-serif" }}>✓ Abonné</span>}
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ borderTop: '1px solid rgba(239,68,68,0.15)', paddingTop: 16, marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(239,68,68,0.70)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: "'Poppins', sans-serif" }}>☠️ Zone de danger</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', marginBottom: 12, fontFamily: "'Poppins', sans-serif" }}>Cette action est irréversible.</div>
        <button
          onClick={() => { if (confirmClear) { clearProjects(); setConfirmClear(false) } else { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000) } }}
          style={{ padding: '8px 16px', borderRadius: 8, background: confirmClear ? '#EF4444' : 'rgba(239,68,68,0.10)', border: `1px solid ${confirmClear ? 'rgba(239,68,68,0.60)' : 'rgba(239,68,68,0.25)'}`, color: confirmClear ? '#fff' : '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: "'Poppins', sans-serif", width: '100%' }}
        >
          {confirmClear ? '⚠️ Confirmer la réinitialisation ? (3s)' : '🗑️ Réinitialiser le canvas'}
        </button>
      </div>
    </>
  )
}

// ── LLM Section ────────────────────────────────────────────────────────────────
function LLMSection() {
  const { activeCapsuleId } = useLaunchpadStore()
  const [provider, setProvider] = useState<'anthropic' | 'openai' | 'google' | 'custom'>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null)
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [defaultModel, setDefaultModel] = useState('claude-sonnet-4-6')
  const [fallbackModel, setFallbackModel] = useState('claude-haiku-4-5')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testState, setTestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveWarning, setSaveWarning] = useState(false)

  // Load from DB
  useEffect(() => {
    if (!activeCapsuleId) return
    supabase.from('capsule_settings')
      .select('key, value')
      .eq('capsule_id', activeCapsuleId)
      .eq('section', 'llm')
      .then(({ data }) => {
        if (data) {
          data.forEach(row => {
            if (row.key === 'provider') setProvider(row.value as typeof provider)
            if (row.key === 'api_key') setApiKeyMasked(`••••••••${row.value.slice(-4)}`)
            if (row.key === 'custom_endpoint') setCustomEndpoint(row.value)
            if (row.key === 'default_model') setDefaultModel(row.value)
            if (row.key === 'fallback_model') setFallbackModel(row.value)
          })
        }
      })
  }, [activeCapsuleId])

  const handleTest = async () => {
    if (!apiKey && !apiKeyMasked) return
    setTestState('loading')
    setTestError('')
    try {
      let ok = false
      if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] })
        })
        ok = res.status !== 401 && res.status !== 403
      } else if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        })
        ok = res.ok
      } else if (provider === 'google') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
        ok = res.ok
      } else if (provider === 'custom') {
        ok = true // no test for custom
      }
      setTestState(ok ? 'success' : 'error')
      if (ok) setTimeout(() => setTestState('idle'), 3000)
      else setTestError('Clé invalide ou quota dépassé')
    } catch {
      setTestState('error')
      setTestError('Erreur réseau')
    }
  }

  const handleSave = async () => {
    if (!activeCapsuleId) return
    if (testState === 'idle' && apiKey) {
      setSaveWarning(true)
      return
    }
    await doSave()
  }

  const doSave = async () => {
    if (!activeCapsuleId) return
    setSaveWarning(false)
    setSaving(true)
    const upserts = [
      { capsule_id: activeCapsuleId, section: 'llm', key: 'provider', value: provider, is_secret: false, updated_at: new Date().toISOString() },
      { capsule_id: activeCapsuleId, section: 'llm', key: 'default_model', value: defaultModel, is_secret: false, updated_at: new Date().toISOString() },
      { capsule_id: activeCapsuleId, section: 'llm', key: 'fallback_model', value: fallbackModel, is_secret: false, updated_at: new Date().toISOString() },
    ]
    if (provider === 'custom' && customEndpoint) {
      upserts.push({ capsule_id: activeCapsuleId, section: 'llm', key: 'custom_endpoint', value: customEndpoint, is_secret: false, updated_at: new Date().toISOString() })
    }
    // Only upsert api_key if non-empty
    if (apiKey) {
      upserts.push({ capsule_id: activeCapsuleId, section: 'llm', key: 'api_key', value: apiKey, is_secret: true, updated_at: new Date().toISOString() })
    }
    await supabase.from('capsule_settings').upsert(upserts, { onConflict: 'capsule_id,section,key' })
    setSaving(false)
    setDirty(false)
    if (apiKey) setApiKeyMasked(`••••••••${apiKey.slice(-4)}`)
    setApiKey('')
  }

  const providerCards = [
    { key: 'anthropic', label: 'Anthropic', icon: '🧠' },
    { key: 'openai', label: 'OpenAI', icon: '✦' },
    { key: 'google', label: 'Google', icon: '🔮' },
    { key: 'custom', label: 'Custom', icon: '⚙️' },
  ]

  const modelOptions = PROVIDER_MODELS[provider] || []
  const modelSelectOptions: SelectOption[] = modelOptions.map(m => ({ value: m, label: m }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Provider cards */}
      <div>
        <label style={labelStyle}>PROVIDER</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {providerCards.map(p => (
            <button
              key={p.key}
              onClick={() => { setProvider(p.key as typeof provider); setDirty(true) }}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: 10,
                background: provider === p.key ? 'rgba(225,31,123,0.10)' : 'rgba(255,255,255,0.04)',
                border: provider === p.key ? '1px solid rgba(225,31,123,0.40)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                boxShadow: provider === p.key ? '0 0 12px rgba(225,31,123,0.15)' : 'none',
              }}
            >
              <span style={{ fontSize: 20 }}>{p.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: provider === p.key ? '#fff' : 'rgba(255,255,255,0.55)', fontFamily: "'Poppins', sans-serif" }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div>
        <label style={labelStyle}>CLÉ API</label>
        <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)' }}>
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setDirty(true); setTestState('idle') }}
            placeholder={apiKeyMasked || 'sk-••••••••••••••••'}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              padding: '9px 12px',
              color: '#fff',
              fontSize: 13,
              outline: 'none',
              fontFamily: "'Poppins', sans-serif",
            }}
          />
          {/* Show/hide */}
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderLeft: '1px solid rgba(255,255,255,0.10)',
              padding: '0 12px',
              cursor: 'pointer',
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {showApiKey ? '🙈' : '👁'}
          </button>
          {/* Test button */}
          <button
            onClick={handleTest}
            disabled={testState === 'loading'}
            style={{
              background: testState === 'success' ? 'rgba(16,185,129,0.10)' : testState === 'error' ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.06)',
              border: 'none',
              borderLeft: '1px solid rgba(255,255,255,0.10)',
              padding: '0 14px',
              cursor: testState === 'loading' ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: testState === 'success' ? '#10B981' : testState === 'error' ? '#EF4444' : 'rgba(255,255,255,0.6)',
              whiteSpace: 'nowrap',
              fontFamily: "'Poppins', sans-serif",
              transition: 'all 0.2s ease',
            }}
          >
            {testState === 'loading' ? '⏳' : testState === 'success' ? '✓ Connecté' : testState === 'error' ? '✕ Erreur' : 'Tester →'}
          </button>
        </div>
        {testState === 'error' && testError && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EF4444', fontFamily: "'Poppins', sans-serif" }}>{testError}</p>
        )}
      </div>

      {/* Custom endpoint */}
      {provider === 'custom' && (
        <div>
          <label style={labelStyle}>ENDPOINT CUSTOM</label>
          <input
            value={customEndpoint}
            onChange={e => { setCustomEndpoint(e.target.value); setDirty(true) }}
            placeholder="https://api.example.com/v1"
            type="url"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
          />
        </div>
      )}

      {/* Default model */}
      <div>
        <label style={labelStyle}>MODÈLE PAR DÉFAUT</label>
        {provider !== 'custom' ? (
          <Select
            value={defaultModel}
            onChange={v => { setDefaultModel(v); setDirty(true) }}
            options={modelSelectOptions}
          />
        ) : (
          <input
            value={defaultModel}
            onChange={e => { setDefaultModel(e.target.value); setDirty(true) }}
            placeholder="nom-du-modèle"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
          />
        )}
      </div>

      {/* Fallback model */}
      <div>
        <label style={labelStyle}>MODÈLE DE SECOURS</label>
        <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'Poppins', sans-serif" }}>Utilisé si quota dépassé</p>
        {provider !== 'custom' ? (
          <Select
            value={fallbackModel}
            onChange={v => { setFallbackModel(v); setDirty(true) }}
            options={modelSelectOptions}
          />
        ) : (
          <input
            value={fallbackModel}
            onChange={e => { setFallbackModel(e.target.value); setDirty(true) }}
            placeholder="nom-du-modèle-fallback"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(225,31,123,0.50)')}
          />
        )}
      </div>

      {/* Save warning */}
      {saveWarning && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)', fontSize: 12, color: '#F59E0B', fontFamily: "'Poppins', sans-serif" }}>
          ⚠️ Cette clé n'a pas été testée. Sauvegarder quand même ?
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={doSave} style={{ padding: '6px 12px', borderRadius: 6, background: '#F59E0B', border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Sauvegarder</button>
            <button onClick={() => setSaveWarning(false)} style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!dirty || saving}
        style={{
          padding: '10px',
          borderRadius: 10,
          background: dirty && !saving ? '#E11F7B' : 'rgba(255,255,255,0.07)',
          border: 'none',
          color: dirty ? '#fff' : 'rgba(255,255,255,0.4)',
          fontSize: 13,
          fontWeight: 700,
          cursor: dirty && !saving ? 'pointer' : 'not-allowed',
          fontFamily: "'Poppins', sans-serif",
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
      >
        {saving ? '⏳ Sauvegarde...' : dirty ? '💾 Sauvegarder' : '✓ Sauvegardé'}
        {dirty && !saving && (
          <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
        )}
      </button>
    </div>
  )
}

// ── Integrations Section ────────────────────────────────────────────────────────
function IntegrationsSection() {
  const integrations = [
    {
      icon: '🐙',
      name: 'GitHub',
      description: 'Accès repos + webhooks',
      section: 'integrations',
      fields: [
        { key: 'github_pat', label: 'Personal Access Token', type: 'password' as const, isSecret: true, hint: 'Scopes requis: repo, workflow' }
      ],
      onTest: async (vals: Record<string, string>) => {
        try {
          const res = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${vals.github_pat}` } })
          return res.ok
        } catch { return false }
      }
    },
    {
      icon: '✈️',
      name: 'Telegram',
      description: 'Notifications agents',
      section: 'integrations',
      fields: [
        { key: 'telegram_bot_token', label: 'Bot Token', type: 'password' as const, isSecret: true },
        { key: 'telegram_admin_chat_id', label: 'Admin Chat ID', type: 'text' as const }
      ],
      onTest: async (vals: Record<string, string>) => {
        try {
          const res = await fetch(`https://api.telegram.org/bot${vals.telegram_bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: vals.telegram_admin_chat_id, text: '🤖 Orion.build connected!' })
          })
          return res.ok
        } catch { return false }
      }
    },
    {
      icon: '🌊',
      name: 'Surge.sh',
      description: 'Déploiements automatiques',
      section: 'integrations',
      fields: [
        { key: 'surge_token', label: 'Deploy Token', type: 'password' as const, isSecret: true }
      ],
      onTest: async (vals: Record<string, string>) => {
        try {
          const res = await fetch('https://surge.sh/token', { headers: { token: vals.surge_token } })
          return res.ok
        } catch { return false }
      }
    },
    {
      icon: '🔮',
      name: 'Google AI',
      description: 'Gemini API pour les agents',
      section: 'integrations',
      fields: [
        { key: 'google_ai_key', label: 'API Key', type: 'password' as const, isSecret: true }
      ],
      onTest: async (vals: Record<string, string>) => {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${vals.google_ai_key}`)
          return res.ok
        } catch { return false }
      }
    },
    {
      icon: '🛡️',
      name: 'Sentry',
      description: 'Monitoring erreurs',
      section: 'integrations',
      fields: [
        { key: 'sentry_dsn', label: 'DSN', type: 'url' as const, placeholder: 'https://xxx@yyy.ingest.sentry.io/zzz' }
      ],
      onTest: undefined,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: "'Poppins', sans-serif" }}>
        Configurez les services tiers utilisés par vos agents.
      </p>
      {integrations.map(integration => (
        <IntegrationCard key={integration.name} {...integration} />
      ))}
    </div>
  )
}

// ── BudgetsSection — TK-0156 ────────────────────────────────────────────────
interface AgentBudgetRow {
  id: string
  agent_key: string
  capsule_id: string | null
  monthly_token_limit: number
  monthly_usd_limit: number
  alert_threshold_pct: number
  hard_stop: boolean
  tokens_used_mtd: number
  usd_used_mtd: number
}

const AGENT_EMOJIS: Record<string, string> = {
  orion: '🌟', nova: '✦', aria: '🎨', forge: '🔧', rex: '🛡️',
}

function BudgetsSection() {
  const { canvasAgents } = useLaunchpadStore()
  const [budgets, setBudgets] = useState<AgentBudgetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLimit, setEditLimit] = useState('')
  const [editUsdLimit, setEditUsdLimit] = useState('')

  useEffect(() => {
    supabase.from('agent_budgets').select('*').then(({ data }) => {
      setBudgets((data as AgentBudgetRow[]) ?? [])
      setLoading(false)
    })
  }, [])

  const getBudgetPct = (b: AgentBudgetRow) => {
    const tokenPct = b.monthly_token_limit > 0 ? (b.tokens_used_mtd / b.monthly_token_limit) * 100 : 0
    const usdPct = b.monthly_usd_limit > 0 ? (b.usd_used_mtd / b.monthly_usd_limit) * 100 : 0
    return Math.min(Math.round(Math.max(tokenPct, usdPct)), 100)
  }

  const getBarColor = (pct: number) => {
    if (pct >= 90) return '#EF4444'
    if (pct >= 80) return '#EF4444'
    if (pct >= 70) return '#F59E0B'
    return '#10B981'
  }

  const handleSaveLimits = async (b: AgentBudgetRow) => {
    const newTokenLimit = parseInt(editLimit) || b.monthly_token_limit
    const newUsdLimit = parseFloat(editUsdLimit) || b.monthly_usd_limit
    await supabase.from('agent_budgets').update({
      monthly_token_limit: newTokenLimit,
      monthly_usd_limit: newUsdLimit,
      updated_at: new Date().toISOString(),
    }).eq('id', b.id)
    setBudgets(prev => prev.map(x => x.id === b.id ? { ...x, monthly_token_limit: newTokenLimit, monthly_usd_limit: newUsdLimit } : x))
    setEditingId(null)
  }

  const handleToggleHardStop = async (b: AgentBudgetRow) => {
    const newVal = !b.hard_stop
    await supabase.from('agent_budgets').update({ hard_stop: newVal, updated_at: new Date().toISOString() }).eq('id', b.id)
    setBudgets(prev => prev.map(x => x.id === b.id ? { ...x, hard_stop: newVal } : x))
  }

  // Agents du canvas sans budget → afficher un état vide
  const agentsWithoutBudget = canvasAgents.filter(a => !budgets.some(b => b.agent_key === a.agent_key))

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ fontSize: 24 }}>⏳</motion.div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: "'Poppins', sans-serif" }}>
        Suivez la consommation de tokens et les coûts USD par agent. Les limites mensuelles se réinitialisent automatiquement.
      </p>

      {budgets.length === 0 && agentsWithoutBudget.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Aucun agent sur le canvas. Recrutez des agents pour suivre leurs budgets.
        </div>
      )}

      {budgets.map(b => {
        const agent = canvasAgents.find(a => a.agent_key === b.agent_key)
        const pct = getBudgetPct(b)
        const barColor = getBarColor(pct)
        const emoji = AGENT_EMOJIS[b.agent_key] ?? '🤖'
        const isEditing = editingId === b.id

        return (
          <div key={b.id} style={{
            background: 'rgba(44,39,47,0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
                  {agent?.name ?? b.agent_key}
                </span>
                {pct >= 70 && (
                  <span style={{
                    background: pct >= 80 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                    border: `1px solid ${pct >= 80 ? '#EF4444' : '#F59E0B'}`,
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: pct >= 80 ? '#EF4444' : '#F59E0B',
                    fontFamily: "'Poppins', sans-serif",
                  }}>
                    {pct >= 90 ? '⚠️ Critique' : pct >= 80 ? '🔴 Danger' : '🟡 Alerte'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: barColor, fontFamily: "'Poppins', sans-serif" }}>{pct}%</span>
                <button
                  onClick={() => { setEditingId(isEditing ? null : b.id); setEditLimit(String(b.monthly_token_limit)); setEditUsdLimit(String(b.monthly_usd_limit)) }}
                  style={{
                    background: isEditing ? 'rgba(225,31,123,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isEditing ? 'rgba(225,31,123,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    color: isEditing ? '#E11F7B' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >{isEditing ? '✕ Annuler' : '✏️ Modifier'}</button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: "'Poppins', sans-serif" }}>
              <span>🔢 {b.tokens_used_mtd.toLocaleString()} / {(b.monthly_token_limit / 1000000).toFixed(1)}M tokens</span>
              <span>💵 ${Number(b.usd_used_mtd).toFixed(2)} / ${Number(b.monthly_usd_limit).toFixed(2)}</span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ height: '100%', background: barColor, borderRadius: 3 }}
              />
            </div>

            {/* Edit limits */}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingTop: 4 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle }}>Limite tokens/mois</label>
                      <input
                        style={{ ...inputStyle, fontSize: 12 }}
                        type="number"
                        value={editLimit}
                        onChange={e => setEditLimit(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle }}>Limite USD/mois</label>
                      <input
                        style={{ ...inputStyle, fontSize: 12 }}
                        type="number"
                        step="0.01"
                        value={editUsdLimit}
                        onChange={e => setEditUsdLimit(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => handleSaveLimits(b)}
                      style={{
                        padding: '8px 14px',
                        background: '#E11F7B',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Poppins', sans-serif",
                        whiteSpace: 'nowrap',
                      }}
                    >💾 Sauver</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hard stop toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'Poppins', sans-serif" }}>
                  🛑 Hard stop
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontFamily: "'Poppins', sans-serif" }}>
                  (bloque l'agent si le budget est dépassé)
                </span>
              </div>
              <button
                onClick={() => handleToggleHardStop(b)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  border: 'none',
                  background: b.hard_stop ? '#E11F7B' : 'rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: b.hard_stop ? 21 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
          </div>
        )
      })}

      {/* Agents sans budget configuré */}
      {agentsWithoutBudget.length > 0 && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: "'Poppins', sans-serif" }}>
            Agents sans budget configuré : {agentsWithoutBudget.map(a => a.name).join(', ')}
            <br />
            <span style={{ fontSize: 11 }}>Les budgets sont créés automatiquement lors des opérations LLM.</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ── Coming Soon placeholder ────────────────────────────────────────────────────
function ComingSoonSection({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', minHeight: 240 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontFamily: "'Poppins', sans-serif" }}>{label}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: "'Poppins', sans-serif" }}>Coming soon</div>
    </div>
  )
}

// ── Main AppSettingsTab ────────────────────────────────────────────────────────
type AllSettingsSections = 'general' | 'llm' | 'integrations' | 'notifications' | 'members' | 'budgets' | 'security' | 'danger'

export function AppSettingsTab() {
  const [section, setSection] = useState<AllSettingsSections>('general')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  // Responsive detection
  useState(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  })

  const navItems: { key: AllSettingsSections; icon: string; label: string; danger?: boolean }[] = [
    { key: 'general', icon: '⚡', label: 'General' },
    { key: 'llm', icon: '🤖', label: 'LLM & Models' },
    { key: 'integrations', icon: '🔌', label: 'Integrations' },
    { key: 'notifications', icon: '🔔', label: 'Notifications' },
    { key: 'members', icon: '👥', label: 'Members' },
    { key: 'budgets', icon: '💰', label: 'Budgets' },
    { key: 'security', icon: '🛡️', label: 'Security' },
    { key: 'danger', icon: '🗑️', label: 'Danger Zone', danger: true },
  ]

  const renderContent = () => {
    switch (section) {
      case 'general': return <GeneralSection />
      case 'llm': return <LLMSection />
      case 'integrations': return <IntegrationsSection />
      case 'notifications': return <ComingSoonSection label="Notifications" />
      case 'members': return <ComingSoonSection label="Members" />
      case 'budgets': return <BudgetsSection />
      case 'security': return <ComingSoonSection label="Security" />
      case 'danger': return <ComingSoonSection label="Danger Zone" />
    }
  }

  if (isMobile) {
    // Mobile: horizontal scrollable tabs
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
        {/* Horizontal tabs */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          gap: 2,
          paddingBottom: 0,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '10px 12px',
                minWidth: 70,
                minHeight: 44,
                background: section === item.key ? 'rgba(225,31,123,0.12)' : 'transparent',
                borderBottom: section === item.key ? `2px solid ${item.danger ? '#EF4444' : '#E11F7B'}` : '2px solid transparent',
                border: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: section === item.key ? 700 : 500,
                color: section === item.key ? (item.danger ? '#EF4444' : '#fff') : (item.danger ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.5)'),
                transition: 'all 0.15s ease',
                fontFamily: "'Poppins', sans-serif",
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, padding: '20px 4px', overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 500 }}>
      {/* Sidebar nav — 120px, 8 items */}
      <div style={{
        width: 120,
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingTop: 4,
      }}>
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              borderRadius: '6px 0 0 6px',
              background: section === item.key
                ? (item.danger ? 'rgba(239,68,68,0.10)' : 'rgba(225,31,123,0.12)')
                : 'transparent',
              borderLeft: section === item.key
                ? `2px solid ${item.danger ? '#EF4444' : '#E11F7B'}`
                : '2px solid transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 12,
              fontWeight: section === item.key ? 700 : 500,
              color: section === item.key
                ? (item.danger ? '#EF4444' : '#fff')
                : (item.danger ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.5)'),
              transition: 'all 0.15s ease',
              fontFamily: "'Poppins', sans-serif",
              width: '100%',
              marginTop: item.danger ? 'auto' : undefined,
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, paddingLeft: 24, paddingRight: 8, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
