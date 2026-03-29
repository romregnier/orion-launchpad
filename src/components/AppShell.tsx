import { Outlet } from 'react-router-dom'
import { NavSidebar } from './NavSidebar'

// ── AppShell ──────────────────────────────────────────────────────────────────
// Layout principal v2 : nav 64px fixe + zone main flexible
// Utilise React Router <Outlet /> pour les pages enfants
export function AppShell() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Nav latérale 64px */}
      <NavSidebar />

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
