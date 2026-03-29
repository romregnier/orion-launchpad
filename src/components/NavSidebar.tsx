import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  LayoutDashboard,
  Bot,
  Ticket,
  Activity,
  Settings,
  LogOut,
} from 'lucide-react'
import { useLaunchpadStore } from '../store'
import { CapsuleSwitcher } from './CapsuleSwitcher'

// ── Nav item definition ───────────────────────────────────────────────────────
interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { path: '/',          label: 'Canvas',    icon: <LayoutGrid size={20} /> },
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/agents',    label: 'Agents',    icon: <Bot size={20} /> },
  { path: '/tickets',   label: 'Tickets',   icon: <Ticket size={20} /> },
  { path: '/activity',  label: 'Activity',  icon: <Activity size={20} /> },
  { path: '/settings',  label: 'Settings',  icon: <Settings size={20} /> },
]

// ── NavSidebar ─────────────────────────────────────────────────────────────────
interface NavSidebarProps {
  onOpenCommandPalette?: () => void
}

export function NavSidebar({ onOpenCommandPalette }: NavSidebarProps) {
  const { currentUser, logout } = useLaunchpadStore()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      style={{
        width: 'var(--nav-width)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: 'var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 12,
        zIndex: 100,
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {/* CapsuleSwitcher compact — top */}
      <div style={{ width: '100%', padding: '0 8px', marginBottom: 8 }}>
        <CapsuleSwitcher />
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
          return (
            <NavItemButton
              key={item.path}
              item={item}
              active={isActive}
              onClick={() => navigate(item.path)}
            />
          )
        })}
      </div>

      {/* ⌘K hint */}
      {onOpenCommandPalette && (
        <button
          onClick={onOpenCommandPalette}
          title="Command Palette (⌘K)"
          style={{
            width: 'calc(100% - 16px)',
            margin: '4px 8px',
            padding: '6px 8px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget
            b.style.background = 'rgba(255,255,255,0.08)'
            b.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={e => {
            const b = e.currentTarget
            b.style.background = 'rgba(255,255,255,0.04)'
            b.style.color = 'var(--text-tertiary)'
          }}
        >
          <kbd style={{ fontSize: 10, fontFamily: 'monospace', opacity: 0.7 }}>⌘K</kbd>
        </button>
      )}

      {/* Bottom: user avatar + logout */}
      <div style={{ width: '100%', borderTop: 'var(--glass-border)', paddingTop: 8 }}>
        {currentUser && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {/* User avatar */}
            <div
              title={currentUser.username}
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                cursor: 'default',
              }}
            >
              {currentUser.username.charAt(0).toUpperCase()}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              title="Déconnexion"
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget
                b.style.color = 'var(--error)'
                b.style.background = 'rgba(239,68,68,0.1)'
              }}
              onMouseLeave={e => {
                const b = e.currentTarget
                b.style.color = 'var(--text-tertiary)'
                b.style.background = 'transparent'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

// ── NavItemButton ─────────────────────────────────────────────────────────────
interface NavItemButtonProps {
  item: NavItem
  active: boolean
  onClick: () => void
}

function NavItemButton({ item, active, onClick }: NavItemButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={item.label}
        style={{
          width: '100%',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
          background: active
            ? 'var(--accent-subtle)'
            : hovered
            ? 'var(--bg-hover)'
            : 'transparent',
          color: active ? 'var(--accent)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
          outline: 'none',
          padding: 0,
        }}
      >
        {item.icon}
      </button>

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: 'calc(var(--nav-width) + 4px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            fontSize: 12,
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 200,
            boxShadow: 'var(--shadow-md)',
            border: 'var(--glass-border)',
          }}
        >
          {item.label}
        </div>
      )}
    </div>
  )
}
