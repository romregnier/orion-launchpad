import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEvent {
  id: string
  event_type: string
  agent_key: string | null
  severity: string | null
  created_at: string
  message?: string | null
}

interface BuildTask {
  id: string
  label: string
  status: string
  progress: number
  agent_key: string | null
  step_label: string | null
  created_at: string
}

interface Ticket {
  id: string
  title: string
  priority: string
  status: string
  created_at: string
}

interface AgentBudget {
  agent_key: string
  monthly_token_limit: number
  tokens_used_mtd: number
  usd_used_mtd: number
  monthly_usd_limit: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `il y a ${days}j`
}

function severityIcon(severity: string | null): string {
  switch (severity) {
    case 'error':   return '🔴'
    case 'warning': return '🟡'
    case 'info':    return '🔵'
    default:        return '⚪'
  }
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────

function Shimmer({ height = 16, width = '100%' }: { height?: number; width?: string | number }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: 4,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }}
    />
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function DashCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 200,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.55)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: '#E11F7B',
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function Empty({ text }: { text: string }) {
  return (
    <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: "'Poppins', sans-serif" }}>
      {text}
    </p>
  )
}

// ── Zone 1 — Activité récente ─────────────────────────────────────────────────

function ActivityCard({ events, loading }: { events: AuditEvent[]; loading: boolean }) {
  return (
    <DashCard title="Activité récente">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => <Shimmer key={i} height={14} />)}
        </div>
      ) : events.length === 0 ? (
        <Empty text="Aucune activité récente" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
          {events.map((e) => (
            <div
              key={e.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{severityIcon(e.severity)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap' }}>
                    {e.event_type}
                  </span>
                  {e.agent_key && (
                    <span style={{ fontSize: 11, color: '#E11F7B', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap' }}>
                      {e.agent_key}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0, fontFamily: "'Poppins', sans-serif" }}>
                {relativeTime(e.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashCard>
  )
}

// ── Zone 2 — Tasks en cours ───────────────────────────────────────────────────

function TasksCard({ tasks, loading }: { tasks: BuildTask[]; loading: boolean }) {
  return (
    <DashCard title="Tasks en cours">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Shimmer height={13} width="70%" />
              <Shimmer height={4} />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Empty text="Pipeline au repos 💤" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map((t) => (
            <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: "'Poppins', sans-serif", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.label || t.step_label || 'Tâche'}
                </span>
                {t.agent_key && (
                  <span style={{ fontSize: 10, color: '#E11F7B', fontFamily: "'Poppins', sans-serif", flexShrink: 0 }}>
                    {t.agent_key}
                  </span>
                )}
              </div>
              <ProgressBar value={t.progress} />
            </div>
          ))}
        </div>
      )}
    </DashCard>
  )
}

// ── Zone 3 — Tickets P0 ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: 'rgba(59,130,246,0.3)',
  in_progress: 'rgba(245,158,11,0.3)',
  review: 'rgba(139,92,246,0.3)',
  done: 'rgba(16,185,129,0.3)',
  closed: 'rgba(255,255,255,0.1)',
}

function TicketsCard({ tickets, loading }: { tickets: Ticket[]; loading: boolean }) {
  return (
    <DashCard title="Tickets critiques">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(3)].map((_, i) => <Shimmer key={i} height={14} />)}
        </div>
      ) : tickets.length === 0 ? (
        <Empty text="Aucun ticket critique ouvert ✅" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tickets.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(239,68,68,0.25)',
                  color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.35)',
                  flexShrink: 0,
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                P0
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Poppins', sans-serif" }}>
                {t.title}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: STATUS_COLORS[t.status] ?? 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                  flexShrink: 0,
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {t.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashCard>
  )
}

// ── Zone 4 — Budget agents ────────────────────────────────────────────────────

function BudgetCard({ budgets, loading }: { budgets: AgentBudget[]; loading: boolean }) {
  return (
    <DashCard title="Budget agents">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Shimmer height={13} width="50%" />
              <Shimmer height={4} />
            </div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Empty text="Aucune donnée budget" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {budgets.map((b) => {
            const pct = b.monthly_token_limit > 0
              ? Math.round((b.tokens_used_mtd / b.monthly_token_limit) * 100)
              : 0
            return (
              <div key={b.agent_key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: "'Poppins', sans-serif" }}>
                    {b.agent_key}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Poppins', sans-serif" }}>
                    {pct}%
                  </span>
                </div>
                <ProgressBar value={pct} />
              </div>
            )
          })}
        </div>
      )}
    </DashCard>
  )
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [budgets, setBudgets] = useState<AgentBudget[]>([])

  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [loadingBudgets, setLoadingBudgets] = useState(true)

  useEffect(() => {
    // Zone 1 — Activité récente
    void Promise.resolve(
      supabase
        .from('agent_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
    ).then(({ data }) => {
      setEvents((data as AuditEvent[] | null) ?? [])
      setLoadingEvents(false)
    }).catch(() => setLoadingEvents(false))

    // Zone 2 — Tasks en cours
    void Promise.resolve(
      supabase
        .from('build_tasks')
        .select('*')
        .in('status', ['in_progress', 'pending'])
        .order('created_at', { ascending: false })
        .limit(5)
    ).then(({ data }) => {
      setTasks((data as BuildTask[] | null) ?? [])
      setLoadingTasks(false)
    }).catch(() => setLoadingTasks(false))

    // Zone 3 — Tickets P0
    void Promise.resolve(
      supabase
        .from('tickets')
        .select('*')
        .eq('priority', 'P0')
        .not('status', 'in', '("done","closed")')
        .order('created_at', { ascending: false })
        .limit(5)
    ).then(({ data }) => {
      setTickets((data as Ticket[] | null) ?? [])
      setLoadingTickets(false)
    }).catch(() => setLoadingTickets(false))

    // Zone 4 — Budget agents
    void Promise.resolve(
      supabase
        .from('agent_budgets')
        .select('agent_key,monthly_token_limit,tokens_used_mtd,usd_used_mtd,monthly_usd_limit')
        .order('usd_used_mtd', { ascending: false })
        .limit(5)
    ).then(({ data }) => {
      setBudgets((data as AgentBudget[] | null) ?? [])
      setLoadingBudgets(false)
    }).catch(() => setLoadingBudgets(false))
  }, [])

  return (
    <>
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0B090D',
          overflowY: 'auto',
          padding: 24,
          boxSizing: 'border-box',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* Page title */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: '#F0EDF5',
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: '-0.02em',
            }}
          >
            Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: "'Poppins', sans-serif" }}>
            Vue d'ensemble du pipeline Orion
          </p>
        </div>

        {/* Grid 2 colonnes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
          className="dashboard-grid"
        >
          <ActivityCard events={events} loading={loadingEvents} />
          <TasksCard tasks={tasks} loading={loadingTasks} />
          <TicketsCard tickets={tickets} loading={loadingTickets} />
          <BudgetCard budgets={budgets} loading={loadingBudgets} />
        </div>
      </div>

      {/* Responsive style */}
      <style>{`
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
