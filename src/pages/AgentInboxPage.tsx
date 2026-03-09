import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { AGENT_META } from '../types'
import { formatMessageTime } from '../utils/formatMessageTime'
import { useAgentStatus } from '../hooks/useAgentStatus'
import { BroadcastModal } from '../components/BroadcastModal'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgentConversation {
  id: string
  agent_key: string
  last_message?: string | null
  last_message_at?: string | null
  unread_count?: number
  // fallback cols from existing schema
  title?: string
  updated_at?: string
}

// ── Agent meta (TK-0209 spec) ─────────────────────────────────────────────────
const AGENTS: Record<string, { name: string; emoji: string; color: string }> = {
  orion: { name: 'Orion', emoji: '🌟', color: '#E11F7B' },
  nova:  { name: 'Nova',  emoji: '💡', color: '#6366F1' },
  aria:  { name: 'Aria',  emoji: '🎨', color: '#EC4899' },
  forge: { name: 'Forge', emoji: '🔨', color: '#F59E0B' },
  rex:   { name: 'Rex',   emoji: '🔍', color: '#10B981' },
}

// ── AgentInboxPage ─────────────────────────────────────────────────────────────
export function AgentInboxPage() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [totalUnread, setTotalUnread] = useState(0)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const agentStatusMap = useAgentStatus()

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('agent_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50)

    if (error || !data) {
      // Try ordering by updated_at as fallback
      const { data: fallback } = await supabase
        .from('agent_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50)
      setConversations((fallback ?? []) as AgentConversation[])
    } else {
      setConversations(data as AgentConversation[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Compute total unread
  useEffect(() => {
    const total = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0)
    setTotalUnread(total)
  }, [conversations])

  // Supabase Realtime — auto-refresh on agent_conversations changes
  useEffect(() => {
    const channel = supabase
      .channel('agent-inbox-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_conversations' },
        () => { loadConversations() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadConversations])

  const handleItemClick = (agentKey: string) => {
    navigate(`/agents/${agentKey}`)
  }

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
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#F0EDF5', flex: 1 }}>
          Messages
        </h1>
        {/* Broadcaster button — TK-0216 */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowBroadcast(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 999,
            background: 'rgba(225,31,123,0.12)',
            border: '1px solid rgba(225,31,123,0.3)',
            color: '#E11F7B',
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Poppins', sans-serif",
            flexShrink: 0,
          }}
        >
          📡 Broadcaster
        </motion.button>
        {totalUnread > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              minWidth: 22, height: 22,
              borderRadius: 999,
              background: '#E11F7B',
              color: '#fff',
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

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 16px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(240,237,245,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <p>Chargement…</p>
          </div>
        ) : conversations.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '80px 24px' }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'rgba(240,237,245,0.4)', marginBottom: 8 }}>
              Aucune conversation
            </p>
            <p style={{ fontSize: 13, color: 'rgba(240,237,245,0.25)', margin: 0 }}>
              Cliquez sur un agent pour démarrer un DM
            </p>
            {/* Quick start buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 32 }}>
              {Object.entries(AGENTS).map(([key, meta]) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleItemClick(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px',
                    borderRadius: 999,
                    background: `${meta.color}15`,
                    border: `1px solid ${meta.color}44`,
                    color: meta.color,
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <span>{meta.emoji}</span>
                  {meta.name}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <AnimatePresence initial={false}>
              {conversations.map((convo, i) => {
                const agentKey = convo.agent_key
                const meta = AGENTS[agentKey] ?? { name: agentKey, emoji: '🤖', color: AGENT_META[agentKey]?.color ?? '#888' }
                const lastMsg = convo.last_message ?? null
                const lastMsgAt = convo.last_message_at ?? convo.updated_at ?? null
                const unread = convo.unread_count ?? 0

                return (
                  <motion.button
                    key={convo.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 350, damping: 28 }}
                    onClick={() => handleItemClick(agentKey)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      borderRadius: 14,
                      background: '#2C272F',
                      border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      fontFamily: "'Poppins', sans-serif",
                      transition: 'background 0.15s ease',
                    }}
                    whileHover={{ backgroundColor: '#3E3742' } as never}
                    whileTap={{ scale: 0.99 } as never}
                  >
                    {/* Avatar with status dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: `${meta.color}20`,
                        border: `2px solid ${meta.color}50`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                      }}>
                        {meta.emoji}
                      </div>
                      {/* Live status dot */}
                      {(() => {
                        const st = agentStatusMap.get(agentKey) ?? 'idle'
                        const DOT_COLOR: Record<string, string> = {
                          busy: '#F59E0B',
                          online: '#22C55E',
                          idle: 'rgba(255,255,255,0.2)',
                        }
                        return (
                          <span
                            title={st}
                            style={{
                              position: 'absolute',
                              bottom: 1, right: 1,
                              width: 12, height: 12,
                              borderRadius: '50%',
                              background: DOT_COLOR[st],
                              border: '2px solid #0B090D',
                              boxShadow: st === 'busy' ? '0 0 6px #F59E0B' : st === 'online' ? '0 0 6px #22C55E' : 'none',
                            }}
                          />
                        )
                      })()}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: unread > 0 ? 700 : 600, color: '#F0EDF5' }}>
                          {meta.name}
                        </span>
                        {lastMsgAt && (
                          <span style={{ fontSize: 11, color: 'rgba(240,237,245,0.35)', flexShrink: 0, marginLeft: 8 }}>
                            {formatMessageTime(lastMsgAt).relative}
                          </span>
                        )}
                      </div>
                      {lastMsg ? (
                        <p style={{
                          fontSize: 13,
                          color: unread > 0 ? 'rgba(240,237,245,0.75)' : 'rgba(240,237,245,0.45)',
                          fontWeight: unread > 0 ? 500 : 400,
                          margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {lastMsg.slice(0, 40)}{lastMsg.length > 40 ? '…' : ''}
                        </p>
                      ) : (
                        <p style={{ fontSize: 13, color: 'rgba(240,237,245,0.25)', margin: 0 }}>
                          Aucun message
                        </p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {unread > 0 && (
                      <div style={{
                        flexShrink: 0,
                        minWidth: 22, height: 22,
                        borderRadius: 999,
                        background: '#E11F7B',
                        color: '#fff',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 6px',
                        boxShadow: '0 0 8px rgba(225,31,123,0.4)',
                      }}>
                        {unread}
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* BroadcastModal — TK-0216 */}
      <BroadcastModal open={showBroadcast} onClose={() => setShowBroadcast(false)} />
    </div>
  )
}
