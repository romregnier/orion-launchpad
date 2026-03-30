/**
 * AgentStatusBadge — Indicateur visuel du statut d'un agent.
 * Affiche un badge coloré selon le statut (online/idle/offline) et des dots animés si build_task running.
 */
import { motion } from 'framer-motion'

// ── Couleurs par agent ────────────────────────────────────────────────────────
const AGENT_META: Record<string, { color: string }> = {
  orion: { color: '#4FC3F7' },
  nova:  { color: 'var(--accent)' },
  aria:  { color: '#8B5CF6' },
  forge: { color: '#F59E0B' },
  rex:   { color: '#10B981' },
}

interface AgentStatusBadgeProps {
  agentName: string
  agentKey?: string
  hasRunningBuildTask: boolean
  isWorking: boolean
  isMoving: boolean
}

/**
 * Bulle de pensée animée (3 dots pulsants) quand l'agent a une build_task running.
 */
export function AgentStatusBadge({ agentName, hasRunningBuildTask, isWorking, isMoving }: AgentStatusBadgeProps) {
  const key = agentName.toLowerCase()
  const meta = AGENT_META[key] ?? { color: '#fff' }

  return (
    <>
      {/* TK-0019 — Bulle de pensée animée quand l'agent a une build_task running */}
      {hasRunningBuildTask && (
        <div style={{
          position: 'absolute',
          top: -22,
          right: -6,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          {[0, 0.15, 0.30].map((delay, i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 0.9, delay, ease: 'easeInOut' }}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: meta.color,
                boxShadow: `0 0 4px ${meta.color}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Indicateur visuel de déplacement */}
      {isMoving && isWorking && (
        <motion.div
          animate={{ opacity: [0.6, 0], scale: [1, 1.5] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(225,31,123,0.3)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Working badge — ⚡ quand en mouvement, 🔨 quand arrivé */}
      {isWorking && (
        <motion.div
          animate={isMoving ? { opacity: [1, 0.5, 1] } : {}}
          transition={isMoving ? { repeat: Infinity, duration: 0.6 } : {}}
          style={{
            background: 'rgba(225,31,123,0.2)',
            border: '1px solid rgba(225,31,123,0.4)',
            borderRadius: 4,
            padding: '2px 7px',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
          }}
        >
          {isMoving ? '⚡ en route' : '🔨 en cours'}
        </motion.div>
      )}
    </>
  )
}
