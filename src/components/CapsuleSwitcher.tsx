import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { CreateCapsuleModal } from './CreateCapsuleModal'
import { useGalaxyMode } from '../hooks/useGalaxyMode'

interface CapsuleSwitcherProps {
  compact?: boolean
}

export function CapsuleSwitcher({ compact }: CapsuleSwitcherProps = {}) {
  const { activeCapsuleId, capsules, switchCapsule, fetchCapsules } = useLaunchpadStore()
  const galaxyMode = useGalaxyMode()
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  const ref = useRef<HTMLDivElement>(null)
  const current = capsules.find(c => c.id === activeCapsuleId)

  // Fetch capsules on mount if not yet loaded
  useEffect(() => {
    if (capsules.length === 0) {
      fetchCapsules()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect mobile
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Close dropdown on outside click (desktop only)
  useEffect(() => {
    if (!open || isMobile) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, isMobile])

  const handleCreate = () => {
    setOpen(false)
    setShowCreate(true)
  }

  // Bottom-sheet content (shared between mobile sheet and desktop dropdown)
  const capsuleItems = (
    <>
      {capsules.map(c => (
        <motion.button
          key={c.id}
          onClick={() => { switchCapsule(c.id); setOpen(false) }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: isMobile ? '12px 20px' : '8px 10px',
            borderRadius: isMobile ? 0 : 8,
            cursor: 'pointer',
            color: '#fff',
            fontSize: isMobile ? 15 : 13,
            fontFamily: "'Poppins', sans-serif",
            background: c.id === activeCapsuleId ? 'rgba(225,31,123,0.15)' : 'transparent',
            border: 'none',
            textAlign: 'left' as const,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && c.id === activeCapsuleId && (
              <span style={{ color: 'var(--accent)' }}>●</span>
            )}
            <span style={{ fontSize: 16 }}>{c.emoji}</span>
            <span>{c.name}</span>
          </span>
          {!isMobile && c.id === activeCapsuleId && (
            <span style={{
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 7px',
              borderRadius: 999,
              letterSpacing: '0.05em',
            }}>✓</span>
          )}
        </motion.button>
      ))}

      {!isMobile && <div style={{ height: 1, background: 'var(--border-default)', margin: '6px 4px' }} />}

      <motion.button
        onClick={handleCreate}
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: isMobile ? '12px 20px' : '8px 10px',
          borderRadius: isMobile ? 0 : 8,
          cursor: 'pointer',
          color: isMobile ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
          fontSize: isMobile ? 14 : 13,
          fontFamily: "'Poppins', sans-serif",
          background: 'transparent',
          border: 'none',
          textAlign: 'left' as const,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ fontSize: 18 }}>＋</span>
        <span>{galaxyMode ? 'Nouvelle Nébuleuse' : 'Nouvelle capsule'}</span>
      </motion.button>
    </>
  )

  return (
    <>
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ opacity: 0.85 }}
        whileTap={{ scale: 0.96 }}
        title={compact ? (current?.name ?? 'Studio') : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 4 : 6,
          padding: compact ? '6px 8px' : '5px 12px',
          background: 'rgba(225,31,123,0.12)',
          border: '1px solid rgba(225,31,123,0.3)',
          borderRadius: 999,
          color: '#fff',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: "'Poppins', sans-serif",
          WebkitTapHighlightColor: 'transparent',
          width: compact ? '100%' : undefined,
          justifyContent: compact ? 'center' : undefined,
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
        <span style={{ fontSize: compact ? 18 : undefined }}>{current?.emoji ?? '🌟'}</span>
        {!compact && <span>{current?.name ?? 'Studio'}</span>}
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
        >
          <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      {/* Desktop dropdown */}
      {!isMobile && (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="capsule-switcher-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: 220,
                background: 'var(--bg-surface)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                zIndex: 200,
                padding: '6px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {capsuleItems}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>

    {/* Mobile bottom-sheet via portal */}
    {isMobile && createPortal(
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 9990,
                background: 'rgba(0,0,0,0.55)',
              }}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                zIndex: 9991,
                background: 'var(--bg-surface)',
                borderRadius: '16px 16px 0 0',
                paddingBottom: 32,
                maxHeight: '70vh',
                overflowY: 'auto',
              }}
            >
              {/* Handle bar */}
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: 'rgba(255,255,255,0.15)',
                margin: '12px auto 16px',
              }} />
              {/* Titre */}
              <div style={{
                padding: '0 20px 12px',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                color: 'var(--text-tertiary)', fontFamily: "'Poppins', sans-serif",
                textTransform: 'uppercase' as const,
              }}>
                {galaxyMode ? '🌀 Changer de Nébuleuse' : 'Changer de Capsule'}
              </div>
              {capsuleItems}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}

    <CreateCapsuleModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  )
}
