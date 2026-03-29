import { useState } from 'react'
import { Globe, LayoutDashboard, Bot, Ticket, Zap, Settings } from 'lucide-react'
import { useLaunchpadStore } from '../store'

// ── Nav items ────────────────────────────────────────────────────────────────
type TabId = 'canvas' | 'dashboard' | 'agents' | 'tickets' | 'activity' | 'settings'

interface NavItem {
  tab: TabId
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { tab: 'canvas',    label: 'Canvas',    icon: <Globe size={20} /> },
  { tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { tab: 'agents',    label: 'Agents',    icon: <Bot size={20} /> },
  { tab: 'tickets',   label: 'Tickets',   icon: <Ticket size={20} /> },
  { tab: 'activity',  label: 'Activity',  icon: <Zap size={20} /> },
  { tab: 'settings',  label: 'Settings',  icon: <Settings size={20} /> },
]

// ── AppShell ─────────────────────────────────────────────────────────────────
interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { activeTab, setActiveTab } = useLaunchpadStore()

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* ── Vertical nav 56px ─────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 56,
          height: '100vh',
          background: '#13111A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 8,
          paddingBottom: 8,
          zIndex: 100,
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.tab}
            item={item}
            active={activeTab === item.tab}
            onClick={() => setActiveTab(item.tab)}
          />
        ))}
      </nav>

      {/* ── Main zone ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          marginLeft: 56,
          width: 'calc(100vw - 56px)',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── NavButton ─────────────────────────────────────────────────────────────────
interface NavButtonProps {
  item: NavItem
  active: boolean
  onClick: () => void
}

function NavButton({ item, active, onClick }: NavButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={item.label}
        style={{
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderLeft: active ? '2px solid #E11F7B' : '2px solid transparent',
          background: active
            ? 'rgba(225,31,123,0.15)'
            : hovered
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
          color: active ? '#E11F7B' : 'rgba(255,255,255,0.55)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
          outline: 'none',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {item.icon}
      </button>

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: 64,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#2C272F',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.9)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 200,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 500,
          }}
        >
          {item.label}
        </div>
      )}
    </div>
  )
}
