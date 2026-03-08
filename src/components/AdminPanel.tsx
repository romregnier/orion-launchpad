import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { AdminTabBar } from './AdminTabBar'
import { TeamTab } from './TeamTab'
import { PermissionsTab } from './PermissionsTab'
import { AppSettingsTab } from './AppSettingsTab'
import { WorkflowTab } from './WorkflowTab'
import { CollaborationTab } from './CollaborationTab'
import { OrgChartTab } from './OrgChartTab'

function TabContent() {
  const { adminTab } = useLaunchpadStore()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={adminTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
        }}
      >
        {adminTab === 'team'          && <TeamTab />}
        {adminTab === 'permissions'   && <PermissionsTab />}
        {adminTab === 'orgchart'      && <OrgChartTab />}
        {adminTab === 'workflow'      && <WorkflowTab />}
        {adminTab === 'appsettings'   && <AppSettingsTab />}
        {adminTab === 'collaboration' && <CollaborationTab />}
      </motion.div>
    </AnimatePresence>
  )
}

interface Props {
  onClose: () => void
}

export function AdminPanel({ onClose }: Props) {
  const { canvasAgents, boardMembers } = useLaunchpadStore()
  const aiCount = canvasAgents.filter(a => a.entity_type === 'ai' || !a.entity_type).length
  const memberCount = boardMembers.length

  const panel = (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 490,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(1000px, 100vw)',
          zIndex: 500,
          background: '#0F0D12',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        } as React.CSSProperties}
      >
        {/* Header */}
        <div style={{
          position: 'sticky' as const,
          top: 0,
          height: 65,
          minHeight: 65,
          padding: '0 28px',
          background: '#0F0D12',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.01em',
              fontFamily: "'Poppins', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              🛡️ Admin Panel
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.35)',
              marginTop: 2,
              fontFamily: "'Poppins', sans-serif",
            }}>
              {aiCount} agent{aiCount !== 1 ? 's' : ''} IA · {memberCount} membre{memberCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontFamily: "'Poppins', sans-serif",
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'
              ;(e.currentTarget as HTMLElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <AdminTabBar />

        {/* Tab Content — scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
          onWheel={e => e.stopPropagation()}
        >
          <TabContent />
        </div>
      </motion.div>
    </>
  )

  return createPortal(panel, document.body)
}
