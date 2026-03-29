/**
 * TicketsPage — Route "/tickets"
 * TK-0175 — Vue Kanban des tickets
 * TK-0169 — Goal Hierarchy (capsule goal banner, GoalBadge, New Goal modal)
 */
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'
import type { Goal } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Ticket {
  id: string
  title: string
  priority: string
  status: string
  assigned_to: string | null
  project: string | null
  goal_id?: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  P0: { bg: 'rgba(239,68,68,0.2)',    color: '#EF4444' },
  P1: { bg: 'rgba(245,158,11,0.2)',   color: '#F59E0B' },
  P2: { bg: 'rgba(107,114,128,0.2)',  color: '#9CA3AF' },
  P3: { bg: 'rgba(107,114,128,0.15)', color: '#6B7280' },
}

const GOAL_LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  capsule: { bg: 'rgba(225,31,123,0.15)', color: '#E11F7B' },
  project: { bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6' },
  sprint:  { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
}

const AGENT_EMOJI: Record<string, string> = {
  forge: '🔧', nova: '✦', aria: '🎨', rex: '🛡️', orion: '🌟',
}

const KANBAN_COLUMNS = [
  { id: 'backlog',     label: 'Backlog',     statuses: ['backlog'] },
  { id: 'in_progress', label: 'In Progress', statuses: ['queued', 'in_progress', 'in_review'] },
  { id: 'done',        label: 'Done',        statuses: ['done', 'verified'] },
]

// ── GoalBadge ─────────────────────────────────────────────────────────────────
function GoalBadge({ goal }: { goal: Goal }) {
  const colors = GOAL_LEVEL_COLORS[goal.level] ?? GOAL_LEVEL_COLORS.project
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 'var(--radius-full)',
      background: colors.bg,
      color: colors.color,
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: 120,
    }} title={goal.title}>
      🎯 {goal.title}
    </span>
  )
}

