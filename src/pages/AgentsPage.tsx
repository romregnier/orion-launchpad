import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { AGENT_META } from '../types'
import { formatMessageTime } from '../utils/formatMessageTime'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgentConversation {
  id: string
  agent_key: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

interface AgentDirectMessage {
  id: string
  conversation_id: string
  role: string
  content: string
  agent_key: string
  created_at: string
}

interface AgentStatus {
  status: 'busy' | 'online' | 'idle'
}

interface AgentInfo {
  key: string
  name: string
  role: string
  emoji: string
  color: string
  conversation: AgentConversation | null
  lastMessage: AgentDirectMessage | null
  unreadCount: number
  agentStatus: AgentStatus['status']
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AGENTS: { key: string; name: string; role: string }[] = [
  { key: 'orion', name: 'Orion', role: 'Chef d\'orchestration' },
  { key: 'nova', name: 'Nova', role: 'Stratégie & Analyse' },
  { key: 'aria', name: 'Aria', role: 'Design & Créativité' },
  { key: 'forge', name: 'Forge', role: 'Développement' },
  { key: 'rex', name: 'Rex', role: 'QA & Déploiement' },
]

const STATUS_DOT: Record<string, string> = {
  busy: '#F59E0B',
  online: '#10B981',
  idle: '#6B7280',
}

const STATUS_LABEL: Record<string, string> = {
  busy: 'Occupé',
  online: 'En ligne',
  idle: 'Inactif',
}

// ── Helper : resolve agent status from build_tasks ───────────────────────────
async function fetchAgentStatuses(): Promise<Record<string, AgentStatus['status']>> {
  const { data } = await supabase
    .from('build_tasks')
    .select('agent_key, status, updated_at')
    .in('agent_key', AGENTS.map(a => a.key))
    .order('updated_at', { ascending: false })

  if (!data) return {}

  // Group by agent_key, keep most recent
  const byAgent: Record<string, { status: string; updated_at: string }> = {}
  for (const row of data) {
    if (!byAgent[row.agent_key]) {
      byAgent[row.agent_key] = { status: row.status, updated_at: row.updated_at }
    }
  }

  const result: Record<string, AgentStatus['status']> = {}
  const now = Date.now()
  for (const [key, val] of Object.entries(byAgent)) {
    if (val.status === 'running') {
      result[key] = 'busy'
    } else if (val.status === 'done' && now - new Date(val.updated_at).getTime() < 5 * 60 * 1000) {
      result[key] = 'online'
    } else {
      result[key] = 'idle'
    }
  }
  return result
}

// ── NewMessageModal ────────────────────────────────────────────────────────────
function NewMessageModal({ onClose, onSelect }: { onClose: () => void; onSelect: (key: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{
          background: '#2C272F',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 24,
          width: 360,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F0EDF5', marginBottom: 4 }}>Nouveau message</h2>
        <p style={{ fontSize: 13, color: 'rgba(240,237,245,0.5)', marginBottom: 20 }}>Choisissez un agent</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AGENTS.map(agent => {
            const meta = AGENT_META[agent.key]
            return (
              <button
                key={agent.key}
                onClick={() => onSelect(agent.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(225,31,123,0.12)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(225,31,123,0.3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <span style={{ fontSize: 24 }}>{meta.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F0EDF5' }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(240,237,245,0.5)' }}>{agent.role}</div>
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── AgentsPage ────────────────────────────────────────────────────────────────
export function AgentsPage() {
  const navigate = useNavigate()
  const [agentInfos, setAgentInfos] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  const loadData = useCallback(async () => {
    // 1. Fetch all conversations
    const { data: convos } = await supabase
      .from('agent_conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    // 2. Fetch recent messages (last 24h) for unread + preview
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentMsgs } = await supabase
      .from('agent_direct_messages')
      .select('*')
      .gte('created_at', since24h)
      .order('created_at', { ascending: false })

    // 3. Fetch last message per conversation for preview
    const convoIds = (convos ?? []).map(c => c.id)
    let lastMsgByConvo: Record<string, AgentDirectMessage> = {}
    if (convoIds.length > 0) {
      const { data: lastMsgs } = await supabase
        .from('agent_direct_messages')
        .select('*')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false })
      // Keep only last per conversation
      for (const msg of (lastMsgs ?? [])) {
        if (!lastMsgByConvo[msg.conversation_id]) {
          lastMsgByConvo[msg.conversation_id] = msg
        }
      }
    }

    // 4. Fetch agent statuses
    const statuses = await fetchAgentStatuses()

    // 5. Build agent infos
    const infos: AgentInfo[] = AGENTS.map(agent => {
      const meta = AGENT_META[agent.key]
      const conversation = (convos ?? []).find(c => c.agent_key === agent.key) ?? null
      const lastMessage = conversation ? (lastMsgByConvo[conversation.id] ?? null) : null
      const unreadCount = conversation
        ? (recentMsgs ?? []).filter(m => m.conversation_id === conversation.id && m.role === 'agent').length
        : 0
      return {
        key: agent.key,
        name: agent.name,
        role: agent.role,
        emoji: meta.emoji,
        color: meta.color,
        conversation,
        lastMessage,
        unreadCount,
        agentStatus: statuses[agent.key] ?? 'idle',
      }
    })

    setAgentInfos(infos)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Ensure or create conversation, then navigate
  const openThread = useCallback(async (agentKey: string) => {
    let convo = agentInfos.find(a => a.key === agentKey)?.conversation
    if (!convo) {
      const agent = AGENTS.find(a => a.key === agentKey)!
      const { data, error } = await supabase
        .from('agent_conversations')
        .insert({ agent_key: agentKey, title: `DM avec ${agent.name}`, status: 'active' })
        .select()
        .single()
      if (error || !data) {
        console.error('Failed to create conversation', error)
        return
      }
      convo = data
    }
    navigate(`/agents/${agentKey}`)
  }, [agentInfos, navigate])

  const handleNewMessage = (agentKey: string) => {
    setShowNewModal(false)
    openThread(agentKey)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B090D',
      color: '#F0EDF5',
      fontFamily: "'Poppins', sans-serif",
      padding: '0 0 40px 0',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(11,9,13,0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(240,237,245,0.5)', fontSize: 20,
              padding: '4px 8px', borderRadius: 6,
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F0EDF5', margin: 0 }}>
            Agent Inbox
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowNewModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 18px',
            borderRadius: 10,
            background: '#E11F7B',
            border: 'none',
            color: '#fff',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          ✉ Nouveau message
        </motion.button>
      </div>

      {/* Agent list */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(240,237,245,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌟</div>
            <p>Chargement…</p>
          </div>
        ) : (
          <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agentInfos.map((agent, i) => (
              <motion.button
                key={agent.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 350, damping: 28 }}
                onClick={() => openThread(agent.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: '#2C272F',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: "'Poppins', sans-serif",
                  transition: 'all 0.15s ease',
                }}
                whileHover={{ scale: 1.01, backgroundColor: '#3E3742' } as never}
                whileTap={{ scale: 0.99 } as never}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 48, height: 48,
                    borderRadius: '50%',
                    background: `${agent.color}22`,
                    border: `2px solid ${agent.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    {agent.emoji}
                  </div>
                  {/* Status dot */}
                  <div style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 12, height: 12,
                    borderRadius: '50%',
                    background: STATUS_DOT[agent.agentStatus],
                    border: '2px solid #2C272F',
                  }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#F0EDF5' }}>{agent.name}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: STATUS_DOT[agent.agentStatus],
                        background: `${STATUS_DOT[agent.agentStatus]}22`,
                        padding: '1px 7px', borderRadius: 999,
                        border: `1px solid ${STATUS_DOT[agent.agentStatus]}44`,
                      }}>
                        {STATUS_LABEL[agent.agentStatus]}
                      </span>
                    </div>
                    {agent.lastMessage && (
                      <span style={{ fontSize: 11, color: 'rgba(240,237,245,0.35)', flexShrink: 0 }}>
                        {formatMessageTime(agent.lastMessage.created_at).relative}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(240,237,245,0.45)', marginBottom: 4 }}>
                    {agent.role}
                  </div>
                  {agent.lastMessage ? (
                    <p style={{
                      fontSize: 13, color: 'rgba(240,237,245,0.6)',
                      margin: 0, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}>
                      {agent.lastMessage.role === 'user' ? '→ ' : ''}
                      {agent.lastMessage.content.slice(0, 50)}
                    </p>
                  ) : (
                    <p style={{ fontSize: 13, color: 'rgba(240,237,245,0.25)', margin: 0 }}>
                      Aucun message — Démarrez la conversation
                    </p>
                  )}
                </div>

                {/* Unread badge */}
                {agent.unreadCount > 0 && (
                  <div style={{
                    flexShrink: 0,
                    minWidth: 22, height: 22,
                    borderRadius: 999,
                    background: '#E11F7B',
                    color: '#fff',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px',
                  }}>
                    {agent.unreadCount}
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {/* New message modal */}
      <AnimatePresence>
        {showNewModal && (
          <NewMessageModal
            onClose={() => setShowNewModal(false)}
            onSelect={handleNewMessage}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
