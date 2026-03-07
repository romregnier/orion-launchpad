/**
 * BuildStatusWidget
 *
 * Élément flottant sur le canvas (position absolute dans le canvas div).
 * Draggable, sauvegarde position en localStorage.
 * Affiche toutes les tâches build_tasks groupées par statut + backlog tickets.
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
  status: 'running' | 'done' | 'failed' | 'pending'
  project?: string
  agent_key?: string
  step_label?: string
  progress?: number
  created_at: string
  updated_at?: string
}

interface BacklogTicket {
  id: string
  title: string
  status: string
  assigned_to?: string | null
  priority?: string | null
}

const AGENT_COLORS: Record<string, string> = {
  Nova:  '#E11F7B',
  Aria:  '#8B5CF6',
  Forge: '#F59E0B',
  Rex:   '#10B981',
  Orion: '#60A5FA',
}

function agentInitial(agentKey?: string | null): string {
  if (!agentKey) return '?'
  return agentKey.charAt(0).toUpperCase()
}

function agentColor(agentKey?: string | null): string {
  if (!agentKey) return 'rgba(255,255,255,0.3)'
  const name = agentKey.charAt(0).toUpperCase() + agentKey.slice(1).toLowerCase()
  return AGENT_COLORS[name] ?? 'rgba(255,255,255,0.4)'
}

function statusIcon(status: string) {
  if (status === 'running') return '🔄'
  if (status === 'done')    return '✅'
  if (status === 'failed')  return '❌'
  return '⏳'
}

function statusBadgeStyle(status: string): React.CSSProperties {
  if (status === 'running') return { background: 'rgba(225,31,123,0.15)', color: '#E11F7B', border: '1px solid rgba(225,31,123,0.25)' }
  if (status === 'done')    return { background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }
  if (status === 'failed')  return { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }
  return { background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }
}

function statusLabel(status: string) {
  if (status === 'running') return 'EN COURS'
  if (status === 'done')    return 'DONE'
  if (status === 'failed')  return 'FAILED'
  return 'EN ATTENTE'
}

function priorityColor(priority?: string | null): string {
  if (priority === 'P0') return '#EF4444'
  if (priority === 'P1') return '#F59E0B'
  if (priority === 'P2') return '#60A5FA'
  return 'rgba(255,255,255,0.3)'
}

const STATUS_ORDER = ['running', 'pending', 'done', 'failed']

const STORAGE_KEY = 'bsw-canvas-pos'
const DEFAULT_POS = { x: 20, y: 80 }

function loadPos(): { x: number; y: number } {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return DEFAULT_POS
    const parsed = JSON.parse(s) as { x: number; y: number }
    if (typeof window !== 'undefined' && parsed.x > window.innerWidth * 0.8) {
      return DEFAULT_POS
    }
    return parsed
  } catch { return DEFAULT_POS }
}

interface Props {
  canvasScale: number
  currentUser?: { username: string; role: string } | null
}

export function BuildStatusWidget({ canvasScale: _canvasScale, currentUser }: Props) {
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [backlog, setBacklog] = useState<BacklogTicket[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [showDora, setShowDora] = useState(false)
  const [showTickets, setShowTickets] = useState(false)
  const [avgQualityScore, setAvgQualityScore] = useState<number | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, wx: 0, wy: 0 })

  // ── Quality score moyen ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('project_metadata').select('project_id, ai_meta').then(({ data }) => {
      if (!data) return
      const scores = (data as ProjectMetaRow[])
        .map(r => r.ai_meta?.health_score)
        .filter((s): s is number => typeof s === 'number' && s > 0)
      if (scores.length > 0) setAvgQualityScore(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))
    })
  }, [])

  // ── Backlog tickets — poll 10s ───────────────────────────────────────────
  useEffect(() => {
    const loadTickets = () => {
      supabase
        .from('tickets')
        .select('id, title, status, assigned_to, priority')
        .in('status', ['backlog', 'queued'])
        .order('priority', { ascending: true })
        .limit(20)
        .then(({ data }) => {
          if (data) setBacklog(data as BacklogTicket[])
        })
    }
    loadTickets()
    const interval = setInterval(loadTickets, 10000)
    return () => clearInterval(interval)
  }, [])

  // ── Build tasks — poll 5s + realtime channel ────────────────────────────
  useEffect(() => {
    const load = () => {
      supabase
        .from('build_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) setTasks(data as BuildTask[])
        })
    }
    load()
    // Poll toutes les 5s (fiabilité > realtime seul)
    const interval = setInterval(load, 5000)

    // Realtime en complément pour les updates instantanés
    const channel = supabase
      .channel('bsw_tasks_rt_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, load)
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Drag ─────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-widget-nodrag]')) return
    e.stopPropagation()
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, wx: pos.x, wy: pos.y }

    const onMove = (ev: MouseEvent) => {
      const nx = dragStart.current.wx + (ev.clientX - dragStart.current.mouseX)
      const ny = dragStart.current.wy + (ev.clientY - dragStart.current.mouseY)
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

  // Group tasks by status
  const grouped: Record<string, BuildTask[]> = {}
  for (const s of STATUS_ORDER) grouped[s] = []
  for (const t of tasks) {
    if (grouped[t.status]) grouped[t.status].push(t)
    else grouped['pending'].push(t)
  }

  const hasTasks = tasks.length > 0

  if (!hasTasks) return (
    <div
      className="build-status-widget bsw-gradient-border"
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 40,
        background: 'rgba(22,18,26,0.85)',
        borderRadius: 14, padding: '10px 14px',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none', backdropFilter: 'blur(16px)',
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
      className="build-status-widget bsw-gradient-border"
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 40,
        background: 'rgba(22,18,26,0.96)',
        borderRadius: 14, overflow: 'hidden',
        minWidth: 260, maxWidth: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '9px 12px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'inherit' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', lineHeight: 1 }}>⠿</span>
          <button
            data-widget-nodrag
            aria-label="Réduire/Déployer le widget Build Status"
            onClick={() => setCollapsed(c => !c)}
            onMouseDown={e => e.stopPropagation()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
              ⚡ BUILD STATUS
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{collapsed ? '▲' : '▼'}</span>
          </button>
          {avgQualityScore !== null ? (
            <span
              title="Score qualité moyen des projets (IA)"
              style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: avgQualityScore >= 75 ? 'rgba(16,185,129,0.2)' : avgQualityScore >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                color: avgQualityScore >= 75 ? '#10B981' : avgQualityScore >= 50 ? '#F59E0B' : '#EF4444',
                border: `1px solid ${avgQualityScore >= 75 ? 'rgba(16,185,129,0.3)' : avgQualityScore >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                flexShrink: 0,
              }}
            >
              🛡 {avgQualityScore}/100
            </span>
          ) : (
            <button
              data-widget-nodrag
              onMouseDown={e => e.stopPropagation()}
              onClick={() => {
                const analyzeBtn = document.querySelector<HTMLButtonElement>('[data-analyze-btn]')
                if (analyzeBtn) analyzeBtn.click()
              }}
              title="Aucun score qualité — cliquer pour analyser un projet"
              style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              🛡 Analyser →
            </button>
          )}
        </div>
        <button
          data-widget-nodrag
          aria-label="Afficher les métriques DORA"
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setShowDora(prev => !prev)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            cursor: 'pointer', pointerEvents: 'all', transition: 'all 0.2s',
            background: showDora ? 'rgba(225,31,123,0.2)' : 'rgba(62,55,66,0.8)',
            color: showDora ? '#E11F7B' : '#6b7280',
            border: showDora ? '1px solid rgba(225,31,123,0.3)' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          📊 Stats
        </button>
        {currentUser?.role === 'admin' && (
          <button
            data-widget-nodrag
            aria-label="Afficher les tickets"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setShowTickets(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              cursor: 'pointer', pointerEvents: 'all', transition: 'all 0.2s',
              background: showTickets ? 'rgba(139,92,246,0.2)' : 'rgba(62,55,66,0.8)',
              color: showTickets ? '#A78BFA' : '#6b7280',
              border: showTickets ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            🎫 Tickets
          </button>
        )}
      </div>

      {/* Task list + Backlog */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{ overflow: 'hidden' }}
          >
            <div data-widget-nodrag style={{ maxHeight: 420, overflowY: 'auto', pointerEvents: 'all' }}>
              {/* Grouped tasks */}
              {STATUS_ORDER.map(status => {
                const group = grouped[status]
                if (!group || group.length === 0) return null
                const groupLabel: Record<string, string> = {
                  running: '🔄 En cours',
                  pending: '⏳ En attente',
                  done: '✅ Terminé',
                  failed: '❌ Échoué',
                }
                return (
                  <div key={status}>
                    <div style={{
                      padding: '5px 12px 3px',
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                      color: 'rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {groupLabel[status]} ({group.length})
                    </div>
                    {group.map(task => {
                      const aColor = agentColor(task.agent_key ?? task.agent)
                      const aInitial = agentInitial(task.agent_key ?? task.agent)
                      const isRunning = task.status === 'running'
                      return (
                        <div key={task.id} style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            {/* Agent badge */}
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                              background: aColor + '25',
                              border: `1px solid ${aColor}60`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 800, color: aColor,
                            }}>
                              {aInitial}
                            </div>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.label}
                            </span>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                              flexShrink: 0, ...statusBadgeStyle(task.status),
                            }}>
                              {statusIcon(task.status)} {statusLabel(task.status)}
                            </span>
                          </div>
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
                )
              })}

              {/* Backlog section */}
              {backlog.length > 0 && (
                <div>
                  <div style={{
                    padding: '5px 12px 3px',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.25)',
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    📋 Backlog ({backlog.length})
                  </div>
                  {backlog.map(ticket => (
                    <div key={ticket.id} style={{ padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                        background: 'rgba(255,255,255,0.06)',
                        color: priorityColor(ticket.priority),
                        flexShrink: 0,
                      }}>
                        {ticket.priority ?? 'P?'}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.title}
                      </span>
                      {ticket.assigned_to && (
                        <span style={{ fontSize: 8, color: agentColor(ticket.assigned_to), flexShrink: 0 }}>
                          {agentInitial(ticket.assigned_to)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
