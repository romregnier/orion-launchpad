import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send } from 'lucide-react'
import { supabase, fetchMessages, sendMessage as dbSend, type DbMessage } from '../lib/supabase'

const USERNAME_KEY = 'launchpad_username'

const AVATAR_COLORS = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B']
function avatarColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

interface ChatPanelProps {
  /** Si défini, contrôle l'ouverture depuis l'extérieur */
  open?: boolean
  /** Appelé quand le panel se ferme en interne */
  onClose?: () => void
}

export function ChatPanel({ open: externalOpen, onClose }: ChatPanelProps = {}) {
  const [open, setOpen] = useState(false)

  // Sync avec l'état externe (bouton Toolbar)
  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen)
  }, [externalOpen])
  const [messages, setMessages] = useState<DbMessage[]>([])
  const [text, setText] = useState('')
  const [unread, setUnread] = useState(0)
  const [username, setUsername] = useState(() => localStorage.getItem(USERNAME_KEY) ?? '')
  const [connected, setConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  // Initial fetch + Realtime subscription
  useEffect(() => {
    fetchMessages().then((msgs) => {
      setMessages(msgs)
      setConnected(true)
    }).catch(() => setConnected(false))

    const channel = supabase
      .channel('launchpad-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'launchpad_messages' },
        (payload) => {
          const msg = payload.new as DbMessage
          setMessages((prev) => [...prev, msg])
          if (!openRef.current) setUnread((u) => u + 1)
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const handleOpen = useCallback(() => {
    setOpen(true); setUnread(0)
  }, [])

  const sendMessage = useCallback(async () => {
    if (!text.trim()) return
    let author = username
    if (!author) {
      const name = window.prompt('Ton prénom pour le chat ?')
      if (!name?.trim()) return
      author = name.trim()
      localStorage.setItem(USERNAME_KEY, author)
      setUsername(author)
    }
    const t = text.trim()
    setText('')
    await dbSend(author, t)
  }, [text, username])

  const isMobile = window.innerWidth < 500

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={open ? () => { setOpen(false); onClose?.() } : handleOpen}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 48, height: 48, borderRadius: '50%',
          background: '#E11F7B', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', boxShadow: '0 4px 20px rgba(225,31,123,0.5)',
          zIndex: 200,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle size={20} />
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: '#EF4444', borderRadius: '50%',
            width: 18, height: 18, fontSize: 10, fontWeight: 700,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: isMobile ? 0 : 84, right: isMobile ? 0 : 24,
              left: isMobile ? 0 : 'auto',
              width: isMobile ? '100%' : 320,
              height: isMobile ? '70vh' : 480,
              zIndex: 199,
              background: 'rgba(18,15,24,0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: isMobile ? '16px 16px 0 0' : 16,
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(225,31,123,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Chat du Launchpad 🌟</div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10B981' : '#6b7280' }} title={connected ? 'Connecté' : 'Hors ligne'} />
              </div>
              <button onClick={() => { setOpen(false); onClose?.() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}>
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((msg) => {
                const color = avatarColor(msg.author)
                const isMe = msg.author === username
                return (
                  <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {msg.author[0]?.toUpperCase()}
                    </div>
                    <div style={{ maxWidth: '75%' }}>
                      {!isMe && <div style={{ fontSize: 10, color, fontWeight: 600, marginBottom: 2 }}>{msg.author}</div>}
                      <div style={{ fontSize: 12, color: isMe ? '#fff' : 'rgba(255,255,255,0.85)', background: isMe ? 'linear-gradient(135deg,#E11F7B,#c41a6a)' : 'rgba(255,255,255,0.07)', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '7px 10px', lineHeight: 1.45 }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                        {msg.created_at ? formatTime(msg.created_at) : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
                placeholder="Envoyer un message…"
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'}
              />
              <button onClick={sendMessage} style={{ background: text.trim() ? 'linear-gradient(135deg,#E11F7B,#c41a6a)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: '0 12px', cursor: text.trim() ? 'pointer' : 'default', color: '#fff', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}>
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
