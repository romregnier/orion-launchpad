import { useLaunchpadStore } from '../store'
import { AgentDirectoryCard } from './AgentDirectoryCard'

export function AgentDirectoryTab() {
  const { canvasAgents } = useLaunchpadStore()

  // Sort: AI first, then human
  const sorted = [...canvasAgents].sort((a, b) => {
    if (a.entity_type === 'ai' && b.entity_type !== 'ai') return -1
    if (a.entity_type !== 'ai' && b.entity_type === 'ai') return 1
    return (a.agent_key ?? '').localeCompare(b.agent_key ?? '')
  })

  if (sorted.length === 0) {
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
        <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 20 }}>👥</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          Aucun agent configuré
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', maxWidth: 300, lineHeight: 1.5 }}>
          Les agents apparaîtront ici une fois configurés dans Supabase.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 12,
      padding: '24px 28px',
    }}>
      {sorted.map(agent => (
        <AgentDirectoryCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}
