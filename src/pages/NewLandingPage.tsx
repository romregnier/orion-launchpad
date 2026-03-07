/**
 * NewLandingPage — Formulaire multi-step création landing
 * TK-0059
 *
 * Step 1 — Brief (titre, description, audience, tonalité, langue)
 * Step 2 — Sections (toggles, hero/cta/footer non désactivables)
 * Step 3 — Style (thème, couleur accent, font)
 * Step 4 — Génération (résumé + progress animé)
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Check, Monitor, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tone = 'startup' | 'b2b_pro' | 'ecommerce' | 'portfolio' | 'event'
type Lang = 'fr' | 'en'
type SectionType = 'navbar' | 'hero' | 'features' | 'stats' | 'testimonials' | 'pricing' | 'faq' | 'cta' | 'footer'
type ThemePreset = 'dark_premium' | 'light_clean' | 'gradient_bold' | 'corporate'
type FontChoice = 'Poppins' | 'Inter' | 'Playfair Display' | 'Space Grotesk'

interface BriefData {
  title: string
  description: string
  audience: string
  tone: Tone
  lang: Lang
}

interface StyleData {
  theme: ThemePreset
  accentColor: string
  font: FontChoice
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TONE_LABELS: Record<Tone, string> = {
  startup: '🚀 Startup',
  b2b_pro: '💼 B2B Pro',
  ecommerce: '🛍️ E-commerce',
  portfolio: '🎨 Portfolio',
  event: '🎉 Événement',
}

const SECTION_LIST: { key: SectionType; label: string; emoji: string; mandatory?: boolean }[] = [
  { key: 'navbar',       label: 'Navigation',     emoji: '🧭' },
  { key: 'hero',         label: 'Hero',            emoji: '⭐', mandatory: true },
  { key: 'features',     label: 'Fonctionnalités', emoji: '✅' },
  { key: 'stats',        label: 'Statistiques',    emoji: '📊' },
  { key: 'testimonials', label: 'Témoignages',     emoji: '💬' },
  { key: 'pricing',      label: 'Tarifs',          emoji: '💰' },
  { key: 'faq',          label: 'FAQ',             emoji: '❓' },
  { key: 'cta',          label: 'Call to Action',  emoji: '🎯', mandatory: true },
  { key: 'footer',       label: 'Footer',          emoji: '📋', mandatory: true },
]

const THEMES: { key: ThemePreset; label: string; preview: string; desc: string }[] = [
  { key: 'dark_premium', label: 'Dark Premium', preview: 'linear-gradient(135deg, #0B090D 60%, #2C272F)', desc: 'Sombre & élégant' },
  { key: 'light_clean',  label: 'Light Clean',  preview: 'linear-gradient(135deg, #FAFAFA 60%, #F0F0F5)', desc: 'Clair & épuré' },
  { key: 'gradient_bold',label: 'Gradient Bold',preview: 'linear-gradient(135deg, #1a0533 0%, #E11F7B 100%)', desc: 'Audacieux & coloré' },
  { key: 'corporate',    label: 'Corporate',    preview: 'linear-gradient(135deg, #0F172A 60%, #1E3A5F)', desc: 'Pro & sérieux' },
]

const FONTS: FontChoice[] = ['Poppins', 'Inter', 'Playfair Display', 'Space Grotesk']

const GENERATION_STEPS = [
  'Création du contenu…',
  'Génération des sections…',
  'Finalisation…',
]

// ── Step indicators ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ['Brief', 'Sections', 'Style', 'Génération']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {labels.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < total - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
                background: done ? '#10B981' : active ? '#E11F7B' : 'rgba(255,255,255,0.08)',
                color: done || active ? '#fff' : 'rgba(255,255,255,0.3)',
                border: active ? '2px solid #E11F7B' : 'none',
                transition: 'all 0.3s',
              }}>
                {done ? <Check size={15} /> : step}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#E11F7B' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#10B981' : 'rgba(255,255,255,0.08)', margin: '0 8px', marginBottom: 20, transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1 — Brief ────────────────────────────────────────────────────────────

function StepBrief({ data, onChange }: { data: BriefData; onChange: (d: BriefData) => void }) {
  const tones: Tone[] = ['startup', 'b2b_pro', 'ecommerce', 'portfolio', 'event']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={labelStyle}>Titre du produit / service *</label>
        <input
          value={data.title}
          onChange={e => onChange({ ...data, title: e.target.value })}
          placeholder="ex: Mangas.io — La plateforme manga #1"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>
          Description courte *
          <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>
            {data.description.length}/600 (min 50)
          </span>
        </label>
        <textarea
          value={data.description}
          onChange={e => onChange({ ...data, description: e.target.value.slice(0, 600) })}
          placeholder="Décrivez votre produit en quelques phrases…"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
        {data.description.length > 0 && data.description.length < 50 && (
          <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Minimum 50 caractères ({50 - data.description.length} manquants)</p>
        )}
      </div>

      <div>
        <label style={labelStyle}>Audience cible *</label>
        <input
          value={data.audience}
          onChange={e => onChange({ ...data, audience: e.target.value })}
          placeholder="ex: Développeurs React, 25-40 ans, cherchent à gagner du temps"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Tonalité</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tones.map(tone => (
            <button
              key={tone}
              type="button"
              onClick={() => onChange({ ...data, tone })}
              style={{
                ...chipStyle,
                background: data.tone === tone ? 'rgba(225,31,123,0.2)' : 'rgba(255,255,255,0.05)',
                color: data.tone === tone ? '#E11F7B' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${data.tone === tone ? 'rgba(225,31,123,0.5)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {TONE_LABELS[tone]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Langue</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {([['fr', '🇫🇷 Français'], ['en', '🇬🇧 English']] as [Lang, string][]).map(([l, label]) => (
            <button
              key={l}
              type="button"
              onClick={() => onChange({ ...data, lang: l })}
              style={{
                ...chipStyle,
                background: data.lang === l ? 'rgba(225,31,123,0.2)' : 'rgba(255,255,255,0.05)',
                color: data.lang === l ? '#E11F7B' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${data.lang === l ? 'rgba(225,31,123,0.5)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 2 — Sections ─────────────────────────────────────────────────────────

function StepSections({
  enabled,
  onChange,
}: {
  enabled: Set<SectionType>
  onChange: (s: Set<SectionType>) => void
}) {
  function toggle(key: SectionType, mandatory: boolean | undefined) {
    if (mandatory) return
    const next = new Set(enabled)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
        Activez les sections à inclure dans votre landing. Les sections marquées 🔒 sont obligatoires.
      </p>
      {SECTION_LIST.map(({ key, label, emoji, mandatory }) => {
        const active = enabled.has(key)
        return (
          <div
            key={key}
            onClick={() => toggle(key, mandatory)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: 12,
              background: active ? 'rgba(225,31,123,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'rgba(225,31,123,0.25)' : 'rgba(255,255,255,0.07)'}`,
              cursor: mandatory ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {label}
              </span>
              {mandatory && (
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                  🔒 Obligatoire
                </span>
              )}
            </div>
            <div style={{
              width: 44, height: 24, borderRadius: 12,
              background: active ? '#E11F7B' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.2s',
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 3, left: active ? 22 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Step 3 — Style ────────────────────────────────────────────────────────────

function StepStyle({ style, onChange }: { style: StyleData; onChange: (s: StyleData) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Themes */}
      <div>
        <label style={labelStyle}>Thème</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {THEMES.map(theme => (
            <div
              key={theme.key}
              onClick={() => onChange({ ...style, theme: theme.key })}
              style={{
                borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                border: `2px solid ${style.theme === theme.key ? '#E11F7B' : 'rgba(255,255,255,0.08)'}`,
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ height: 60, background: theme.preview }} />
              <div style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: style.theme === theme.key ? '#E11F7B' : '#fff' }}>
                    {theme.label}
                  </span>
                  {style.theme === theme.key && <Check size={14} color="#E11F7B" />}
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{theme.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <label style={labelStyle}>Couleur accent</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="color"
            value={style.accentColor}
            onChange={e => onChange({ ...style, accentColor: e.target.value })}
            style={{
              width: 48, height: 48, borderRadius: 10, border: '2px solid rgba(255,255,255,0.15)',
              cursor: 'pointer', background: 'none', padding: 2,
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['#E11F7B', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'].map(color => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ ...style, accentColor: color })}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: color,
                  border: style.accentColor === color ? '3px solid white' : '3px solid transparent',
                  cursor: 'pointer', padding: 0, transition: 'border 0.15s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
            {style.accentColor}
          </span>
        </div>
      </div>

      {/* Font */}
      <div>
        <label style={labelStyle}>Typographie</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FONTS.map(font => (
            <div
              key={font}
              onClick={() => onChange({ ...style, font })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                background: style.font === font ? 'rgba(225,31,123,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${style.font === font ? 'rgba(225,31,123,0.3)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontFamily: font, fontSize: 16, color: style.font === font ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                {font}
              </span>
              {style.font === font && <Check size={15} color="#E11F7B" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 4 — Génération ───────────────────────────────────────────────────────

function StepGenerate({
  brief,
  sections,
  style,
  onGenerate,
  generating,
  genStep,
}: {
  brief: BriefData
  sections: Set<SectionType>
  style: StyleData
  onGenerate: () => void
  generating: boolean
  genStep: number
}) {
  const toneLabel = TONE_LABELS[brief.tone]
  const langLabel = brief.lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'
  const enabledSections = SECTION_LIST.filter(s => sections.has(s.key))
  const themeLabel = THEMES.find(t => t.key === style.theme)?.label ?? style.theme
  const progressPct = generating ? Math.min(95, ((genStep + 1) / GENERATION_STEPS.length) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)', padding: 20,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📋 Récapitulatif</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SummaryRow label="Titre" value={brief.title || '—'} />
          <SummaryRow label="Langue" value={langLabel} />
          <SummaryRow label="Tonalité" value={toneLabel} />
          <SummaryRow label="Audience" value={brief.audience || '—'} />
          <SummaryRow label="Thème" value={themeLabel} />
          <SummaryRow label="Font" value={style.font} />
        </div>

        {brief.description && (
          <div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 1.6 }}>{brief.description}</p>
          </div>
        )}

        <div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sections ({enabledSections.length})
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {enabledSections.map(s => (
              <span key={s.key} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 999,
                background: 'rgba(225,31,123,0.12)', color: '#E11F7B',
                border: '1px solid rgba(225,31,123,0.2)',
              }}>
                {s.emoji} {s.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: style.accentColor }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{style.accentColor}</span>
        </div>
      </div>

      {/* Generate button */}
      {!generating && (
        <button
          onClick={onGenerate}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 24px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #E11F7B, #c41a6a)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(225,31,123,0.4)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          ✨ Générer la landing
        </button>
      )}

      {/* Progress */}
      {generating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(225,31,123,0.06)', borderRadius: 14,
            border: '1px solid rgba(225,31,123,0.2)', padding: 24,
            textAlign: 'center',
          }}
        >
          <Loader2 size={32} color="#E11F7B" style={{ marginBottom: 12, animation: 'spin 1s linear infinite' }} />
          <AnimatePresence mode="wait">
            <motion.p
              key={genStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}
            >
              {GENERATION_STEPS[genStep] ?? '✅ Presque terminé…'}
            </motion.p>
          </AnimatePresence>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #E11F7B, #7C3AED)', borderRadius: 999 }}
            />
          </div>
        </motion.div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{value}</span>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'rgba(255,255,255,0.7)', marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 14,
  fontFamily: 'Poppins, sans-serif',
  outline: 'none',
}

const chipStyle: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.15s',
}

// ── Main Component ────────────────────────────────────────────────────────────

const MANDATORY_SECTIONS: SectionType[] = ['hero', 'cta', 'footer']
const DEFAULT_ENABLED: Set<SectionType> = new Set(['navbar', 'hero', 'features', 'cta', 'footer'])

export function NewLandingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 4

  const [brief, setBrief] = useState<BriefData>({
    title: '',
    description: '',
    audience: '',
    tone: 'startup',
    lang: 'fr',
  })

  const [sections, setSections] = useState<Set<SectionType>>(DEFAULT_ENABLED)

  const [style, setStyle] = useState<StyleData>({
    theme: 'dark_premium',
    accentColor: '#E11F7B',
    font: 'Poppins',
  })

  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)

  // Ensure mandatory sections always enabled
  function handleSections(next: Set<SectionType>) {
    for (const m of MANDATORY_SECTIONS) next.add(m)
    setSections(next)
  }

  // Validate current step
  function canNext(): boolean {
    if (step === 1) {
      return brief.title.trim().length > 0 &&
        brief.description.trim().length >= 50 &&
        brief.audience.trim().length > 0
    }
    return true
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenStep(0)

    // Simulate generation steps
    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      setGenStep(i)
      await new Promise(r => setTimeout(r, 1200))
    }

    // Insert landing into Supabase
    const themeJson = {
      preset: style.theme,
      colors: { primary: style.accentColor, bg: '#0B090D', text: '#F5F0F8' },
      font: style.font,
    }

    const { data, error } = await supabase
      .from('landings')
      .insert({
        title: brief.title,
        description: brief.description,
        status: 'draft',
        theme_json: themeJson,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[NewLandingPage] insert error:', error?.message)
      setGenerating(false)
      return
    }

    // Insert sections
    const sectionInserts = Array.from(sections).map((type, idx) => ({
      landing_id: data.id,
      type,
      position: idx,
      content_json: {
        tone: brief.tone,
        lang: brief.lang,
        audience: brief.audience,
      },
    }))

    await supabase.from('sections').insert(sectionInserts)

    // Redirect
    navigate(`/landings/${data.id}/edit`)
  }

  const stepTitles = ['Brief', 'Sections', 'Style', 'Génération']

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B090D',
      color: '#FFFFFF',
      fontFamily: 'Poppins, sans-serif',
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(225,31,123,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', padding: '0 24px 60px' }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '28px 0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 36,
        }}>
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/landings')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Monitor size={20} color="#E11F7B" />
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
                Nouvelle landing
              </h1>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
              Étape {step} sur {TOTAL_STEPS} — {stepTitles[step - 1]}
            </p>
          </div>
        </div>

        {/* ── Step indicators ───────────────────────────────────────────── */}
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* ── Step content ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && <StepBrief data={brief} onChange={setBrief} />}
            {step === 2 && <StepSections enabled={sections} onChange={handleSections} />}
            {step === 3 && <StepStyle style={style} onChange={setStyle} />}
            {step === 4 && (
              <StepGenerate
                brief={brief}
                sections={sections}
                style={style}
                onGenerate={handleGenerate}
                generating={generating}
                genStep={genStep}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation buttons ────────────────────────────────────────── */}
        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '11px 22px', borderRadius: 10, border: 'none',
                background: canNext() ? 'linear-gradient(135deg, #E11F7B, #c41a6a)' : 'rgba(255,255,255,0.08)',
                color: canNext() ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: 14, fontWeight: 600,
                cursor: canNext() ? 'pointer' : 'not-allowed',
                boxShadow: canNext() ? '0 4px 16px rgba(225,31,123,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              Continuer
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewLandingPage
