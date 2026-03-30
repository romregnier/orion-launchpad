/**
 * CommentsPanel
 *
 * Rôle : Panneau de commentaires par projet (Supabase), drawer animé ou mode inline.
 * Utilisé dans : ProjectCard, ProjectPreviewModal
 * Props : projectId, projectTitle, open, onClose, inline?
 */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Comment {
  id: string
  author: string
  text: string
  createdAt: string
}

interface Props {
  projectId: string
  projectTitle: string
  open: boolean
  onClose: () => void
  /** Nom du collaborateur connecté — sauvegardé comme auteur du commentaire */
  currentUser?: string
  /** Si true, rendu inline (pas de portal, pas de position:fixed) */
  inline?: boolean
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

const AVATAR_COLORS = ['var(--accent)', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444']
function avatarColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/** Row type from launchpad_comments table */
interface CommentRow {
  id: string
  project_id: string
  author: string
  text: string
  created_at: string
}

/**
 * Fetch comments for a project from Supabase.
 */
async function fetchComments(projectId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from('launchpad_comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (!data) return []
  return (data as CommentRow[]).map(r => ({
    id: r.id,
    author: r.author,
    text: r.text,
    createdAt: r.created_at,
  }))
}

export function CommentsPanel({ projectId, projectTitle, open, onClose, currentUser, inline }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')

  // Fetch comments on open + subscribe to realtime
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchComments(projectId).then(c => { if (!cancelled) setComments(c) })

    const ch = supabase
      .channel(`comments_${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'launchpad_comments', filter: `project_id=eq.${projectId}` },
        () => { fetchComments(projectId).then(c => { if (!cancelled) setComments(c) }) }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [open, projectId])

  useEffect(() => {
    if (!open || inline) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, inline])

  const publish = async () => {
    if (!text.trim()) return
    const newText = text.trim()
    setText('')
    await supabase.from('launchpad_comments').insert({
      project_id: projectId,
      author: currentUser ? (currentUser.includes('@') ? currentUser.split('@')[0] : currentUser) : 'Anonyme',
      text: newText,
    })
    // Optimistic: refresh immediately
    const updated = await fetchComments(projectId)
    setComments(updated)
  }

  const isMobile = window.innerWidth < 500

  // ── Inline mode : rendu direct sans portal ni position:fixed ─────────────
  if (inline) {
    return (
      <div className="comments-panel comments-panel--inline" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#13111A' }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(225,31,123,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>💬 Commentaires</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{projectTitle}</div>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 40, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              Aucun commentaire encore.<br />Sois le premier !
            </div>
          )}
          {comments.map((c) => {
            const color = avatarColor(c.author)
            return (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}>
                  {c.author[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: color }}>{c.author}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <div style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5,
                    background: 'rgba(255,255,255,0.05)', borderRadius: '4px 12px 12px 12px',
                    padding: '7px 11px',
                  }}>
                    {c.text}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void publish() } }}
            placeholder="Ajouter un commentaire…"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 12, outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.4)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            onClick={() => void publish()}
            disabled={!text.trim()}
            style={{
              background: text.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: 10, padding: '0 14px',
              cursor: text.trim() ? 'pointer' : 'default',
              color: '#fff', display: 'flex', alignItems: 'center', transition: 'background 0.15s',
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    )
  }

  // ── Portal mode (comportement original) ──────────────────────────────────
  const panel = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: isMobile ? 0 : 360, y: isMobile ? 400 : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: isMobile ? 0 : 360, y: isMobile ? 400 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              position: 'fixed',
              top: isMobile ? 'auto' : 0,
              bottom: 0,
              right: 0,
              left: isMobile ? 0 : 'auto',
              width: isMobile ? '100%' : 360,
              height: isMobile ? '80vh' : '100vh',
              zIndex: 401,
              background: '#13111A',
              borderLeft: isMobile ? 'none' : '1px solid var(--border-default)',
              borderTop: isMobile ? '1px solid var(--border-default)' : 'none',
              borderRadius: isMobile ? '16px 16px 0 0' : 0,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(225,31,123,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Commentaires</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{projectTitle}</div>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 40, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                  Aucun commentaire encore.<br />Sois le premier !
                </div>
              )}
              {comments.map((c) => {
                const color = avatarColor(c.author)
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', background: color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>
                      {c.author[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: color }}>{c.author}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <div style={{
                        fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5,
                        background: 'rgba(255,255,255,0.05)', borderRadius: '4px 12px 12px 12px',
                        padding: '7px 11px',
                      }}>
                        {c.text}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, flexShrink: 0 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void publish() } }}
                placeholder="Ajouter un commentaire…"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 12, outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.4)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                autoFocus
              />
              <button
                onClick={() => void publish()}
                disabled={!text.trim()}
                style={{
                  background: text.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  border: 'none', borderRadius: 10, padding: '0 14px',
                  cursor: text.trim() ? 'pointer' : 'default',
                  color: '#fff', display: 'flex', alignItems: 'center', transition: 'background 0.15s',
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(panel, document.body)
}
