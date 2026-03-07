/**
 * DeckPresentPage.tsx — Mode présentation plein écran
 * Affiche les slides en plein écran avec navigation clavier
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SlideRenderer } from '../components/deck/SlideRenderer'
import type { SlideJSON, DeckTheme } from '../types/deck'

interface DeckData {
  id: string
  title: string
  theme_json: string | null
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

export function DeckPresentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<DeckData | null>(null)
  const [slides, setSlides] = useState<SlideData[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)

  const theme = getTheme(deck)

  useEffect(() => {
    if (id) fetchDeck(id)
  }, [id])

  async function fetchDeck(deckId: string) {
    setLoading(true)
    const { data: deckData } = await supabase
      .from('presentations')
      .select('id,title,theme_json')
      .eq('id', deckId)
      .single()

    if (deckData) setDeck(deckData as DeckData)

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

  const prev = useCallback(() => setCurrentIdx(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setCurrentIdx(i => Math.min(slides.length - 1, i + 1)), [slides.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') navigate(`/decks/${id}/edit`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, navigate, next, prev])

  // Auto-hide controls
  useEffect(() => {
    setShowControls(true)
    const t = setTimeout(() => setShowControls(false), 3000)
    return () => clearTimeout(t)
  }, [currentIdx])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B090D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 40 }}>✨</div>
      </div>
    )
  }

  const currentSlide = slides[currentIdx]
  const progress = ((currentIdx + 1) / slides.length) * 100

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden', cursor: 'none' }}
      onMouseMove={() => setShowControls(true)}
      onClick={next}
    >
      {/* Slide */}
      <AnimatePresence mode="wait">
        {currentSlide && (
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', height: '100%' }}
          >
            <SlideRenderer slide={currentSlide} theme={theme} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              cursor: 'default',
            }}
          >
            {/* Close */}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/decks/${id}/edit`) }}
              style={{
                position: 'absolute', top: 20, right: 20,
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'all',
              }}
            >
              <X size={16} />
            </button>

            {/* Prev / Next */}
            <button
              onClick={e => { e.stopPropagation(); prev() }}
              disabled={currentIdx === 0}
              style={{
                position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: currentIdx === 0 ? 0.3 : 1,
                pointerEvents: 'all',
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={e => { e.stopPropagation(); next() }}
              disabled={currentIdx === slides.length - 1}
              style={{
                position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: currentIdx === slides.length - 1 ? 0.3 : 1,
                pointerEvents: 'all',
              }}
            >
              <ChevronRight size={20} />
            </button>

            {/* Slide counter */}
            <div style={{
              position: 'absolute', bottom: 20, right: 20,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Poppins, sans-serif',
            }}>
              {currentIdx + 1} / {slides.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: 'rgba(255,255,255,0.08)',
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #E11F7B, #7C3AED)',
          }}
        />
      </div>
    </div>
  )
}

export default DeckPresentPage
