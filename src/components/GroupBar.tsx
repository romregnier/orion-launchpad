import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'

const COLOR_PALETTE = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#FF6B35', '#A78BFA']

export function GroupBar() {
  const { groups, activeGroup, setGroupFilter, addGroup } = useLaunchpadStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newEmoji, setNewEmoji] = useState('✨')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0])
  const formRef = useRef<HTMLDivElement>(null)

  // Close create form on Escape or click outside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCreateForm(false) }
    const onClick = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowCreateForm(false)
      }
    }
    if (showCreateForm) {
      window.addEventListener('keydown', onKey)
      window.addEventListener('mousedown', onClick)
    }
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [showCreateForm])

  const handleConfirm = () => {
    if (!newName.trim()) return
    addGroup({ name: newName.trim(), color: newColor, emoji: newEmoji })
    setNewEmoji('✨')
    setNewName('')
    setNewColor(COLOR_PALETTE[0])
    setShowCreateForm(false)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
    }}>
      {/* "+" create button or inline form */}
      <div ref={formRef}>
        <AnimatePresence mode="wait">
          {showCreateForm ? (
            <motion.div
              key="form"
              initial={{ width: 28, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 28, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(62,55,66,0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                padding: '2px 8px',
                overflow: 'hidden',
                height: 28,
              }}
            >
              <input
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                style={{
                  width: 28, background: 'transparent', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 14, textAlign: 'center', flexShrink: 0,
                }}
              />
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
                placeholder="Nom du groupe"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 11, fontWeight: 600, minWidth: 0,
                }}
              />
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{
                      width: 12, height: 12, borderRadius: '50%', background: c,
                      border: newColor === c ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleConfirm}
                style={{
                  background: '#E11F7B', color: '#fff', border: 'none', borderRadius: '50%',
                  width: 18, height: 18, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >✓</button>
            </motion.div>
          ) : (
            <motion.button
              key="plus"
              onClick={() => setShowCreateForm(true)}
              whileHover={{ borderColor: '#E11F7B' }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: 16, fontWeight: 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >+</motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Group pills */}
      {groups.map(group => {
        const isActive = activeGroup === group.id
        return (
          <motion.button
            key={group.id}
            onClick={() => setGroupFilter(isActive ? null : group.id)}
            whileTap={{ scale: 0.95 }}
            title={isActive ? 'Désactiver le filtre' : `Filtrer par ${group.name}`}
            style={{
              height: 28,
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: `1px solid ${group.color}`,
              background: isActive ? group.color : `${group.color}33`,
              color: isActive ? '#fff' : group.color,
              boxShadow: isActive ? `0 0 12px ${group.color}66` : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{group.emoji}</span>
            <span>{group.name}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
