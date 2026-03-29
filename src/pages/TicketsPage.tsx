/**
 * TicketsPage — Route "/tickets"
 * TK-0175 — Vue Kanban des tickets
 */
import { useEffect, useState, useRef } from 'react'
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
  P0: { bg: 'rgba(239,68,68,0.2)',    color: '#EF4444' },
  P1: { bg: 'rgba(245,158,11,0.2)',   color: '#F59E0B' },
  P2: { bg: 'rgba(107,114,128,0.2)',  color: '#9CA3AF' },
  P3: { bg: 'rgba(107,114,128,0.15)', color: '#6B7280' },
}

const AGENT_EMOJI: Record<string, string> = {
  forge: '🔧', nova: '✦', aria: '🎨', rex: '🛡️', orion: '🌟',
}

const KANBAN_COLUMNS = [
  { id: 'backlog',     label: 'Backlog',     statuses: ['backlog'] },
  { id: 'in_progress', label: 'In Progress', statuses: ['queued', 'in_progress', 'in_review'] },
  { id: 'done',        label: 'Done',        statuses: ['done', 'verified'] },
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
        border: '1px solid var(--border-default)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: 'default',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-accent)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)' }}
    >
      {/* Title */}
      <p style={{
        margin: 0,
        fontSize: 'var(--font-size-sm)',
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
          fontSize: 'var(--font-size-xs)',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          background: pColor.bg,
          color: pColor.color,
          fontFamily: 'var(--font-sans)',
        }}>
          {priority}
        </span>
        {agentEmoji && (
          <span title={ticket.assigned_to ?? ''} style={{ fontSize: 14, marginLeft: 'auto' }}>
            {agentEmoji}
          </span>
        )}
        {!agentEmoji && ticket.assigned_to && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginLeft: 'auto', fontFamily: 'var(--font-sans)' }}>
            {ticket.assigned_to}
          </span>
        )}
      </div>
    </div>
  )
}

// ── InlineNewTicket ────────────────────────────────────────────────────────────
function InlineNewTicket({
  columnStatus,
  onCreated,
}: {
  columnStatus: string
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('P2')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOpen = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      await supabase.from('tickets').insert({
        title: title.trim(),
        priority,
        status: columnStatus,
      })
      setTitle('')
      setPriority('P2')
      setOpen(false)
      onCreated()
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSubmit()
    if (e.key === 'Escape') { setOpen(false); setTitle('') }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'transparent',
          border: '1px dashed var(--border-default)',
          color: 'var(--text-tertiary)',
          fontSize: 'var(--font-size-sm)',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-sans)',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'
        }}
      >
        + Nouveau ticket
      </button>
    )
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-accent)',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Titre du ticket…"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-sans)',
          width: '100%',
        }}
      />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {(['P0','P1','P2'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              background: priority === p ? (PRIORITY_COLORS[p]?.bg ?? 'transparent') : 'transparent',
              color: priority === p ? (PRIORITY_COLORS[p]?.color ?? '#fff') : 'var(--text-tertiary)',
              border: priority === p ? `1px solid ${PRIORITY_COLORS[p]?.color}55` : '1px solid var(--border-default)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {p}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            onClick={() => { setOpen(false); setTitle('') }}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid var(--border-default)', cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loading || !title.trim()}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, opacity: loading || !title.trim() ? 0.5 : 1 }}
          >
            {loading ? '…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TicketsPage ───────────────────────────────────────────────────────────────
export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

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
    if (filterStatus) {
      // map filter status label to actual statuses
      const col = KANBAN_COLUMNS.find(c => c.id === filterStatus)
      if (col && !col.statuses.includes(t.status)) return false
      if (!col && t.status !== filterStatus) return false
    }
    return true
  })

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
        padding: 'var(--space-5) var(--space-6) var(--space-4)',
        borderBottom: 'var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.02em',
        }}>
          Tickets <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: 'var(--font-size-lg)' }}>({tickets.length})</span>
        </h1>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginLeft: 8 }}>
          {/* Priority filter */}
          {(['P0','P1','P2'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(filterPriority === p ? null : p)}
              style={{
                fontSize: 'var(--font-size-xs)', fontWeight: 700, padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                background: filterPriority === p ? (PRIORITY_COLORS[p]?.bg ?? 'transparent') : 'rgba(255,255,255,0.06)',
                color: filterPriority === p ? (PRIORITY_COLORS[p]?.color ?? '#fff') : 'var(--text-tertiary)',
                border: filterPriority === p ? `1px solid ${PRIORITY_COLORS[p]?.color}44` : '1px solid transparent',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {p}
            </button>
          ))}

          {/* Status filter */}
          <select
            value={filterStatus ?? ''}
            onChange={e => setFilterStatus(e.target.value || null)}
            style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <option value="">Tous les statuts</option>
            {KANBAN_COLUMNS.map(col => (
              <option key={col.id} value={col.id}>{col.label}</option>
            ))}
          </select>
        </div>

        {/* Spacer + New Ticket button */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => {
              // Scroll to backlog column if possible, or just trigger inline form
              document.getElementById('new-ticket-backlog')?.click()
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
          >
            + Nouveau ticket
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
          gap: 'var(--space-4)',
          padding: 'var(--space-6)',
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
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
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
                    Aucun ticket ici
                  </div>
                ) : (
                  colTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                )}

                {/* Inline new ticket — backlog column only */}
                {col.id === 'backlog' && (
                  <InlineNewTicket
                    columnStatus="backlog"
                    onCreated={loadTickets}
                  />
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
