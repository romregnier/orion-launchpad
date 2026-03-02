/**
 * BuildStatusWidget
 *
 * Élément flottant sur le canvas (position absolute dans le canvas div).
 * Draggable, sauvegarde position en localStorage.
 * Affiche les tâches build_tasks récentes (running / done / failed).
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { DoraWidget } from './DoraWidget'
import { TicketsWidget } from './TicketsWidget'

interface ProjectMetaRow {
  project_id: string
  ai_meta?: { health_score?: number } | null
}

export interface BuildTask {
  id: string
  agent: string
  label: string
  status: 'running' | 'done' | 'failed'
  project?: string
  agent_key?: string
  step_label?: string
  progress?: number
  created_at: string
  updated_at?: string
}

const AGENT_COLORS: Record<string, string> = {
  Nova:  '#E11F7B',
  Aria:  '#8B5CF6',
  Forge: '#F59E0B',
  Rex:   '#10B981',
  Orion: '#60A5FA',
}

function statusIcon(status: string) {
  if (status === 'done')    return '✅'
  if (status === 'failed')  return '❌'
  return '⏳'
}

function statusLabel(status: string) {
  if (status === 'done')    return 'DONE'
  if (status === 'failed')  return 'FAILED'
  return 'RUNNING'
}

function isRecent(task: BuildTask): boolean {
  if (task.status === 'running') return true
  const updated = task.updated_at ?? task.created_at
  return Date.now() - new Date(updated).getTime() < 10 * 60 * 1000
}

const STORAGE_KEY = 'bsw-canvas-pos'
const DEFAULT_POS = { x: 20, y: 80 }

function loadPos(): { x: number; y: number } {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return DEFAULT_POS
    const parsed = JSON.parse(s)
    // Reset if saved position is off-screen (> 80% of viewport width)
    if (typeof window !== 'undefined' && parsed.x > window.innerWidth * 0.8) {
      return DEFAULT_POS
    }
    return parsed
  } catch { return DEFAULT_POS }
}

interface Props {
  /** Scale du canvas — utilisé pour normaliser le drag */
  canvasScale: number
  /** Utilisateur courant — pour afficher le toggle Tickets (admin only) */
  currentUser?: { username: string; role: string } | null
}

