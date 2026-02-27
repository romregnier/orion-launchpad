import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Trash2, GripHorizontal, Github, Copy, Check, MessageSquare } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import type { Project } from '../types'
import { CommentsPanel } from './CommentsPanel'

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
  const { updatePosition, removeProject } = useLaunchpadStore()
  const [isDragging, setIsDragging] = useState(false)
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  const [showActions, setShowActions] = useState(isTouchDevice)
  const [imgError, setImgError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showComments, setShowComments] = useState(false)

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
  const dragStart = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    e.stopPropagation()
    e.preventDefault()

    setIsDragging(true)
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cardX: project.position.x,
      cardY: project.position.y,
    }

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale
      const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale
      updatePosition(project.id, dragStart.current.cardX + dx, dragStart.current.cardY + dy)
    }
    const onUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [project.id, project.position.x, project.position.y, canvasScale, updatePosition])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    if (e.touches.length !== 1) return
    e.stopPropagation()
    const touch = e.touches[0]
    setIsDragging(true)
    dragStart.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      cardX: project.position.x,
      cardY: project.position.y,
    }

    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return
      const t = ev.touches[0]
      const dx = (t.clientX - dragStart.current.mouseX) / canvasScale
      const dy = (t.clientY - dragStart.current.mouseY) / canvasScale
      updatePosition(project.id, dragStart.current.cardX + dx, dragStart.current.cardY + dy)
    }
    const onEnd = () => {
      setIsDragging(false)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
  }, [project.id, project.position.x, project.position.y, canvasScale, updatePosition])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    window.open(project.url, '_blank', 'noopener,noreferrer')
  }, [project.url])

  const accent = project.color ?? '#E11F7B'

  // ── Outer div: handles absolute positioning + drag (NO Framer Motion here)
  // ── Inner motion.div: handles only entrance animation (no position props)
  return (
    <div
      className="project-card"
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
      onMouseLeave={() => setShowActions(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: -8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26, delay: index * 0.08 }}
        style={{
          borderRadius: 16,
          background: 'rgba(26,22,30,0.95)',
          border: `1px solid rgba(255,255,255,0.09)`,
          backdropFilter: 'blur(24px)',
          boxShadow: isDragging
            ? `0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px ${accent}44`
            : '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          transition: isDragging ? 'box-shadow 0.1s ease' : 'box-shadow 0.2s ease',
        }}
      >
        {/* Preview image */}
        <div className="relative overflow-hidden" style={{ height: 150, background: `${accent}22` }}>
          {project.image && !imgError ? (
            <img
              src={project.image}
              alt={project.title}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              draggable={false}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${accent}44 0%, ${accent}11 60%, rgba(0,0,0,0.3) 100%)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {project.favicon
                ? <img src={project.favicon} alt="" style={{ width: 36, height: 36, borderRadius: 8, opacity: 0.85 }} />
                : <span style={{ fontSize: 36, opacity: 0.4 }}>🌐</span>}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', maxWidth: 180, textAlign: 'center' }}>
                {project.title}
              </span>
            </div>
          )}

          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(26,22,30,0.9) 100%)' }} />
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />

          {/* Action buttons */}
          <motion.div
            className="absolute top-2 right-2 flex gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: showActions ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            data-no-drag
          >
            {project.github && (
              <a href={project.github} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: '#fff' }}
                title="GitHub">
                <Github size={13} />
              </a>
            )}
            <a href={project.url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: '#fff' }}
              title="Ouvrir">
              <ExternalLink size={13} />
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: copied ? '#10B981' : '#fff' }}
              title="Copier le lien">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowComments(true) }}
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: '#fff', position: 'relative' }}
              title="Commentaires">
              <MessageSquare size={13} />
              {commentCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4, background: '#E11F7B',
                  borderRadius: '50%', width: 14, height: 14, fontSize: 8, fontWeight: 700,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {commentCount}
                </span>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeProject(project.id) }}
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: 'rgba(255,80,80,0.9)' }}
              title="Supprimer">
              <Trash2 size={13} />
            </button>
          </motion.div>
        </div>

        {/* Card body */}
        <div style={{ padding: '12px 14px 14px' }}>
          <div className="flex items-center gap-2 mb-1">
            {project.favicon && (
              <img src={project.favicon} alt="" style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {project.title}
            </span>
          </div>

          {project.description && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', marginBottom: 8 }}>
              {project.description}
            </p>
          )}

          <div className="flex items-center justify-between" style={{ marginBottom: project.tags?.length ? 8 : 0 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {project.url.replace(/^https?:\/\//, '')}
            </span>
            {project.addedBy && (
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
                padding: '2px 6px', borderRadius: 4, background: `${accent}22`, color: accent }}>
                {project.addedBy}
              </span>
            )}
          </div>

          {project.tags && project.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {project.tags.map((tag) => {
                const c = tagColor(tag)
                return (
                  <span key={tag} style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                    padding: '2px 7px', borderRadius: 20, background: `${c}22`, color: c, border: `1px solid ${c}44` }}>
                    {tag}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2"
          style={{ color: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }}>
          <GripHorizontal size={12} />
        </div>
      </motion.div>
      <CommentsPanel
        projectId={project.id}
        projectTitle={project.title}
        open={showComments}
        onClose={() => setShowComments(false)}
      />
    </div>
  )
}
