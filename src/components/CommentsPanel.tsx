import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'

interface Comment {
  id: string
  author: string
  avatar: string
  text: string
  createdAt: string
}

interface Props {
  projectId: string
  projectTitle: string
  open: boolean
  onClose: () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

const AVATAR_COLORS = ['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444']
function avatarColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function CommentsPanel({ projectId, projectTitle, open, onClose }: Props) {
  const key = `comments_${projectId}`
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem(key)
        setComments(stored ? JSON.parse(stored) : [])
      } catch {
        setComments([])
      }
    }
  }, [open, key])

  const publish = () => {
    if (!text.trim()) return
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Toi',
      avatar: 'T',
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    const updated = [...comments, comment]
    setComments(updated)
    localStorage.setItem(key, JSON.stringify(updated))
    setText('')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.3)' }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              position: 'fixed',
              top: typeof window !== 'undefined' && window.innerWidth < 500 ? 'auto' : 0,
              bottom: 0,
              right: 0,
              left: typeof window !== 'undefined' && window.innerWidth < 500 ? 0 : 'auto',
              width: typeof window !== 'undefined' && window.innerWidth < 500 ? '100%' : 360,
              height: typeof window !== 'undefined' && window.innerWidth < 500 ? '80vh' : 'auto',
              zIndex: 301,
              background: '#1A171C',
              borderLeft: typeof window !== 'undefined' && window.innerWidth < 500 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderTop: typeof window !== 'undefined' && window.innerWidth < 500 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              borderRadius: typeof window !== 'undefined' && window.innerWidth < 500 ? '16px 16px 0 0' : 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Commentaires</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{projectTitle}</div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Comments list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 32 }}>
                  Aucun commentaire pour l'instant.<br />Soyez le premier ! 💬
                </div>
              )}
              {comments.map((c) => {
                const color = avatarColor(c.author)
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {c.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{c.author}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <div style={{
                        fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5,
                        background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                        padding: '8px 12px',
                      }}>
                        {c.text}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); publish() } }}
                placeholder="Ajouter un commentaire…"
                rows={2}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 12, resize: 'none',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={publish}
                style={{
                  background: '#E11F7B', border: 'none', borderRadius: 10, padding: '0 14px',
                  cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
