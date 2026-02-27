import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from './types'

// GitHub raw URL — updated once the repo is created
const REMOTE_PROJECTS_URL =
  'https://raw.githubusercontent.com/romregnier/orion-launchpad/main/projects.json'

interface LaunchpadStore {
  projects: Project[]
  deletedIds: string[]   // IDs supprimés localement — pas réimportés depuis remote
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
      deletedIds: [],
      remoteLoaded: false,

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
          deletedIds: state.deletedIds.filter((id) => id !== project.id), // un re-add annule la suppression
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          deletedIds: [...state.deletedIds, id], // mémorise la suppression
        })),

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
          if (!res.ok) {
            // Remote unavailable — mark loaded so UI isn't stuck on spinner
            set({ remoteLoaded: true })
            return
          }
          const remote: Project[] = await res.json()
          const { projects: local, deletedIds } = get()

          // Filtre les projets supprimés localement
          const filtered = remote.filter((rp) => !deletedIds.includes(rp.id))

          // Merge: remote prend le dessus, on préserve les positions locales et les projets local-only
          const merged = [...filtered]
          local.forEach((lp) => {
            if (deletedIds.includes(lp.id)) return // supprimé, on ignore
            if (!merged.find((rp) => rp.id === lp.id)) {
              merged.push(lp) // projet local-only (ajouté manuellement)
            } else {
              // Préserve la position déplacée localement
              const idx = merged.findIndex((p) => p.id === lp.id)
              merged[idx] = { ...merged[idx], position: lp.position }
            }
          })

          set({ projects: merged, remoteLoaded: true })
        } catch {
          // Offline or repo not yet created — mark loaded so UI shows local state
          set({ remoteLoaded: true })
        }
      },
    }),
    {
      name: 'orion-launchpad',
      // Don't persist remoteLoaded
      partialize: (state) => ({
        projects: state.projects,
        deletedIds: state.deletedIds,
      }),
    }
  )
)
