import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { NavSidebar } from './NavSidebar'
import { CommandPalette } from './CommandPalette'

// ── AppShell ──────────────────────────────────────────────────────────────────
// Layout principal v2 : nav 64px fixe + zone main flexible
// Utilise React Router <Outlet /> pour les pages enfants
// NavSidebar masquée sur mobile (≤ 768px), MobileBottomNav prend le relais
// CommandPalette globale (Cmd+K / Ctrl+K) — TK-0176
export function AppShell() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Nav latérale — desktop only */}
      <div style={{ display: isMobile ? 'none' : 'block', width: 'var(--nav-width)', flexShrink: 0 }}>
        <NavSidebar onOpenCommandPalette={() => setShowCommandPalette(true)} />
      </div>

      {/* Zone principale scrollable */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          minWidth: 0,
        }}
      >
        <Outlet />
      </main>

      {/* Command Palette (portal vers document.body) */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  )
}
