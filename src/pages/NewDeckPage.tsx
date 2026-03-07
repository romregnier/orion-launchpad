/**
 * NewDeckPage.tsx — Formulaire création multi-step
 * TK-0031
 *
 * Formulaire 3 steps:
 * 1. Brief (titre, description, audience, tonalité)
 * 2. Style (thème, nb slides, langue)
 * 3. Confirmation + génération IA
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react'
import { generateDeck, type GenerationProgress } from '../lib/deckGenerator'
import type { DeckBrief, DeckAudience, DeckTonality, DeckTheme, DeckLang } from '../types/deck'

// ── Theme Card ────────────────────────────────────────────────────────────────

const THEMES: { id: DeckTheme; label: string; preview: string; desc: string }[] = [
  {
    id: 'dark_premium',
    label: 'Dark Premium',
    preview: 'linear-gradient(135deg, #0B090D 0%, #2C272F 100%)',
    desc: 'Élégant, mystérieux, haut de gamme',
  },
  {
    id: 'light_clean',
    label: 'Light Clean',
    preview: 'linear-gradient(135deg, #F7F5F9 0%, #EDEBEF 100%)',
    desc: 'Propre, minimaliste, professionnel',
  },
  {
    id: 'gradient_bold',
    label: 'Gradient Bold',
    preview: 'linear-gradient(135deg, #1A0A2E 0%, #3D1568 50%, #0D1A3A 100%)',
    desc: 'Audacieux, dynamique, créatif',
  },
  {
    id: 'corporate',
    label: 'Corporate',
    preview: 'linear-gradient(135deg, #F0F2F5 0%, #E4E7EC 100%)',
    desc: 'Classique, sobre, institutionnel',
  },
]

const AUDIENCES: DeckAudience[] = ['Investisseur', 'Partenaire', 'Équipe', 'Client', 'Public']
const TONALITIES: DeckTonality[] = ['Formel', 'Neutre', 'Dynamique', 'Inspirant']
const LANGS: DeckLang[] = ['Français', 'English']

// ── Input styles ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#F5F0F7',
  fontSize: 14,
  fontFamily: 'Poppins, sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 8,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}

// ── Step 1: Brief ─────────────────────────────────────────────────────────────

function StepBrief({
  data,
  onChange,
}: {
  data: Partial<DeckBrief>
  onChange: (partial: Partial<DeckBrief>) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <label style={labelStyle}>Titre *</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Ex: Pitch Investisseur — Série A"
          style={inputStyle}
          minLength={3}
          maxLength={80}
        />
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
          {(data.title || '').length}/80 caractères (min. 3)
        </div>
      </div>

      <div>
        <label style={labelStyle}>Description / Sujet *</label>
        <textarea
          value={data.description || ''}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Décrivez le contenu de votre présentation en détail. Plus c'est précis, meilleur sera le résultat généré par l'IA..."
          style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
          minLength={50}
          maxLength={500}
        />
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
          {(data.description || '').length}/500 caractères (min. 50)
        </div>
      </div>

      <div>
        <label style={labelStyle}>Audience cible</label>
        <select
          value={data.audience || ''}
          onChange={e => onChange({ audience: e.target.value as DeckAudience })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="" disabled>Sélectionner...</option>
          {AUDIENCES.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Tonalité</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {TONALITIES.map(t => {
            const active = data.tonality === t
            return (
              <button
                key={t}
                onClick={() => onChange({ tonality: t })}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${active ? '#E11F7B' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#E11F7B' : 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Style ─────────────────────────────────────────────────────────────

function StepStyle({
  data,
  onChange,
}: {
  data: Partial<DeckBrief>
  onChange: (partial: Partial<DeckBrief>) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <label style={labelStyle}>Thème visuel</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {THEMES.map(theme => {
            const active = data.theme === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => onChange({ theme: theme.id })}
                style={{
                  padding: 0,
                  borderRadius: 12,
                  border: `2px solid ${active ? '#E11F7B' : 'rgba(255,255,255,0.08)'}`,
                  background: 'transparent',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                  textAlign: 'left',
                }}
              >
                {/* Preview */}
                <div style={{
                  height: 80,
                  background: theme.preview,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {active && <Check size={24} color="#E11F7B" />}
                </div>
                {/* Info */}
                <div style={{
                  padding: '10px 12px',
                  background: '#2C272F',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#E11F7B' : '#F5F0F7', marginBottom: 2 }}>
                    {theme.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {theme.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Nombre de slides — {data.slideCount || 8}</label>
        <input
          type="range"
          min={5}
          max={15}
          value={data.slideCount || 8}
          onChange={e => onChange({ slideCount: parseInt(e.target.value) })}
          style={{ width: '100%', accentColor: '#E11F7B', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
          <span>5</span>
          <span>15</span>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Langue</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {LANGS.map(lang => {
            const active = data.lang === lang
            return (
              <button
                key={lang}
                onClick={() => onChange({ lang })}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${active ? '#E11F7B' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? 'rgba(225,31,123,0.15)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#E11F7B' : 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {lang}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Confirmation ──────────────────────────────────────────────────────

function StepConfirm({
  data,
  isGenerating,
  progress,
  onGenerate,
}: {
  data: DeckBrief
  isGenerating: boolean
  progress: GenerationProgress | null
  onGenerate: () => void
}) {
  const theme = THEMES.find(t => t.id === data.theme)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 20,
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Résumé du brief
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Titre', value: data.title },
            { label: 'Description', value: data.description },
            { label: 'Audience', value: data.audience },
            { label: 'Tonalité', value: data.tonality },
            { label: 'Thème', value: theme?.label || data.theme },
            { label: 'Slides', value: `${data.slideCount} slides` },
            { label: 'Langue', value: data.lang },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', width: 80, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 12, color: '#F5F0F7', flex: 1, wordBreak: 'break-word' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Generation button + progress */}
      {!isGenerating ? (
        <button
          onClick={onGenerate}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '16px 24px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #E11F7B, #c41a6a)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: '0 4px 24px rgba(225,31,123,0.4)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          <Sparkles size={18} />
          Générer le deck avec l&apos;IA
        </button>
      ) : (
        <div style={{
          background: 'rgba(225,31,123,0.05)',
          border: '1px solid rgba(225,31,123,0.2)',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            >
              <Sparkles size={18} color="#E11F7B" />
            </motion.div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#E11F7B' }}>
              {progress?.message || 'Génération en cours...'}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${progress?.pct || 10}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #E11F7B, #7C3AED)',
                borderRadius: 999,
              }}
            />
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
            {progress?.pct || 0}% — Cela prend généralement 15-30 secondes
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Brief', 'Style', 'Génération']

export function NewDeckPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)

  const [brief, setBrief] = useState<Partial<DeckBrief>>({
    theme: 'dark_premium',
    slideCount: 8,
    lang: 'Français',
    audience: 'Investisseur',
    tonality: 'Dynamique',
  })

  function updateBrief(partial: Partial<DeckBrief>) {
    setBrief(prev => ({ ...prev, ...partial }))
  }

  function canProceed() {
    if (step === 0) {
      return (
        (brief.title?.length ?? 0) >= 3 &&
        (brief.description?.length ?? 0) >= 50 &&
        brief.audience &&
        brief.tonality
      )
    }
    if (step === 1) {
      return brief.theme && brief.slideCount && brief.lang
    }
    return true
  }

  async function handleGenerate() {
    if (isGenerating) return
    setError(null)
    setIsGenerating(true)

    try {
      const deckId = await generateDeck(brief as DeckBrief, (p) => {
        setProgress(p)
      })
      navigate(`/decks/${deckId}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsGenerating(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B090D',
      color: '#F5F0F7',
      fontFamily: 'Poppins, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(225,31,123,0.1) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 540 }}>

        {/* Back button */}
        <button
          onClick={() => step > 0 && !isGenerating ? setStep(s => s - 1) : navigate('/decks')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 32,
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          <ChevronLeft size={16} />
          {step > 0 ? 'Étape précédente' : 'Retour aux decks'}
        </button>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(225,31,123,0.1)',
            border: '1px solid rgba(225,31,123,0.2)',
            color: '#E11F7B', fontSize: 12, fontWeight: 700,
            marginBottom: 16,
          }}>
            <Sparkles size={12} />
            Nouveau deck IA
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
            Créer une présentation
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
            {step === 0 && 'Décrivez votre sujet et votre audience'}
            {step === 1 && 'Choisissez le style visuel de votre deck'}
            {step === 2 && "Vérifiez et lancez la génération par l'IA"}
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
          {STEP_LABELS.map((label, i) => {
            const done = i < step
            const active = i === step
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: done ? '#E11F7B' : active ? 'rgba(225,31,123,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${done || active ? '#E11F7B' : 'rgba(255,255,255,0.1)'}`,
                    color: done ? '#fff' : active ? '#E11F7B' : 'rgba(255,255,255,0.3)',
                  }}>
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#F5F0F7' : 'rgba(255,255,255,0.3)' }}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div style={{
                    width: 32, height: 1,
                    background: done ? '#E11F7B' : 'rgba(255,255,255,0.08)',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Form card */}
        <div style={{
          background: '#2C272F',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: 28,
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && <StepBrief data={brief} onChange={updateBrief} />}
              {step === 1 && <StepStyle data={brief} onChange={updateBrief} />}
              {step === 2 && (
                <StepConfirm
                  data={brief as DeckBrief}
                  isGenerating={isGenerating}
                  progress={progress}
                  onGenerate={handleGenerate}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 16, padding: 12, borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#FCA5A5', fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Navigation buttons (steps 0 & 1) */}
          {step < 2 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 22px', borderRadius: 10, border: 'none',
                  background: canProceed()
                    ? 'linear-gradient(135deg, #E11F7B, #c41a6a)'
                    : 'rgba(255,255,255,0.06)',
                  color: canProceed() ? '#fff' : 'rgba(255,255,255,0.2)',
                  fontSize: 14, fontWeight: 600, cursor: canProceed() ? 'pointer' : 'not-allowed',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.15s',
                  boxShadow: canProceed() ? '0 4px 16px rgba(225,31,123,0.3)' : 'none',
                }}
              >
                Continuer
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Hint text */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
          Propulsé par Gemini AI · Génère du vrai contenu professionnel
        </p>
      </div>
    </div>
  )
}

export default NewDeckPage
