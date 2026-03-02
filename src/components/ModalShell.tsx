/**
 * ModalShell
 *
 * Rôle : Shell harmonisé pour toutes les modales du Launchpad.
 * Props : title, subtitle?, emoji, onClose, children, footer?
 * Usage : Envelopper le contenu de la modale dans ce composant.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

interface ModalShellProps {
  /** Affichage conditionnel (AnimatePresence gère l'animation de sortie) */
  open: boolean
  title: string
  subtitle?: string
  emoji: string
  onClose: () => void
  children: React.ReactNode
  /** Boutons footer (optionnel) */
  footer?: React.ReactNode
  /** z-index override (défaut : 500) */
  zIndex?: number
  /** Largeur max override (défaut : 480px) */
  maxWidth?: number | string
}

export function ModalShell({
  open,
  title,
  subtitle,
  emoji,
  onClose,
  children,
  footer,
  zIndex = 500,
  maxWidth = 480,
}: ModalShellProps) {
  const modal = (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="modal-shell-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: zIndex - 1,
            }}
          />

          {/* ── Card ── */}
          <motion.div
            key="modal-shell-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28, duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
              maxHeight: '80vh',
              overflowY: 'auto',
              background: '#1A171C',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 24,
              zIndex,
            }}
          >
            {/* ── Header ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: children ? 20 : 0,
                paddingRight: 32, // space for close btn
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{title}</div>
                {subtitle && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{subtitle}</div>
                )}
              </div>
            </div>

            {/* ── Close button ── */}
            <button
              onClick={onClose}
              aria-label="Fermer"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 20,
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '2px 6px',
                borderRadius: 6,
                transition: 'color 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            >
              ×
            </button>

            {/* ── Content ── */}
            {children}

            {/* ── Footer ── */}
            {footer && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                  marginTop: 20,
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}
