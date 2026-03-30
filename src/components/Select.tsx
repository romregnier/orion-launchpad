/**
 * Select (composant custom)
 *
 * Rôle : Dropdown sélecteur fiable sur fond sombre — remplace les <select> natifs
 *        qui ont des problèmes d'affichage avec backdrop-filter/dark mode.
 * Utilisé dans : SettingsPanel, EditProjectModal, BotModal, CanvasAgentAvatar
 * Props : value, onChange, options, placeholder, disabled
 */
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  style?: React.CSSProperties
}

export function Select({ value, onChange, options, placeholder = '— Choisir —', disabled, style }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // Ferme si clic hors du composant
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  // Ferme sur Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div
      ref={ref}
      className="custom-select"
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="custom-select__trigger"
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(225,31,123,0.5)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10,
          padding: '10px 14px',
          color: selected ? '#fff' : 'rgba(255,255,255,0.3)',
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.15s',
          textAlign: 'left',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder}
        </span>
        <span
          className="custom-select__arrow"
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            marginLeft: 8,
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown list */}
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="custom-select__list"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: '#1E1A22',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              overflow: 'hidden',
              zIndex: 9999,
              listStyle: 'none',
              margin: 0,
              padding: '4px 0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {options.map(opt => {
              const isSelected = opt.value === value
              return (
                <li
                  key={opt.value}
                  className={`custom-select__option${isSelected ? ' custom-select__option--selected' : ''}`}
                  onMouseDown={e => {
                    e.preventDefault()
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  style={{
                    padding: '9px 14px',
                    fontSize: 13,
                    color: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.85)',
                    background: isSelected ? 'rgba(225,31,123,0.1)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(225,31,123,0.1)' : 'transparent'
                  }}
                >
                  {opt.label}
                  {isSelected && <span style={{ fontSize: 10, color: 'var(--accent)' }}>✓</span>}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
