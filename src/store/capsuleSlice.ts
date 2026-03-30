/**
 * capsuleSlice.ts — Capsule state: capsules list, currentCapsuleId, switchCapsule
 */
import type { StateCreator } from 'zustand'
import type { Capsule } from '../types'
import type { LaunchpadStore } from './sliceTypes'
import { supabase } from '../lib/supabase'

export type CapsuleSlice = Pick<
  LaunchpadStore,
  | 'activeCapsuleId'
  | 'capsules'
  | 'currentCapsule'
  | 'switchCapsule'
  | 'fetchCapsules'
>

export const createCapsuleSlice: StateCreator<LaunchpadStore, [], [], CapsuleSlice> = (set, get) => ({
  activeCapsuleId: '00000000-0000-0000-0000-000000000001',
  capsules: [],

  get currentCapsule(): Capsule | null {
    const s = get()
    return s.capsules.find(c => c.id === s.activeCapsuleId) ?? null
  },

  switchCapsule: (id: string) => {
    set({ activeCapsuleId: id })
  },

  fetchCapsules: async () => {
    const { data } = await supabase.from('capsules').select('*').order('created_at')
    if (data) set({ capsules: data as Capsule[] })
  },
})
