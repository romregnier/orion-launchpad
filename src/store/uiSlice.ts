/**
 * uiSlice.ts — UI state: modals, navigation tabs, admin tabs
 */
import type { StateCreator } from 'zustand'
import type { LaunchpadStore, AdminTab, AppShellTab } from './sliceTypes'

export type UiSlice = Pick<
  LaunchpadStore,
  | 'activeTab' | 'setActiveTab'
  | 'adminTab' | 'setAdminTab'
  | 'lastNewAgentId' | 'setLastNewAgentId'
  | 'showOrgSettings' | 'orgSettingsTab'
  | 'setShowOrgSettings' | 'setOrgSettingsTab'
  | 'showSettings' | 'setShowSettings'
>

export const createUiSlice: StateCreator<LaunchpadStore, [], [], UiSlice> = (set) => ({
  activeTab: 'canvas' as AppShellTab,
  setActiveTab: (tab) => set({ activeTab: tab }),

  adminTab: 'team' as AdminTab,
  setAdminTab: (tab) => set({ adminTab: tab }),

  lastNewAgentId: null,
  setLastNewAgentId: (id) => set({ lastNewAgentId: id }),

  showOrgSettings: false,
  orgSettingsTab: 'agents' as const,
  setShowOrgSettings: (v) => {
    set({ showOrgSettings: v })
    if (v) set({ activeTab: 'agents' })
  },
  setOrgSettingsTab: (tab) => {
    const map: Record<string, AdminTab> = {
      agents: 'team',
      workflow: 'workflow',
      orgchart: 'orgchart',
      collaboration: 'collaboration',
    }
    set({ orgSettingsTab: tab, adminTab: map[tab] ?? 'team' })
  },

  showSettings: false,
  setShowSettings: (v) => {
    if (v) {
      set({ showSettings: v, adminTab: 'appsettings', activeTab: 'settings' })
    } else {
      set({ showSettings: false })
    }
  },
})
