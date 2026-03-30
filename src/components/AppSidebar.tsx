/**
 * AppSidebar v2
 *
 * Sidebar gauche verticale avec :
 * 1. CapsuleSwitcher (top)
 * 2. Navigation items (Canvas, Decks, Landings, Team, Agents, Settings)
 * 3. AgentStatusRow (bottom) — agents du canvas avec statut
 */
import { useLocation, Link } from 'react-router-dom'
import { CapsuleSwitcher } from './CapsuleSwitcher'
import { useLaunchpadStore } from '../store'

const NAV_ITEMS = [
  { emoji: '🌌', label: 'Canvas', to: '/' },
  { emoji: '🃏', label: 'Decks', to: '/decks' },
  { emoji: '🛬', label: 'Landings', to: '/landings' },
]

const ADMIN_ITEMS = [
  { emoji: '👥', label: 'Team', tab: 'team' as const },
  { emoji: '🤖', label: 'Agents', tab: 'orgchart' as const },
  { emoji: '⚙️', label: 'Settings', tab: 'appsettings' as const },
]

function AgentStatusRow() {
  const { canvasAgents } = useLaunchpadStore()
  const visible = canvasAgents.slice(0, 5)
  const extra = canvasAgents.length - 5

  if (canvasAgents.length === 0) return null

  return (
    <div style={{ padding: '12px 12px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(240,237,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Agents
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visible.map(agent => {
          const isActive = !!agent.working_on_project
          const initials = agent.name.slice(0, 2).toUpperCase()
          return (
            <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {agent.tailorUrl ? (
                  <img
                    src={agent.tailorUrl}
                    alt={agent.name}
                    style={{ width: 24, height: 24, borderRadius: 999, objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: 'rgba(225,31,123,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--accent)',
                  }}>
                    {initials}
                  </div>
                )}
                {/* Status dot */}
                <div style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: isActive ? '#10B981' : 'rgba(255,255,255,0.2)',
                  border: '1.5px solid rgba(11,9,13,0.95)',
                }} />
              </div>
              {/* Name */}
              <span style={{
                fontSize: 12,
                color: isActive ? 'rgba(240,237,245,0.8)' : 'rgba(240,237,245,0.4)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {agent.name}
              </span>
            </div>
          )
        })}
        {extra > 0 && (
          <div style={{ fontSize: 11, color: 'rgba(240,237,245,0.3)', paddingLeft: 2 }}>
            +{extra} agent{extra > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

interface AppSidebarProps {
  onAdminTab?: (tab: 'team' | 'orgchart' | 'appsettings') => void
}

export function AppSidebar({ onAdminTab }: AppSidebarProps) {
  const location = useLocation()
  const { setAdminTab, setActiveTab } = useLaunchpadStore()

  const isActive = (to: string) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  const handleAdminTab = (tab: 'team' | 'orgchart' | 'appsettings') => {
    setAdminTab(tab)
    // TK-0167: remplacer setShowAdminPanel par setActiveTab
    if (tab === 'appsettings') {
      setActiveTab('settings')
    } else {
      setActiveTab('agents')
    }
    if (onAdminTab) onAdminTab(tab)
  }

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 220,
      zIndex: 30,
      background: 'rgba(11,9,13,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Top: CapsuleSwitcher ── */}
      <div style={{ padding: '16px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <CapsuleSwitcher />
      </div>

      {/* ── Nav items ── */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {/* Route nav */}
        <div style={{ marginBottom: 4 }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#F0EDF5' : 'rgba(240,237,245,0.45)',
                  background: active ? 'rgba(225,31,123,0.15)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.12s, color 0.12s',
                  marginBottom: 2,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'
                    ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(240,237,245,0.75)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(240,237,245,0.45)'
                  }
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 4px' }} />

        {/* Admin items */}
        <div>
          {ADMIN_ITEMS.map(item => (
            <button
              key={item.tab}
              onClick={() => handleAdminTab(item.tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 400,
                color: 'rgba(240,237,245,0.45)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.12s, color 0.12s',
                marginBottom: 2,
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,237,245,0.75)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,237,245,0.45)'
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Bottom: Agent status ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <AgentStatusRow />
      </div>
    </aside>
  )
}
