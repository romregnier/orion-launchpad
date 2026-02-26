import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Trash2, GripHorizontal } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import type { Project } from '../types'

interface Props {
  project: Project
  canvasScale: number
}

export function ProjectCard({ project, canvasScale }: Props) {
  const { updatePosition, removeProject } = useLaunchpadStore()
  const [isDragging, setIsDragging] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [imgError, setImgError] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    e.stopPropagation()
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

  const accent = project.color ?? '#E11F7B'

  return (
    <motion.div
      className="project-card card-enter absolute"
      style={{
        left: project.position.x,
        top: project.position.y,
        width: 260,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : showActions ? 100 : 1,
        borderRadius: 16,
        background: 'rgba(26,22,30,0.95)',
        border: `1px solid rgba(255,255,255,0.09)`,
        backdropFilter: 'blur(24px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      layout
    >
      {/* Preview image */}
      <div
        className="relative overflow-hidden"
        style={{ height: 150, background: `${accent}22` }}
      >
        {project.image && !imgError ? (
          <img
            src={project.image}
            alt={project.title}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent}33, ${accent}11)` }}
          >
            {project.favicon ? (
              <img src={project.favicon} alt="" style={{ width: 40, height: 40, opacity: 0.6 }} />
            ) : (
              <span style={{ fontSize: 40, opacity: 0.3 }}>🌐</span>
            )}
          </div>
        )}

        {/* Top gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(26,22,30,0.9) 100%)' }}
        />

        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />

        {/* Action buttons (visible on hover) */}
        <motion.div
          className="absolute top-2 right-2 flex gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: showActions ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          data-no-drag
        >
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: '#fff' }}
            title="Ouvrir"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); removeProject(project.id) }}
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: 'rgba(255,80,80,0.9)' }}
            title="Supprimer"
          >
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
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 8 }}>
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {project.url.replace(/^https?:\/\//, '')}
          </span>
          {project.addedBy && (
            <span style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.06em',
              padding: '2px 6px',
              borderRadius: 4,
              background: `${accent}22`,
              color: accent,
            }}>
              {project.addedBy}
            </span>
          )}
        </div>
      </div>

      {/* Drag handle indicator */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ color: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }}
      >
        <GripHorizontal size={12} />
      </div>
    </motion.div>
  )
}
