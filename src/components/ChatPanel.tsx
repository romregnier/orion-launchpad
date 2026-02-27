import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send } from 'lucide-react'

interface ChatMessage {
  id: string
  author: string
  text: string
  createdAt: string
}

const STORAGE_KEY = 'launchpad_chat'
const USERNAME_KEY = 'launchpad_username'

const WELCOME_MESSAGES: ChatMessage[] = [
  { id: 'w1', author: 'Orion', text: 'Bienvenue sur le Launchpad ! 🌟 Je suis Orion, votre assistant cosmique. Explorez les projets !', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'w2', author: 'Romain', text: 'Salut tout le monde ! N\'hésitez pas à partager vos feedbacks sur les projets 🚀', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'w3', author: 'Orion', text: 'Double-cliquez sur une carte pour ouvrir le projet. Enjoy! ✨', createdAt: new Date(Date.now() - 900000).toISOString() },
]

const AVATAR_COLORS = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B']
function avatarColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function loadMessages(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  // Initialize with welcome messages
  localStorage.setItem(STORAGE_KEY, JSON.stringify(WELCOME_MESSAGES))
  return WELCOME_MESSAGES
}

export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [unread, setUnread] = useState(0)
  const [username, setUsername] = useState<string | null>(null)
  const lastCountRef = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages + username on mount
  useEffect(() => {
    const msgs = loadMessages()
    setMessages(msgs)
    lastCountRef.current = msgs.length
    const stored = localStorage.getItem(USERNAME_KEY)
    if (stored) setUsername(stored)
  }, [])

  // Poll every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      const msgs = loadMessages()
      setMessages(msgs)
      if (!open && msgs.length > lastCountRef.current) {
        setUnread(prev => prev + (msgs.length - lastCountRef.current))
      }
      lastCountRef.current = msgs.length
    }, 3000)
    return () => clearInterval(interval)
  }, [open])

  // Scroll to bottom when open or new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  const handleOpen = useCallback(() => {
    setOpen(true)
    setUnread(0)
    lastCountRef.current = messages.length
  }, [messages.length])

  const sendMessage = useCallback(() => {
    if (!text.trim()) return

    let author = username
    if (!author) {
      const name = window.prompt('Votre prénom pour le chat ?')
      if (!name?.trim()) return
      author = name.trim()
      localStorage.setItem(USERNAME_KEY, author)
      setUsername(author)
    }

    const msg: ChatMessage = {
      id: Date.now().toString(),
      author,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    const current = loadMessages()
    const updated = [...current, msg]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setMessages(updated)
    lastCountRef.current = updated.length
    setText('')
  }, [text, username])

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={open ? () => setOpen(false) : handleOpen}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 48, height: 48, borderRadius: '50%',
          background: '#E11F7B', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', zIndex: 200, boxShadow: '0 4px 20px rgba(225,31,123,0.5)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {!open && unread > 0 && (
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

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: typeof window !== 'undefined' && window.innerWidth < 500 ? 0 : 84,
              right: typeof window !== 'undefined' && window.innerWidth < 500 ? 0 : 24,
              left: typeof window !== 'undefined' && window.innerWidth < 500 ? 0 : 'auto',
              width: typeof window !== 'undefined' && window.innerWidth < 500 ? '100%' : 320,
              height: typeof window !== 'undefined' && window.innerWidth < 500 ? '70vh' : 480,
              zIndex: 199,
              background: '#1A171C',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: typeof window !== 'undefined' && window.innerWidth < 500 ? '16px 16px 0 0' : 16,
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(225,31,123,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Chat du Launchpad 🌟</div>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}>
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
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {msg.author[0]?.toUpperCase()}
                    </div>
                    <div style={{ maxWidth: '75%' }}>
                      {!isMe && (
                        <div style={{ fontSize: 10, color: color, fontWeight: 600, marginBottom: 2 }}>{msg.author}</div>
                      )}
                      <div style={{
                        fontSize: 12, color: isMe ? '#fff' : 'rgba(255,255,255,0.85)',
                        background: isMe ? '#E11F7B' : 'rgba(255,255,255,0.07)',
                        borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        padding: '7px 10px', lineHeight: 1.45,
                      }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
                placeholder="Envoyer un message…"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  background: '#E11F7B', border: 'none', borderRadius: 10, padding: '0 12px',
                  cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center',
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
