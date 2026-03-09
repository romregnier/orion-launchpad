/**
 * CreateCapsuleModal
 *
 * Modal de création de capsule avec UI propre.
 * Remplace le prompt() basique dans CapsuleSwitcher.
 */
import { useState } from 'react'
import { ModalShell } from './ModalShell'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'

const PRESET_EMOJIS = ['🌟', '🚀', '🎯', '💡', '🔥', '⚡', '🎨', '🏗️', '🧠', '💎', '🌈', '🦁', '🐉', '🌊', '🎭']
const PRESET_COLORS = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateCapsuleModal({ open, onClose }: Props) {
  const { fetchCapsules, switchCapsule } = useLaunchpadStore()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🌟')
  const [color, setColor] = useState('#E11F7B')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Le nom est requis.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: dbError } = await supabase
      .from('capsules')
      .insert({ name: name.trim(), emoji, color, owner_id: 'user' })
      .select()
      .single()
    setLoading(false)
    if (dbError || !data) {
      setError(dbError?.message ?? 'Erreur lors de la création.')
      return
    }
    await fetchCapsules()
    switchCapsule(data.id)
    // Reset form
    setName('')
    setEmoji('🌟')
    setColor('#E11F7B')
    onClose()
  }

  const footer = (
    <>
      <button
        onClick={onClose}
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.6)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        Annuler
      </button>
      <button
        onClick={handleCreate}
        disabled={loading || !name.trim()}
        style={{
          padding: '8px 20px',
          borderRadius: 8,
          background: loading || !name.trim() ? 'rgba(225,31,123,0.35)' : '#E11F7B',
          border: 'none',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
          fontFamily: "'Poppins', sans-serif",
          transition: 'background 0.15s',
        }}
      >
        {loading ? 'Création…' : 'Créer la capsule'}
      </button>
    </>
  )

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Nouvelle capsule"
      subtitle="Organisez vos projets par espace de travail"
      emoji={emoji}
      footer={footer}
      maxWidth={440}
    >
      {/* Name input */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Nom
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 40))}
          placeholder="Mon espace de travail"
          maxLength={40}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 14,
            fontFamily: "'Poppins', sans-serif",
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#E11F7B' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'right' }}>
          {name.length}/40
        </div>
      </div>

      {/* Emoji picker */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Emoji
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {PRESET_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                padding: '8px',
                borderRadius: 8,
                border: emoji === e ? '2px solid #E11F7B' : '2px solid transparent',
                background: emoji === e ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e2 => { if (emoji !== e) (e2.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e2 => { if (emoji !== e) (e2.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Color palette */}
      <div style={{ marginBottom: error ? 12 : 0 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Couleur
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: c,
                border: color === c ? '3px solid #fff' : '3px solid transparent',
                cursor: 'pointer',
                boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                transition: 'all 0.12s',
                outline: 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13 }}>
          {error}
        </div>
      )}
    </ModalShell>
  )
}