export function BuildStatusWidget({ canvasScale: _canvasScale, currentUser }: Props) {
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [showDora, setShowDora] = useState(false)
  const [showTickets, setShowTickets] = useState(false)
  const [avgQualityScore, setAvgQualityScore] = useState<number | null>(null)
  const [pos, setPos]     = useState<{ x: number; y: number }>(loadPos)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, wx: 0, wy: 0 })

  // ── Quality score moyen des projets ─────────────────────────────────────
  useEffect(() => {
    supabase.from('project_metadata').select('project_id, ai_meta').then(({ data }) => {
      if (!data) return
      const scores = (data as ProjectMetaRow[])
        .map(r => r.ai_meta?.health_score)
        .filter((s): s is number => typeof s === 'number' && s > 0)
      if (scores.length > 0) setAvgQualityScore(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))
    })
  }, [])

  // ── Supabase subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const load = () => {
      supabase
        .from('build_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data }) => {
          if (data) setTasks((data as BuildTask[]).filter(isRecent))
        })
    }
    load()

    const channel = supabase
      .channel('bsw_tasks_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, load)
      .subscribe()

    const interval = setInterval(() => setTasks(prev => prev.filter(isRecent)), 60_000)

    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [])

  // ── Drag viewport-coordinates ─────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Bloquer uniquement sur les éléments interactifs internes (boutons, scroll)
    const target = e.target as HTMLElement
    if (target.closest('[data-widget-nodrag]')) return
    e.stopPropagation()
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, wx: pos.x, wy: pos.y }

    const onMove = (ev: MouseEvent) => {
      const nx = dragStart.current.wx + (ev.clientX - dragStart.current.mouseX)
      const ny = dragStart.current.wy + (ev.clientY - dragStart.current.mouseY)
      // Garder dans les limites du viewport
      const clamped = {
        x: Math.max(0, Math.min(nx, window.innerWidth - 280)),
        y: Math.max(0, Math.min(ny, window.innerHeight - 60)),
      }
      setPos(clamped)
    }
    const onUp = () => {
      setIsDragging(false)
      setPos(p => { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); return p })
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [pos])

  if (tasks.length === 0) return (
    <div
      className="build-status-widget"
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 40,
        background: 'rgba(22,18,26,0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '10px 14px',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        backdropFilter: 'blur(16px)',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
        ⚡ BUILD STATUS
      </span>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Agents en veille</div>
    </div>
  )

  return (
    <div
      className="build-status-widget"
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 40,
        background: 'rgba(22,18,26,0.96)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14,
        overflow: 'hidden',
        minWidth: 260,
        maxWidth: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      {/* Header — la zone entière sert de drag handle, les boutons stoppent la propagation */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '9px 12px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Poignée drag + label collapse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'inherit' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', lineHeight: 1 }}>⠿</span>
          <button
            data-widget-nodrag
            aria-label="Réduire/Déployer le widget Build Status"
            onClick={() => setCollapsed(c => !c)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, padding: 0,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
              ⚡ BUILD STATUS
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{collapsed ? '▲' : '▼'}</span>
          </button>
          {/* Quality Score badge */}
          {avgQualityScore !== null && (
            <span
              title="Score qualité moyen des projets (IA)"
              style={{
                fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 999,
                background: avgQualityScore >= 75
                  ? 'rgba(16,185,129,0.2)'
                  : avgQualityScore >= 50
                  ? 'rgba(245,158,11,0.2)'
                  : 'rgba(239,68,68,0.2)',
                color: avgQualityScore >= 75 ? '#10B981' : avgQualityScore >= 50 ? '#F59E0B' : '#EF4444',
                border: `1px solid ${avgQualityScore >= 75 ? 'rgba(16,185,129,0.3)' : avgQualityScore >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                flexShrink: 0,
              }}
            >
              🛡 {avgQualityScore}/100
            </span>
          )}
        </div>
        {/* Stats toggle button — DoraWidget */}
        <button
          data-widget-nodrag
          aria-label="Afficher les métriques DORA"
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setShowDora(prev => !prev)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 6,
            fontSize: 10, fontWeight: 600,
            cursor: 'pointer', pointerEvents: 'all',
            transition: 'all 0.2s',
            background: showDora ? 'rgba(225,31,123,0.2)' : 'rgba(62,55,66,0.8)',
            color: showDora ? '#E11F7B' : '#6b7280',
            border: showDora ? '1px solid rgba(225,31,123,0.3)' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          📊 Stats
        </button>
        {/* Tickets toggle — admin only */}
        {currentUser?.role === 'admin' && (
          <button
            data-widget-nodrag
            aria-label="Afficher les tickets"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setShowTickets(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6,
              fontSize: 10, fontWeight: 600,
              cursor: 'pointer', pointerEvents: 'all',
              transition: 'all 0.2s',
              background: showTickets ? 'rgba(139,92,246,0.2)' : 'rgba(62,55,66,0.8)',
              color: showTickets ? '#A78BFA' : '#6b7280',
              border: showTickets ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            🎫 Tickets
          </button>
        )}
      </div>

      {/* Task list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{ overflow: 'hidden' }}
          >
            <div data-widget-nodrag style={{ padding: '4px 0', maxHeight: 220, overflowY: 'auto', pointerEvents: 'all' }}>
              {tasks.map(task => {
                const agentColor = AGENT_COLORS[task.agent] ?? '#fff'
                const isRunning = task.status === 'running'
                return (
                  <div key={task.id} style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12 }}>{statusIcon(task.status)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: agentColor, minWidth: 40, textTransform: 'uppercase' }}>
                        {task.agent}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.label}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                        background: isRunning ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.06)',
                        color: isRunning ? '#E11F7B' : 'rgba(255,255,255,0.3)',
                        flexShrink: 0,
                      }}>
                        {statusLabel(task.status)}
                      </span>
                    </div>
                    {/* Progress bar pour les tâches en cours */}
                    {isRunning && task.progress !== undefined && (
                      <div style={{ marginTop: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{task.step_label ?? '…'}</span>
                          <span style={{ fontSize: 9, color: '#E11F7B', fontWeight: 700 }}>{Math.round(task.progress)}%</span>
                        </div>
                        <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, task.progress)}%`, height: '100%', background: '#E11F7B', borderRadius: 1, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DORA Metrics Panel */}
      <AnimatePresence>
        {showDora && !collapsed && (
          <motion.div
            key="dora-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{ overflow: 'hidden' }}
          >
            <DoraWidget />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tickets Panel — admin only */}
      <AnimatePresence>
        {showTickets && currentUser?.role === 'admin' && !collapsed && (
          <motion.div
            key="tickets-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{ overflow: 'hidden' }}
          >
            <TicketsWidget />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
