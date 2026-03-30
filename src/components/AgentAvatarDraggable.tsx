/**
 * AgentAvatarDraggable — Avatar agent avec logique drag & drop sur le canvas.
 * Utilise AgentAvatar pour le visuel et AgentStatusBadge pour les indicateurs.
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { AgentAvatar } from './AgentAvatar'
import { AgentStatusBadge } from './AgentStatusBadge'
import type { CanvasAgent } from '../types'

// ── Couleurs par agent (pour le badge modèle LLM) ────────────────────────────
const AGENT_META_COLORS: Record<string, { color: string }> = {
  orion: { color: '#4FC3F7' },
  nova:  { color: 'var(--accent)' },
  aria:  { color: '#8B5CF6' },
  forge: { color: '#F59E0B' },
  rex:   { color: '#10B981' },
}

interface AgentAvatarDraggableProps {
  agent: CanvasAgent
  canvasScale: number
  onChat?: (agent: CanvasAgent) => void
  onEdit?: (agent: CanvasAgent) => void
  /** Si true, déclenche l'animation de spawn (nouvel agent recruté). */
  isNew?: boolean
  /** Pourcentage du budget mensuel consommé (0-100). Badge affiché si >= 70. */
  budgetPct?: number
}

/**
 * Avatar draggable d'un agent sur le canvas.
 *
 * Deux modes :
 * - **Idle** : l'agent est draggable, positionné sur le canvas selon `agent.position`.
 * - **Working** : quand `agent.working_on_project` est défini, l'agent se déplace
 *   automatiquement (style Warcraft 3) vers la ProjectCard correspondante.
 */
