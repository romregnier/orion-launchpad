/**
 * DashboardPage — Route "/dashboard"
 * TK-0163 — Vue opérationnelle complète
 * TK-0170 — Board Approvals branchés sur board_approvals
 * TK-0165 — Automations branchées sur automations table
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'
import { useGalaxyMode } from '../hooks/useGalaxyMode'
import { GalaxyBadge } from '../components/GalaxyBadge'
import { HumanApprovalCard } from '../components/HumanApprovalCard'
import { AutomationCard } from '../components/AutomationCard'
import type { BoardApproval, Automation } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditEvent {
  id: string
  event_type: string
  agent_key: string | null
  severity?: string | null
  created_at: string
  event_data?: Record<string, unknown> | null
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

// ── Constants ─────────────────────────────────────────────────────────────────
const AGENT_EMOJI: Record<string, string> = {
  forge: '🔧', nova: '✦', aria: '🎨', rex: '🛡️', orion: '🌟',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return `il y a ${Math.floor(hrs / 24)}j`
}

// ── Shimmer ───────────────────────────────────────────────────────────────────
function Shimmer({ height = 16, width = '100%' }: { height?: number; width?: string | number }) {
  return (
    <div style={{
      height, width, borderRadius: 4,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: 20,
      border: 'var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <h2 style={{
        margin: 0,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-label)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-display)',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', height: 4, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
      {text}
    </p>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      border: 'var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-display)' }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

// ── DashboardPage ─────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { canvasAgents } = useLaunchpadStore()
  const galaxyMode = useGalaxyMode()

  const [events, setEvents] = useState<AuditEvent[]>([])
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [ticketsP0, setTicketsP0] = useState<Ticket[]>([])
  const [budgets, setBudgets] = useState<AgentBudget[]>([])
  const [approvals, setApprovals] = useState<BoardApproval[]>([])
  const [automations, setAutomations] = useState<Automation[]>([])

  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [loadingBudgets, setLoadingBudgets] = useState(true)

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const safeQuery = async <T,>(
    query: PromiseLike<{ data: T[] | null; error: unknown }>,
    onData: (d: T[]) => void,
    onErr: () => void
  ) => {
    try {
      const { data } = await query
      onData(data ?? [])
    } catch {
      onErr()
    }
  }

  const loadApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('board_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) {
        // Table doesn't exist yet - use empty state
        setApprovals([])
      } else {
        setApprovals((data as BoardApproval[]) ?? [])
      }
    } catch {
      setApprovals([])
    }
  }

  const loadAutomations = async () => {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('name')
      if (error) {
        setAutomations([])
      } else {
        setAutomations((data as Automation[]) ?? [])
      }
    } catch {
      setAutomations([])
    }
  }

  useEffect(() => {
    void safeQuery(supabase.from('agent_audit_log').select('*').order('created_at', { ascending: false }).limit(5) as never,
      (d) => { setEvents(d as AuditEvent[]); setLoadingEvents(false) },
      () => setLoadingEvents(false))

    void safeQuery(supabase.from('build_tasks').select('*').eq('status', 'running').order('created_at', { ascending: false }).limit(5) as never,
      (d) => { setTasks(d as BuildTask[]); setLoadingTasks(false) },
      () => setLoadingTasks(false))

    void safeQuery(supabase.from('tickets').select('*').eq('priority', 'P0').not('status', 'in', '("done","closed","verified")').order('created_at', { ascending: false }).limit(10) as never,
      (d) => { setTicketsP0(d as Ticket[]); setLoadingTickets(false) },
      () => setLoadingTickets(false))

    void safeQuery(supabase.from('agent_budgets').select('agent_key,monthly_token_limit,tokens_used_mtd,usd_used_mtd,monthly_usd_limit').order('usd_used_mtd', { ascending: false }).limit(5) as never,
      (d) => { setBudgets(d as AgentBudget[]); setLoadingBudgets(false) },
      () => setLoadingBudgets(false))

    void loadApprovals()
    void loadAutomations()
  }, [])

  // Realtime subscription for build tasks
  useEffect(() => {
    const ch = supabase.channel('dashboard_tasks_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, () => {
        void supabase.from('build_tasks').select('*').eq('status', 'running').order('created_at', { ascending: false }).limit(5)
          .then(({ data }) => setTasks(data as BuildTask[] ?? []))
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [])

  // Approval actions
  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('board_approvals')
      .update({ status: 'approved', decided_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setApprovals(prev => prev.filter(a => a.id !== id))
    }
  }

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('board_approvals')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setApprovals(prev => prev.filter(a => a.id !== id))
    }
  }

  // Automation toggle
  const handleAutomationToggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from('automations')
      .update({ enabled })
      .eq('id', id)
    if (!error) {
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a))
    }
  }

  // Stats
  const activeAgents = canvasAgents.filter(a => a.status === 'online' || a.working_on_project).length
  const totalBudget = budgets.reduce((s, b) => s + (b.usd_used_mtd ?? 0), 0)
  const budgetLimit = budgets.reduce((s, b) => s + (b.monthly_usd_limit ?? 0), 0)

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div style={{
        width: '100%',
        height: '100vh',
        background: 'var(--bg-base)',
        overflowY: 'auto',
        padding: 24,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Page header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
              {galaxyMode ? '🌌 Galaxy' : 'Dashboard'}
              {galaxyMode && <GalaxyBadge termKey="workspace" size="sm" variant="glow" />}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
              {galaxyMode ? 'Vue d\'ensemble de votre Galaxy Orion' : 'Vue d\'ensemble du pipeline Orion'}
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
            {today.charAt(0).toUpperCase() + today.slice(1)}
          </span>
        </div>

        {/* ── Section 1 — Stats (3 cards) ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <StatCard label="Agents actifs" value={activeAgents} sub="status = busy" />
          <StatCard
            label="Tickets P0"
            value={loadingTickets ? '…' : ticketsP0.length}
            sub="ouverts, non terminés"
          />
          <StatCard
            label="Budget ce mois"
            value={loadingBudgets ? '…' : `${totalBudget.toFixed(1)}$`}
            sub={budgetLimit > 0 ? `/ ${budgetLimit.toFixed(0)}$ limite` : 'Aucune limite définie'}
          />
        </div>

        {/* ── Grid 2 colonnes ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }} className="dashboard-grid">

          {/* Section 2 — Build tasks en cours */}
          <Section title="Build tasks en cours">
            {loadingTasks ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2].map(i => (
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
                {tasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        {t.agent_key && (
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{AGENT_EMOJI[t.agent_key] ?? '🤖'}</span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)' }}>
                          {t.label || t.step_label || 'Tâche'}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
                        {t.progress}%
                      </span>
                    </div>
                    <ProgressBar value={t.progress} />
                    {t.step_label && (
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
                        {t.step_label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Section 3 — Approbations en attente (board_approvals) */}
          <Section title={`Approbations en attente ${approvals.length > 0 ? `(${approvals.length})` : ''}`}>
            {approvals.length === 0 ? (
              <Empty text="Aucune approbation en attente ✅" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {approvals.map(a => (
                  <HumanApprovalCard
                    key={a.id}
                    approval={a}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Section 4 — Activity feed */}
          <Section title="Activité récente">
            {loadingEvents ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <Shimmer key={i} height={14} />)}
              </div>
            ) : events.length === 0 ? (
              <Empty text="Aucune activité récente" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.map(e => {
                  const description = (e.event_data as { description?: string } | null)?.description
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>
                        {e.agent_key ? (AGENT_EMOJI[e.agent_key] ?? '⚙️') : '●'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {e.agent_key && (
                            <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 600, flexShrink: 0 }}>
                              {e.agent_key}
                            </span>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
                            {e.event_type}
                          </span>
                          {description && (
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              · {description}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0, fontFamily: 'var(--font-sans)' }}>
                        {relativeTime(e.created_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Section 5 — Automations */}
          <Section title={`Automations ${automations.length > 0 ? `(${automations.length})` : ''}`}>
            {automations.length === 0 ? (
              <Empty text="Aucune automatisation configurée" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {automations.map(a => (
                  <AutomationCard
                    key={a.id}
                    automation={a}
                    onToggle={handleAutomationToggle}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