// ── NewGoalModal ──────────────────────────────────────────────────────────────
function NewGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<'capsule' | 'project' | 'sprint'>('project')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Le titre est obligatoire'); return }
    setLoading(true)
    setError('')
    try {
      // Get current capsule id
      const { data: capsules } = await supabase.from('capsules').select('id').limit(1)
      const capsuleId = capsules?.[0]?.id
      if (!capsuleId) { setError('Aucune capsule trouvée'); setLoading(false); return }

      const { error: insertErr } = await supabase.from('goals').insert({
        capsule_id: capsuleId,
        title: title.trim(),
        level,
        description: description.trim() || null,
        target_date: targetDate || null,
        status: 'active',
      })
      if (insertErr) throw insertErr
      onCreated()
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la création'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg-elevated)',
          border: 'var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 24,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          🎯 Nouvel objectif
        </h2>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-label)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Titre *
          </label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
            placeholder="Atteindre 500k MAU en 2026…"
            style={{
              background: 'var(--bg-surface)', border: 'var(--glass-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 12px',
              color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
          />
        </div>

        {/* Level */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-label)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Niveau
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['capsule', 'project', 'sprint'] as const).map(lvl => {
              const colors = GOAL_LEVEL_COLORS[lvl]
              return (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  style={{
                    flex: 1, padding: '8px 0',
                    borderRadius: 'var(--radius-md)',
                    border: level === lvl ? `1px solid ${colors.color}` : '1px solid var(--border-default)',
                    background: level === lvl ? colors.bg : 'transparent',
                    color: level === lvl ? colors.color : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  }}
                >
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-label)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Description (optionnelle)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Détails sur l'objectif…"
            style={{
              background: 'var(--bg-surface)', border: 'var(--glass-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 12px',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)',
              outline: 'none', resize: 'vertical',
            }}
          />
        </div>

        {/* Target date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-label)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Date cible (optionnelle)
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            style={{
              background: 'var(--bg-surface)', border: 'var(--glass-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 12px',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)',
              outline: 'none', colorScheme: 'dark',
            }}
          />
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 12, color: '#EF4444', fontFamily: 'var(--font-sans)' }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 'var(--radius-md)',
              background: 'transparent', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loading || !title.trim()}
            style={{
              padding: '9px 18px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: '#fff', border: 'none',
              cursor: loading || !title.trim() ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
              opacity: loading || !title.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Création…' : '🎯 Créer l\'objectif'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TicketCard ────────────────────────────────────────────────────────────────
function TicketCard({ ticket, goals }: { ticket: Ticket; goals: Goal[] }) {
  const priority = ticket.priority?.toUpperCase() ?? 'P3'
  const pColor = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.P3
  const agentEmoji = AGENT_EMOJI[ticket.assigned_to?.toLowerCase() ?? '']
  const linkedGoal = ticket.goal_id ? goals.find(g => g.id === ticket.goal_id) : null

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

      {/* GoalBadge */}
      {linkedGoal && <GoalBadge goal={linkedGoal} />}

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
      const { activeCapsuleId } = useLaunchpadStore.getState()
      const { error: insertErr } = await supabase.from('tickets').insert({
        title: title.trim(),
        priority,
        status: columnStatus,
        project: 'launchpad',
        reporter: 'romain',
        type: 'feature',
        capsule_id: activeCapsuleId ?? undefined,
      })
      if (insertErr) throw insertErr
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
        id={columnStatus === 'backlog' ? 'new-ticket-backlog' : undefined}
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
  const [goals, setGoals] = useState<Goal[]>([])
  const [capsuleGoal, setCapsuleGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [showNewGoalModal, setShowNewGoalModal] = useState(false)

  const loadData = async () => {
    try {
      // Load tickets with goal_id (graceful if column doesn't exist)
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('id,title,priority,status,assigned_to,project,goal_id')
        .order('created_at', { ascending: false })
      setTickets((ticketData as Ticket[]) ?? [])
    } catch {
      // goals column might not exist yet - load without it
      try {
        const { data: ticketData } = await supabase
          .from('tickets')
          .select('id,title,priority,status,assigned_to,project')
          .order('created_at', { ascending: false })
        setTickets((ticketData as Ticket[]) ?? [])
      } catch {
        setTickets([])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // Table doesn't exist yet - graceful empty state
        setGoals([])
        setCapsuleGoal(null)
        return
      }

      const allGoals = (data as Goal[]) ?? []
      setGoals(allGoals)
      // Find active capsule-level goal
      const activeCapGoal = allGoals.find(g => g.level === 'capsule' && g.status === 'active')
      setCapsuleGoal(activeCapGoal ?? null)
    } catch {
      setGoals([])
      setCapsuleGoal(null)
    }
  }

  const loadTickets = async () => {
    await loadData()
  }

  useEffect(() => {
    void loadData()
    void loadGoals()

    const ch = supabase.channel('tickets_page_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => void loadData())
      .subscribe()

    return () => { void supabase.removeChannel(ch) }
  }, [])

  // Filter
  const filtered = tickets.filter(t => {
    if (filterPriority && t.priority?.toUpperCase() !== filterPriority) return false
    if (filterStatus) {
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
      {/* ── Capsule Goal Banner ──────────────────────────────────────────────── */}
      {capsuleGoal ? (
        <div style={{
          padding: '10px 24px',
          background: 'rgba(225,31,123,0.06)',
          borderBottom: '1px solid rgba(225,31,123,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(225,31,123,0.9)',
            fontFamily: 'var(--font-display)',
          }}>
            "{capsuleGoal.title}"
          </span>
          {capsuleGoal.target_date && (
            <span style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-sans)',
            }}>
              → {new Date(capsuleGoal.target_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
      ) : (
        <div style={{
          padding: '8px 24px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <button
            onClick={() => setShowNewGoalModal(true)}
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
          >
            <span>🎯</span> + Définir un objectif capsule
          </button>
        </div>
      )}

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

        {/* Spacer + New Ticket + New Goal buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowNewGoalModal(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(225,31,123,0.1)',
              color: 'rgba(225,31,123,0.9)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              border: '1px solid rgba(225,31,123,0.25)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s',
            }}
          >
            🎯 New Goal
          </button>
          <button
            onClick={() => {
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
                    <TicketCard key={ticket.id} ticket={ticket} goals={goals} />
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

      {/* New Goal Modal */}
      {showNewGoalModal && (
        <NewGoalModal
          onClose={() => setShowNewGoalModal(false)}
          onCreated={() => { void loadGoals() }}
        />
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
