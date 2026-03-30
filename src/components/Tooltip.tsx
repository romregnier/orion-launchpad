/**
 * Tooltip.tsx — TK-0224
 * Tooltip générique avec animation fade+scale (Framer Motion).
 * Apparaît au hover avec délai 300ms.
 */
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const gap = 8
        let x = 0
        let y = 0
        if (placement === 'top') {
          x = rect.left + rect.width / 2
          y = rect.top - gap
        } else if (placement === 'bottom') {
          x = rect.left + rect.width / 2
          y = rect.bottom + gap
        } else if (placement === 'left') {
          x = rect.left - gap
          y = rect.top + rect.height / 2
        } else {
          x = rect.right + gap
          y = rect.top + rect.height / 2
        }
        setCoords({ x, y })
        setVisible(true)
      }
    }, 300)
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const getTransformOrigin = () => {
    if (placement === 'top') return 'bottom center'
    if (placement === 'bottom') return 'top center'
    if (placement === 'left') return 'right center'
    return 'left center'
  }

  const getTranslate = (initial: boolean) => {
    const off = initial ? 6 : 0
    if (placement === 'top') return `translate(-50%, calc(-100% - 0px)) translateY(${initial ? off : 0}px)`
    if (placement === 'bottom') return `translate(-50%, 0) translateY(${initial ? -off : 0}px)`
    if (placement === 'left') return `translate(calc(-100% - 0px), -50%) translateX(${initial ? off : 0}px)`
    return `translate(0, -50%) translateX(${initial ? -off : 0}px)`
  }

  const tooltipEl = (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, transform: getTranslate(true) }}
          animate={{ opacity: 1, scale: 1, transform: getTranslate(false) }}
          exit={{ opacity: 0, scale: 0.85, transform: getTranslate(true) }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            zIndex: 9999,
            pointerEvents: 'none',
            transformOrigin: getTransformOrigin(),
            background: 'var(--bg-elevated, #1a1a2e)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            color: 'var(--text-primary, #fff)',
            fontFamily: "'Poppins', sans-serif",
            maxWidth: 240,
            lineHeight: 1.5,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </span>
      {createPortal(tooltipEl, document.body)}
    </>
  )
}
