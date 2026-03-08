import { motion } from 'framer-motion'

export function WorkflowTab() {
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
        🔀
      </motion.div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontFamily: "'Poppins', sans-serif" }}>
        Workflow Editor — bientôt disponible
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', maxWidth: 300, lineHeight: 1.5, fontFamily: "'Poppins', sans-serif" }}>
        Cette fonctionnalité sera disponible dans le Sprint B.
      </div>
    </div>
  )
}
