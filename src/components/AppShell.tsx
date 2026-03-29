import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { NavSidebar } from './NavSidebar'

// ── AppShell ──────────────────────────────────────────────────────────────────
// Layout principal v2 : nav 64px fixe + zone main flexible
// Utilise React Router <Outlet /> pour les pages enfants
// NavSidebar masquée sur mobile (≤ 768px), MobileBottomNav prend le relais
export function AppShell() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
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
        <NavSidebar />
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
    </div>
  )
}
