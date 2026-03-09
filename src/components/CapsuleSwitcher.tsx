import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { supabase } from '../lib/supabase'

export function CapsuleSwitcher() {
  const { activeCapsuleId, capsules, switchCapsule, fetchCapsules } = useLaunchpadStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = capsules.find(c => c.id === activeCapsuleId)

  // Fetch capsules on mount if not yet loaded
  useEffect(() => {
    if (capsules.length === 0) {
      fetchCapsules()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleCreate = async () => {
    const name = prompt('Nom de la nouvelle capsule :')
    if (!name?.trim()) return
    const emoji = prompt('Emoji (ex: 🚀) :') ?? '🌟'
    const { data, error } = await supabase.from('capsules').insert({
      name: name.trim(),
      emoji: emoji.trim() || '🌟',
      color: '#E11F7B',
      owner_id: 'user',
    }).select().single()
    if (!error && data) {
      await fetchCapsules()
      switchCapsule(data.id)
    }
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          background: 'rgba(225,31,123,0.12)',
          border: '1px solid rgba(225,31,123,0.3)',
          borderRadius: 999,
          color: '#fff',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(225,31,123,0.22)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(225,31,123,0.6)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(225,31,123,0.12)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(225,31,123,0.3)'
        }}
      >
        <span>{current?.emoji ?? '🌟'}</span>
        <span>{current?.name ?? 'Studio'}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
        >
          <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              minWidth: 220,
              background: '#2C272F',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              zIndex: 200,
              padding: '6px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {capsules.map(c => (
              <div
                key={c.id}
                onClick={() => { switchCapsule(c.id); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 13,
                  background: c.id === activeCapsuleId ? 'rgba(225,31,123,0.15)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (c.id !== activeCapsuleId) {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    c.id === activeCapsuleId ? 'rgba(225,31,123,0.15)' : 'transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{c.emoji}</span>
                  <span>{c.name}</span>
                </span>
                {c.id === activeCapsuleId && (
                  <span style={{
                    background: '#E11F7B',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 999,
                    letterSpacing: '0.05em',
                  }}>✓</span>
                )}
              </div>
            ))}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 4px' }} />

            <div
              onClick={handleCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
                ;(e.currentTarget as HTMLDivElement).style.color = '#fff'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLDivElement).style.color = 'rgba(255,255,255,0.5)'
              }}
            >
              <span style={{ fontSize: 16 }}>＋</span>
              <span>Nouvelle capsule</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
