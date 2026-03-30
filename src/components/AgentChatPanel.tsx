import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'
import type { CanvasAgent } from '../types'
import { AGENT_META } from '../types'
import { TypingIndicator } from './TypingIndicator'
import { formatMessageTime } from '../utils/formatMessageTime'

// ── @mention helpers ──────────────────────────────────────────────────────────
const MENTION_COLOR = 'var(--accent)'

function renderMessageWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span key={i} style={{ color: MENTION_COLOR, fontWeight: 600 }}>
          {part}
        </span>
      )
    }
    return part
  })
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g)
  if (!matches) return []
  return matches.map(m => m.slice(1).toLowerCase())
}

interface ChatMessage {
  id: string
  agent_key: string
  role: string       // 'user' | 'agent'
  message: string
  created_at: string
  user_id?: string
}



interface Props {
  agent: CanvasAgent
  currentUser: string
  onClose: () => void
  isTyping?: boolean
}

export function AgentChatPanel({ agent, currentUser, onClose, isTyping }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [, forceUpdate] = useState(0)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionAnchor, setMentionAnchor] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { activeBuildTasks, canvasAgents } = useLaunchpadStore()
  const agentKey = (agent as CanvasAgent & { agent_key?: string }).agent_key ?? agent.name.toLowerCase()
  const color = AGENT_META[agentKey]?.color ?? 'var(--accent)'
  const emoji = AGENT_META[agentKey]?.emoji ?? '🤖'
  const isActive = activeBuildTasks.some(t => t.agent_key === agentKey && t.status === 'running')

  // Live-update timestamps every 60s
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Typing = external override OR internal waiting
  const showTyping = isTyping ?? isWaiting

  useEffect(() => {
    // Charger uniquement les messages de cette conversation (agent + user)
    supabase
      .from('agent_chat_messages')
      .select('*')
      .eq('agent_key', agentKey)
      .eq('user_id', currentUser)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => { if (data) setMessages(data as ChatMessage[]) })

    // Realtime — filtré par agent_key
    const channel = supabase
      .channel(`chat-${agentKey}-${currentUser}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'agent_chat_messages',
        filter: `agent_key=eq.${agentKey}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage
        if (msg.user_id === currentUser || msg.role === 'agent') {
          setMessages(prev => [...prev, msg])
          if (msg.role === 'agent') setIsWaiting(false)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [agent.id, currentUser, agentKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
    const lastAt = value.lastIndexOf('@')
    if (lastAt >= 0 && (lastAt === 0 || value[lastAt - 1] === ' ')) {
      const query = value.slice(lastAt + 1)
      if (!query.includes(' ')) {
        setMentionQuery(query.toLowerCase())
        setMentionAnchor(lastAt)
        return
      }
    }
    setMentionQuery(null)
  }, [])

  const selectMention = useCallback((key: string) => {
    const before = input.slice(0, mentionAnchor)
    const after = input.slice(mentionAnchor + 1 + (mentionQuery?.length ?? 0))
    const newValue = `${before}@${key} ${after}`
    setInput(newValue)
    setMentionQuery(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [input, mentionAnchor, mentionQuery])

  // Build mention suggestions list
  const mentionSuggestions = mentionQuery !== null ? (() => {
    const q = mentionQuery
    const agentSuggestions = canvasAgents
      .filter(a => {
        const key = (a as CanvasAgent & { agent_key?: string }).agent_key ?? a.name.toLowerCase()
        return key.startsWith(q)
      })
      .slice(0, 4)
      .map(a => {
        const key = (a as CanvasAgent & { agent_key?: string }).agent_key ?? a.name.toLowerCase()
        const em = AGENT_META[key]?.emoji ?? '🤖'
        return { key, emoji: em }
      })
    const result: { key: string; emoji: string }[] = [...agentSuggestions]
    if ('romain'.startsWith(q) && result.length < 5) {
      result.push({ key: 'romain', emoji: '👤' })
    }
    return result.slice(0, 5)
  })() : []

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')

    // Sauvegarder dans Supabase
    const mentions = extractMentions(content)
    await supabase.from('agent_chat_messages').insert({
      agent_key: agentKey,
      role: 'user',
      message: content,
      user_id: currentUser,
      read_by_agent: false,
      ...(mentions.length > 0 ? { mentions } : {}),
    })
    setIsWaiting(true)

    // Relayer via Telegram Bot API pour tous les agents (y compris Orion)
    const agentData = agent as CanvasAgent & { bot_token?: string; agent_key?: string }
    if (agentData.bot_token) {
      fetch(`https://api.telegram.org/bot${agentData.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: (import.meta.env.VITE_ADMIN_TELEGRAM_CHAT_ID as string | undefined) ?? agent.telegram_chat_id ?? '', text: `💬 [Launchpad] ${currentUser} → ${agent.name}:\n${content}` }),
      }).catch(() => {})
    }

    setSending(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="agent-chat-panel"
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        right: 'max(8px, env(safe-area-inset-right, 8px))',
        width: 'min(320px, calc(100vw - 16px))',
        maxWidth: 'calc(100vw - 16px)',
        height: 440,
        background: '#1A171C',
        border: `1px solid ${color}40`,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 300,
        boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid rgba(255,255,255,0.07)`, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{agent.name}</div>
          <div style={{ fontSize: 10, color, fontWeight: 600 }}>{agentKey === 'orion' ? 'Agent IA principal' : `Agent ${agentKey}`}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isActive ? '#4ade80' : 'rgba(255,255,255,0.2)',
            boxShadow: isActive ? '0 0 6px rgba(74,222,128,0.6)' : 'none',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 10, color: isActive ? '#4ade80' : 'rgba(255,255,255,0.3)', fontFamily: 'Poppins, sans-serif' }}>
            {isActive ? 'actif' : 'disponible'}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Commence une conversation avec {agent.name}</p>
          </div>
        )}
        {messages.map(msg => {
          const isUser = msg.role === 'user'
          const { relative, absolute } = formatMessageTime(msg.created_at)
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: isUser ? `${color}22` : 'rgba(255,255,255,0.07)',
                border: `1px solid ${isUser ? `${color}40` : 'var(--border-default)'}`,
                fontSize: 13,
                color: '#fff',
                lineHeight: 1.5,
              }}>
                {!isUser && <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 4 }}>{agent.name}</div>}
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderMessageWithMentions(msg.message)}</div>
                <span
                  title={absolute}
                  style={{ fontSize: 10, opacity: 0.4, marginTop: 3, display: 'block', textAlign: isUser ? 'right' : 'left', cursor: 'default', userSelect: 'none' }}
                >
                  {relative}
                </span>
              </div>
            </div>
          )
        })}
        <TypingIndicator
          agentName={agent.name}
          color={color}
          visible={showTyping}
        />
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', gap: 8, position: 'relative' }}>
        {/* @mention dropdown */}
        {mentionQuery !== null && mentionSuggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 14,
            right: 14,
            background: 'var(--bg-elevated, var(--bg-elevated))',
            borderRadius: 10,
            border: '1px solid var(--border-default, rgba(255,255,255,0.12))',
            zIndex: 400,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {mentionSuggestions.map(s => (
              <button
                key={s.key}
                onMouseDown={e => { e.preventDefault(); selectMention(s.key) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover, var(--border-default))' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              >
                <span style={{ fontSize: 16 }}>{s.emoji}</span>
                <span style={{ color: MENTION_COLOR, fontWeight: 600 }}>@{s.key}</span>
              </button>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape' && mentionQuery !== null) { setMentionQuery(null); return }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
          }}
          placeholder={`Message ${agent.name}…`}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 10px', fontSize: 16, color: '#fff', outline: 'none',
          }}
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          style={{
            padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: input.trim() ? color : 'rgba(255,255,255,0.06)',
            color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
            opacity: sending ? 0.5 : 1, transition: 'all 0.15s',
            minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↑</button>
      </div>
    </motion.div>
  )
}
