import { motion, AnimatePresence } from 'framer-motion'

interface TypingIndicatorProps {
  agentName: string
  color?: string           // couleur accent de l'agent, défaut '#E11F7B'
  visible: boolean         // contrôle mount/unmount animé
}

export function TypingIndicator({ agentName, color = '#E11F7B', visible }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="typing"
          initial={{ opacity: 0, y: 6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            marginBottom: 4,
          }}
        >
          {/* 3 dots staggered */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [0.8, 1.15, 0.8],
                  opacity: [0.35, 1, 0.35],
                }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.18,   // staggered 180ms entre dots
                }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  opacity: 0.65,
                }}
              />
            ))}
          </div>
          {/* Label */}
          <span style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'Poppins, sans-serif',
            fontStyle: 'italic',
          }}>
            {agentName} écrit…
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
