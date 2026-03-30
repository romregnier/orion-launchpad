/**
 * useGalaxyMode — TK-0232 [DS-004]
 * Hook réactif pour lire/écouter le mode Galaxy depuis localStorage
 */
import { useState, useEffect } from 'react'

export function useGalaxyMode(): boolean {
  const [galaxyMode, setGalaxyMode] = useState<boolean>(() => {
    try { return localStorage.getItem('galaxyMode') === 'true' } catch { return false }
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'galaxyMode') {
        setGalaxyMode(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return galaxyMode
}
