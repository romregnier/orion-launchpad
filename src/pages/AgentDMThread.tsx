import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

interface DirectMessage {
  id: string
  conversation_id: string
  role: 'user' | 'agent'
  content: string
  agent_key: string
  created_at: string
}

// ── Agent meta ────────────────────────────────────────────────────────────────
const AGENT_INFO: Record<string, { name: string; role: string }> = {
  orion: { name: 'Orion', role: 'Chef d\'orchestration' },
  nova:  { name: 'Nova',  role: 'Stratégie & Analyse' },
  aria:  { name: 'Aria',  role: 'Design & Créativité' },
  forge: { name: 'Forge', role: 'Développement' },
  rex:   { name: 'Rex',   role: 'QA & Déploiement' },
}

// ── Status helpers ─────────────────────────────────────────────────────────────
type AgentStatus = 'busy' | 'online' | 'idle'

const STATUS_DOT: Record<AgentStatus, string> = {
  busy: '#F59E0B',
  online: '#10B981',
  idle: '#6B7280',
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  busy: 'Occupé',
  online: 'En ligne',
  idle: 'Inactif',
}

async function fetchAgentStatus(agentKey: string): Promise<AgentStatus> {
  const { data } = await supabase
    .from('build_tasks')
    .select('status, updated_at')
    .eq('agent_key', agentKey)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return 'idle'
  if (data.status === 'running') return 'busy'
  if (data.status === 'done' && Date.now() - new Date(data.updated_at).getTime() < 5 * 60 * 1000) return 'online'
  return 'idle'
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: DirectMessage }) {
  const isUser = msg.role === 'user'
  const { relative } = formatMessageTime(msg.created_at)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, x: isUser ? 16 : -16 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
        padding: '0 16px',
      }}
    >
      <div style={{
        maxWidth: '72%',
        padding: '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? '#E11F7B' : '#2C272F',
        color: '#fff',
        fontSize: 14,
        lineHeight: 1.55,
        wordBreak: 'break-word',
        boxShadow: isUser
          ? '0 4px 16px rgba(225,31,123,0.25)'
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {msg.content}
      </div>
      <span style={{
        fontSize: 11,
        color: 'rgba(240,237,245,0.35)',
        marginTop: 4,
        paddingLeft: isUser ? 0 : 4,
        paddingRight: isUser ? 4 : 0,
      }}>
        {relative}
      </span>
    </motion.div>
  )
}

// ── AgentDMThread ──────────────────────────────────────────────────────────────
export function AgentDMThread() {
  const { agentKey = 'orion' } = useParams<{ agentKey: string }>()
  const navigate = useNavigate()
  const meta = AGENT_META[agentKey] ?? AGENT_META.orion
  const info = AGENT_INFO[agentKey] ?? AGENT_INFO.orion

  const [conversation, setConversation] = useState<AgentConversation | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')
  const [loading, setLoading] = useState(true)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Ensure or create conversation
  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      // Try to find existing conversation
      const { data: existing } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('agent_key', agentKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let convo = existing
      if (!convo) {
        const { data: created } = await supabase
          .from('agent_conversations')
          .insert({ agent_key: agentKey, title: `DM avec ${info.name}`, status: 'active' })
          .select()
          .single()
        convo = created
      }

      if (cancelled || !convo) return
      setConversation(convo)

      // Fetch messages
      const { data: msgs } = await supabase
        .from('agent_direct_messages')
        .select('*')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: true })
      if (!cancelled) {
        setMessages((msgs ?? []) as DirectMessage[])
        setLoading(false)
      }

      // Fetch agent status
      const status = await fetchAgentStatus(agentKey)
      if (!cancelled) setAgentStatus(status)
    }

    init()
    return () => { cancelled = true }
  }, [agentKey, info.name])

  // Realtime subscription
  useEffect(() => {
    if (!conversation) return

    const channel = supabase
      .channel(`dm:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_direct_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation])

  // Send message
  const sendMessage = useCallback(async () => {
    const content = text.trim()
    if (!content || !conversation || sending) return

    setSending(true)
    setText('')

    const { error } = await supabase
      .from('agent_direct_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        agent_key: agentKey,
        content,
      })

    if (error) {
      console.error('Send failed:', error)
      setText(content) // Restore on error
    }

    setSending(false)
    textareaRef.current?.focus()
  }, [text, conversation, sending, agentKey])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="page-with-bottom-nav" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0B090D',
      color: '#F0EDF5',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px',
        height: 64,
        background: 'rgba(11,9,13,0.97)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/agents')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(240,237,245,0.5)', fontSize: 20,
            padding: '4px 8px', borderRadius: 6,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          ←
        </button>

        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: `${meta.color}22`,
            border: `2px solid ${meta.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {meta.emoji}
          </div>
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 11, height: 11, borderRadius: '50%',
            background: STATUS_DOT[agentStatus],
            border: '2px solid #0B090D',
          }} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{info.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: STATUS_DOT[agentStatus],
              background: `${STATUS_DOT[agentStatus]}22`,
              padding: '1px 7px', borderRadius: 999,
              border: `1px solid ${STATUS_DOT[agentStatus]}44`,
            }}>
              {STATUS_LABEL[agentStatus]}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(240,237,245,0.4)' }}>{info.role}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: 16,
        paddingBottom: 8,
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(240,237,245,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <p>Chargement des messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{meta.emoji}</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(240,237,245,0.4)', marginBottom: 8 }}>
              Démarrez la conversation
            </p>
            <p style={{ fontSize: 13, color: 'rgba(240,237,245,0.25)' }}>
              Envoyez un message à {info.name}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        background: 'rgba(11,9,13,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'flex-end', gap: 10,
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending || !conversation}
          placeholder={`Message à ${info.name}… (Enter pour envoyer)`}
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 12,
            background: '#2C272F',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#F0EDF5',
            fontSize: 16,
            fontFamily: "'Poppins', sans-serif",
            resize: 'none',
            outline: 'none',
            minHeight: 44,
            maxHeight: 160,
            lineHeight: 1.5,
            transition: 'border-color 0.15s ease',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(225,31,123,0.4)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 160) + 'px'
          }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={sendMessage}
          disabled={sending || !text.trim() || !conversation}
          style={{
            flexShrink: 0,
            width: 44, height: 44,
            borderRadius: 12,
            background: sending || !text.trim() ? 'rgba(225,31,123,0.3)' : '#E11F7B',
            border: 'none',
            color: '#fff',
            fontSize: 18,
            cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          title="Envoyer"
        >
          {sending ? '⏳' : '↑'}
        </motion.button>
      </div>
    </div>
  )
}
