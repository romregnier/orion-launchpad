import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAgentStatus } from '../hooks/useAgentStatus'

// ── Types ─────────────────────────────────────────────────────────────────────
interface BuildTask {
  id: string
  agent_key: string
  step_label: string
  progress: number
  status: string
  updated_at: string | null
  created_at?: string | null
}

interface AgentConversation {
  id: string
  agent_key: string
  unread_count?: number
  last_message?: string | null
  last_message_at?: string | null
  updated_at?: string | null
}

// ── Agent meta ────────────────────────────────────────────────────────────────
const AGENTS: Record<string, { name: string; emoji: string; color: string }> = {
  orion: { name: 'Orion', emoji: '🌟', color: '#E11F7B' },
  nova:  { name: 'Nova',  emoji: '💡', color: '#6366F1' },
  aria:  { name: 'Aria',  emoji: '🎨', color: '#EC4899' },
  forge: { name: 'Forge', emoji: '🔨', color: '#F59E0B' },
  rex:   { name: 'Rex',   emoji: '🔍', color: '#10B981' },
}

const STATUS_COLOR: Record<string, string> = {
  busy: '#F59E0B',
  online: '#22C55E',
  idle: 'rgba(255,255,255,0.2)',
}

const STATUS_LABEL: Record<string, string> = {
  busy: 'En cours',
  online: 'En ligne',
  idle: 'Inactif',
}

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'à l\'instant'
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// ── CapsuleHomePage ────────────────────────────────────────────────────────────
export function CapsuleHomePage() {
  const navigate = useNavigate()
  const agentStatusMap = useAgentStatus()

  const [runningBuilds, setRunningBuilds] = useState<BuildTask[]>([])
  const [activityFeed, setActivityFeed] = useState<BuildTask[]>([])
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    // Fetch builds en cours
    const { data: builds } = await supabase
      .from('build_tasks')
      .select('*')
      .eq('status', 'running')
      .order('updated_at', { ascending: false })

    // Fetch activité feed (10 dernières tâches)
    const { data: feed } = await supabase
      .from('build_tasks')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10)

    // Fetch conversations
    const { data: convos } = await supabase
      .from('agent_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(20)

    setRunningBuilds((builds ?? []) as BuildTask[])
    setActivityFeed((feed ?? []) as BuildTask[])
    setConversations((convos ?? []) as AgentConversation[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('capsule-home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_tasks' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_conversations' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  const agentKeys = Object.keys(AGENTS)
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0)

  return (
    <div className="page-with-bottom-nav" style={{
      minHeight: '100vh',
      background: '#0B090D',
      color: '#F0EDF5',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(11,9,13,0.97)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 20px',
        height: 64,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(240,237,245,0.5)', fontSize: 20,
            padding: '4px 8px', borderRadius: 6,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🏠 Dashboard</h1>
        {totalUnread > 0 && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{
              minWidth: 22, height: 22, borderRadius: 999,
              background: '#E11F7B', color: '#fff',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 6px',
              boxShadow: '0 0 10px rgba(225,31,123,0.4)',
            }}
          >
            {totalUnread}
          </motion.div>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(240,237,245,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p>Chargement…</p>
          </div>
        ) : (
          <>
            {/* ── Section Agents actifs ───────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,245,0.4)', marginBottom: 14, margin: '0 0 14px' }}>
                Agents actifs
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                <AnimatePresence>
                  {agentKeys.map((key, i) => {
                    const meta = AGENTS[key]
                    const status = agentStatusMap.get(key) ?? 'idle'
                    return (
                      <motion.button
                        key={key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, type: 'spring', stiffness: 350, damping: 28 }}
                        onClick={() => navigate(`/agents/${key}`)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 8, padding: '16px 12px',
                          borderRadius: 14,
                          background: '#2C272F',
                          border: `1px solid ${status === 'busy' ? `${meta.color}44` : 'rgba(255,255,255,0.06)'}`,
                          cursor: 'pointer',
                          fontFamily: "'Poppins', sans-serif",
                          transition: 'background 0.15s ease, border-color 0.15s ease',
                          boxShadow: status === 'busy' ? `0 0 16px ${meta.color}20` : 'none',
                        }}
                        whileHover={{ backgroundColor: '#3E3742' } as never}
                        whileTap={{ scale: 0.97 } as never}
                      >
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            background: `${meta.color}20`,
                            border: `2px solid ${meta.color}50`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                          }}>
                            {meta.emoji}
                          </div>
                          <span style={{
                            position: 'absolute', bottom: 1, right: 1,
                            width: 12, height: 12, borderRadius: '50%',
                            background: STATUS_COLOR[status],
                            border: '2px solid #0B090D',
                            boxShadow: status !== 'idle' ? `0 0 6px ${STATUS_COLOR[status]}` : 'none',
                          }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDF5' }}>{meta.name}</div>
                          <div style={{ fontSize: 11, color: STATUS_COLOR[status], fontWeight: 600, marginTop: 2 }}>
                            {STATUS_LABEL[status]}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>

            {/* ── Section Builds en cours ─────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,245,0.4)', margin: '0 0 14px' }}>
                Builds en cours ({runningBuilds.length})
              </h2>
              {runningBuilds.length === 0 ? (
                <div style={{ padding: '20px 0', color: 'rgba(240,237,245,0.3)', fontSize: 13, textAlign: 'center' }}>
                  Aucun build en cours
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {runningBuilds.map((task, i) => {
                    const meta = AGENTS[task.agent_key] ?? { name: task.agent_key, emoji: '🤖', color: '#888' }
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, type: 'spring', stiffness: 350, damping: 28 }}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 14,
                          background: '#2C272F',
                          border: `1px solid ${meta.color}33`,
                          display: 'flex', flexDirection: 'column', gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{meta.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDF5' }}>
                              {task.step_label || 'Tâche en cours...'}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(240,237,245,0.4)', marginTop: 2 }}>
                              {meta.name} · {relativeTime(task.updated_at)}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>
                            {task.progress ?? 0}%
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progress ?? 0}%` }}
                            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                            style={{ height: '100%', borderRadius: 2, background: meta.color }}
                          />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── Section Messages non-lus ────────────────────────────────────── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,245,0.4)', margin: 0 }}>
                  Messages non-lus
                </h2>
                <button
                  onClick={() => navigate('/agents')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#E11F7B', fontSize: 12, fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Voir tout →
                </button>
              </div>
              {conversations.filter(c => (c.unread_count ?? 0) > 0).length === 0 ? (
                <div style={{ padding: '20px 0', color: 'rgba(240,237,245,0.3)', fontSize: 13, textAlign: 'center' }}>
                  Aucun message non-lu 🎉
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {conversations
                    .filter(c => (c.unread_count ?? 0) > 0)
                    .map((convo, i) => {
                      const meta = AGENTS[convo.agent_key] ?? { name: convo.agent_key, emoji: '🤖', color: '#888' }
                      return (
                        <motion.button
                          key={convo.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, type: 'spring', stiffness: 350, damping: 28 }}
                          onClick={() => navigate(`/agents/${convo.agent_key}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderRadius: 12,
                            background: '#2C272F', border: '1px solid rgba(255,255,255,0.06)',
                            cursor: 'pointer', textAlign: 'left', width: '100%',
                            fontFamily: "'Poppins', sans-serif",
                          }}
                          whileHover={{ backgroundColor: '#3E3742' } as never}
                          whileTap={{ scale: 0.98 } as never}
                        >
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: `${meta.color}20`, border: `2px solid ${meta.color}50`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                          }}>
                            {meta.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#F0EDF5' }}>{meta.name}</div>
                            {convo.last_message && (
                              <div style={{ fontSize: 12, color: 'rgba(240,237,245,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {convo.last_message}
                              </div>
                            )}
                          </div>
                          <div style={{
                            minWidth: 22, height: 22, borderRadius: 999,
                            background: '#E11F7B', color: '#fff',
                            fontSize: 11, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0 6px', flexShrink: 0,
                            boxShadow: '0 0 8px rgba(225,31,123,0.4)',
                          }}>
                            {convo.unread_count}
                          </div>
                        </motion.button>
                      )
                    })}
                </div>
              )}
            </section>

            {/* ── Section Activité feed ───────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,245,0.4)', margin: '0 0 14px' }}>
                Activité récente
              </h2>
              {activityFeed.length === 0 ? (
                <div style={{ padding: '20px 0', color: 'rgba(240,237,245,0.3)', fontSize: 13, textAlign: 'center' }}>
                  Aucune activité
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {activityFeed.map((task, i) => {
                    const meta = AGENTS[task.agent_key] ?? { name: task.agent_key, emoji: '🤖', color: '#888' }
                    const isLast = i === activityFeed.length - 1
                    const statusColors: Record<string, string> = {
                      running: '#F59E0B',
                      done: '#22C55E',
                      failed: '#EF4444',
                      pending: 'rgba(255,255,255,0.3)',
                    }
                    const dotColor = statusColors[task.status] ?? 'rgba(255,255,255,0.3)'
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        style={{ display: 'flex', gap: 12, position: 'relative' }}
                      >
                        {/* Timeline line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: dotColor,
                            marginTop: 16,
                            boxShadow: task.status === 'running' ? `0 0 8px ${dotColor}` : 'none',
                          }} />
                          {!isLast && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.08)', minHeight: 20 }} />}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, padding: '10px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 14 }}>{meta.emoji}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.name}</span>
                            <span style={{ fontSize: 11, color: 'rgba(240,237,245,0.3)' }}>{relativeTime(task.updated_at)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'rgba(240,237,245,0.75)' }}>
                            {task.step_label || 'Tâche'}
                          </div>
                          {task.status === 'running' && (
                            <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', maxWidth: 200 }}>
                              <motion.div
                                animate={{ width: `${task.progress ?? 0}%` }}
                                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                                style={{ height: '100%', borderRadius: 2, background: meta.color }}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
