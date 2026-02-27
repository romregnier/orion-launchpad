import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Trash2, Github, Copy, Check, MessageSquare } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import type { Project } from '../types'
import { CommentsPanel } from './CommentsPanel'
import { GroupContextMenu } from './GroupContextMenu'

interface Props {
  project: Project
  canvasScale: number
  index?: number
}

const TAG_COLORS = [
  '#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
]
function tagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export function ProjectCard({ project, canvasScale, index = 0 }: Props) {
  const { removeProject, groups } = useLaunchpadStore()
  const group = groups.find(g => g.id === project.groupId)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 })
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

  const commentCount = (() => {
    try {
      const stored = localStorage.getItem(`comments_${project.id}`)
      return stored ? (JSON.parse(stored) as unknown[]).length : 0
    } catch { return 0 }
  })()

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(project.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [project.url])

  const { updatePosition } = useLaunchpadStore()

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    e.stopPropagation(); e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, cardX: project.position.x, cardY: project.position.y }
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale
      const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale
      updatePosition(project.id, dragStart.current.cardX + dx, dragStart.current.cardY + dy)
    }
    const onUp = () => { setIsDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [project.id, project.position.x, project.position.y, canvasScale, updatePosition])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    if (e.touches.length !== 1) return
    e.stopPropagation()
    const touch = e.touches[0]
    setIsDragging(true)
    dragStart.current = { mouseX: touch.clientX, mouseY: touch.clientY, cardX: project.position.x, cardY: project.position.y }
    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return
      const t = ev.touches[0]
      const dx = (t.clientX - dragStart.current.mouseX) / canvasScale
      const dy = (t.clientY - dragStart.current.mouseY) / canvasScale
      updatePosition(project.id, dragStart.current.cardX + dx, dragStart.current.cardY + dy)
    }
    const onEnd = () => { setIsDragging(false); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
  }, [project.id, project.position.x, project.position.y, canvasScale, updatePosition])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    window.open(project.url, '_blank', 'noopener,noreferrer')
  }, [project.url])

  const accent = project.color ?? '#E11F7B'

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: project.position.x,
          top: project.position.y,
          width: 260,
          zIndex: isDragging ? 1000 : showActions ? 100 : 1,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onDoubleClick={onDoubleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { if (!showDeleteConfirm) setShowActions(false) }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }) }}
      >
        {/* ── Floating action bar ABOVE the card ── */}
        <AnimatePresence>
          {(showActions || isTouchDevice) && (
            <motion.div
              data-no-drag
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 8,
                display: 'flex',
                gap: 4,
                padding: '6px 8px',
                borderRadius: 12,
                background: 'rgba(15,12,20,0.96)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
                zIndex: 10,
                whiteSpace: 'nowrap',
              }}
            >
              {project.github && (
                <a href={project.github} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="GitHub"
                  style={actionBtn}>
                  <Github size={13} />
                </a>
              )}
              <a href={project.url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Ouvrir"
                style={actionBtn}>
                <ExternalLink size={13} />
              </a>
              <button onClick={handleCopy} title="Copier le lien" style={{ ...actionBtn, color: copied ? '#10B981' : 'rgba(255,255,255,0.6)' }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 2px' }} />
              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(true) }}
                title="Commentaires"
                style={{ ...actionBtn, position: 'relative' }}
              >
                <MessageSquare size={13} />
                {commentCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -5,
                    background: '#E11F7B', borderRadius: '50%',
                    width: 13, height: 13, fontSize: 7, fontWeight: 800,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid rgba(15,12,20,0.96)',
                  }}>
                    {commentCount > 9 ? '9+' : commentCount}
                  </span>
                )}
              </button>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 2px' }} />
              {!showDeleteConfirm ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
                  title="Retirer du canvas"
                  style={{ ...actionBtn, color: 'rgba(255,100,100,0.7)' }}
                >
                  <Trash2 size={13} />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', paddingInline: 4 }}>Retirer ?</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeProject(project.id) }}
                    style={{ ...actionBtn, background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 10, fontWeight: 700, padding: '0 8px', width: 'auto', borderRadius: 6 }}
                  >Oui</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false) }}
                    style={{ ...actionBtn, fontSize: 10, fontWeight: 700, padding: '0 8px', width: 'auto', borderRadius: 6 }}
                  >Non</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Card body ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: -8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26, delay: index * 0.08 }}
          style={{
            borderRadius: 16,
            background: 'rgba(26,22,30,0.97)',
            border: `1px solid ${showActions ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
            backdropFilter: 'blur(24px)',
            boxShadow: isDragging
              ? `0 24px 60px rgba(0,0,0,0.7), 0 0 0 2px ${accent}55`
              : showActions
              ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${accent}22`
              : '0 4px 20px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          }}
        >
          {/* Accent top bar */}
          <div style={{ height: 2, background: accent, opacity: showActions ? 1 : 0.6, transition: 'opacity 0.2s' }} />

          {/* Preview */}
          <div style={{ position: 'relative', height: 130, background: `${accent}18` }}>
            {project.image && !imgError ? (
              <img
                src={project.image} alt={project.title}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                draggable={false}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, ${accent}33 0%, ${accent}11 60%, rgba(0,0,0,0.2) 100%)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {project.favicon
                  ? <img src={project.favicon} alt="" style={{ width: 32, height: 32, borderRadius: 8, opacity: 0.75 }} />
                  : <span style={{ fontSize: 32, opacity: 0.35 }}>🌐</span>}
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(26,22,30,0.9) 100%)' }} />
            {group && (
              <div style={{
                position: 'absolute', top: 12, left: 12, zIndex: 10,
                width: 10, height: 10, borderRadius: '50%',
                background: group.color,
                border: '2px solid #2C272F',
                boxShadow: `0 0 6px ${group.color}80`,
              }} title={group.name} />
            )}
          </div>

          {/* Body */}
          <div style={{ padding: '10px 14px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              {project.favicon && (
                <img src={project.favicon} alt="" style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0eaf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {project.title}
              </span>
            </div>

            {project.description && (
              <p style={{
                fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.45, margin: '0 0 8px',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {project.description}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: project.tags?.length ? 8 : 0 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
                {project.url.replace(/^https?:\/\//, '')}
              </span>
              {project.addedBy && (
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: `${accent}22`, color: accent, flexShrink: 0 }}>
                  {project.addedBy}
                </span>
              )}
            </div>

            {project.tags && project.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {project.tags.map((tag) => {
                  const c = tagColor(tag)
                  return (
                    <span key={tag} style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', padding: '2px 7px', borderRadius: 20, background: `${c}1A`, color: c, border: `1px solid ${c}33` }}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* CommentsPanel rendered via portal — outside card DOM tree */}
      <CommentsPanel
        projectId={project.id}
        projectTitle={project.title}
        open={showComments}
        onClose={() => setShowComments(false)}
      />

      {contextMenu && (
        <GroupContextMenu
          projectId={project.id}
          currentGroupId={project.groupId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}

const actionBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 8,
  color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
  border: 'none', background: 'transparent',
  transition: 'background 0.12s, color 0.12s',
  flexShrink: 0,
}
