import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { OrionAvatar3D } from './OrionAvatar3D'
import { useLaunchpadStore } from '../store'
import type { CanvasAgent } from '../types'

interface CanvasAgentAvatarProps {
  agent: CanvasAgent
  canvasScale: number
  onChat?: (agent: CanvasAgent) => void
  onEdit?: (agent: CanvasAgent) => void
}

export function CanvasAgentAvatar({ agent, canvasScale, onChat, onEdit }: CanvasAgentAvatarProps) {
  const { projects, updateAgentPosition, removeCanvasAgent, currentUser, pushOverlapping, setAgentWorkingOn } = useLaunchpadStore()
  const [hovered, setHovered] = useState(false)

  // Local drag state for smooth visual feedback (no Supabase on every frame)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, agentX: 0, agentY: 0 })

  const isAdmin = currentUser?.role === 'admin'
  const isOwner = currentUser?.username === agent.owner
  const canEdit = isAdmin || isOwner

  // Compute effective position: working_on_project overrides drag/store position
  const targetProject = agent.working_on_project
    ? projects.find(p => p.id === agent.working_on_project)
    : null

  const effectivePos = targetProject
    ? { x: targetProject.position.x + 98, y: targetProject.position.y - 90 }
    : (dragPos ?? agent.position)

  const isWorking = !!targetProject

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isWorking) return // non-draggable when working on a project
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

  const ownerInitial = agent.owner.slice(0, 1).toUpperCase()

  // Void reference to prevent unused variable warning
  void setAgentWorkingOn

  return (
    <motion.div
      data-no-drag
      className="canvas-agent-avatar"
      initial={false}
      animate={{ x: effectivePos.x, y: effectivePos.y }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
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
      {/* Avatar */}
      <div className="canvas-agent-avatar__figure" style={{ position: 'relative' }}>
        <OrionAvatar3D size={64} />

        {/* Owner badge */}
        <div
          className="canvas-agent-avatar__badge"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#E11F7B',
            border: '2px solid #0B090D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {ownerInitial}
        </div>

        {/* Actions on hover — edit visible for admin or owner */}
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
                background: '#6366F1', border: '2px solid #0B090D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', cursor: 'pointer', padding: 0,
              }}
            >
              ✏️
            </button>
            {/* Delete only for non-system agents */}
            {!agent.is_system && (
              <button
                className="canvas-agent-avatar__btn canvas-agent-avatar__btn--delete"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); removeCanvasAgent(agent.id) }}
                title="Supprimer l'agent"
                style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#EF4444', border: '2px solid #0B090D',
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
                color: '#E11F7B',
              }}
            >
              💬
            </button>
          )}
        </div>

        {/* Working badge */}
        {isWorking && (
          <div
            style={{
              background: 'rgba(225,31,123,0.2)',
              border: '1px solid rgba(225,31,123,0.4)',
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: 10,
              fontWeight: 700,
              color: '#E11F7B',
              whiteSpace: 'nowrap',
            }}
          >
            ⚡ en cours
          </div>
        )}
      </div>
    </motion.div>
  )
}
