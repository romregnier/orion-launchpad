import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLaunchpadStore } from '../store'

type AdminTab = 'team' | 'permissions' | 'orgchart' | 'workflow' | 'appsettings' | 'collaboration'

const ADMIN_TABS: Array<{
  id: AdminTab
  label: string
  emoji: string
  disabled?: boolean
  comingSoon?: boolean
  hidden?: boolean
}> = [
  { id: 'team',          label: 'Team',        emoji: '👥' },
  { id: 'permissions',   label: 'Permissions', emoji: '🔐' },
  { id: 'orgchart',      label: 'Org Chart',   emoji: '🌲' },
  { id: 'workflow',      label: 'Workflow',    emoji: '🔀' },
  { id: 'appsettings',   label: 'App Settings',emoji: '⚙️' },
  { id: 'collaboration', label: 'Collab',      emoji: '🕸️', disabled: true, comingSoon: true, hidden: true },
]

export function AdminTabBar() {
  const { adminTab, setAdminTab } = useLaunchpadStore()
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleTabClick = (tabId: AdminTab) => {
    setAdminTab(tabId)
    // Scroll the active tab into view on mobile
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-tab="${tabId}"]`) as HTMLElement | null
      el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    })
  }

  return (
    <div style={{
      height: 48,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'transparent',
      position: 'sticky' as const,
      top: 65,
      zIndex: 9,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      flexShrink: 0,
    }}>
      <div
        className="admin-tab-bar"
        style={{
          display: 'flex',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          gap: 4,
          padding: '0 4px',
          height: '100%',
          alignItems: 'flex-end',
        }}
      >
      {ADMIN_TABS.filter(tab => !tab.hidden).map(tab => {
        const isActive = adminTab === tab.id
        const isDisabled = tab.disabled

        return (
          <motion.button
            key={tab.id}
            data-tab={tab.id}
            onClick={() => !isDisabled && handleTabClick(tab.id)}
            whileTap={!isDisabled ? { scale: 0.94 } : undefined}
            style={{
              padding: isMobile ? '0 10px 12px' : '0 16px 12px',
              height: '100%',
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              border: 'none',
              background: 'transparent',
              position: 'relative' as const,
              whiteSpace: 'nowrap' as const,
              color: isDisabled
                ? 'rgba(255,255,255,0.20)'
                : isActive
                ? '#fff'
                : 'rgba(255,255,255,0.40)',
              transition: 'color 0.2s ease',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 5,
              opacity: isDisabled ? 0.35 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Emoji — only on active tab */}
            {isActive && <span>{tab.emoji}</span>}

            {tab.label}

            {/* Coming soon badge */}
            {tab.comingSoon && (
              <span style={{
                fontSize: 8,
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.3)',
                marginLeft: 2,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.04em',
                fontFamily: "'Poppins', sans-serif",
              }}>
                bientôt
              </span>
            )}

            {/* Animated underline */}
            {isActive && (
              <motion.div
                layoutId="admin-tab-underline"
                style={{
                  position: 'absolute' as const,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: '#E11F7B',
                  borderRadius: '2px 2px 0 0',
                  boxShadow: '0 0 8px rgba(225,31,123,0.5)',
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
          </motion.button>
        )
      })}
      </div>
    </div>
  )
}
