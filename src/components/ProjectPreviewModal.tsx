/**
 * ProjectPreviewModal
 *
 * Rôle : Modal plein-écran affichant un aperçu iframe du projet (60%) et le CommentsPanel (40%).
 *         Sur mobile (<768px) : tabs Aperçu / Commentaires.
 *         Mode fullscreen ⛶ : iframe 100vw/100vh + sidebar commentaires rétractable.
 * Utilisé dans : ProjectCard
 * Props : project, open, onClose
 */
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, RefreshCw } from 'lucide-react'
import { CommentsPanel } from './CommentsPanel'
import { useLaunchpadStore } from '../store'
import type { Project } from '../types'

interface ProjectPreviewModalProps {
  project: Project
  open: boolean
  onClose: () => void
}

export function ProjectPreviewModal({ project, open, onClose }: ProjectPreviewModalProps) {
  const { currentUser } = useLaunchpadStore()
  const [iframeBlocked, setIframeBlocked] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'comments'>('preview')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showComments, setShowComments] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Reset state when project changes or modal opens
  useEffect(() => {
    if (open) {
      setIframeBlocked(false)
      setActiveTab('preview')
      setIsFullscreen(false)
      setShowComments(true)
    }
  }, [open, project.id])

  // ESC handler — ferme fullscreen si actif, sinon ferme la modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isFullscreen, onClose])

  const handleIframeError = useCallback(() => {
    setIframeBlocked(true)
  }, [])

  const domain = project.url.replace(/^https?:\/\//, '').split('/')[0]

  // ── Fullscreen mode ──────────────────────────────────────────────────────────
  const fullscreenModal = (
    <AnimatePresence>
      {open && isFullscreen && (
        <motion.div
          key="fullscreen"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: '#0D0B0F',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── Fullscreen top bar ── */}
          <div
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(14,12,16,0.98)',
              flexShrink: 0,
            }}
          >
            {/* ← Retour */}
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ← Retour
            </button>

            {/* Project favicon + URL */}
            {project.favicon && (
              <img src={project.favicon} alt="" style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0 }} />
            )}
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.url}
            </span>

            {/* Toggle comments */}
            <button
              onClick={() => setShowComments((v) => !v)}
              title={showComments ? 'Masquer les commentaires' : 'Afficher les commentaires'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8,
                border: 'none',
                background: showComments ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.07)',
                color: showComments ? '#E11F7B' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              💬
            </button>

            {/* Refresh */}
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Recharger l'aperçu"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} />
            </button>

            {/* External link */}
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center',
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.5)',
                justifyContent: 'center',
              }}
            >
              <ExternalLink size={13} />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Fermer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8,
                border: 'none', background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Fullscreen body ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Iframe */}
            <div style={{ flex: 1, position: 'relative', background: '#000' }}>
              {iframeBlocked ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 32 }}>
                  <div>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.6)' }}>
                      Ce site ne peut pas être affiché en iframe
                    </div>
                    <a href={project.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#E11F7B', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                      <ExternalLink size={14} /> Ouvrir dans un onglet
                    </a>
                  </div>
                </div>
              ) : (
                <iframe
                  key={refreshKey}
                  src={project.url}
                  title={project.title}
                  onError={handleIframeError}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            {/* Comments sidebar — slide from right */}
            <AnimatePresence>
              {showComments && (
                <motion.div
                  key="fs-comments"
                  initial={{ x: 360, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 360, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  style={{
                    width: 360,
                    flexShrink: 0,
                    borderLeft: '1px solid rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CommentsPanel
                    projectId={project.id}
                    projectTitle={project.title}
                    open={true}
                    onClose={() => setShowComments(false)}
                    currentUser={currentUser?.username}
                    inline={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ── Normal split modal ───────────────────────────────────────────────────────
  const modal = (
    <AnimatePresence>
      {open && !isFullscreen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="project-preview-modal__backdrop"
            style={{
              position: 'fixed', inset: 0, zIndex: 480,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            }}
          />

          {/* ── Modal container ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="project-preview-modal"
            style={{
              position: 'fixed', inset: 0, zIndex: 481,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              className="project-preview-modal__inner"
              style={{
                width: 'min(1200px, calc(100vw - 32px))',
                height: 'min(700px, calc(100vh - 64px))',
                display: 'flex',
                flexDirection: 'column',
                background: '#0E0C10',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div
                className="project-preview-modal__header"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(14,12,16,0.98)',
                  flexShrink: 0,
                }}
              >
                {project.favicon && (
                  <img src={project.favicon} alt="" style={{ width: 16, height: 16, borderRadius: 4 }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f0eaf5' }}>{project.title}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginRight: 'auto' }}>· {domain}</span>

                {/* Mobile tabs */}
                {isMobile && (
                  <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
                    {(['preview', 'comments'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 8,
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: activeTab === tab ? '#E11F7B' : 'rgba(255,255,255,0.07)',
                          color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.5)',
                          transition: 'background 0.15s',
                        }}
                      >
                        {tab === 'preview' ? '👁 Aperçu' : '💬 Comments'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Refresh button */}
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  title="Recharger l'aperçu"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8,
                    border: 'none', background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={12} />
                </button>

                {/* Fullscreen button ⛶ */}
                {!isMobile && (
                  <button
                    onClick={() => setIsFullscreen(true)}
                    title="Plein écran"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 8,
                      border: 'none', background: 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                      fontSize: 14,
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                  >
                    ⛶
                  </button>
                )}

                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ouvrir dans un onglet"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={12} /> Ouvrir
                </a>

                <button
                  onClick={onClose}
                  aria-label="Fermer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8,
                    border: 'none', background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* ── Body ── */}
              <div
                className="project-preview-modal__body"
                style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
              >
                {/* Left: iframe or blocked message */}
                {(!isMobile || activeTab === 'preview') && (
                  <div
                    className="project-preview-modal__iframe-side"
                    style={{
                      flex: isMobile ? '1 1 100%' : '0 0 60%',
                      position: 'relative',
                      background: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {iframeBlocked ? (
                      <div style={{
                        textAlign: 'center',
                        padding: 32,
                        color: 'rgba(255,255,255,0.4)',
                      }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.6)' }}>
                          Ce site ne peut pas être affiché en iframe
                        </div>
                        <div style={{ fontSize: 12, marginBottom: 20 }}>
                          Le site utilise des restrictions de sécurité (X-Frame-Options ou CSP).
                        </div>
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '9px 18px', borderRadius: 10,
                            background: '#E11F7B', color: '#fff',
                            fontWeight: 700, fontSize: 13,
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={14} /> Ouvrir dans un onglet
                        </a>
                      </div>
                    ) : (
                      <iframe
                        key={refreshKey}
                        src={project.url}
                        title={project.title}
                        onError={handleIframeError}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                )}

                {/* Right: CommentsPanel inline */}
                {(!isMobile || activeTab === 'comments') && (
                  <div
                    className="project-preview-modal__comments-side"
                    style={{
                      flex: isMobile ? '1 1 100%' : '0 0 40%',
                      borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CommentsPanel
                      projectId={project.id}
                      projectTitle={project.title}
                      open={true}
                      onClose={onClose}
                      currentUser={currentUser?.username}
                      inline={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {createPortal(modal, document.body)}
      {createPortal(fullscreenModal, document.body)}
    </>
  )
}
