// TK-0238: [ARCH-008] Learning Loop — Learning Dashboard
// Mini-dashboard d'observation des patterns d'efficacité (Phase 1: read-only)

import { useEffect, useState } from 'react'
import { useLearningLoop } from '../hooks/useLearningLoop'
import type { DashboardStats } from '../hooks/useLearningLoop'

function SkeletonBar() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 bg-white/10 rounded w-32" />
          <div className="h-3 bg-white/10 rounded flex-1" />
          <div className="h-3 bg-white/10 rounded w-12" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3">🧠</div>
      <p className="text-white/50 text-sm">Aucun pattern détecté encore.</p>
      <p className="text-white/30 text-xs mt-1">Les patterns apparaissent après les premières exécutions d'agents.</p>
    </div>
  )
}

export function LearningDashboard() {
  const { getDashboardStats } = useLearningLoop()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats().then(data => {
      setStats(data)
      setLoading(false)
    })
  }, [getDashboardStats])

  const hasData = stats && (
    stats.topPatterns.length > 0 ||
    stats.topAgents.length > 0 ||
    stats.avgCostByTaskType.length > 0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-lg">🧠</span>
        <h2 className="text-white font-semibold text-lg">Learning Loop</h2>
        <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">Phase 1 — Observation</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 rounded-xl p-4">
              <div className="h-4 bg-white/10 rounded w-24 mb-4 animate-pulse" />
              <SkeletonBar />
            </div>
          ))}
        </div>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Patterns by success_rate */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white/70 text-sm font-medium mb-4">Top Patterns</h3>
            {stats!.topPatterns.length === 0 ? (
              <p className="text-white/30 text-xs">Aucun pattern</p>
            ) : (
              <div className="space-y-3">
                {stats!.topPatterns.map(pattern => (
                  <div key={pattern.id} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span
                        className="text-white/70 text-xs truncate max-w-[140px]"
                        title={pattern.pattern_key}
                      >
                        {pattern.pattern_key}
                      </span>
                      <span className="text-white text-xs font-mono ml-2">
                        {(pattern.success_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${pattern.success_rate * 100}%` }}
                      />
                    </div>
                    <div className="text-white/30 text-[10px]">
                      {pattern.sample_count} sample{pattern.sample_count > 1 ? 's' : ''} · {pattern.pattern_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Agents par efficacité */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white/70 text-sm font-medium mb-4">Top Agents</h3>
            {stats!.topAgents.length === 0 ? (
              <p className="text-white/30 text-xs">Aucun agent tracké</p>
            ) : (
              <div className="space-y-3">
                {stats!.topAgents.map((agent, idx) => (
                  <div key={agent.agent} className="flex items-center gap-3">
                    <span className="text-white/30 text-xs w-4">#{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm font-medium capitalize">{agent.agent}</span>
                        <span className="text-emerald-400 text-xs font-mono">
                          {(agent.success_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${agent.success_rate * 100}%` }}
                        />
                      </div>
                      <div className="text-white/30 text-[10px] mt-0.5">
                        {agent.sample_count} tâche{agent.sample_count > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coût moyen par type de tâche */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white/70 text-sm font-medium mb-4">Coût moyen / type</h3>
            {stats!.avgCostByTaskType.length === 0 ? (
              <p className="text-white/30 text-xs">Aucune donnée de coût</p>
            ) : (
              <div className="space-y-3">
                {stats!.avgCostByTaskType.slice(0, 5).map(item => (
                  <div key={item.task_type} className="flex items-center justify-between">
                    <span className="text-white/70 text-xs capitalize">{item.task_type}</span>
                    <span className="text-white/50 text-xs font-mono">
                      {item.avg_cost < 1
                        ? `<$0.01`
                        : `$${(item.avg_cost / 100).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LearningDashboard
