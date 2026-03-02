import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Trash2, Plus, X } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import type { ListWidget } from '../types'

const TYPE_CONFIG = {
  brainstorm: { emoji: '💡', color: '#F59E0B', label: 'Brainstorm' },
  checklist:  { emoji: '✅', color: '#10B981', label: 'Checklist' },
  ranking:    { emoji: '🏆', color: '#FFD700', label: 'Classement' },
  notes:      { emoji: '📝', color: '#8B5CF6', label: 'Notes' },
}

interface Props {
  list: ListWidget
  canvasScale: number
  sessionId: string
  isAdmin?: boolean
}

export function ListWidgetCard({ list, canvasScale, sessionId, isAdmin = false }: Props) {
  const { removeList, addListItem, removeListItem, toggleListItem, voteListItem, moveListItem, updateListPosition, syncPositionToDb, pushOverlapping, swapTarget } = useLaunchpadStore()
  const config = TYPE_CONFIG[list.type]
  const [collapsed, setCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [newText, setNewText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isSwapTarget = swapTarget === list.id
  const pushSpring = { type: 'spring' as const, stiffness: 300, damping: 30 }

  const dragStart = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    dragStart.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      cardX: list.position.x, cardY: list.position.y,
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
        updateListPosition(list.id, nx, ny)
      })
    }
    const onUp = () => {
      setIsDragging(false)
      const pos = useLaunchpadStore.getState().lists.find(l => l.id === list.id)?.position ?? list.position
      pushOverlapping(list.id, pos.x, pos.y)
      syncPositionToDb(list.id, pos.x, pos.y, 'list')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [canvasScale, list.position, list.id, updateListPosition, pushOverlapping])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    const touch = e.touches[0]
    setIsDragging(true)
    dragStart.current = {
      mouseX: touch.clientX, mouseY: touch.clientY,
      cardX: list.position.x, cardY: list.position.y,
    }
    const onMove = (ev: TouchEvent) => {
      const t = ev.touches[0]
      const dx = (t.clientX - dragStart.current.mouseX) / canvasScale
      const dy = (t.clientY - dragStart.current.mouseY) / canvasScale
      const nx = dragStart.current.cardX + dx
      const ny = dragStart.current.cardY + dy
      updateListPosition(list.id, nx, ny)
    }
    const onEnd = () => {
      setIsDragging(false)
      const pos = useLaunchpadStore.getState().lists.find(l => l.id === list.id)?.position ?? list.position
      pushOverlapping(list.id, pos.x, pos.y)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
  }, [canvasScale, list.position, list.id, updateListPosition, pushOverlapping])

  const submit = () => {
    if (!newText.trim()) return
    addListItem(list.id, newText.trim(), sessionId)
    setNewText('')
  }

  return (
    <motion.div
      style={{
        position: 'absolute',
        width: 280,
        zIndex: isDragging ? 50 : 2,
        cursor: isDragging ? 'grabbing' : 'grab',
        x: list.position.x,
        y: list.position.y,
      }}
      animate={{ x: list.position.x, y: list.position.y }}
      transition={isDragging ? { duration: 0 } : isSwapTarget ? { type: 'spring', stiffness: 260, damping: 24 } : pushSpring}
      initial={false}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: isDragging ? 1.04 : 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{
          borderRadius: 16,
          background: 'rgba(26,22,30,0.97)',
          border: isSwapTarget
            ? '1px solid #E11F7B'
            : `1px solid ${isDragging ? config.color + '55' : config.color + '22'}`,
          backdropFilter: 'blur(24px)',
          boxShadow: isDragging
            ? `0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px ${config.color}33`
            : isSwapTarget
            ? '0 0 0 2px #E11F7B, 0 0 16px rgba(225,31,123,0.30)'
            : `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${config.color}11`,
          overflow: 'hidden',
          userSelect: 'none',
          transition: 'box-shadow 0.12s ease-out, border-color 0.12s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
            background: config.color + '0f',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{config.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {list.title}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
              background: config.color + '22', color: config.color, flexShrink: 0,
            }}>
              {list.items.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {(sessionId === list.createdBy || isAdmin) && (
              confirmDelete ? (
                <div data-no-drag="" style={{ display: 'flex', gap: 4 }}>
                  <button
                    data-no-drag=""
                    onClick={(e) => { e.stopPropagation(); removeList(list.id) }}
                    style={{ padding: '2px 6px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}
                  >Oui</button>
                  <button
                    data-no-drag=""
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                    style={{ padding: '2px 6px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer' }}
                  >Non</button>
                </div>
              ) : (
                <button
                  data-no-drag=""
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={11} />
                </button>
              )
            )}
            <button
              data-no-drag=""
              onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}
            >
              {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
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
              {/* Items list */}
              <div
                data-no-drag=""
                onWheel={(e) => e.stopPropagation()}
                style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}
              >
                {list.items.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {/* Checklist */}
                    {list.type === 'checklist' && (
                      <input
                        type="checkbox"
                        checked={!!item.checked}
                        onChange={() => toggleListItem(list.id, item.id)}
                        data-no-drag=""
                        style={{ cursor: 'pointer', flexShrink: 0, accentColor: config.color }}
                      />
                    )}
                    {/* Ranking number */}
                    {list.type === 'ranking' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: config.color, flexShrink: 0, minWidth: 16, textAlign: 'center' }}>
                        {idx + 1}
                      </span>
                    )}
                    {/* Text */}
                    <span style={{
                      flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4,
                      textDecoration: list.type === 'checklist' && item.checked ? 'line-through' : 'none',
                      opacity: list.type === 'checklist' && item.checked ? 0.4 : 1,
                    }}>
                      {item.text}
                    </span>
                    {/* Ranking up/down */}
                    {list.type === 'ranking' && sessionId === item.createdBy && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                        <button data-no-drag="" onClick={() => moveListItem(list.id, item.id, 'up')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>↑</button>
                        <button data-no-drag="" onClick={() => moveListItem(list.id, item.id, 'down')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>↓</button>
                      </div>
                    )}
                    {/* Brainstorm vote */}
                    {list.type === 'brainstorm' && (() => {
                      const hasVoted = (item.votedBy ?? []).includes(sessionId)
                      return (
                        <button
                          data-no-drag=""
                          onClick={() => voteListItem(list.id, item.id, sessionId)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                            padding: '3px 5px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            background: hasVoted ? config.color + '22' : 'rgba(255,255,255,0.05)',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: 9 }}>👍</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: hasVoted ? config.color : 'rgba(255,255,255,0.35)' }}>
                            {item.votes ?? 0}
                          </span>
                        </button>
                      )
                    })()}
                    {/* Delete item — visible to anyone on hover */}
                    <button
                      data-no-drag=""
                      onClick={() => removeListItem(list.id, item.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                        color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', flexShrink: 0,
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
                {list.items.length === 0 && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '8px 0', margin: 0 }}>
                    Aucun élément
                  </p>
                )}
              </div>

              {/* Add item footer */}
              <div data-no-drag="" style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
                    placeholder="Ajouter un élément…"
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                      padding: '6px 10px', color: '#fff', fontSize: 11,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={submit}
                    disabled={!newText.trim()}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: 'none',
                      background: newText.trim() ? config.color : 'rgba(255,255,255,0.06)',
                      color: '#fff', cursor: newText.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', flexShrink: 0,
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
