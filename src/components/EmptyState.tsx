/**
 * EmptyState — TK-0219
 * Composant réutilisable pour les états vides de toutes les pages.
 * Animation Framer Motion : fade + slide up
 * CSS variables uniquement — 0 hardcoded colors
 */
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-10)',
        textAlign: 'center',
        background: 'transparent',
      }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'backOut' }}
        style={{
          fontSize: 48,
          lineHeight: 1,
          marginBottom: 'var(--space-2)',
        }}
      >
        {icon}
      </motion.div>

      {/* Title */}
      <p
        style={{
          margin: 0,
          fontSize: 'var(--font-size-lg)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </p>

      {/* Description */}
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)',
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          onClick={action.onClick}
          style={{
            marginTop: 'var(--space-2)',
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: 'var(--text-on-accent, #fff)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}
