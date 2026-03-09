import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

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
  maxWidth: 420,
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  fontFamily: "'Poppins', sans-serif",
  color: '#F0EDF5',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F0EDF5',
  fontSize: 14,
  fontFamily: "'Poppins', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(240,237,245,0.5)',
  display: 'block',
  marginBottom: 6,
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
            background: '#22C55E',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            fontFamily: "'Poppins', sans-serif",
            boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── InviteMemberModal ─────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
}

export function InviteMemberModal({ open, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'member' | 'admin'>('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Email requis'); return }
    setLoading(true)
    setError(null)

    const invite_token = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from('capsule_members')
      .insert({ email: email.trim(), role, invite_token, status: 'pending' })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    // Success — show toast, reset, close
    setEmail('')
    setRole('member')
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
    onClose()
  }

  const handleClose = () => {
    setEmail('')
    setRole('member')
    setError(null)
    onClose()
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="invite-overlay"
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Inviter un membre</h2>
                  <p style={{ fontSize: 12, color: 'rgba(240,237,245,0.4)', margin: 0 }}>
                    Une invitation sera générée et envoyée
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

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Email */}
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    placeholder="prenom@exemple.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#E11F7B' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    autoFocus
                    required
                  />
                </div>

                {/* Rôle */}
                <div>
                  <label style={labelStyle}>Rôle</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as 'viewer' | 'member' | 'admin')}
                    style={{
                      ...inputStyle,
                      cursor: 'pointer',
                      appearance: 'none',
                    }}
                  >
                    <option value="viewer">👁️ Viewer — Lecture seule</option>
                    <option value="member">✏️ Member — Peut éditer</option>
                    <option value="admin">🛡️ Admin — Accès complet</option>
                  </select>
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
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      flex: 2, padding: '10px 16px', borderRadius: 10,
                      background: loading ? 'rgba(225,31,123,0.4)' : '#E11F7B',
                      border: 'none',
                      color: '#fff',
                      fontSize: 14, fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                      boxShadow: loading ? 'none' : '0 4px 16px rgba(225,31,123,0.35)',
                    }}
                  >
                    {loading ? 'Envoi…' : '📨 Envoyer l\'invitation'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message="Invitation envoyée ✅" visible={showToast} />
    </>
  )
}
