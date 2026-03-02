/**
 * TicketsWidget
 *
 * Affiche les tickets backlog/in_progress/in_review en temps réel.
 * Triés par priorité (p0→p3), puis par id.
 * Badges colorés priorité + statut.
 * Subscription Supabase Realtime sur la table `tickets`.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Ticket {
  id: string
  priority: 'p0' | 'p1' | 'p2' | 'p3'
  status: 'backlog' | 'in_progress' | 'in_review'
  title: string
}

const PRIORITY_COLORS: Record<string, string> = {
  p0: '#EF4444',
  p1: '#F59E0B',
  p2: '#EAB308',
  p3: '#6B7280',
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  backlog:     { bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', label: 'backlog' },
  in_progress: { bg: 'rgba(59,130,246,0.25)',  color: '#60A5FA',               label: 'en cours' },
  in_review:   { bg: 'rgba(139,92,246,0.25)',  color: '#A78BFA',               label: 'review' },
}

const PRIORITY_ORDER: Record<string, number> = { p0: 0, p1: 1, p2: 2, p3: 3 }

function BadgePriority({ priority }: { priority: string }) {
  return (
    <span style={{
      background: PRIORITY_COLORS[priority] ?? '#6B7280',
      color: 'white',
      fontWeight: 700,
      fontSize: '10px',
      padding: '2px 5px',
      borderRadius: '4px',
      textTransform: 'uppercase' as const,
      fontFamily: 'monospace',
      flexShrink: 0,
    }}>
      {priority.toUpperCase()}
    </span>
  )
}

function BadgeStatus({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.backlog
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      fontSize: '10px',
      padding: '2px 6px',
      borderRadius: '4px',
      flexShrink: 0,
    }}>
      {style.label}
    </span>
  )
}

interface TicketsWidgetProps {
  onClose?: () => void
}

export function TicketsWidget({ onClose: _onClose }: TicketsWidgetProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])

  const fetchTickets = () => {
    supabase
      .from('tickets')
      .select('id, priority, status, title')
      .in('status', ['backlog', 'in_progress', 'in_review'])
      .then(({ data }) => {
        if (data) {
          const sorted = [...data].sort((a, b) => {
            const pd = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
            if (pd !== 0) return pd
            return a.id.localeCompare(b.id)
          })
          setTickets(sorted as Ticket[])
        }
      })
  }

  useEffect(() => {
    fetchTickets()

    const channel = supabase
      .channel('tickets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,0.08)',
      paddingTop: 6,
    }}>
      <div
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.15) transparent',
        }}
      >
        {tickets.length === 0 && (
          <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            Aucun ticket actif
          </div>
        )}
        {tickets.map(ticket => {
          return (
            <div key={ticket.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.85)',
              minHeight: '28px',
            }}>
              <BadgePriority priority={ticket.priority} />
              <BadgeStatus status={ticket.status} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ opacity: 0.5, fontFamily: 'monospace', marginRight: '4px' }}>{ticket.id}</span>
                {ticket.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
