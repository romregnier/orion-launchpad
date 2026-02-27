import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useLaunchpadStore } from '../store'

interface Props {
  projectId: string
  currentGroupId?: string
  x: number
  y: number
  onClose: () => void
}

export function GroupContextMenu({ projectId, currentGroupId, x, y, onClose }: Props) {
  const { groups, setProjectGroup } = useLaunchpadStore()

  // Clamp to viewport
  const menuWidth = 200
  const menuHeight = 48 + groups.length * 32 + (currentGroupId ? 32 : 0)
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 8)

  const assign = (groupId: string | null) => {
    setProjectGroup(projectId, groupId)
    onClose()
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        onMouseDown={onClose}
      />
      {/* Menu */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{
          position: 'fixed',
          top: clampedY,
          left: clampedX,
          background: '#3E3742',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 6,
          minWidth: menuWidth,
          zIndex: 1000,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '4px 8px 6px',
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          📁 Assigner au groupe
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 4 }} />

        {/* Group rows */}
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => assign(group.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              height: 32,
              padding: '0 8px',
              borderRadius: 8,
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: '#f0eaf5',
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span>{group.emoji}</span>
            <span style={{ flex: 1 }}>{group.name}</span>
            {group.id === currentGroupId && (
              <span style={{ color: group.color, fontSize: 14 }}>✓</span>
            )}
          </button>
        ))}

        {/* "Sans groupe" option */}
        {currentGroupId && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
            <button
              onClick={() => assign(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                height: 32,
                padding: '0 8px',
                borderRadius: 8,
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: 500,
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span>✕</span>
              <span>Sans groupe</span>
            </button>
          </>
        )}
      </motion.div>
    </>,
    document.body
  )
}
