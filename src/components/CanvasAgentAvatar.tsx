import { useRef, useState, useCallback } from 'react'
import { OrionAvatar3D } from './OrionAvatar3D'
import { useLaunchpadStore } from '../store'
import type { CanvasAgent } from '../types'

interface CanvasAgentAvatarProps {
  agent: CanvasAgent
  canvasScale: number
}

export function CanvasAgentAvatar({ agent, canvasScale }: CanvasAgentAvatarProps) {
  const { updateAgentPosition, removeCanvasAgent, currentUser } = useLaunchpadStore()
  const [hovered, setHovered] = useState(false)
  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, agentX: 0, agentY: 0 })
  const posRef = useRef({ x: agent.position.x, y: agent.position.y })

  const isOwner = currentUser?.username === agent.owner

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
    posRef.current = { x: agent.position.x, y: agent.position.y }

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale
      const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale
      posRef.current = {
        x: dragStart.current.agentX + dx,
        y: dragStart.current.agentY + dy,
      }
    }

    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        updateAgentPosition(agent.id, posRef.current.x, posRef.current.y)
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [agent.id, agent.position.x, agent.position.y, canvasScale, updateAgentPosition])

  const ownerInitial = agent.owner.slice(0, 1).toUpperCase()

  return (
    <div
      data-no-drag
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: agent.position.x,
        top: agent.position.y,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: isDragging.current ? 'grabbing' : 'grab',
        userSelect: 'none',
        filter: hovered ? 'drop-shadow(0 4px 16px rgba(225,31,123,0.3))' : 'none',
        transition: 'filter 0.2s',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative' }}>
        <OrionAvatar3D size={64} />

        {/* Owner badge */}
        <div style={{
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
        }}>
          {ownerInitial}
        </div>

        {/* Delete button */}
        {hovered && isOwner && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              removeCanvasAgent(agent.id)
            }}
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#EF4444',
              border: '2px solid #0B090D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fff',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Agent name label */}
      <div style={{
        background: 'rgba(26,23,28,0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        whiteSpace: 'nowrap',
      }}>
        {agent.name}
      </div>
    </div>
  )
}
