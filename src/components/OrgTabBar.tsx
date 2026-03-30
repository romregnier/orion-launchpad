import { motion } from 'framer-motion'
import { useLaunchpadStore } from '../store'

type Tab = 'agents' | 'workflow' | 'orgchart' | 'collaboration'

const TABS: { id: Tab; label: string; emoji: string; disabled?: boolean }[] = [
  { id: 'agents', label: 'Agents', emoji: '👥' },
  { id: 'workflow', label: 'Workflow', emoji: '🔀', disabled: true },
  { id: 'orgchart', label: 'Org Chart', emoji: '🌲' },
  { id: 'collaboration', label: 'Collaboration', emoji: '🕸️', disabled: true },
]

export function OrgTabBar() {
  const { orgSettingsTab, setOrgSettingsTab } = useLaunchpadStore()

  return (
    <div style={{
      height: 44,
      padding: '0 28px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      gap: 0,
      alignItems: 'flex-end',
      background: 'transparent',
      position: 'sticky',
      top: 65,
      zIndex: 9,
      backdropFilter: 'blur(12px)',
    }}>
      {TABS.map(tab => {
        const isActive = orgSettingsTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setOrgSettingsTab(tab.id)}
            style={{
              padding: '0 18px 12px',
              height: '100%',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              border: 'none',
              background: 'transparent',
              position: 'relative',
              whiteSpace: 'nowrap',
              color: isActive ? '#fff' : tab.disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)',
              opacity: tab.disabled ? 0.4 : 1,
              transition: 'color 0.2s ease',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 5,
            }}
          >
            {isActive && <span>{tab.emoji}</span>}
            {tab.label}
            {tab.disabled && (
              <span style={{
                fontSize: 8,
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 4,
                background: 'var(--border-default)',
                color: 'rgba(255,255,255,0.3)',
                marginLeft: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                bientôt
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="org-tab-underline"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'var(--accent)',
                  borderRadius: '2px 2px 0 0',
                  boxShadow: '0 0 8px rgba(225,31,123,0.5)',
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
