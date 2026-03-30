/**
 * OnboardingModal — TK-0223 [ONBOARD-001]
 * Full screen welcome flow for first-time users with no capsule.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'

export interface OnboardingModalProps {
  onComplete: (capsule: { name: string; emoji: string; color: string }) => void
}

const EMOJI_OPTIONS = ['🚀', '💡', '🎯', '⚡', '🌟', '🔥']

const COLOR_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Pink',   value: 'var(--accent)' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Amber',  value: '#F59E0B' },
  { label: 'Cyan',   value: '#4FC3F7' },
  { label: 'Green',  value: '#10B981' },
  { label: 'Rose',   value: '#F43F5E' },
]

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🚀')
  const [color, setColor] = useState('var(--accent)')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    await onComplete({ name: name.trim(), emoji, color })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-card, rgba(255,255,255,0.05))',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <h1 style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--text-primary, #fff)',
            lineHeight: 1.2,
          }}>
            Bienvenue dans votre Launchpad
          </h1>
          <p style={{
            margin: '10px 0 0',
            fontSize: 15,
            color: 'var(--text-secondary, rgba(255,255,255,0.55))',
          }}>
            Créez votre premier espace de travail pour commencer.
          </p>
        </div>

        {/* Capsule name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary, rgba(255,255,255,0.55))',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Nom de votre espace
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ex : Mon Projet, Studio Rive…"
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 16,
              color: 'var(--text-primary, #fff)',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            autoFocus
          />
        </div>

        {/* Emoji picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary, rgba(255,255,255,0.55))',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Emoji
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  border: emoji === e
                    ? '2px solid var(--accent)'
                    : '2px solid rgba(255,255,255,0.1)',
                  background: emoji === e
                    ? 'rgba(225,31,123,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  fontSize: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary, rgba(255,255,255,0.55))',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Couleur
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: color === c.value
                    ? '3px solid rgba(255,255,255,0.9)'
                    : '2px solid rgba(255,255,255,0.15)',
                  background: c.value,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  transform: color === c.value ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || submitting}
          style={{
            background: name.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            color: name.trim() ? '#fff' : 'rgba(255,255,255,0.35)',
            border: 'none',
            borderRadius: 12,
            padding: '14px 24px',
            fontSize: 16,
            fontWeight: 600,
            cursor: name.trim() && !submitting ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {submitting ? (
            <>
              <span style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }} />
              Création…
            </>
          ) : (
            'Créer mon espace 🚀'
          )}
        </button>
      </motion.div>
    </motion.div>
  )
}
