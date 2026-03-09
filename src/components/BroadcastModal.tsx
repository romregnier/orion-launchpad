import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Agent meta ────────────────────────────────────────────────────────────────
const AGENTS: Record<string, { name: string; emoji: string; color: string }> = {
  orion: { name: 'Orion', emoji: '🌟', color: '#E11F7B' },
  nova:  { name: 'Nova',  emoji: '💡', color: '#6366F1' },
  aria:  { name: 'Aria',  emoji: '🎨', color: '#EC4899' },
  forge: { name: 'Forge', emoji: '🔨', color: '#F59E0B' },
  rex:   { name: 'Rex',   emoji: '🔍', color: '#10B981' },
}

// ── Styles helpers ────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const modalStyle: React.CSSProperties = {
  background: '#2C272F',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
  padding: 28,
  width: '100%',
  maxWidth: 480,
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  fontFamily: "'Poppins', sans-serif",
  color: '#F0EDF5',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(240,237,245,0.5)',
  display: 'block',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          style={{
            position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            zIndex: 2000,
            background: '#22C55E', color: '#fff',
            padding: '10px 20px', borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            fontFamily: "'Poppins', sans-serif",
            boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Helper: get or create conversation ───────────────────────────────────────
async function getOrCreateConversation(agentKey: string): Promise<string | null> {
  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('agent_conversations')
    .select('id')
    .eq('agent_key', agentKey)
    .limit(1)
    .single()

  if (existing?.id) return existing.id

  // Create new conversation
  const { data: created, error } = await supabase
    .from('agent_conversations')
    .insert({
      agent_key: agentKey,
      title: `Conversation avec ${AGENTS[agentKey]?.name ?? agentKey}`,
    })
    .select('id')
    .single()

  if (error || !created) return null
  return created.id
}

// ── BroadcastModal ────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
}

export function BroadcastModal({ open, onClose }: Props) {
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)

  const toggleAgent = (key: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => setSelectedAgents(new Set(Object.keys(AGENTS)))
  const clearAll = () => setSelectedAgents(new Set())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedAgents.size === 0) { setError('Sélectionne au moins un agent'); return }
    if (!message.trim()) { setError('Message requis'); return }
    setLoading(true)
    setError(null)

    try {
      for (const agentKey of selectedAgents) {
        const conversationId = await getOrCreateConversation(agentKey)
        if (!conversationId) continue

        await supabase.from('agent_direct_messages').insert({
          conversation_id: conversationId,
          content: message.trim(),
          role: 'user',
          metadata: { type: 'task' },
        })
      }

      setMessage('')
      setSelectedAgents(new Set())
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMessage('')
    setSelectedAgents(new Set())
    setError(null)
    onClose()
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="broadcast-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={overlayStyle}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={modalStyle}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>📡 Broadcaster une tâche</h2>
                  <p style={{ fontSize: 12, color: 'rgba(240,237,245,0.4)', margin: 0 }}>
                    Envoie un message à un ou plusieurs agents
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: 'none',
                    borderRadius: 8, padding: '6px 10px',
                    cursor: 'pointer', color: 'rgba(240,237,245,0.6)',
                    fontSize: 16, fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Agent selection */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Agents cibles</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: '#E11F7B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
                        Tous
                      </button>
                      <button type="button" onClick={clearAll} style={{ background: 'none', border: 'none', color: 'rgba(240,237,245,0.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
                        Aucun
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(AGENTS).map(([key, meta]) => {
                      const selected = selectedAgents.has(key)
                      return (
                        <motion.button
                          key={key}
                          type="button"
                          onClick={() => toggleAgent(key)}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 999,
                            background: selected ? `${meta.color}20` : 'rgba(255,255,255,0.05)',
                            border: `1.5px solid ${selected ? meta.color : 'rgba(255,255,255,0.1)'}`,
                            color: selected ? meta.color : 'rgba(240,237,245,0.5)',
                            fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
                            transition: 'all 0.15s ease',
                            boxShadow: selected ? `0 0 12px ${meta.color}30` : 'none',
                          }}
                        >
                          <span>{meta.emoji}</span>
                          <span>{meta.name}</span>
                          {selected && <span style={{ fontSize: 10 }}>✓</span>}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label style={labelStyle}>Message / Tâche</label>
                  <textarea
                    placeholder="Décris la tâche à envoyer aux agents…"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#F0EDF5',
                      fontSize: 14,
                      fontFamily: "'Poppins', sans-serif",
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#E11F7B' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    required
                  />
                  <div style={{ fontSize: 11, color: 'rgba(240,237,245,0.3)', marginTop: 4 }}>
                    {selectedAgents.size > 0 ? `Envoi vers ${selectedAgents.size} agent(s)` : 'Aucun agent sélectionné'}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    fontSize: 13, color: '#EF4444',
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(240,237,245,0.7)',
                      fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Annuler
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading || selectedAgents.size === 0}
                    whileHover={(!loading && selectedAgents.size > 0) ? { scale: 1.02 } : {}}
                    whileTap={(!loading && selectedAgents.size > 0) ? { scale: 0.97 } : {}}
                    style={{
                      flex: 2, padding: '10px 16px', borderRadius: 10,
                      background: (loading || selectedAgents.size === 0) ? 'rgba(225,31,123,0.35)' : '#E11F7B',
                      border: 'none',
                      color: '#fff',
                      fontSize: 14, fontWeight: 700,
                      cursor: (loading || selectedAgents.size === 0) ? 'not-allowed' : 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                      boxShadow: (loading || selectedAgents.size === 0) ? 'none' : '0 4px 16px rgba(225,31,123,0.35)',
                    }}
                  >
                    {loading ? 'Envoi…' : '📡 Broadcaster'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message="Tâche envoyée ✅" visible={showToast} />
    </>
  )
}
