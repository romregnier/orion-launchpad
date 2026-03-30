import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const KNOWN_SKILLS = [
  'code', 'build', 'deploy', 'git', 'review',
  'ui', 'ux', 'design-tokens', 'figma-reader', 'accessibility',
  'testing', 'audit', 'regression', 'deploy-check', 'bug-report',
  'spec', 'prioritization', 'roadmap', 'user-stories', 'acceptance-criteria',
  'copy', 'seo', 'social', 'analytics', 'campaign',
  'respond', 'escalate', 'faq', 'sentiment', 'ticket-triage',
  'web-search', 'summarize', 'competitive-intel', 'fact-check', 'report',
  'api', 'database', 'devops', 'security', 'performance',
  'documentation', 'architecture', 'refactoring', 'debugging',
]

interface SkillsTagInputProps {
  value: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
}

export function SkillsTagInput({ value, onChange, placeholder = 'Ajouter un skill...' }: SkillsTagInputProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (input.trim().length > 0) {
      const filtered = KNOWN_SKILLS.filter(s =>
        s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
      ).slice(0, 5)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }, [input, value])

  const addSkill = (skill: string) => {
    const trimmed = skill.trim().toLowerCase()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const removeSkill = (skill: string) => {
    onChange(value.filter(s => s !== skill))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) addSkill(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeSkill(value[value.length - 1])
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px',
          minHeight: 44,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${focused ? 'rgba(225,31,123,0.50)' : 'rgba(255,255,255,0.10)'}`,
          borderRadius: 8,
          cursor: 'text',
          transition: 'border-color 0.15s ease',
        }}
      >
        <AnimatePresence>
          {value.map(skill => (
            <motion.div
              key={skill}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(225,31,123,0.15)',
                border: '1px solid rgba(225,31,123,0.30)',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 12,
                color: 'var(--accent)',
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {skill}
              <button
                onClick={(e) => { e.stopPropagation(); removeSkill(skill) }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(225,31,123,0.7)',
                  padding: 0,
                  fontSize: 11,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(225,31,123,0.7)')}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTimeout(() => setSuggestions([]), 150) }}
          placeholder={value.length === 0 ? placeholder : ''}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 12,
            color: '#fff',
            minWidth: 80,
            flex: 1,
            fontFamily: "'Poppins', sans-serif",
          }}
        />
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: '#1E1B22',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 10,
              padding: 6,
              zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {suggestions.map(s => (
              <button
                key={s}
                onMouseDown={e => { e.preventDefault(); addSkill(s) }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.8)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: "'Poppins', sans-serif",
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-default)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
