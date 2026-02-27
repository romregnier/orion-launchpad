import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ThumbsUp, Plus, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useLaunchpadStore } from '../store'

const SESSION_ID = (() => {
  let id = localStorage.getItem('launchpad_session')
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('launchpad_session', id) }
  return id
})()

interface Props {
  canvasScale: number
  index?: number
}

export function IdeaWidget({ canvasScale, index = 0 }: Props) {
  const { ideas, addIdea, voteIdea, deleteIdea, ideaWidgetPosition, setIdeaWidgetPosition, projects, pushOverlapping, swapTarget, pushLevels } = useLaunchpadStore()
  const isSwapTarget = swapTarget === 'idea-widget'
  const pushLevel = pushLevels['idea-widget'] ?? 0
  const pushSpring = pushLevel >= 2
    ? { type: 'spring' as const, stiffness: 240, damping: 32, delay: pushLevel * 0.03 }
    : { type: 'spring' as const, stiffness: 300, damping: 30 }

  // On mount: nudge away from any overlapping project card
  useEffect(() => {
    const CARD_W = 280, CARD_H = 220, PAD = 16
    const { x, y } = ideaWidgetPosition
    const overlaps = projects.some(p =>
      x < p.position.x + CARD_W + PAD &&
      x + CARD_W + PAD > p.position.x &&
      y < p.position.y + CARD_H + PAD &&
      y + CARD_H + PAD > p.position.y
    )
    if (overlaps) setIdeaWidgetPosition(x, y) // triggers the nudge logic in store
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [collapsed, setCollapsed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newIdea, setNewIdea] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [author, setAuthor] = useState(() => localStorage.getItem('launchpad_username') ?? 'Anonyme')

  const dragStart = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 })
  const sorted = [...ideas].sort((a, b) => b.votes - a.votes)

  // ── Mouse drag ──────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    dragStart.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      cardX: ideaWidgetPosition.x, cardY: ideaWidgetPosition.y,
    }
    let rafId: number | null = null
    const onMove = (ev: MouseEvent) => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale
        const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale
        const nx = dragStart.current.cardX + dx
        const ny = dragStart.current.cardY + dy
        setIdeaWidgetPosition(nx, ny)
        pushOverlapping('idea-widget', nx, ny)
      })
    }
    const onUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [canvasScale, ideaWidgetPosition, setIdeaWidgetPosition, pushOverlapping])

  // ── Touch drag ──────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    const touch = e.touches[0]
    setIsDragging(true)
    dragStart.current = {
      mouseX: touch.clientX, mouseY: touch.clientY,
      cardX: ideaWidgetPosition.x, cardY: ideaWidgetPosition.y,
    }
    const onMove = (ev: TouchEvent) => {
      const t = ev.touches[0]
      const dx = (t.clientX - dragStart.current.mouseX) / canvasScale
      const dy = (t.clientY - dragStart.current.mouseY) / canvasScale
      const nx = dragStart.current.cardX + dx
      const ny = dragStart.current.cardY + dy
      setIdeaWidgetPosition(nx, ny)
      pushOverlapping('idea-widget', nx, ny)
    }
    const onEnd = () => {
      setIsDragging(false)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
  }, [canvasScale, ideaWidgetPosition, setIdeaWidgetPosition, pushOverlapping])

  const submit = () => {
    if (!newIdea.trim()) return
    localStorage.setItem('launchpad_username', author)
    addIdea(newIdea.trim(), author || 'Anonyme')
    setNewIdea('')
    setShowForm(false)
  }

  return (
    <motion.div
      style={{
        position: 'absolute',
        width: 280,
        zIndex: isDragging ? 50 : 2,
        cursor: isDragging ? 'grabbing' : 'grab',
        x: ideaWidgetPosition.x,
        y: ideaWidgetPosition.y,
      }}
      animate={{ x: ideaWidgetPosition.x, y: ideaWidgetPosition.y }}
      transition={isDragging ? { duration: 0 } : isSwapTarget ? { type: 'spring', stiffness: 260, damping: 24 } : pushSpring}
      initial={false}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: pushLevel > 0 && !isDragging ? 0.85 : 1, scale: isDragging ? 1.04 : 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, delay: isDragging ? 0 : index * 0.08 }}
        style={{
          borderRadius: 16,
          background: 'rgba(26,22,30,0.97)',
          border: isSwapTarget
            ? '1px solid #E11F7B'
            : pushLevel >= 1
            ? `1px solid rgba(225,31,123,${pushLevel === 1 ? '0.35' : '0.15'})`
            : `1px solid ${isDragging ? 'rgba(255,193,7,0.35)' : 'rgba(255,215,0,0.15)'}`,
          backdropFilter: 'blur(24px)',
          boxShadow: isDragging
            ? '0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,193,7,0.2)'
            : isSwapTarget
            ? '0 0 0 2px #E11F7B, 0 0 16px rgba(225,31,123,0.30)'
            : '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.08)',
          overflow: 'hidden',
          userSelect: 'none',
          transition: 'box-shadow 0.12s ease-out, border-color 0.12s ease-out',
        }}
      >
        {/* Header — drag handle */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,193,7,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}
            onClick={() => !isDragging && setCollapsed(!collapsed)}
            data-no-drag={collapsed ? undefined : undefined}
          >
            <Lightbulb size={14} style={{ color: '#FFC107', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              Idées de projets
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
              background: 'rgba(255,193,7,0.15)', color: '#FFC107', flexShrink: 0,
            }}>
              {ideas.length}
            </span>
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed) }}
            data-no-drag=""
            style={{ cursor: 'pointer', padding: 4 }}
          >
            {collapsed
              ? <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
              : <ChevronUp size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
            }
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Ideas list */}
              <div
                data-no-drag=""
                onWheel={(e) => e.stopPropagation()}
                style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}
              >
                {sorted.map((idea, i) => {
                  const hasVoted = idea.votedBy.includes(SESSION_ID)
                  return (
                    <motion.div
                      key={idea.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '8px 10px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${hasVoted ? 'rgba(225,31,123,0.3)' : 'rgba(255,255,255,0.05)'}`,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, margin: 0 }}>{idea.text}</p>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 3, display: 'block' }}>
                          par {idea.author}
                        </span>
                      </div>
                      <button
                        data-no-drag=""
                        onClick={(e) => { e.stopPropagation(); deleteIdea(idea.id) }}
                        title="Supprimer"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 18, height: 18, borderRadius: 4, border: 'none', cursor: 'pointer',
                          background: 'transparent', flexShrink: 0, opacity: 0,
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <X size={9} style={{ color: 'rgba(239,68,68,0.7)' }} />
                      </button>
                      <button
                        data-no-drag=""
                        onClick={(e) => { e.stopPropagation(); voteIdea(idea.id, SESSION_ID) }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                          padding: '4px 6px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: hasVoted ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.05)',
                          transition: 'all 0.15s', flexShrink: 0,
                        }}
                      >
                        <ThumbsUp size={10} style={{ color: hasVoted ? '#E11F7B' : 'rgba(255,255,255,0.3)' }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: hasVoted ? '#E11F7B' : 'rgba(255,255,255,0.35)' }}>
                          {idea.votes}
                        </span>
                      </button>
                    </motion.div>
                  )
                })}
              </div>

              {/* Add idea form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div data-no-drag="" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Ton nom…"
                        style={{
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11,
                          outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                      <textarea
                        value={newIdea}
                        onChange={(e) => setNewIdea(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                        placeholder="Décris ton idée de projet…"
                        rows={2}
                        style={{
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 11,
                          outline: 'none', resize: 'none', lineHeight: 1.4, fontFamily: 'inherit',
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button data-no-drag="" onClick={() => setShowForm(false)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>Annuler</button>
                        <button data-no-drag="" onClick={submit} disabled={!newIdea.trim()} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: newIdea.trim() ? '#E11F7B' : 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: newIdea.trim() ? 'pointer' : 'default' }}>Proposer</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              {!showForm && (
                <div data-no-drag="" style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowForm(true) }}
                    style={{
                      width: '100%', padding: '7px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.12)',
                      background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 11,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(225,31,123,0.4)'; e.currentTarget.style.color = '#E11F7B' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                  >
                    <Plus size={11} /> Proposer une idée
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
