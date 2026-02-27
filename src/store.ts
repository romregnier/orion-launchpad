import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from './types'

export interface Group {
  id: string
  name: string
  color: string
  emoji: string
  order: number
}

const REMOTE_PROJECTS_URL =
  'https://raw.githubusercontent.com/romregnier/orion-launchpad/main/projects.json'

export interface Idea {
  id: string
  text: string
  author: string
  votes: number
  votedBy: string[] // session IDs qui ont voté
  createdAt: string
}

interface LaunchpadStore {
  projects: Project[]
  deletedProjects: Project[]  // projets retirés du canvas (pas supprimés de GitHub)
  deletedIds: string[]
  remoteLoaded: boolean
  ideas: Idea[]
  ideaWidgetPosition: { x: number; y: number }
  activeFilter: string | null
  groups: Group[]
  activeGroup: string | null
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  restoreProject: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  fetchRemote: () => Promise<void>
  addIdea: (text: string, author: string) => void
  voteIdea: (id: string, sessionId: string) => void
  setFilter: (tag: string | null) => void
  setIdeaWidgetPosition: (x: number, y: number) => void
  addGroup: (group: Omit<Group, 'id' | 'order'>) => void
  deleteGroup: (id: string) => void
  updateGroup: (id: string, updates: Partial<Omit<Group, 'id'>>) => void
  setProjectGroup: (projectId: string, groupId: string | null) => void
  setGroupFilter: (groupId: string | null) => void
}

export const useLaunchpadStore = create<LaunchpadStore>()(
  persist(
    (set, get) => ({
      projects: [],
      deletedProjects: [],
      deletedIds: [],
      remoteLoaded: false,
      ideaWidgetPosition: { x: -300, y: 60 },
      ideas: [
        { id: 'idea-1', text: 'Un dashboard analytics pour nos apps 📊', author: 'Orion', votes: 3, votedBy: [], createdAt: new Date().toISOString() },
        { id: 'idea-2', text: 'Une landing page pour Crumb 🌍', author: 'Nova', votes: 2, votedBy: [], createdAt: new Date().toISOString() },
        { id: 'idea-3', text: 'Dark UI Kit vendu sur Gumroad 💰', author: 'Aria', votes: 5, votedBy: [], createdAt: new Date().toISOString() },
      ],
      activeFilter: null,
      groups: [
        { id: 'group-prod', name: 'En prod', color: '#22c55e', emoji: '🚀', order: 0 },
        { id: 'group-dev', name: 'En dev', color: '#3b82f6', emoji: '🔧', order: 1 },
        { id: 'group-ideas', name: 'Idées', color: '#f59e0b', emoji: '💡', order: 2 },
        { id: 'group-archived', name: 'Archivé', color: '#6b7280', emoji: '📦', order: 3 },
      ],
      activeGroup: null,

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
          deletedIds: state.deletedIds.filter((id) => id !== project.id),
          deletedProjects: state.deletedProjects.filter((p) => p.id !== project.id),
        })),

      removeProject: (id) =>
        set((state) => {
          const project = state.projects.find((p) => p.id === id)
          return {
            projects: state.projects.filter((p) => p.id !== id),
            deletedIds: [...state.deletedIds, id],
            deletedProjects: project ? [...state.deletedProjects, project] : state.deletedProjects,
          }
        }),

      restoreProject: (id) =>
        set((state) => {
          const project = state.deletedProjects.find((p) => p.id === id)
          if (!project) return {}
          return {
            projects: [...state.projects, project],
            deletedIds: state.deletedIds.filter((did) => did !== id),
            deletedProjects: state.deletedProjects.filter((p) => p.id !== id),
          }
        }),

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
          if (!res.ok) { set({ remoteLoaded: true }); return }
          const remote: Project[] = await res.json()
          const { projects: local, deletedIds } = get()
          const filtered = remote.filter((rp) => !deletedIds.includes(rp.id))
          const merged = [...filtered]
          local.forEach((lp) => {
            if (deletedIds.includes(lp.id)) return
            if (!merged.find((rp) => rp.id === lp.id)) {
              merged.push(lp)
            } else {
              const idx = merged.findIndex((p) => p.id === lp.id)
              merged[idx] = { ...merged[idx], position: lp.position }
            }
          })
          set({ projects: merged, remoteLoaded: true })
        } catch {
          set({ remoteLoaded: true })
        }
      },

      addIdea: (text, author) =>
        set((state) => ({
          ideas: [...state.ideas, {
            id: `idea-${Date.now()}`,
            text, author, votes: 0, votedBy: [],
            createdAt: new Date().toISOString(),
          }],
        })),

      voteIdea: (id, sessionId) =>
        set((state) => ({
          ideas: state.ideas.map((idea) => {
            if (idea.id !== id) return idea
            const hasVoted = idea.votedBy.includes(sessionId)
            return {
              ...idea,
              votes: hasVoted ? idea.votes - 1 : idea.votes + 1,
              votedBy: hasVoted
                ? idea.votedBy.filter((s) => s !== sessionId)
                : [...idea.votedBy, sessionId],
            }
          }),
        })),

      setFilter: (tag) => set({ activeFilter: tag }),
      setIdeaWidgetPosition: (x, y) => set({ ideaWidgetPosition: { x, y } }),

      addGroup: (group) => set((state) => ({
        groups: [...state.groups, { ...group, id: `group-${Date.now()}`, order: state.groups.length }]
      })),
      deleteGroup: (id) => set((state) => ({
        groups: state.groups.filter(g => g.id !== id),
        projects: state.projects.map(p => p.groupId === id ? { ...p, groupId: undefined } : p),
        activeGroup: state.activeGroup === id ? null : state.activeGroup,
      })),
      updateGroup: (id, updates) => set((state) => ({
        groups: state.groups.map(g => g.id === id ? { ...g, ...updates } : g)
      })),
      setProjectGroup: (projectId, groupId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, groupId: groupId ?? undefined } : p)
      })),
      setGroupFilter: (groupId) => set({ activeGroup: groupId }),
    }),
    {
      name: 'orion-launchpad',
      partialize: (state) => ({
        projects: state.projects,
        deletedIds: state.deletedIds,
        deletedProjects: state.deletedProjects,
        ideas: state.ideas,
        groups: state.groups,
        activeGroup: state.activeGroup,
      }),
    }
  )
)
