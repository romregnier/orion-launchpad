/**
 * PulseIndicator — TK-0235
 * Indicateur visuel de heartbeat pour les agents sur le canvas.
 * Props: status ('alive' | 'idle' | 'error'), size (px)
 */
import { motion } from 'framer-motion'

export type PulseStatus = 'alive' | 'idle' | 'error'

interface PulseIndicatorProps {
  status: PulseStatus
  size?: number
}

const STATUS_CONFIG: Record<PulseStatus, { color: string; bg: string }> = {
  alive: { color: '#10B981', bg: 'rgba(16,185,129,0.25)' },
  idle:  { color: '#6B7280', bg: 'rgba(107,114,128,0.2)' },
  error: { color: '#EF4444', bg: 'rgba(239,68,68,0.25)' },
}

export function PulseIndicator({ status, size = 10 }: PulseIndicatorProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Ring pulse — alive only */}
      {status === 'alive' && (
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: cfg.bg,
          }}
        />
      )}

      {/* Ring error — blink */}
      {status === 'error' && (
        <motion.div
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: cfg.bg,
          }}
        />
      )}

      {/* Core dot */}
      <div style={{
        position: 'absolute',
        inset: '20%',
        borderRadius: '50%',
        background: cfg.color,
        boxShadow: `0 0 ${size * 0.6}px ${cfg.color}`,
      }} />
    </div>
  )
}

export default PulseIndicator
