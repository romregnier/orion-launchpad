/**
 * WorkflowBuilder — TK-0231
 * TK-0240: [ARCH-012] Swarm Topologies support added
 * Éditeur visuel de workflow node-based.
 * Canvas custom sans librairie externe (SVG bezier + drag natif).
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import type { SwarmTopology, TopologyConfig } from '../types/workflow'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'agent'
  label: string
  x: number
  y: number
  config: Record<string, unknown>
  topology?: SwarmTopology    // TK-0240: optional topology badge
  topologyConfig?: TopologyConfig  // TK-0240: topology configuration
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

interface WorkflowBuilderProps {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  onChange: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
  workflowId?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_WIDTH = 140
const NODE_HEIGHT = 52

const NODE_TYPE_CONFIG: Record<WorkflowNode['type'], { color: string; bg: string; icon: string; label: string }> = {
  trigger:   { color: 'var(--info, #3b82f6)',    bg: 'rgba(59,130,246,0.15)',  icon: '⚡', label: 'Trigger' },
  action:    { color: 'var(--success, #22c55e)',  bg: 'rgba(34,197,94,0.15)',  icon: '🔧', label: 'Action' },
  condition: { color: 'var(--warning, #f59e0b)',  bg: 'rgba(245,158,11,0.15)', icon: '❓', label: 'Condition' },
  agent:     { color: 'var(--purple, #8b5cf6)',   bg: 'rgba(139,92,246,0.15)', icon: '🤖', label: 'Agent' },
}

// ── TK-0240: Topology definitions ─────────────────────────────────────────────

const TOPOLOGY_CONFIG: Record<SwarmTopology, { icon: string; label: string; color: string }> = {
  sequential:  { icon: '→',  label: 'Séquentiel',  color: 'var(--info, #3b82f6)'    },
  parallel:    { icon: '⇉',  label: 'Parallèle',   color: 'var(--success, #22c55e)' },
  conditional: { icon: '⋔',  label: 'Conditionnel',color: 'var(--warning, #f59e0b)' },
  fan_out:     { icon: '⊳',  label: 'Fan-out',     color: 'var(--purple, #8b5cf6)'  },
  fan_in:      { icon: '⊲',  label: 'Fan-in',      color: 'var(--purple, #8b5cf6)'  },
  recurrent:   { icon: '↺',  label: 'Récurrent',   color: 'var(--warning, #f59e0b)' },
}

// ── Bezier path between two nodes ─────────────────────────────────────────────

function getBezierPath(sx: number, sy: number, tx: number, ty: number): string {
  const cx = (sx + tx) / 2
  return `M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}`
}

// ── Node center positions ─────────────────────────────────────────────────────

function nodeOutputPos(node: WorkflowNode) {
  return { x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 }
}
function nodeInputPos(node: WorkflowNode) {
  return { x: node.x, y: node.y + NODE_HEIGHT / 2 }
}

// ── WorkflowBuilder component ─────────────────────────────────────────────────

export function WorkflowBuilder({ nodes, edges, onChange, workflowId: _workflowId }: WorkflowBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null) // source node id
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<{ id: string; offX: number; offY: number } | null>(null)

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null

  // ── TK-0240: Insert topology template ────────────────────────────────────

  const insertTopology = useCallback((topology: SwarmTopology) => {
    const baseX = 80 + Math.random() * 200
    const baseY = 80 + Math.random() * 150
    const newNodes: WorkflowNode[] = []
    const newEdges: WorkflowEdge[] = []

    const mk = (type: WorkflowNode['type'], label: string, x: number, y: number, topo?: SwarmTopology): WorkflowNode => ({
      id: crypto.randomUUID(), type, label, x, y, config: {},
      topology: topo,
    })

    if (topology === 'sequential') {
      const a = mk('trigger', 'Étape A', baseX, baseY)
      const b = mk('action',  'Étape B', baseX + 200, baseY)
      const c = mk('action',  'Étape C', baseX + 400, baseY)
      newNodes.push(a, b, c)
      newEdges.push(
        { id: crypto.randomUUID(), source: a.id, target: b.id },
        { id: crypto.randomUUID(), source: b.id, target: c.id },
      )
    } else if (topology === 'parallel') {
      const fan = mk('trigger', 'Fan-out', baseX, baseY + 80, 'fan_out')
      const b1  = mk('agent',   'Branch 1', baseX + 200, baseY)
      const b2  = mk('agent',   'Branch 2', baseX + 200, baseY + 80)
      const b3  = mk('agent',   'Branch 3', baseX + 200, baseY + 160)
      const fin = mk('action',  'Fan-in',   baseX + 400, baseY + 80, 'fan_in')
      newNodes.push(fan, b1, b2, b3, fin)
      ;[b1, b2, b3].forEach(b => {
        newEdges.push({ id: crypto.randomUUID(), source: fan.id, target: b.id })
        newEdges.push({ id: crypto.randomUUID(), source: b.id, target: fin.id })
      })
    } else if (topology === 'conditional') {
      const cond = mk('condition', 'Condition', baseX, baseY + 40, 'conditional')
      const yes  = mk('action',   'Branche Oui', baseX + 200, baseY)
      const no   = mk('action',   'Branche Non', baseX + 200, baseY + 100)
      newNodes.push(cond, yes, no)
      newEdges.push(
        { id: crypto.randomUUID(), source: cond.id, target: yes.id },
        { id: crypto.randomUUID(), source: cond.id, target: no.id },
      )
    } else if (topology === 'fan_out') {
      const src = mk('trigger', 'Source', baseX, baseY + 80, 'fan_out')
      const t1  = mk('agent', 'Target 1', baseX + 200, baseY)
      const t2  = mk('agent', 'Target 2', baseX + 200, baseY + 80)
      const t3  = mk('agent', 'Target 3', baseX + 200, baseY + 160)
      newNodes.push(src, t1, t2, t3)
      ;[t1, t2, t3].forEach(t => newEdges.push({ id: crypto.randomUUID(), source: src.id, target: t.id }))
    } else if (topology === 'fan_in') {
      const s1  = mk('agent',  'Source 1', baseX, baseY)
      const s2  = mk('agent',  'Source 2', baseX, baseY + 80)
      const s3  = mk('agent',  'Source 3', baseX, baseY + 160)
      const agg = mk('action', 'Agrégateur', baseX + 200, baseY + 80, 'fan_in')
      newNodes.push(s1, s2, s3, agg)
      ;[s1, s2, s3].forEach(s => newEdges.push({ id: crypto.randomUUID(), source: s.id, target: agg.id }))
    } else if (topology === 'recurrent') {
      const entry = mk('trigger', 'Entrée Loop', baseX, baseY, 'recurrent')
      const body  = mk('action',  'Corps Loop',  baseX + 200, baseY)
      const check = mk('condition', 'Condition sortie', baseX + 400, baseY)
      newNodes.push(entry, body, check)
      newEdges.push(
        { id: crypto.randomUUID(), source: entry.id, target: body.id },
        { id: crypto.randomUUID(), source: body.id, target: check.id },
        { id: crypto.randomUUID(), source: check.id, target: body.id }, // loop back
      )
    }

    onChange([...nodes, ...newNodes], [...edges, ...newEdges])
  }, [nodes, edges, onChange])

  // ── Add node ──────────────────────────────────────────────────────────────

  const addNode = useCallback((type: WorkflowNode['type']) => {
    const cfg = NODE_TYPE_CONFIG[type]
    const id = crypto.randomUUID()
    const newNode: WorkflowNode = {
      id,
      type,
      label: `${cfg.label} ${nodes.filter(n => n.type === type).length + 1}`,
      x: 60 + Math.random() * 400,
      y: 60 + Math.random() * 300,
      config: {},
    }
    onChange([...nodes, newNode], edges)
    setSelectedId(id)
  }, [nodes, edges, onChange])

  // ── Delete node ───────────────────────────────────────────────────────────

  const deleteNode = useCallback((id: string) => {
    const newNodes = nodes.filter(n => n.id !== id)
    const newEdges = edges.filter(e => e.source !== id && e.target !== id)
    onChange(newNodes, newEdges)
    if (selectedId === id) setSelectedId(null)
  }, [nodes, edges, onChange, selectedId])

  // ── Keyboard Delete ───────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const tag = (e.target as HTMLElement).tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          deleteNode(selectedId)
        }
      }
      if (e.key === 'Escape') {
        setConnecting(null)
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, deleteNode])

  // ── Drag ──────────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (connecting) return // connecting mode: clicking on node connects
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    dragging.current = {
      id: nodeId,
      offX: e.clientX - rect.left - node.x,
      offY: e.clientY - rect.top - node.y,
    }
    setSelectedId(nodeId)
  }, [connecting, nodes])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePos({ x, y })
    if (!dragging.current) return
    const { id, offX, offY } = dragging.current
    const newNodes = nodes.map(n =>
      n.id === id
        ? { ...n, x: Math.max(0, x - offX), y: Math.max(0, y - offY) }
        : n
    )
    onChange(newNodes, edges)
  }, [nodes, edges, onChange])

  const handleMouseUp = useCallback(() => {
    dragging.current = null
  }, [])

  // ── Connecting mode ───────────────────────────────────────────────────────

  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (!connecting) {
      setSelectedId(nodeId)
      return
    }
    if (connecting === nodeId) {
      setConnecting(null)
      return
    }
    // Create edge
    const alreadyExists = edges.some(ed => ed.source === connecting && ed.target === nodeId)
    if (!alreadyExists) {
      const newEdge: WorkflowEdge = { id: crypto.randomUUID(), source: connecting, target: nodeId }
      onChange(nodes, [...edges, newEdge])
    }
    setConnecting(null)
  }, [connecting, edges, nodes, onChange])

  const handleCanvasClick = useCallback(() => {
    if (connecting) { setConnecting(null); return }
    setSelectedId(null)
  }, [connecting])

  const deleteEdge = useCallback((edgeId: string) => {
    onChange(nodes, edges.filter(e => e.id !== edgeId))
  }, [nodes, edges, onChange])

  // ── Update node label / config ────────────────────────────────────────────

  const updateNodeLabel = useCallback((id: string, label: string) => {
    onChange(nodes.map(n => n.id === id ? { ...n, label } : n), edges)
  }, [nodes, edges, onChange])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* Canvas area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', gap: 8, padding: '10px 16px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          {(Object.keys(NODE_TYPE_CONFIG) as WorkflowNode['type'][]).map(type => {
            const cfg = NODE_TYPE_CONFIG[type]
            return (
              <button
                key={type}
                onClick={() => addNode(type)}
                style={{
                  padding: '6px 14px',
                  background: cfg.bg, color: cfg.color,
                  border: `1px solid ${cfg.color}33`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                ➕ {cfg.icon} {cfg.label}
              </button>
            )
          })}
          {/* TK-0240: Topology toolbar separator */}
          <div style={{
            width: 1, height: 24,
            background: 'rgba(255,255,255,0.1)',
            margin: '0 4px', flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Topologies :</span>
          {(Object.keys(TOPOLOGY_CONFIG) as SwarmTopology[]).map(topo => {
            const tc = TOPOLOGY_CONFIG[topo]
            return (
              <button
                key={topo}
                onClick={() => insertTopology(topo)}
                title={`Insérer topologie ${tc.label}`}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  color: tc.color,
                  border: `1px solid ${tc.color}33`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 5,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 14 }}>{tc.icon}</span>
                {tc.label}
              </button>
            )
          })}

          {connecting && (
            <span style={{
              marginLeft: 'auto', fontSize: 12,
              color: 'var(--warning, #f59e0b)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🔗 Cliquez sur un nœud cible — Échap pour annuler
            </span>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            flex: 1, position: 'relative', overflow: 'auto',
            background: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            cursor: connecting ? 'crosshair' : 'default',
            minWidth: 800, minHeight: 500,
          }}
        >
          {/* SVG for edges */}
          <svg
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" />
              </marker>
            </defs>

            {/* Existing edges */}
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.source)
              const tgt = nodes.find(n => n.id === edge.target)
              if (!src || !tgt) return null
              const sp = nodeOutputPos(src)
              const tp = nodeInputPos(tgt)
              const d = getBezierPath(sp.x, sp.y, tp.x, tp.y)
              return (
                <g key={edge.id} style={{ pointerEvents: 'all' }}>
                  {/* Invisible wider hit area */}
                  <path
                    d={d}
                    fill="none" stroke="transparent" strokeWidth={12}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); deleteEdge(edge.id) }}
                  />
                  <path
                    d={d} fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth={2}
                    strokeDasharray="5,3"
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              )
            })}

            {/* Live edge while connecting */}
            {connecting && (() => {
              const src = nodes.find(n => n.id === connecting)
              if (!src) return null
              const sp = nodeOutputPos(src)
              const d = getBezierPath(sp.x, sp.y, mousePos.x, mousePos.y)
              return (
                <path
                  d={d} fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="6,3"
                />
              )
            })()}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const cfg = NODE_TYPE_CONFIG[node.type]
            const isSelected = selectedId === node.id
            const isConnectSource = connecting === node.id

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={(e) => handleNodeClick(e, node.id)}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  background: cfg.bg,
                  border: `2px solid ${isSelected || isConnectSource ? cfg.color : cfg.color + '55'}`,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 10px',
                  cursor: dragging.current?.id === node.id ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  boxShadow: isSelected ? `0 0 0 3px ${cfg.color}33, 0 8px 24px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  zIndex: isSelected ? 10 : 1,
                }}
              >
                {/* Input port */}
                <div
                  style={{
                    position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)',
                    width: 12, height: 12, borderRadius: '50%',
                    background: 'var(--bg-surface)',
                    border: `2px solid ${cfg.color}`,
                  }}
                />

                <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                <div style={{ flex: 1, marginLeft: 6, overflow: 'hidden' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'block',
                  }}>
                    {node.label}
                  </span>
                  {/* TK-0240: Topology badge */}
                  {node.topology && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                      color: TOPOLOGY_CONFIG[node.topology].color,
                      opacity: 0.8,
                      display: 'block',
                      marginTop: 1,
                    }}>
                      {TOPOLOGY_CONFIG[node.topology].icon} {TOPOLOGY_CONFIG[node.topology].label}
                    </span>
                  )}
                </div>

                {/* Connect + Delete buttons on selected */}
                {isSelected && (
                  <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); setConnecting(node.id) }}
                      title="Connecter"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none', borderRadius: 4,
                        color: cfg.color, cursor: 'pointer',
                        width: 20, height: 20, fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      🔗
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }}
                      title="Supprimer"
                      style={{
                        background: 'rgba(239,68,68,0.2)',
                        border: 'none', borderRadius: 4,
                        color: '#ef4444', cursor: 'pointer',
                        width: 20, height: 20, fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Output port */}
                <div
                  style={{
                    position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
                    width: 12, height: 12, borderRadius: '50%',
                    background: cfg.color,
                    border: '2px solid var(--bg-surface)',
                    cursor: 'crosshair',
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); setConnecting(node.id) }}
                />
              </div>
            )
          })}

          {/* Empty hint */}
          {nodes.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', opacity: 0.4 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                <p style={{ margin: 0, fontSize: 14 }}>Ajoutez un nœud pour commencer</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Utilisez la barre d'outils ci-dessus</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config panel (selected node) */}
      {selectedNode && (
        <div style={{
          width: 240, flexShrink: 0,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          padding: 16, overflowY: 'auto',
        }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {NODE_TYPE_CONFIG[selectedNode.type].icon} Config nœud
          </h4>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              Label
            </label>
            <input
              value={selectedNode.label}
              onChange={e => updateNodeLabel(selectedNode.id, e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6, padding: '6px 10px',
                color: 'var(--text-primary)', fontSize: 12, outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              Type
            </label>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6,
              background: NODE_TYPE_CONFIG[selectedNode.type].bg,
              color: NODE_TYPE_CONFIG[selectedNode.type].color,
              fontSize: 12, fontWeight: 600,
            }}>
              {NODE_TYPE_CONFIG[selectedNode.type].icon} {selectedNode.type}
            </span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              Position
            </label>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>
              x: {Math.round(selectedNode.x)}, y: {Math.round(selectedNode.y)}
            </p>
          </div>
          <button
            onClick={() => deleteNode(selectedNode.id)}
            style={{
              width: '100%',
              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '8px 12px',
              cursor: 'pointer', fontSize: 12,
            }}
          >
            🗑 Supprimer ce nœud
          </button>
        </div>
      )}
    </div>
  )
}
