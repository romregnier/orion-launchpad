import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLaunchpadStore } from '../store'
import { OrgTabBar } from './OrgTabBar'
import { AgentDirectoryTab } from './AgentDirectoryTab'
import { OrgChartTab } from './OrgChartTab'

interface Props {
  onClose: () => void
}

function ComingSoonTab({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 40px',
      textAlign: 'center',
      flex: 1,
      minHeight: 300,
    }}>
      <motion.div
        animate={{ y: [-4, 4, -4] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        style={{ fontSize: 52, lineHeight: 1, marginBottom: 20 }}
      >
        {emoji}
      </motion.div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
        {label} — bientôt disponible
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', maxWidth: 300, lineHeight: 1.5 }}>
        Cette fonctionnalité sera disponible dans le Sprint 2.
      </div>
    </div>
  )
}

function TabContent() {
  const { orgSettingsTab } = useLaunchpadStore()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={orgSettingsTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, duration: 0.2 }}
        style={{ flex: 1 }}
      >
        {orgSettingsTab === 'agents' && <AgentDirectoryTab />}
        {orgSettingsTab === 'orgchart' && <OrgChartTab />}
        {orgSettingsTab === 'workflow' && <ComingSoonTab emoji="🔀" label="Workflow Editor" />}
        {orgSettingsTab === 'collaboration' && <ComingSoonTab emoji="🕸️" label="Collaboration Graph" />}
      </motion.div>
    </AnimatePresence>
  )
}

export function OrgSettingsPanel({ onClose }: Props) {
  const { canvasAgents } = useLaunchpadStore()
  const aiCount = canvasAgents.filter(a => a.entity_type === 'ai' || !a.entity_type).length
  const humanCount = canvasAgents.filter(a => a.entity_type === 'human').length

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
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(900px, 100vw)',
          zIndex: 500,
          background: '#0F0D12',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        } as React.CSSProperties}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: '#0F0D12',
          zIndex: 10,
          padding: '20px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              ⚙️ Organisation
            </div>
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              marginTop: 2,
              fontFamily: "'Poppins', sans-serif",
            }}>
              {aiCount} agent{aiCount > 1 ? 's' : ''} IA · {humanCount} humain{humanCount > 1 ? 's' : ''}
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
              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'
              ;(e.target as HTMLElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
              ;(e.target as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <OrgTabBar />

        {/* Tab Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TabContent />
        </div>
      </motion.div>
    </>
  )

  return createPortal(panel, document.body)
}
