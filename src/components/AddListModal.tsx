import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import type { ListType } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const TYPE_OPTIONS: { type: ListType; emoji: string; label: string; color: string }[] = [
  { type: 'brainstorm', emoji: '💡', label: 'Brainstorm', color: '#F59E0B' },
  { type: 'checklist',  emoji: '✅', label: 'Checklist',  color: '#10B981' },
  { type: 'ranking',    emoji: '🏆', label: 'Classement', color: '#FFD700' },
  { type: 'notes',      emoji: '📝', label: 'Notes',      color: '#8B5CF6' },
]

export function AddListModal({ open, onClose }: Props) {
  const { addList } = useLaunchpadStore()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ListType>('brainstorm')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const handleClose = () => { setTitle(''); setType('brainstorm'); onClose() }

  const handleCreate = () => {
    if (!title.trim()) return
    addList(title.trim(), type)
    handleClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 190,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(380px, calc(100vw - 32px))',
              background: '#0F0C14',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.1)',
              padding: 24,
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>📋 Nouvelle liste</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Crée une liste collaborative</p>
            </div>

            {/* Title input */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                Titre
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                placeholder="Ex: Idées marketing…"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '10px 12px',
                  color: '#fff', fontSize: 13,
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Type selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>
                Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => setType(opt.type)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${type === opt.type ? opt.color + '88' : 'rgba(255,255,255,0.08)'}`,
                      background: type === opt.type ? opt.color + '18' : 'rgba(255,255,255,0.03)',
                      color: type === opt.type ? opt.color : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 7,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '9px 16px', borderRadius: 10, border: 'none',
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                style={{
                  padding: '9px 20px', borderRadius: 10, border: 'none',
                  background: title.trim() ? 'linear-gradient(135deg, #E11F7B, #c41a6a)' : 'rgba(255,255,255,0.06)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: title.trim() ? 'pointer' : 'default',
                  boxShadow: title.trim() ? '0 2px 12px rgba(225,31,123,0.4)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                Créer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
