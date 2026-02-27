import { useRef, useState, useCallback } from 'react'
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
  const { updateAgentPosition, removeCanvasAgent, currentUser, pushOverlapping } = useLaunchpadStore()
  const [hovered, setHovered] = useState(false)

  // Local drag state for smooth visual feedback (no Supabase on every frame)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, agentX: 0, agentY: 0 })

  const isAdmin = currentUser?.role === 'admin'
  const isOwner = currentUser?.username === agent.owner
  const canEdit = isAdmin || isOwner

  const pos = dragPos ?? agent.position

  const onMouseDown = useCallback((e: React.MouseEvent) => {
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

    // lastPosRef tracks the final drag position so onUp can read without closure staleness
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
  }, [agent.id, agent.position.x, agent.position.y, canvasScale, updateAgentPosition, pushOverlapping])

  const ownerInitial = agent.owner.slice(0, 1).toUpperCase()

  return (
    <div
      data-no-drag
      className="canvas-agent-avatar"
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: isDragging.current ? 'grabbing' : 'grab',
        userSelect: 'none',
        filter: hovered ? 'drop-shadow(0 4px 16px rgba(225,31,123,0.35))' : 'none',
        transition: 'filter 0.2s',
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
      <div className="canvas-agent-avatar__label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
    </div>
  )
}
