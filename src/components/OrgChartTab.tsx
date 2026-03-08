import { useState } from 'react'
import { useLaunchpadStore } from '../store'
import { OrgChartNode } from './OrgChartNode'
import { OrgChartEdge } from './OrgChartEdge'
import type { CanvasAgent } from '../types'

const CANVAS_W = 852
const CANVAS_H = 520
const NODE_SPACING = 160

// Layout positions
function getNodePositions(agentMap: Record<string, CanvasAgent | undefined>) {
  const centerX = CANVAS_W / 2

  const romain = agentMap['romain']
  const orion = agentMap['orion']
  const nova = agentMap['nova']
  const aria = agentMap['aria']
  const forge = agentMap['forge']
  const rex = agentMap['rex']

  const positions: { agent: CanvasAgent; x: number; y: number; level: number; index: number }[] = []

  if (romain) positions.push({ agent: romain, x: centerX, y: 70, level: 0, index: 0 })
  if (orion) positions.push({ agent: orion, x: centerX, y: 210, level: 1, index: 0 })

  const level2 = [nova, aria, forge, rex].filter(Boolean) as CanvasAgent[]
  const total = level2.length
  level2.forEach((agent, i) => {
    const offset = (i - (total - 1) / 2) * NODE_SPACING
    positions.push({ agent, x: centerX + offset, y: 370, level: 2, index: i })
  })

  return positions
}

export function OrgChartTab() {
  const { canvasAgents } = useLaunchpadStore()
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const agentMap: Record<string, CanvasAgent | undefined> = {}
  for (const a of canvasAgents) {
    if (a.agent_key) agentMap[a.agent_key] = a
  }

  const positions = getNodePositions(agentMap)

  if (positions.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        textAlign: 'center',
        flex: 1,
        minHeight: 300,
      }}>
        <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 20 }}>🌲</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          Pas de hiérarchie
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', maxWidth: 300, lineHeight: 1.5 }}>
          L'organigramme s'affichera une fois les agents configurés.
        </div>
      </div>
    )
  }

  // Build edges
  const edges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = []
  const romainPos = positions.find(p => p.agent.agent_key === 'romain')
  const orionPos = positions.find(p => p.agent.agent_key === 'orion')
  const level2Positions = positions.filter(p => p.level === 2)

  if (romainPos && orionPos) {
    edges.push({ x1: romainPos.x, y1: romainPos.y + 40, x2: orionPos.x, y2: orionPos.y - 40, key: 'romain-orion' })
  }
  if (orionPos) {
    level2Positions.forEach(p => {
      edges.push({ x1: orionPos.x, y1: orionPos.y + 40, x2: p.x, y2: p.y - 40, key: `orion-${p.agent.agent_key}` })
    })
  }

  return (
    <div style={{ padding: '24px 28px', overflow: 'auto' }}>
      <svg width={CANVAS_W} height={CANVAS_H} style={{ display: 'block', margin: '0 auto' }}>
        <defs>
          <marker id="org-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" />
          </marker>
          <marker id="org-arrow-accent" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#E11F7B" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const connectedKey = edge.key.split('-').find(k => k !== 'romain' && k !== 'orion') ?? edge.key
          const highlighted = hoveredKey === connectedKey || (edge.key === 'romain-orion' && (hoveredKey === 'romain' || hoveredKey === 'orion'))
          return (
            <OrgChartEdge
              key={edge.key}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              index={i}
              highlighted={highlighted}
            />
          )
        })}

        {/* Nodes */}
        {positions.map(({ agent, x, y, level, index }) => (
          <OrgChartNode
            key={agent.id}
            agent={agent}
            x={x}
            y={y}
            level={level}
            nodeIndex={index}
            highlighted={hoveredKey === agent.agent_key}
            onHover={(hovered) => setHoveredKey(hovered ? (agent.agent_key ?? null) : null)}
          />
        ))}
      </svg>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 20,
        justifyContent: 'center',
        marginTop: 20,
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 1.5, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
          <span>Hiérarchie</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 1.5, background: '#E11F7B', borderRadius: 2 }} />
          <span>Sélectionné</span>
        </div>
      </div>
    </div>
  )
}
