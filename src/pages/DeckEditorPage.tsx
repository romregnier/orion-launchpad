/**
 * DeckEditorPage.tsx — Éditeur CMS 3 colonnes
 * TK-0042
 *
 * Layout:
 * - Colonne gauche (240px): liste des slides avec miniatures
 * - Canvas central: preview live de la slide active
 * - Panneau droit (280px): propriétés éditables
 * - Toolbar top: titre + actions
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Plus, Maximize2, Eye, Globe,
  RefreshCw, ArrowUp, ArrowDown, Trash2, Save
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SlideRenderer } from '../components/deck/SlideRenderer'
import { regenerateSlide } from '../lib/deckGenerator'
import { publishDeck } from '../lib/deckPublisher'
import type { SlideJSON, DeckTheme, SlideContent } from '../types/deck'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeckData {
  id: string
  title: string
  theme_json: string | null
  status: string
  slide_count: number
}

interface SlideData extends SlideJSON {
  id: string
  deck_id: string
}

function getTheme(deck: DeckData | null): DeckTheme {
  if (!deck?.theme_json) return 'dark_premium'
  try {
    const parsed = JSON.parse(deck.theme_json) as { theme?: string }
    const raw = parsed.theme || 'DARK_PREMIUM'
    const map: Record<string, DeckTheme> = {
      DARK_PREMIUM: 'dark_premium',
      LIGHT_CLEAN: 'light_clean',
      GRADIENT_BOLD: 'gradient_bold',
      CORPORATE: 'corporate',
    }
    return map[raw] || 'dark_premium'
  } catch {
    return 'dark_premium'
  }
}

// ── PropsPanel ────────────────────────────────────────────────────────────────

function PropsPanel({
  slide,
  deckTitle,
  onUpdate,
  onRegenerate,
}: {
  slide: SlideData
  deckTitle: string
  onUpdate: (content: SlideContent) => void
  onRegenerate: () => void
}) {
  const [regenerating, setRegenerating] = useState(false)
  const content = slide.content

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#F5F0F7',
    fontSize: 12,
    fontFamily: 'Poppins, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 4,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const newContent = await regenerateSlide(deckTitle, slide.type, content as Record<string, unknown>)
      onUpdate(newContent as SlideContent)
    } catch (err) {
      console.error('[PropsPanel] regenerate error:', err)
    }
    setRegenerating(false)
    onRegenerate()
  }

  function Field({
    label, field, multiline = false,
  }: {
    label: string
    field: keyof SlideContent
    multiline?: boolean
  }) {
    const value = (content[field] as string) || ''
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>{label}</label>
        {multiline ? (
          <textarea
            value={value}
            onChange={e => onUpdate({ ...content, [field]: e.target.value })}
            style={{ ...fieldStyle, minHeight: 72, resize: 'vertical' }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => onUpdate({ ...content, [field]: e.target.value })}
            style={fieldStyle}
          />
        )}
      </div>
    )
  }

  const SlideType = slide.type

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: 'rgba(225,31,123,0.15)', color: '#E11F7B',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {SlideType}
        </span>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)',
            fontSize: 11, fontWeight: 600, cursor: regenerating ? 'wait' : 'pointer',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          <RefreshCw size={11} style={{ animation: regenerating ? 'spin 1s linear infinite' : 'none' }} />
          Régénérer
        </button>
      </div>

      {/* Fields by type */}
      {(SlideType === 'hero') && (
        <>
          <Field label="Eyebrow" field="eyebrow" />
          <Field label="Titre" field="title" />
          <Field label="Sous-titre" field="subtitle" multiline />
        </>
      )}

      {(SlideType === 'content') && (
        <>
          <Field label="Label" field="label" />
          <Field label="Titre" field="title" />
          <Field label="Corps" field="body" multiline />
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Points clés</label>
            {(content.bullets || []).map((bullet, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <input
                  type="text"
                  value={bullet}
                  onChange={e => {
                    const bullets = [...(content.bullets || [])]
                    bullets[i] = e.target.value
                    onUpdate({ ...content, bullets })
                  }}
                  style={{ ...fieldStyle, flex: 1 }}
                />
                <button
                  onClick={() => {
                    const bullets = (content.bullets || []).filter((_, j) => j !== i)
                    onUpdate({ ...content, bullets })
                  }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0 4px' }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => onUpdate({ ...content, bullets: [...(content.bullets || []), ''] })}
              style={{
                background: 'none', border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: 6, color: 'rgba(255,255,255,0.3)',
                fontSize: 11, cursor: 'pointer', padding: '4px 8px', width: '100%', marginTop: 4,
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              + Ajouter un point
            </button>
          </div>
        </>
      )}

      {(SlideType === 'stats') && (
        <>
          <Field label="Titre" field="title" />
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Métriques</label>
            {(content.metrics || []).map((m, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 4, marginBottom: 4 }}>
                <input
                  type="text"
                  placeholder="Valeur"
                  value={m.value}
                  onChange={e => {
                    const metrics = [...(content.metrics || [])]
                    metrics[i] = { ...metrics[i], value: e.target.value }
                    onUpdate({ ...content, metrics })
                  }}
                  style={fieldStyle}
                />
                <input
                  type="text"
                  placeholder="Label"
                  value={m.label}
                  onChange={e => {
                    const metrics = [...(content.metrics || [])]
                    metrics[i] = { ...metrics[i], label: e.target.value }
                    onUpdate({ ...content, metrics })
                  }}
                  style={fieldStyle}
                />
                <button
                  onClick={() => {
                    const metrics = (content.metrics || []).filter((_, j) => j !== i)
                    onUpdate({ ...content, metrics })
                  }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {(SlideType === 'quote') && (
        <>
          <Field label="Citation" field="text" multiline />
          <Field label="Auteur" field="author" />
          <Field label="Rôle / Titre" field="role" />
        </>
      )}

      {(SlideType === 'cta') && (
        <>
          <Field label="Titre" field="title" />
          <Field label="Sous-titre" field="subtitle" multiline />
          <Field label="Texte du bouton" field="buttonText" />
        </>
      )}

      {(SlideType === 'chart') && (
        <>
          <Field label="Titre" field="title" />
        </>
      )}
    </div>
  )
}

// ── SlideThumbnail ────────────────────────────────────────────────────────────

function SlideThumbnail({
  slide,
  theme,
  index,
  active,
  onClick,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
}: {
  slide: SlideData
  theme: DeckTheme
  index: number
  active: boolean
  onClick: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{ marginBottom: 8, position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Number + type */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 4, padding: '0 2px',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#E11F7B' : 'rgba(255,255,255,0.25)' }}>
          {index + 1}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
          {slide.type}
        </span>
      </div>

      {/* Thumbnail preview */}
      <div
        className={`slide-thumb${active ? ' active' : ''}`}
        onClick={onClick}
        style={{ position: 'relative' }}
      >
        <div style={{ transform: 'scale(0.25)', transformOrigin: '0 0', width: '400%', height: '400%', pointerEvents: 'none' }}>
          <SlideRenderer slide={slide} theme={theme} thumbnail />
        </div>

        {/* Hover controls */}
        {hovered && (
          <div style={{
            position: 'absolute', top: 2, right: 2,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {!isFirst && (
              <button onClick={e => { e.stopPropagation(); onMoveUp() }} style={iconBtnStyle}>
                <ArrowUp size={10} />
              </button>
            )}
            {!isLast && (
              <button onClick={e => { e.stopPropagation(); onMoveDown() }} style={iconBtnStyle}>
                <ArrowDown size={10} />
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              style={{ ...iconBtnStyle, color: '#EF4444' }}
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4,
  border: 'none', background: 'rgba(0,0,0,0.7)',
  color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// ── DeckEditorPage ────────────────────────────────────────────────────────────

export function DeckEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<DeckData | null>(null)
  const [slides, setSlides] = useState<SlideData[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const theme = getTheme(deck)
  const activeSlide = slides[activeIdx] || null

  useEffect(() => {
    if (id) fetchDeck(id)
  }, [id])

  async function fetchDeck(deckId: string) {
    setLoading(true)
    const { data: deckData } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', deckId)
      .single()

    if (deckData) {
      setDeck(deckData as DeckData)
      setTitleValue((deckData as DeckData).title)
    }

    const { data: slidesData } = await supabase
      .from('slides')
      .select('*')
      .eq('deck_id', deckId)
      .order('position', { ascending: true })

    if (slidesData) {
      setSlides(slidesData.map(s => ({
        ...s,
        content: s.content_json || {},
      })) as SlideData[])
    }

    setLoading(false)
  }

  // Debounced auto-save on slide update
  const autoSave = useCallback((slideId: string, content: SlideContent) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      await supabase
        .from('slides')
        .update({ content_json: content })
        .eq('id', slideId)
      setSaving(false)
    }, 1000)
  }, [])

  function updateSlideContent(content: SlideContent) {
    if (!activeSlide) return
    const updated = slides.map((s, i) =>
      i === activeIdx ? { ...s, content } : s
    )
    setSlides(updated)
    autoSave(activeSlide.id, content)
  }

  async function saveTitle() {
    if (!deck || !id) return
    setEditingTitle(false)
    if (titleValue === deck.title) return
    await supabase
      .from('presentations')
      .update({ title: titleValue })
      .eq('id', id)
    setDeck(d => d ? { ...d, title: titleValue } : d)
  }

  async function addSlide() {
    if (!id) return
    const newSlide = {
      deck_id: id,
      position: slides.length + 1,
      type: 'content' as const,
      content_json: {
        label: 'Nouvelle section',
        title: 'Titre de la slide',
        body: 'Décrivez le contenu ici...',
      },
    }
    const { data } = await supabase.from('slides').insert(newSlide).select().single()
    if (data) {
      setSlides(prev => [...prev, { ...data, content: data.content_json } as SlideData])
      setActiveIdx(slides.length)
    }
  }

  async function moveSlide(idx: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= slides.length) return

    const updated = [...slides]
    const temp = updated[idx]
    updated[idx] = updated[targetIdx]
    updated[targetIdx] = temp

    // Update positions
    updated.forEach((s, i) => { s.position = i + 1 })
    setSlides(updated)
    setActiveIdx(targetIdx)

    // Save to Supabase
    await Promise.all([
      supabase.from('slides').update({ position: updated[idx].position }).eq('id', updated[idx].id),
      supabase.from('slides').update({ position: updated[targetIdx].position }).eq('id', updated[targetIdx].id),
    ])
  }

  async function deleteSlide(idx: number) {
    if (slides.length <= 1) return
    const slide = slides[idx]
    await supabase.from('slides').delete().eq('id', slide.id)
    const updated = slides.filter((_, i) => i !== idx)
    updated.forEach((s, i) => { s.position = i + 1 })
    setSlides(updated)
    setActiveIdx(Math.min(activeIdx, updated.length - 1))
  }

  async function handlePublish() {
    if (!id || publishing) return
    setPublishing(true)
    try {
      const url = await publishDeck(id)
      if (url) {
        window.open(url, '_blank')
        setDeck(d => d ? { ...d, status: 'published' } : d)
      }
    } catch (err) {
      console.error('[DeckEditorPage] publish error:', err)
      alert('Erreur lors de la publication: ' + (err instanceof Error ? err.message : 'Inconnu'))
    }
    setPublishing(false)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0B090D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#F5F0F7', fontFamily: 'Poppins, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Chargement de l&apos;éditeur...</p>
        </div>
      </div>
    )
  }

  return (
    <div data-theme={theme.toUpperCase().replace('_', '_')} className="deck-editor" style={{ fontFamily: 'Poppins, sans-serif' }}>

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div className="deck-topbar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/decks')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Editable title */}
          {editingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => e.key === 'Enter' && saveTitle()}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(225,31,123,0.4)',
                borderRadius: 6, padding: '4px 10px', color: '#F5F0F7',
                fontSize: 14, fontWeight: 700, fontFamily: 'Poppins, sans-serif', outline: 'none',
                minWidth: 200,
              }}
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: '#F5F0F7',
                fontFamily: 'Poppins, sans-serif', padding: '4px 8px',
                borderRadius: 4,
              }}
              title="Cliquer pour modifier"
            >
              {deck?.title || 'Sans titre'}
            </button>
          )}

          {saving && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              <Save size={11} style={{ display: 'inline', marginRight: 4 }} />
              Sauvegarde...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Slide counter */}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {activeIdx + 1} / {slides.length}
          </span>

          <button
            onClick={() => navigate(`/decks/${id}/present`)}
            style={topbarBtnStyle(false)}
          >
            <Eye size={13} />
            Aperçu
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing}
            style={topbarBtnStyle(true)}
          >
            <Globe size={13} />
            {publishing ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </div>

      {/* ── Slides panel ────────────────────────────────────────────────────── */}
      <div className="deck-slides">
        <AnimatePresence>
          {slides.map((slide, i) => (
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <SlideThumbnail
                slide={slide}
                theme={theme}
                index={i}
                active={i === activeIdx}
                onClick={() => setActiveIdx(i)}
                onMoveUp={() => moveSlide(i, 'up')}
                onMoveDown={() => moveSlide(i, 'down')}
                onDelete={() => deleteSlide(i)}
                isFirst={i === 0}
                isLast={i === slides.length - 1}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={addSlide}
          style={{
            width: '100%', padding: '8px', borderRadius: 6,
            border: '1px dashed rgba(255,255,255,0.12)',
            background: 'none', color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            fontSize: 12, fontFamily: 'Poppins, sans-serif', marginTop: 4,
          }}
        >
          <Plus size={13} />
          Ajouter
        </button>
      </div>

      {/* ── Canvas zone ─────────────────────────────────────────────────────── */}
      <div className="deck-canvas-zone">
        {activeSlide ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', height: '100%' }}>
            <div className="deck-slide-canvas">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <SlideRenderer slide={activeSlide} theme={theme} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                disabled={activeIdx === 0}
                style={{ ...navBtnStyle, opacity: activeIdx === 0 ? 0.3 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 60, textAlign: 'center' }}>
                {activeIdx + 1} / {slides.length}
              </span>
              <button
                onClick={() => setActiveIdx(i => Math.min(slides.length - 1, i + 1))}
                disabled={activeIdx === slides.length - 1}
                style={{ ...navBtnStyle, opacity: activeIdx === slides.length - 1 ? 0.3 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => navigate(`/decks/${id}/present`)}
                style={{ ...navBtnStyle, marginLeft: 8 }}
                title="Plein écran"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
            <p>Aucune slide sélectionnée</p>
          </div>
        )}
      </div>

      {/* ── Props panel ─────────────────────────────────────────────────────── */}
      <div className="deck-props" style={{ padding: 0 }}>
        {activeSlide ? (
          <PropsPanel
            slide={activeSlide}
            deckTitle={deck?.title || ''}
            onUpdate={updateSlideContent}
            onRegenerate={() => { /* trigger refresh */ }}
          />
        ) : (
          <div style={{ padding: 16, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
            Sélectionnez une slide pour éditer ses propriétés.
          </div>
        )}
      </div>
    </div>
  )
}

const topbarBtnStyle = (accent: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', borderRadius: 7, border: 'none',
  background: accent ? 'linear-gradient(135deg, #E11F7B, #c41a6a)' : 'rgba(255,255,255,0.06)',
  color: accent ? '#fff' : 'rgba(255,255,255,0.5)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Poppins, sans-serif',
  boxShadow: accent ? '0 2px 12px rgba(225,31,123,0.3)' : 'none',
  transition: 'opacity 0.15s',
})

const navBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
}

export default DeckEditorPage
