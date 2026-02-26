import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link, Loader2, Sparkles } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import { fetchMeta } from '../utils/fetchMeta'

interface Props {
  open: boolean
  onClose: () => void
  defaultPosition: { x: number; y: number }
}

export function AddProjectModal({ open, onClose, defaultPosition }: Props) {
  const { addProject } = useLaunchpadStore()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)
  const [meta, setMeta] = useState<{ image?: string; favicon?: string; color?: string }>({})

  const reset = () => {
    setUrl(''); setTitle(''); setDescription(''); setError('')
    setFetched(false); setMeta({}); setLoading(false)
  }

  const handleClose = () => { reset(); onClose() }

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
      url: u,
      title: title.trim(),
      description: description.trim() || undefined,
      image: meta.image,
      favicon: meta.favicon,
      color: meta.color,
      addedBy: 'Romain',
      addedAt: Date.now(),
      position: defaultPosition,
    })
    handleClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed z-[110] left-1/2 top-1/2"
            style={{
              transform: 'translate(-50%, -50%)',
              width: 'min(440px, 92vw)',
              background: 'rgba(22,18,26,0.98)',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: '#E11F7B' }} />
                <span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Ajouter un projet</span>
              </div>
              <button onClick={handleClose} style={{ color: 'rgba(255,255,255,0.35)', padding: 6, borderRadius: 8, cursor: 'pointer' }}
                className="hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* URL row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Link size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                  <input
                    type="url"
                    placeholder="https://monprojet.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !fetched && handleFetch()}
                    style={{
                      width: '100%', paddingLeft: 36, paddingRight: 12, height: 42,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleFetch}
                  disabled={loading || !url.trim()}
                  style={{
                    height: 42, paddingInline: 16, borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: fetched ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#E11F7B,#c41a6a)',
                    color: fetched ? 'rgba(255,255,255,0.5)' : '#fff',
                    cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
                    opacity: !url.trim() ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                    flexShrink: 0,
                    border: 'none',
                  }}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {loading ? 'Chargement…' : fetched ? '✓ Récupéré' : 'Récupérer'}
                </button>
              </div>

              {error && <p style={{ fontSize: 12, color: '#ff6b6b' }}>{error}</p>}

              {/* Preview */}
              {meta.image && (
                <div style={{ borderRadius: 10, overflow: 'hidden', height: 120, background: '#0E0C10' }}>
                  <img src={meta.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {/* Title */}
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Titre
                </label>
                <input
                  type="text"
                  placeholder="Nom du projet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', height: 42,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Description <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none' }}>(optionnel)</span>
                </label>
                <textarea
                  placeholder="Brève description du projet…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'none',
                    lineHeight: 1.5,
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(225,31,123,0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={handleClose} style={{ height: 40, paddingInline: 16, borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', border: 'none' }}>
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={!title.trim() || !url.trim()}
                style={{
                  height: 40, paddingInline: 20, borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: 'linear-gradient(135deg,#E11F7B,#c41a6a)',
                  color: '#fff', cursor: !title.trim() || !url.trim() ? 'not-allowed' : 'pointer',
                  opacity: !title.trim() || !url.trim() ? 0.4 : 1,
                  border: 'none',
                }}
              >
                Ajouter au Launchpad
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