export function AgentAvatarDraggable({ agent, canvasScale, onChat, onEdit, isNew, budgetPct }: AgentAvatarDraggableProps) {
  const { projects, canvasAgents, updateAgentPosition, removeCanvasAgent, currentUser, pushOverlapping, setAgentWorkingOn, activeBuildTasks } = useLaunchpadStore()
  const [hovered, setHovered] = useState(false)
  const [showSpawnAnim, setShowSpawnAnim] = useState(!!isNew)
  const [showNewBadge, setShowNewBadge] = useState(!!isNew)

  useEffect(() => {
    if (isNew) {
      const t1 = setTimeout(() => setShowSpawnAnim(false), 800)
      const t2 = setTimeout(() => setShowNewBadge(false), 3000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [isNew])

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, agentX: 0, agentY: 0 })

  const isAdmin = currentUser?.role === 'admin'
  const isOwner = currentUser?.username === agent.owner
  const canEdit = isAdmin || isOwner

  const targetProject = agent.working_on_project
    ? projects.find(p => p.id === agent.working_on_project)
    : null

  const hasRunningBuildTask = activeBuildTasks.some(
    t => t.agent_key === agent.agent_key && t.status === 'running'
  )

  const isWorking = !!targetProject || hasRunningBuildTask

  const workingAgentIndex = agent.working_on_project
    ? canvasAgents
        .filter(a => a.working_on_project === agent.working_on_project)
        .findIndex(a => a.id === agent.id)
    : 0

  const displayX = targetProject
    ? targetProject.position.x + 10 + (workingAgentIndex * 44)
    : (dragPos?.x ?? agent.position.x)

  const displayY = targetProject
    ? targetProject.position.y + 195
    : (dragPos?.y ?? agent.position.y)

  const [isMoving, setIsMoving] = useState(false)
  const prevPosRef = useRef({ x: displayX, y: displayY })

  useEffect(() => {
    const moved =
      Math.abs(displayX - prevPosRef.current.x) > 2 ||
      Math.abs(displayY - prevPosRef.current.y) > 2
    if (moved) {
      setIsMoving(true)
      prevPosRef.current = { x: displayX, y: displayY }
      const t = setTimeout(() => setIsMoving(false), 800)
      return () => clearTimeout(t)
    }
  }, [displayX, displayY])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isWorking) return
    e.stopPropagation()
    e.preventDefault()
    isDragging.current = true
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      agentX: agent.position.x,
      agentY: agent.position.y,
    }

    let rafId: number | null = null
    const lastPosRef = { x: agent.position.x, y: agent.position.y }

    const onUpMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale
        const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale
        lastPosRef.x = dragStart.current.agentX + dx
        lastPosRef.y = dragStart.current.agentY + dy
        setDragPos({ x: lastPosRef.x, y: lastPosRef.y })
      })
    }

    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setDragPos(null)
      updateAgentPosition(agent.id, lastPosRef.x, lastPosRef.y).then(() => {
        pushOverlapping(agent.id, lastPosRef.x, lastPosRef.y)
      })
      window.removeEventListener('mousemove', onUpMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onUpMove)
    window.addEventListener('mouseup', onUp)
  }, [agent.id, agent.position.x, agent.position.y, canvasScale, updateAgentPosition, pushOverlapping, isWorking])

  void setAgentWorkingOn

  const agentKey = agent.name.toLowerCase()
  void AGENT_META_COLORS[agentKey]

  return (
    <motion.div
      data-no-drag
      className="canvas-agent-avatar"
      initial={false}
      animate={{
        x: displayX,
        y: displayY,
        scale: isWorking ? 0.85 : 1,
        rotate: isMoving ? [-2, 2, -2] : 0,
      }}
      transition={
        isMoving
          ? { rotate: { repeat: Infinity, duration: 0.3, ease: 'easeInOut' },
              x: { type: 'spring', stiffness: isWorking ? 60 : 120, damping: isWorking ? 18 : 20, mass: isWorking ? 1.2 : 1 },
              y: { type: 'spring', stiffness: isWorking ? 60 : 120, damping: isWorking ? 18 : 20, mass: isWorking ? 1.2 : 1 },
              scale: { type: 'spring', stiffness: 120, damping: 20 },
            }
          : {
              type: 'spring',
              stiffness: isWorking ? 60 : 120,
              damping: isWorking ? 18 : 20,
              mass: isWorking ? 1.2 : 1,
            }
      }
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: isWorking ? 'default' : (isDragging.current ? 'grabbing' : 'grab'),
        userSelect: 'none',
        filter: isWorking
          ? 'drop-shadow(0 0 8px rgba(225,31,123,0.6))'
          : hovered ? 'drop-shadow(0 4px 16px rgba(225,31,123,0.35))' : 'none',
        transition: isWorking ? 'filter 1s ease-in-out' : 'filter 0.2s',
        zIndex: isDragging.current ? 500 : 10,
      }}
    >
      <div className="canvas-agent-avatar__figure" style={{ position: 'relative' }}>
        {/* Spawn animation ring */}
        <AnimatePresence>
          {showSpawnAnim && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '2px solid var(--accent)',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />
          )}
        </AnimatePresence>

        {/* NEW badge */}
        <AnimatePresence>
          {showNewBadge && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 8,
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: 4,
                pointerEvents: 'none',
                zIndex: 21,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.05em',
              }}
            >NEW</motion.div>
          )}
        </AnimatePresence>

        <AgentAvatar agent={agent} isWorking={isWorking} />

        {/* TK-0156 — Badge budget */}
        {budgetPct !== undefined && budgetPct >= 70 && (
          <motion.div
            animate={budgetPct >= 80 ? { scale: [1, 1.15, 1], opacity: [0.9, 1, 0.9] } : {}}
            transition={budgetPct >= 80 ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : {}}
            style={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: budgetPct >= 80 ? 'var(--error)' : 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              pointerEvents: 'none',
              zIndex: 22,
              fontFamily: "'Poppins', sans-serif",
              border: '1.5px solid rgba(11,9,13,0.8)',
              boxShadow: budgetPct >= 80 ? '0 0 6px var(--accent-glow)' : '0 0 4px rgba(245,158,11,0.5)',
            }}
          >
            {budgetPct >= 90 ? '💰' : `${budgetPct}%`}
          </motion.div>
        )}

        <AgentStatusBadge
          agentName={agent.name}
          agentKey={agent.agent_key}
          hasRunningBuildTask={hasRunningBuildTask}
          isWorking={isWorking}
          isMoving={isMoving}
        />

        {/* Actions on hover */}
        {hovered && canEdit && (
          <>
            <button
              className="canvas-agent-avatar__btn canvas-agent-avatar__btn--edit"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit?.(agent) }}
              title="Modifier l'agent"
              style={{
                position: 'absolute', top: -8, left: -8,
                width: 22, height: 22, borderRadius: '50%',
                background: '#6366F1', border: '2px solid var(--bg-base)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', cursor: 'pointer', padding: 0,
              }}
            >
              ✏️
            </button>
            {!agent.is_system && (
              <button
                className="canvas-agent-avatar__btn canvas-agent-avatar__btn--delete"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); removeCanvasAgent(agent.id) }}
                title="Supprimer l'agent"
                style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--error)', border: '2px solid var(--bg-base)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#fff', cursor: 'pointer', lineHeight: 1, padding: 0,
                }}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>

      {/* Name tag + chat button */}
      <div className="canvas-agent-avatar__label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            onClick={() => onChat?.(agent)}
            title={`Discuter avec ${agent.name}`}
            style={{
              background: 'rgba(26,23,28,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
              cursor: onChat ? 'pointer' : 'default',
            }}
          >
            {agent.name}
          </div>

          {agent.agent_meta?.model && (
            <div style={{
              background: 'rgba(124,58,237,0.18)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(167,139,250,0.9)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {agent.agent_meta.model.includes('haiku') ? '⚡ Haiku' : agent.agent_meta.model.includes('sonnet') ? '🧠 Sonnet' : agent.agent_meta.model}
            </div>
          )}

          {onChat && (
            <button
              className="canvas-agent-avatar__chat-btn"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onChat(agent) }}
              title="Ouvrir le chat"
              style={{
                background: 'rgba(225,31,123,0.15)',
                border: '1px solid rgba(225,31,123,0.3)',
                borderRadius: 6,
                padding: '3px 7px',
                fontSize: 12,
                cursor: 'pointer',
                color: 'var(--accent)',
              }}
            >
              💬
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
