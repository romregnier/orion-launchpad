/**
 * GalaxyPulse — TK-0235
 * Effet visuel "Galaxy Pulse" — onde de choc circulaire SVG depuis la position d'un agent.
 * Déclenché par heartbeat realtime. S'affiche sur le canvas au-dessus de NebulaParallax.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHeartbeat } from '../hooks/useHeartbeat'
import type { AgentHeartbeat } from '../hooks/useHeartbeat'

interface PulseWave {
  id: string
  x: number
  y: number
  color: string
  createdAt: number
}

interface GalaxyPulseProps {
  capsuleId: string
  /** Map of agent_id → canvas position */
  agentPositions?: Record<string, { x: number; y: number }>
  /** Map of agent_id → color */
  agentColors?: Record<string, string>
  /** Container dimensions */
  width?: number
  height?: number
}

const DEFAULT_COLOR = '#6366F1'
const WAVE_DURATION_MS = 1500
const MAX_WAVES = 8

export function GalaxyPulse({
  capsuleId,
  agentPositions = {},
  agentColors = {},
  width = window.innerWidth,
  height = window.innerHeight,
}: GalaxyPulseProps) {
  const { subscribeToHeartbeats } = useHeartbeat()
  const [waves, setWaves] = useState<PulseWave[]>([])

  const addWave = useCallback((heartbeat: AgentHeartbeat) => {
    const pos = agentPositions[heartbeat.agent_id]
    if (!pos) return

    const wave: PulseWave = {
      id: heartbeat.id,
      x: pos.x,
      y: pos.y,
      color: agentColors[heartbeat.agent_id] ?? DEFAULT_COLOR,
      createdAt: Date.now(),
    }

    setWaves(prev => {
      const next = [...prev, wave].slice(-MAX_WAVES)
      return next
    })

    // Auto-remove after animation
    setTimeout(() => {
      setWaves(prev => prev.filter(w => w.id !== wave.id))
    }, WAVE_DURATION_MS + 200)
  }, [agentPositions, agentColors])

  useEffect(() => {
    if (!capsuleId) return
    const unsubscribe = subscribeToHeartbeats(capsuleId, addWave)
    return unsubscribe
  }, [capsuleId, subscribeToHeartbeats, addWave])

  if (waves.length === 0) return null

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5, // above NebulaParallax, below agent cards
        overflow: 'visible',
      }}
      width={width}
      height={height}
    >
      <AnimatePresence>
        {waves.map(wave => (
          <GalaxyWave key={wave.id} wave={wave} />
        ))}
      </AnimatePresence>
    </svg>
  )
}

function GalaxyWave({ wave }: { wave: PulseWave }) {
  return (
    <motion.circle
      cx={wave.x}
      cy={wave.y}
      initial={{ r: 0, opacity: 0.9 }}
      animate={{ r: 80, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      fill="none"
      stroke={wave.color}
      strokeWidth={2}
    />
  )
}

export default GalaxyPulse
