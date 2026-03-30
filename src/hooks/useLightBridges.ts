/**
 * useLightBridges — TK-0229 [FEAT-006]
 * Hook pour gérer les Light Bridges inter-capsules
 * Graceful degradation si la table n'existe pas (code 42P01)
 */
import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLaunchpadStore } from '../store'

export interface LightBridge {
  id: string
  name: string
  source_capsule_id: string | null
  target_capsule_id: string | null
  bridge_type: 'knowledge' | 'agent' | 'workflow'
  permissions: { read: boolean; write: boolean }
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  source_capsule?: { name: string; emoji: string } | null
  target_capsule?: { name: string; emoji: string } | null
}

export interface CreateBridgePayload {
  name: string
  targetCapsuleId: string
  type: LightBridge['bridge_type']
  permissions: { read: boolean; write: boolean }
}

export function useLightBridges() {
  const { activeCapsuleId } = useLaunchpadStore()
  const [bridges, setBridges] = useState<LightBridge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableAvailable, setTableAvailable] = useState(true)

  const getBridges = useCallback(async () => {
    if (!activeCapsuleId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('light_bridges')
      .select(`
        *,
        source_capsule:capsules!source_capsule_id(name, emoji),
        target_capsule:capsules!target_capsule_id(name, emoji)
      `)
      .eq('source_capsule_id', activeCapsuleId)
      .order('created_at', { ascending: false })

    if (err) {
      // Graceful degradation: table doesn't exist yet
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        setTableAvailable(false)
        setBridges([])
      } else {
        setError(err.message)
      }
    } else {
      setTableAvailable(true)
      setBridges((data as LightBridge[]) || [])
    }
    setLoading(false)
  }, [activeCapsuleId])

  const createBridge = useCallback(async (payload: CreateBridgePayload): Promise<boolean> => {
    if (!activeCapsuleId) return false

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error: err } = await supabase.from('light_bridges').insert({
      name: payload.name,
      source_capsule_id: activeCapsuleId,
      target_capsule_id: payload.targetCapsuleId,
      bridge_type: payload.type,
      permissions: payload.permissions,
      is_active: true,
      created_by: user.id,
    })

    if (err) {
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        setTableAvailable(false)
      }
      return false
    }

    await getBridges()
    return true
  }, [activeCapsuleId, getBridges])

  const toggleBridge = useCallback(async (id: string, active: boolean) => {
    setBridges(prev => prev.map(b => b.id === id ? { ...b, is_active: active } : b))
    const { error: err } = await supabase
      .from('light_bridges')
      .update({ is_active: active })
      .eq('id', id)
    if (err) await getBridges() // revert on error
  }, [getBridges])

  const deleteBridge = useCallback(async (id: string) => {
    setBridges(prev => prev.filter(b => b.id !== id))
    const { error: err } = await supabase
      .from('light_bridges')
      .delete()
      .eq('id', id)
    if (err) await getBridges() // revert on error
  }, [getBridges])

  useEffect(() => {
    getBridges()
  }, [getBridges])

  return {
    bridges,
    loading,
    error,
    tableAvailable,
    getBridges,
    createBridge,
    toggleBridge,
    deleteBridge,
  }
}
