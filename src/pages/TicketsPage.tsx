/**
 * TicketsPage — Route "/tickets"
 * TK-0175 — Vue Kanban des tickets
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Ticket {
  id: string
  title: string
  priority: string
  status: string
  assigned_to: string | null
  project: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  P0: { bg: 'rgba(239,68,68,0.2)',   color: '#EF4444' },
  P1: { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B' },
  P2: { bg: 'rgba(107,114,128,0.2)', color: '#9CA3AF' },
  P3: { bg: 'rgba(107,114,128,0.15)', color: '#6B7280' },
}

const AGENT_EMOJI: Record<string, string> = {
  forge: '🔧', nova: '✦', aria: '🎨', rex: '🛡️', orion: '🌟',
}

const KANBAN_COLUMNS = [
  { id: 'backlog',     label: 'Backlog',      statuses: ['backlog'] },
  { id: 'in_progress', label: 'In Progress',  statuses: ['queued', 'in_progress', 'in_review'] },
  { id: 'done',        label: 'Done',         statuses: ['done', 'verified'] },
]

// ── TicketCard ────────────────────────────────────────────────────────────────
function TicketCard({ ticket }: { ticket: Ticket }) {
  const priority = ticket.priority?.toUpperCase() ?? 'P3'
  const pColor = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.P3
  const agentEmoji = AGENT_EMOJI[ticket.assigned_to?.toLowerCase() ?? '']

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-md)',
        border: 'var(--glass-border)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: 'default',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-accent)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      {/* Title */}
      <p style={{
        margin: 0,
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        lineHeight: 1.4,
      }}>
        {ticket.title}
      </p>

      {/* Footer: priority + assigned */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          background: pColor.bg,
          color: pColor.color,
          fontFamily: 'var(--font-display)',
        }}>
          {priority}
        </span>
        {agentEmoji && (
          <span title={ticket.assigned_to ?? ''} style={{ fontSize: 14, marginLeft: 'auto' }}>
            {agentEmoji}
          </span>
        )}
        {!agentEmoji && ticket.assigned_to && (
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto', fontFamily: 'var(--font-sans)' }}>
            {ticket.assigned_to}
          </span>
        )}
      </div>
    </div>
  )
}

// ── TicketsPage ───────────────────────────────────────────────────────────────
export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterAgent, setFilterAgent] = useState<string | null>(null)

  const loadTickets = async () => {
    try {
      const { data } = await supabase
        .from('tickets')
        .select('id,title,priority,status,assigned_to,project')
        .order('created_at', { ascending: false })
      setTickets(data as Ticket[] ?? [])
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTickets()

    const ch = supabase.channel('tickets_page_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => void loadTickets())
      .subscribe()

    return () => { void supabase.removeChannel(ch) }
  }, [])

  // Filter
  const filtered = tickets.filter(t => {
    if (filterPriority && t.priority?.toUpperCase() !== filterPriority) return false
    if (filterAgent && t.assigned_to !== filterAgent) return false
    return true
  })

  const agents = Array.from(new Set(tickets.map(t => t.assigned_to).filter(Boolean))) as string[]

  const getColumnTickets = (statuses: string[]) =>
    filtered.filter(t => statuses.includes(t.status))

  return (
    <div style={{
      height: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: 'var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.02em',
        }}>
          Tickets <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: 16 }}>({tickets.length})</span>
        </h1>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginLeft: 8 }}>
          {/* Priority filter */}
          {(['P0','P1','P2'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(filterPriority === p ? null : p)}
              style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                background: filterPriority === p ? (PRIORITY_COLORS[p]?.bg ?? 'transparent') : 'rgba(255,255,255,0.06)',
                color: filterPriority === p ? (PRIORITY_COLORS[p]?.color ?? '#fff') : 'var(--text-tertiary)',
                border: filterPriority === p ? `1px solid ${PRIORITY_COLORS[p]?.color}44` : '1px solid transparent',
                fontFamily: 'var(--font-display)',
              }}
            >
              {p}
            </button>
          ))}

          {/* Agent filter */}
          {agents.length > 0 && (
            <select
              value={filterAgent ?? ''}
              onChange={e => setFilterAgent(e.target.value || null)}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <option value="">Tous les agents</option>
              {agents.map(a => (
                <option key={a} value={a}>{AGENT_EMOJI[a] ?? '🤖'} {a}</option>
              ))}
            </select>
          )}
        </div>

        {/* Spacer + New Ticket button */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
          >
            + New Ticket
          </button>
        </div>
      </div>

      {/* ── Kanban board ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <p style={{ fontSize: 13, fontFamily: 'var(--font-sans)' }}>Chargement des tickets…</p>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          padding: 24,
          overflowY: 'auto',
          alignItems: 'start',
        }}>
          {KANBAN_COLUMNS.map(col => {
            const colTickets = getColumnTickets(col.statuses)
            return (
              <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Column header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 4,
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-label)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {colTickets.length}
                  </span>
                </div>

                {/* Cards */}
                {colTickets.length === 0 ? (
                  <div style={{
                    padding: '16px 0',
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    Aucun ticket
                  </div>
                ) : (
                  colTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .tickets-kanban { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
