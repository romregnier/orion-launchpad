import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from './types'

// GitHub raw URL — updated once the repo is created
const REMOTE_PROJECTS_URL =
  'https://raw.githubusercontent.com/romaindsigns/orion-launchpad/main/projects.json'

interface LaunchpadStore {
  projects: Project[]
  remoteLoaded: boolean
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  fetchRemote: () => Promise<void>
}

export const useLaunchpadStore = create<LaunchpadStore>()(
  persist(
    (set, get) => ({
      projects: [],
      remoteLoaded: false,

      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),

      removeProject: (id) =>
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),

      updatePosition: (id, x, y) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, position: { x, y } } : p
          ),
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      fetchRemote: async () => {
        try {
          const res = await fetch(REMOTE_PROJECTS_URL)
          if (!res.ok) return
          const remote: Project[] = await res.json()
          const local = get().projects
          // Merge: remote projects take precedence by id, keep local positions if saved
          const merged = [...remote]
          local.forEach((lp) => {
            if (!merged.find((rp) => rp.id === lp.id)) {
              merged.push(lp) // local-only projects stay
            } else {
              // Preserve local position override
              const idx = merged.findIndex((p) => p.id === lp.id)
              merged[idx] = { ...merged[idx], position: lp.position }
            }
          })
          set({ projects: merged, remoteLoaded: true })
        } catch {
          // Offline or repo not yet created — use local only
          set({ remoteLoaded: true })
        }
      },
    }),
    {
      name: 'orion-launchpad',
      // Don't persist remoteLoaded
      partialize: (state) => ({
        projects: state.projects,
      }),
    }
  )
)
