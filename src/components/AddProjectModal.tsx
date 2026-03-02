import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link, Loader2, Sparkles, RotateCcw, ExternalLink } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import { fetchMeta } from '../utils/fetchMeta'

interface Props {
  open: boolean
  onClose: () => void
  defaultPosition: { x: number; y: number }
}

export function AddProjectModal({ open, onClose, defaultPosition }: Props) {
  const { addProject, restoreProject, deletedProjects } = useLaunchpadStore()
  const [tab, setTab] = useState<'add' | 'archived'>('add')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)
  const [meta, setMeta] = useState<{ image?: string; favicon?: string; color?: string }>({})

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const reset = () => {
    setUrl(''); setTitle(''); setDescription(''); setError('')
    setFetched(false); setMeta({}); setLoading(false)
  }
  const handleClose = () => { reset(); setTab('add'); onClose() }

  const handleFetch = async () => {
    if (!url.trim()) return
    setLoading(true); setError('')
    try {
      let u = url.trim()
      if (!u.startsWith('http')) u = 'https://' + u
      const data = await fetchMeta(u)
      setTitle(data.title ?? '')
      setDescription(data.description ?? '')
      setMeta({ image: data.image, favicon: data.favicon, color: data.color })
      setFetched(true)
    } catch {
      setError('Impossible de récupérer les métadonnées.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    if (!url.trim() || !title.trim()) return
    let u = url.trim()
    if (!u.startsWith('http')) u = 'https://' + u
    addProject({
      id: Date.now().toString(),
      url: u, title: title.trim(),
      description: description.trim() || undefined,
      image: meta.image, favicon: meta.favicon, color: meta.color,
      addedBy: 'Romain', addedAt: Date.now(), position: defaultPosition,
    })
    handleClose()
  }

  const handleRestore = (id: string) => {
    restoreProject(id)
    handleClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 490 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          {/* Modal — centré, z-index 501 pour passer au-dessus de tout */}
          <motion.div
            style={{
              position: 'fixed', zIndex: 500,
              left: '50%', top: '50%',
              x: '-50%', y: '-50%',
              width: 'min(460px, 94vw)',
              background: 'rgba(18,15,24,0.99)',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 32px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(225,31,123,0.08)',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={15} style={{ color: '#E11F7B' }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Projets</span>
              </div>
              <button onClick={handleClose} style={{ color: 'rgba(255,255,255,0.35)', padding: 6, borderRadius: 8, cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.06)', display: 'flex' }}>
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, padding: '14px 22px 0' }}>
              {(['add', 'archived'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: tab === t ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.05)',
                    color: tab === t ? '#E11F7B' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {t === 'add' ? '✨ Ajouter' : `📦 Archivés${deletedProjects.length ? ` (${deletedProjects.length})` : ''}`}
                </button>
              ))}
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 0 0' }} />

            {/* Tab: Add */}
            {tab === 'add' && (
              <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Link size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                    <input
                      type="url" placeholder="https://monprojet.com"
                      value={url} onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !fetched && handleFetch()}
                      style={{ width: '100%', paddingLeft: 32, paddingRight: 10, height: 40, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'}
                      autoFocus
                    />
                  </div>
                  <button onClick={handleFetch} disabled={loading || !url.trim()}
                    style={{ height: 40, paddingInline: 14, borderRadius: 10, fontSize: 12, fontWeight: 600, background: fetched ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#E11F7B,#c41a6a)', color: fetched ? '#10B981' : '#fff', cursor: loading || !url.trim() ? 'not-allowed' : 'pointer', opacity: !url.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0, border: 'none' }}>
                    {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                    {loading ? 'Chargement…' : fetched ? '✓ OK' : 'Récupérer'}
                  </button>
                </div>

                {error && <p style={{ fontSize: 12, color: '#ff6b6b', margin: 0 }}>{error}</p>}

                {meta.image && (
                  <div style={{ borderRadius: 10, overflow: 'hidden', height: 100, background: '#0E0C10' }}>
                    <img src={meta.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {fetched && (
                  <>
                    <input type="text" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', height: 40, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'}
                    />
                    <textarea placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.45, boxSizing: 'border-box', fontFamily: 'inherit' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'}
                    />
                  </>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={handleClose} style={{ height: 38, paddingInline: 14, borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', border: 'none' }}>Annuler</button>
                  <button onClick={handleAdd} disabled={!title.trim() || !url.trim()}
                    style={{ height: 38, paddingInline: 18, borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#E11F7B,#c41a6a)', color: '#fff', cursor: !title.trim() || !url.trim() ? 'not-allowed' : 'pointer', opacity: !title.trim() || !url.trim() ? 0.4 : 1, border: 'none' }}>
                    Ajouter au Launchpad ✨
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Archived */}
            {tab === 'archived' && (
              <div style={{ padding: '16px 22px 22px' }}>
                {deletedProjects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
                    Aucun projet archivé
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>
                      Ces projets ont été retirés du canvas — le repo GitHub n'est pas affecté.
                    </p>
                    {deletedProjects.map((p) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {p.favicon && <img src={p.favicon} alt="" style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }} />}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.url.replace(/^https?:\/\//, '')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {p.github && (
                            <a href={p.github} target="_blank" rel="noopener noreferrer" style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                              <ExternalLink size={12} />
                            </a>
                          )}
                          <button onClick={() => handleRestore(p.id)}
                            style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(225,31,123,0.15)', color: '#E11F7B', border: 'none', cursor: 'pointer' }}
                            title="Remettre sur le canvas">
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
