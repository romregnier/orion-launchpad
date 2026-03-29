/**
 * ActivityPage — Route "/activity"
 * TK-0164 — Timeline depuis agent_audit_log
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditEvent {
  id: string
  created_at: string
  agent_key: string | null
  event_type: string
  event_data: Record<string, unknown> | null
  severity?: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AGENT_EMOJI: Record<string, string> = {
  forge: '🔧', nova: '✦', aria: '🎨', rex: '🛡️', orion: '🌟',
}

const SEVERITY_COLORS: Record<string, string> = {
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '#0EA5E9',
  success: '#10B981',
}

const KNOWN_AGENTS = ['forge', 'nova', 'aria', 'rex', 'orion']

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByDay(events: AuditEvent[]): { date: string; events: AuditEvent[] }[] {
  const groups: Record<string, AuditEvent[]> = {}
  for (const e of events) {
    const key = new Date(e.created_at).toDateString()
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }
  return Object.entries(groups).map(([_key, evs]) => ({
    date: formatDate(evs[0].created_at),
    events: evs,
  }))
}

// ── EventItem ─────────────────────────────────────────────────────────────────
function EventItem({ event }: { event: AuditEvent }) {
  const severity = (event.severity as string | null) ?? 'info'
  const dotColor = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.info
  const emoji = AGENT_EMOJI[event.agent_key?.toLowerCase() ?? ''] ?? '⚙️'
  const description = (event.event_data as { description?: string } | null)?.description ?? ''

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      {/* Dot */}
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: dotColor,
        flexShrink: 0,
        marginTop: 4,
        boxShadow: `0 0 6px ${dotColor}66`,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-sans)',
            flexShrink: 0,
          }}>
            {formatTime(event.created_at)}
          </span>
          <span style={{ fontSize: 14, flexShrink: 0 }}>{emoji}</span>
          {event.agent_key && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent)',
              fontFamily: 'var(--font-display)',
              flexShrink: 0,
            }}>
              {event.agent_key}
            </span>
          )}
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
            flexShrink: 0,
          }}>
            {event.event_type}
          </span>
          {description && (
            <span style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-sans)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              · {description}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ActivityPage ──────────────────────────────────────────────────────────────
export function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filterAgent, setFilterAgent] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error: err } = await supabase
          .from('agent_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (err) throw err
        setEvents(data as AuditEvent[] ?? [])
      } catch {
        setError(true)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    void load()

    // Realtime subscription
    const ch = supabase.channel('activity_page_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_audit_log' }, (payload) => {
        setEvents(prev => [payload.new as AuditEvent, ...prev].slice(0, 50))
      })
      .subscribe()

    return () => { void supabase.removeChannel(ch) }
  }, [])

  const filtered = filterAgent
    ? events.filter(e => e.agent_key === filterAgent)
    : events

  const groups = groupByDay(filtered)

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
        gap: 16,
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
          Activité
        </h1>

        {/* Agent filter */}
        <select
          value={filterAgent ?? ''}
          onChange={e => setFilterAgent(e.target.value || null)}
          style={{
            fontSize: 11,
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-secondary)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <option value="">Tous les agents</option>
          {KNOWN_AGENTS.map(a => (
            <option key={a} value={a}>{AGENT_EMOJI[a] ?? '🤖'} {a}</option>
          ))}
        </select>

        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-sans)',
        }}>
          {filtered.length} événements
        </span>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px 24px',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <p style={{ fontSize: 13, fontFamily: 'var(--font-sans)' }}>Chargement…</p>
          </div>
        )}

        {!loading && (error || filtered.length === 0) && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Aucune activité enregistrée
            </p>
            {error && (
              <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 8, fontFamily: 'var(--font-sans)' }}>
                Impossible de charger l'audit log
              </p>
            )}
          </div>
        )}

        {!loading && !error && groups.map(group => (
          <div key={group.date} style={{ marginBottom: 24 }}>
            {/* Day header */}
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-label)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-display)',
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              {group.date}
            </div>

            {/* Events */}
            {group.events.map(event => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
