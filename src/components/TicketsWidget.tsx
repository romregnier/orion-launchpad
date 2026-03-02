/**
 * TicketsWidget — Queue autonome
 *
 * Affiche la queue de tickets avec statuts granulaires et progression par ticket.
 * Statuts : backlog → queued → in_progress → in_review → done → verified
 * Subscription Realtime sur tickets + build_tasks pour suivi live.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Ticket {
  id: string
  priority: string
  status: string
  title: string
  assigned_to: string | null
  project: string | null
}

interface BuildTask {
  id: string
  agent: string
  label: string
  status: 'running' | 'done' | 'failed'
  progress?: number
  step_label?: string
}

const PRIORITY_COLORS: Record<string, string> = {
  p0: '#EF4444', P0: '#EF4444',
  p1: '#F59E0B', P1: '#F59E0B',
  p2: '#EAB308', P2: '#EAB308',
  p3: '#6B7280', P3: '#6B7280',
}

const STATUS_CFG: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  backlog:     { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', label: 'backlog',   icon: '○' },
  queued:      { bg: 'rgba(99,102,241,0.2)',   color: '#818CF8',               label: 'en queue',  icon: '◈' },
  in_progress: { bg: 'rgba(59,130,246,0.2)',   color: '#60A5FA',               label: 'en cours',  icon: '⚡' },
  in_review:   { bg: 'rgba(139,92,246,0.2)',   color: '#A78BFA',               label: 'review',    icon: '👁' },
  done:        { bg: 'rgba(16,185,129,0.15)',  color: '#10B981',               label: 'done',      icon: '✓' },
  verified:    { bg: 'rgba(16,185,129,0.25)',  color: '#34D399',               label: 'vérifié',   icon: '✅' },
}

const PRIORITY_ORDER: Record<string, number> = { p0: 0, P0: 0, p1: 1, P1: 1, p2: 2, P2: 2, p3: 3, P3: 3 }
const AGENT_COLORS: Record<string, string> = {
  nova: '#E11F7B', aria: '#8B5CF6', forge: '#F59E0B', rex: '#10B981', orion: '#60A5FA',
}

export function TicketsWidget() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'queue'>('active')

  useEffect(() => {
    const loadAll = () => {
      supabase.from('tickets').select('id,title,priority,status,assigned_to,project')
        .then(({ data }) => {
          if (!data) return
          const sorted = [...data].sort((a, b) => {
            const ps = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
            if (ps !== 0) return ps
            // actifs avant queue avant backlog
            const statusOrder: Record<string, number> = { in_progress: 0, in_review: 1, queued: 2, backlog: 3, done: 4, verified: 5 }
            return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
          })
          setTickets(sorted as Ticket[])
        })

      supabase.from('build_tasks')
        .select('id,agent,label,status,progress,step_label')
        .in('status', ['running', 'pending'])
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => { if (data) setTasks(data as BuildTask[]) })
    }

    loadAll()

    const ch1 = supabase.channel('tw_tickets_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadAll)
      .subscribe()
    const ch2 = supabase.channel('tw_tasks_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, loadAll)
      .subscribe()

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [])

  // Trouver la build_task active liée à un ticket (par label contenant l'ID)
  const taskForTicket = (ticketId: string) =>
    tasks.find(t => t.label?.includes(ticketId) || t.label?.toLowerCase().includes(ticketId.toLowerCase()))

  const visible = tickets.filter(t => {
    if (filter === 'active') return ['in_progress', 'in_review', 'queued'].includes(t.status)
    if (filter === 'queue') return ['queued', 'backlog'].includes(t.status)
    return t.status !== 'verified'
  })

  const activeCount = tickets.filter(t => t.status === 'in_progress').length
  const queueCount = tickets.filter(t => t.status === 'queued').length

  return (
    <div data-widget-nodrag style={{ padding: '8px 0', pointerEvents: 'all' }}>
      {/* Filtres */}
      <div style={{ display: 'flex', gap: 4, padding: '0 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['active', 'queue', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, cursor: 'pointer',
            background: filter === f ? 'rgba(225,31,123,0.2)' : 'rgba(255,255,255,0.06)',
            color: filter === f ? '#E11F7B' : 'rgba(255,255,255,0.35)',
            border: filter === f ? '1px solid rgba(225,31,123,0.3)' : '1px solid transparent',
          }}>
            {f === 'active' ? `⚡ Actifs (${activeCount})` : f === 'queue' ? `◈ Queue (${queueCount})` : '○ Tous'}
          </button>
        ))}
      </div>

      {/* Liste tickets */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {visible.length === 0 && (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            Aucun ticket dans cette vue
          </div>
        )}
        {visible.map(ticket => {
          const cfg = STATUS_CFG[ticket.status] ?? STATUS_CFG.backlog
          const activeTask = taskForTicket(ticket.id)
          const agentColor = AGENT_COLORS[ticket.assigned_to?.toLowerCase() ?? ''] ?? 'rgba(255,255,255,0.4)'
          const pColor = PRIORITY_COLORS[ticket.priority] ?? '#6B7280'

          return (
            <div key={ticket.id} style={{
              padding: '7px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: ticket.status === 'in_progress' ? 'rgba(59,130,246,0.04)' : 'transparent',
            }}>
              {/* Ligne principale */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: activeTask ? 5 : 0 }}>
                {/* ID */}
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {ticket.id}
                </span>
                {/* Priorité */}
                <span style={{ fontSize: 9, fontWeight: 700, color: pColor, flexShrink: 0 }}>
                  {ticket.priority.toUpperCase()}
                </span>
                {/* Titre */}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ticket.title}
                </span>
                {/* Agent assigné */}
                {ticket.assigned_to && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: agentColor, flexShrink: 0, textTransform: 'capitalize' }}>
                    {ticket.assigned_to}
                  </span>
                )}
                {/* Statut badge */}
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999, flexShrink: 0,
                  background: cfg.bg, color: cfg.color,
                }}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>

              {/* Build task active liée à ce ticket */}
              {activeTask && (
                <div style={{ marginLeft: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                      {activeTask.agent} — {activeTask.step_label ?? activeTask.label?.slice(0, 40) ?? '…'}
                    </span>
                    {activeTask.progress !== undefined && (
                      <span style={{ fontSize: 9, color: '#E11F7B', fontWeight: 700 }}>{Math.round(activeTask.progress)}%</span>
                    )}
                  </div>
                  {activeTask.progress !== undefined && (
                    <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }}>
                      <div style={{ width: `${Math.min(100, activeTask.progress)}%`, height: '100%', background: '#E11F7B', borderRadius: 1, transition: 'width 0.5s' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer stats */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {Object.entries({ '⚡': 'in_progress', '◈': 'queued', '○': 'backlog', '✅': 'verified' }).map(([icon, s]) => {
          const count = tickets.filter(t => t.status === s).length
          return count > 0 ? (
            <span key={s} style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
              {icon} {count}
            </span>
          ) : null
        })}
      </div>
    </div>
  )
}
