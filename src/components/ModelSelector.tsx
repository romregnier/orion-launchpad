import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────
type Tier = 'fast' | 'smart' | 'flagship'

interface ModelOption {
  id: string
  name: string
  tier: Tier
}

interface Provider {
  key: string
  label: string
  emoji: string
  models: ModelOption[]
}

// ── Data (TK-0211 spec) ───────────────────────────────────────────────────────
const PROVIDERS: Provider[] = [
  {
    key: 'anthropic',
    label: 'Anthropic',
    emoji: '🧠',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', tier: 'smart' },
      { id: 'claude-opus-4',     name: 'Claude Opus 4',     tier: 'flagship' },
      { id: 'claude-haiku-3-5',  name: 'Claude Haiku 3.5',  tier: 'fast' },
    ],
  },
  {
    key: 'openai',
    label: 'OpenAI',
    emoji: '✦',
    models: [
      { id: 'gpt-4o',      name: 'GPT-4o',      tier: 'flagship' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', tier: 'fast' },
      { id: 'o3',          name: 'o3',           tier: 'flagship' },
    ],
  },
  {
    key: 'google',
    label: 'Google',
    emoji: '🔮',
    models: [
      { id: 'gemini-2-5-pro',   name: 'Gemini 2.5 Pro',   tier: 'flagship' },
      { id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', tier: 'fast' },
    ],
  },
  {
    key: 'mistral',
    label: 'Mistral',
    emoji: '🌊',
    models: [
      { id: 'mistral-large', name: 'Mistral Large', tier: 'smart' },
      { id: 'mistral-small', name: 'Mistral Small', tier: 'fast' },
    ],
  },
  {
    key: 'meta',
    label: 'Meta',
    emoji: '🦙',
    models: [
      { id: 'llama-3-3-70b', name: 'Llama 3.3 70B', tier: 'smart' },
      { id: 'llama-3-1-8b',  name: 'Llama 3.1 8B',  tier: 'fast' },
    ],
  },
]

// ── Tier badge colors ─────────────────────────────────────────────────────────
const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string; label: string }> = {
  flagship: { bg: 'rgba(225,31,123,0.15)',  text: '#E11F7B',  border: 'rgba(225,31,123,0.35)', label: 'flagship' },
  smart:    { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6',  border: 'rgba(139,92,246,0.35)', label: 'smart' },
  fast:     { bg: 'rgba(16,185,129,0.15)', text: '#10B981',  border: 'rgba(16,185,129,0.35)', label: 'fast' },
}

// ── ModelSelector ─────────────────────────────────────────────────────────────
interface ModelSelectorProps {
  value: string
  onChange: (model: string) => void
  className?: string
}

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const [activeProvider, setActiveProvider] = useState(() => {
    // Detect which provider owns the current value
    for (const p of PROVIDERS) {
      if (p.models.some(m => m.id === value)) return p.key
    }
    return PROVIDERS[0].key
  })

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)

  const currentProvider = PROVIDERS.find(p => p.key === activeProvider) ?? PROVIDERS[0]

  const handleTabClick = (providerKey: string) => {
    setActiveProvider(providerKey)
    const el = tabRefs.current[providerKey]
    if (el) {
      const parent = el.parentElement
      if (parent) {
        const parentRect = parent.getBoundingClientRect()
        const rect = el.getBoundingClientRect()
        setIndicatorStyle({
          left: rect.left - parentRect.left,
          width: rect.width,
        })
      }
    }
  }

  // Init indicator on mount
  const initTabRef = (key: string, el: HTMLButtonElement | null) => {
    tabRefs.current[key] = el
    if (key === activeProvider && el && indicatorStyle === null) {
      const parent = el.parentElement
      if (parent) {
        const parentRect = parent.getBoundingClientRect()
        const rect = el.getBoundingClientRect()
        setIndicatorStyle({ left: rect.left - parentRect.left, width: rect.width })
      }
    }
  }

  return (
    <div
      className={className}
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: '#2C272F',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Provider tabs */}
      <div style={{
        position: 'relative',
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 8px',
        gap: 0,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {/* Animated underline indicator */}
        {indicatorStyle && (
          <motion.div
            layout
            animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'absolute',
              bottom: 0,
              height: 2,
              background: '#E11F7B',
              borderRadius: 999,
            }}
          />
        )}

        {PROVIDERS.map(provider => {
          const isActive = provider.key === activeProvider
          return (
            <button
              key={provider.key}
              ref={el => initTabRef(provider.key, el)}
              onClick={() => handleTabClick(provider.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#F0EDF5' : 'rgba(240,237,245,0.45)',
                fontFamily: "'Poppins', sans-serif",
                whiteSpace: 'nowrap',
                transition: 'color 0.15s ease',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 15 }}>{provider.emoji}</span>
              {provider.label}
            </button>
          )
        })}
      </div>

      {/* Model list */}
      <div style={{ padding: '10px 10px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProvider}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28, duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {currentProvider.models.map(model => {
              const isSelected = model.id === value
              const tierColor = TIER_COLORS[model.tier]
              return (
                <motion.button
                  key={model.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onChange(model.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(225,31,123,0.12)' : 'rgba(255,255,255,0.04)',
                    border: isSelected
                      ? '1.5px solid rgba(225,31,123,0.5)'
                      : '1px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    fontFamily: "'Poppins', sans-serif",
                    outline: isSelected ? '2px solid rgba(225,31,123,0.2)' : 'none',
                    outlineOffset: 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Selection indicator (checkmark) */}
                    <div style={{
                      width: 18, height: 18,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? '#E11F7B' : 'rgba(255,255,255,0.2)'}`,
                      background: isSelected ? '#E11F7B' : 'transparent',
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      fontSize: 10,
                    }}>
                      {isSelected && (
                        <span style={{ color: '#fff', fontWeight: 900, lineHeight: 1 }}>✓</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 14,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? '#F0EDF5' : 'rgba(240,237,245,0.75)',
                    }}>
                      {model.name}
                    </span>
                  </div>

                  {/* Tier badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: tierColor.text,
                    background: tierColor.bg,
                    border: `1px solid ${tierColor.border}`,
                    padding: '2px 8px',
                    borderRadius: 999,
                    flexShrink: 0,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {tierColor.label}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
