/**
 * ProjectCard
 *
 * Rôle : Carte de projet draggable sur le canvas, avec actions hover (aperçu, commentaires, édition…).
 * Utilisé dans : App.tsx (canvas)
 * Props : project, canvasScale, index?
 */
import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Trash2, Github, Copy, Check, MessageSquare, Pencil, RefreshCw, Eye } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import type { Project } from '../types'
import { supabase } from '../lib/supabase'

/**
 * Hook to get the comment count for a project from Supabase.
 */
function useCommentCount(projectId: string): number {
  const [count, setCount] = useState(0)
  // memoize the projectId to avoid stale closure
  const pid = useMemo(() => projectId, [projectId])
  useEffect(() => {
    let cancelled = false
    supabase
      .from('launchpad_comments')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', pid)
      .then(({ count: c }) => { if (!cancelled) setCount(c ?? 0) })
    return () => { cancelled = true }
  }, [pid])
  return count
}
import { fetchMeta } from '../utils/fetchMeta'
import { useProjectMeta } from '../hooks/useProjectMeta'
import { useProjectAnalysis } from '../hooks/useProjectAnalysis'

import { CommentsPanel } from './CommentsPanel'
import { GroupContextMenu } from './GroupContextMenu'
import { EditProjectModal } from './EditProjectModal'
import { ProjectPreviewModal } from './ProjectPreviewModal'

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
  const { removeProject, groups, updateProject, canvasAgents, activeBuildTasks, currentUser } = useLaunchpadStore()
  const isViewer = currentUser?.role === 'viewer'
  // Agents travaillant sur ce projet — depuis working_on_project (manuel) OU build_tasks actives (automatique)
  const workingAgents = canvasAgents.filter(a => a.working_on_project === project.id)
  const taskAgentKeys = activeBuildTasks
    .filter(t => t.status === 'running' && (t.project === project.id || t.project === project.title))
    .map(t => t.agent_key)
    .filter((k): k is string => !!k && !workingAgents.some(a => a.agent_key === k))
  const taskAgents = canvasAgents.filter(a => taskAgentKeys.includes(a.agent_key ?? ''))
  const allWorkingAgents = [...workingAgents, ...taskAgents]
  const group = groups.find(g => g.id === project.groupId)
  const meta = useProjectMeta(project.id)
  const { analyze, analyzing } = useProjectAnalysis()
  const healthScore = meta?.ai_meta?.health_score
  const screenshotUrl = meta?.screenshot_url

  // Auto-fetch missing image/favicon on mount
  // Auto-fetch missing meta — run only once per project id, not on every render
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (fetchedRef.current) return
    if (project.image && project.favicon) return
    fetchedRef.current = true
    let cancelled = false
    fetchMeta(project.url).then((meta) => {
      if (cancelled) return
      const updates: Partial<Project> = {}
      if (!project.image && meta.image) updates.image = meta.image
      if (!project.favicon && meta.favicon) updates.favicon = meta.favicon
      if (!project.color && meta.color) updates.color = meta.color
      if (Object.keys(updates).length > 0) updateProject(project.id, updates)
    }).catch(() => {})
    return () => { cancelled = true }
  // Only re-run if the project id changes (new card) — not on every prop update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshPreview = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (refreshing) return
    setRefreshing(true)
    setImgError(false)
    try {
      const meta = await fetchMeta(project.url)
      const updates: Partial<Project> = {}
      if (meta.image) updates.image = meta.image
      if (meta.favicon) updates.favicon = meta.favicon
      if (meta.color) updates.color = meta.color
      updateProject(project.id, updates)
    } catch {}
    setRefreshing(false)
  }, [project.id, project.url, updateProject, refreshing])
  const dragStart = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 })
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

  const commentCount = useCommentCount(project.id)

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(project.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [project.url])

  const { updatePosition, syncPositionToDb, pushOverlapping, swapTarget } = useLaunchpadStore()
  const isSwapTarget = swapTarget === project.id
  const pushSpring = { type: 'spring' as const, stiffness: 300, damping: 30 }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isViewer) return // viewers cannot drag
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    e.stopPropagation(); e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, cardX: project.position.x, cardY: project.position.y }
    let rafId: number | null = null
    const onMove = (ev: MouseEvent) => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale
        const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale
        const nx = dragStart.current.cardX + dx
        const ny = dragStart.current.cardY + dy
        updatePosition(project.id, nx, ny)
      })
    }
    const onUp = () => {
      setIsDragging(false)
      const { x, y } = useLaunchpadStore.getState().projects.find(p => p.id === project.id)?.position ?? { x: 0, y: 0 }
      pushOverlapping(project.id, x, y)
      syncPositionToDb(project.id, x, y, 'project')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [isViewer, project.id, project.position.x, project.position.y, canvasScale, updatePosition, pushOverlapping])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isViewer) return // viewers cannot drag
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
  }, [isViewer, project.id, project.position.x, project.position.y, canvasScale, updatePosition])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    window.open(project.url, '_blank', 'noopener,noreferrer')
  }, [project.url])

  const accent = project.color ?? '#E11F7B'

  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          width: 260,
          zIndex: isDragging ? 1000 : showActions ? 100 : 1,
          cursor: isDragging ? 'grabbing' : 'grab',
          x: project.position.x,
          y: project.position.y,
        }}
        animate={{ x: project.position.x, y: project.position.y }}
        transition={isDragging ? { duration: 0 } : isSwapTarget ? { type: 'spring', stiffness: 260, damping: 24 } : pushSpring}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onDoubleClick={onDoubleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { if (!showDeleteConfirm) setShowActions(false) }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }) }}
        initial={false}
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
                left: 0,
                right: 0,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
            <div data-no-drag className="project-card__actions" style={{
                display: 'flex',
                gap: 4,
                padding: '6px 8px',
                borderRadius: 12,
                background: 'rgba(15,12,20,0.96)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap',
                pointerEvents: 'auto',
              }}>
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
              <button onClick={handleRefreshPreview} title="Rafraîchir la preview" style={{ ...actionBtn, color: refreshing ? '#7C3AED' : 'rgba(255,255,255,0.6)' }}>
                <RefreshCw size={13} style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowEdit(true) }}
                title="Modifier le projet"
                style={actionBtn}
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowPreview(true) }}
                title="Aperçu + commentaires"
                style={actionBtn}
              >
                <Eye size={13} />
              </button>

              {project.url && (
                <button
                  className="project-card__action-btn"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); analyze(project.id, project.url) }}
                  title="Analyser le projet avec l'IA"
                  data-analyze-btn
                  disabled={analyzing === project.id}
                  style={{
                    ...actionBtn,
                    background: analyzing === project.id ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 6, padding: '4px 8px',
                    fontSize: 11, color: '#818CF8', cursor: analyzing === project.id ? 'wait' : 'pointer',
                    width: 'auto',
                  }}
                >
                  {analyzing === project.id ? '⏳' : '🔍'}
                </button>
              )}
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
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Card body ── */}
        <motion.div
          className="project-card"
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{
            opacity: 1,
            scale: isDragging ? 1.04 : 1,
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0.88, y: -8 }}
          transition={isDragging
            ? { type: 'spring', stiffness: 380, damping: 26, delay: index * 0.08 }
            : { type: 'spring', stiffness: 300, damping: 30 }
          }
          style={{
            borderRadius: 16,
            background: 'rgba(26,22,30,0.97)',
            border: isSwapTarget
              ? '1px solid #E11F7B'
              : `1px solid ${showActions ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
            backdropFilter: 'blur(24px)',
            boxShadow: isDragging
              ? `0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(225,31,123,0.20)`
              : isSwapTarget
              ? '0 0 0 2px #E11F7B, 0 0 16px rgba(225,31,123,0.30)'
              : showActions
              ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${accent}22`
              : '0 4px 20px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            transition: 'box-shadow 0.12s ease-out, border-color 0.12s ease-out',
          }}
        >
          {/* Accent top bar */}
          <div style={{ height: 2, background: accent, opacity: showActions ? 1 : 0.6, transition: 'opacity 0.2s' }} />

          {/* Working agents bandeau — automatique via build_tasks ou manuel via working_on_project */}
          <AnimatePresence>
            {allWorkingAgents.length > 0 && (
              <motion.div
                data-no-drag
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 0,
                  right: 0,
                  background: 'rgba(225,31,123,0.15)',
                  borderBottom: '1px solid rgba(225,31,123,0.3)',
                  padding: '3px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#E11F7B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  zIndex: 5,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <span style={{ animation: 'pulse 1.5s infinite' }}>⚡</span>
                {allWorkingAgents.map(a => a.name).join(', ')} · en cours
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview */}
          <div style={{ position: 'relative', height: 130, background: `${accent}18` }}>
            {/* Health score badge */}
            {healthScore !== undefined && (
              <div
                className="project-card__health-score"
                title={meta?.ai_meta?.suggestions?.join(' · ')}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 32, height: 32, borderRadius: '50%',
                  background: healthScore >= 70 ? '#10B98122' : healthScore >= 40 ? '#F59E0B22' : '#EF444422',
                  border: `2px solid ${healthScore >= 70 ? '#10B981' : healthScore >= 40 ? '#F59E0B' : '#EF4444'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800,
                  color: healthScore >= 70 ? '#10B981' : healthScore >= 40 ? '#F59E0B' : '#EF4444',
                  cursor: 'help',
                  zIndex: 4,
                }}
              >
                {healthScore}
              </div>
            )}
            {/* Screenshot (priority) or OG image */}
            {screenshotUrl ? (
              <img
                src={screenshotUrl} alt={project.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                draggable={false}
              />
            ) : project.image && !imgError ? (
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
          <div className="project-card__body" style={{ padding: '10px 14px 12px' }}>
            <div className="project-card__header" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
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
              <div className="project-card__tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
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
            {meta?.ai_meta?.summary && (
              <p className="project-card__ai-summary" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '6px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                {meta.ai_meta.summary}
              </p>
            )}
            {/* Rapport d'amélioration IA — suggestions */}
            {meta?.ai_meta?.suggestions && meta.ai_meta.suggestions.length > 0 && (
              <div className="project-card__ai-improvements" style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>
                  💡 Pistes d'amélioration
                </div>
                {meta.ai_meta.suggestions.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: 2, display: 'flex', gap: 5 }}>
                    <span style={{ color: '#E11F7B', flexShrink: 0 }}>→</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* EditProjectModal */}
      <EditProjectModal
        project={project}
        open={showEdit}
        onClose={() => setShowEdit(false)}
      />

      {/* ProjectPreviewModal — aperçu iframe + commentaires côte à côte */}
      <ProjectPreviewModal
        project={project}
        open={showPreview}
        onClose={() => setShowPreview(false)}
      />

      {/* CommentsPanel rendered via portal — outside card DOM tree */}
      <CommentsPanel
        projectId={project.id}
        projectTitle={project.title}
        open={showComments}
        onClose={() => setShowComments(false)}
        currentUser={currentUser?.username}
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
