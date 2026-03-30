/**
 * TaskLockBadge — TK-0245
 * Badge compact affichant l'état du lock d'une tâche.
 * Polling toutes les 10s.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTaskCheckout } from '../hooks/useTaskCheckout'
import type { TaskLock } from '../hooks/useTaskCheckout'

interface TaskLockBadgeProps {
  taskId: string
  currentAgentKey?: string
}

function getTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'expiré'
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  if (minutes > 0) return `${minutes}m left`
  return `${seconds}s left`
}

export function TaskLockBadge({ taskId, currentAgentKey }: TaskLockBadgeProps) {
  const { getLocks, releaseTask } = useTaskCheckout()
  const [lock, setLock] = useState<TaskLock | null>(null)
  const [loading, setLoading] = useState(true)
  const [releasing, setReleasing] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  const fetchLock = useCallback(async () => {
    const locks = await getLocks()
    const found = locks.find(l => l.task_id === taskId) ?? null
    setLock(found)
    if (found) setTimeLeft(getTimeLeft(found.expires_at))
    setLoading(false)
  }, [taskId, getLocks])

  useEffect(() => {
    fetchLock()
    const interval = setInterval(fetchLock, 10_000)
    return () => clearInterval(interval)
  }, [fetchLock])

  // Update time display every second when locked
  useEffect(() => {
    if (!lock) return
    const t = setInterval(() => setTimeLeft(getTimeLeft(lock.expires_at)), 1000)
    return () => clearInterval(t)
  }, [lock])

  const handleRelease = async () => {
    if (!lock || !currentAgentKey) return
    setReleasing(true)
    await releaseTask(taskId, currentAgentKey)
    await fetchLock()
    setReleasing(false)
  }

  const isOwner = lock && currentAgentKey && lock.locked_by === currentAgentKey

  if (loading) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 6,
        background: 'rgba(255,255,255,0.05)',
        fontSize: 11, color: 'rgba(255,255,255,0.3)',
        fontFamily: "'Poppins', sans-serif",
      }}>
        …
      </span>
    )
  }

  if (!lock) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 6,
        background: 'rgba(52, 211, 153, 0.12)',
        border: '1px solid rgba(52, 211, 153, 0.25)',
        fontSize: 11, color: '#34d399',
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 500,
      }}>
        ✅ Available
      </span>
    )
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px', borderRadius: 6,
      background: 'rgba(251, 191, 36, 0.12)',
      border: '1px solid rgba(251, 191, 36, 0.25)',
      fontSize: 11, color: '#fbbf24',
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 500,
    }}>
      🔒 Locked by {lock.locked_by} ({timeLeft})
      {isOwner && (
        <button
          onClick={handleRelease}
          disabled={releasing}
          style={{
            marginLeft: 4,
            padding: '1px 6px',
            borderRadius: 4,
            border: '1px solid rgba(251, 191, 36, 0.4)',
            background: 'rgba(251, 191, 36, 0.15)',
            color: '#fbbf24',
            cursor: releasing ? 'not-allowed' : 'pointer',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {releasing ? '…' : 'Release'}
        </button>
      )}
    </span>
  )
}
