import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, ListWidget, ListType } from './types'
import { sha256 } from './utils/hash'

export interface Group {
  id: string
  name: string
  color: string
  emoji: string
  order: number
}

export interface Member {
  id: string
  username: string
  passwordHash: string // SHA-256 hex
  role: 'admin' | 'member'
  createdAt: number
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

// SHA-256 of 'e2DLvDdrbkHZ2Whkimww9QVU'
const ROMAIN_HASH = 'a2a4bcf7d4cf2f8df876e9134bc71509978782612bcdf0d341d3f112d6c28d90'

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
  boardName: string
  isPrivate: boolean
  members: Member[]
  currentUser: { username: string; role: 'admin' | 'member' } | null
  showSettings: boolean
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  restoreProject: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  fetchRemote: () => Promise<void>
  addIdea: (text: string, author: string) => void
  deleteIdea: (id: string) => void
  voteIdea: (id: string, sessionId: string) => void
  setFilter: (tag: string | null) => void
  setIdeaWidgetPosition: (x: number, y: number) => void
  addGroup: (group: Omit<Group, 'id' | 'order'>) => void
  deleteGroup: (id: string) => void
  updateGroup: (id: string, updates: Partial<Omit<Group, 'id'>>) => void
  setProjectGroup: (projectId: string, groupId: string | null) => void
  setGroupFilter: (groupId: string | null) => void
  setBoardName: (name: string) => void
  setPrivate: (v: boolean) => void
  addMember: (username: string, passwordHash: string, role: 'admin' | 'member') => void
  removeMember: (id: string) => void
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  setShowSettings: (v: boolean) => void
  clearProjects: () => void
  pushOverlapping: (draggedId: string, dragX: number, dragY: number) => void
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
      boardName: 'Mon Launchpad',
      isPrivate: false,
      currentUser: null,
      members: [
        {
          id: 'member-romain',
          username: 'romain',
          passwordHash: ROMAIN_HASH,
          role: 'admin',
          createdAt: Date.now(),
        }
      ],
      showSettings: false,

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
        set((state) => {
          const CARD_W = 260, CARD_H = 220, PAD = 16
          // Nudge until no overlap with any other card
          let nx = x, ny = y
          let attempts = 0
          const others = state.projects.filter(p => p.id !== id)
          const overlaps = (cx: number, cy: number) =>
            others.some(p =>
              cx < p.position.x + CARD_W + PAD &&
              cx + CARD_W + PAD > p.position.x &&
              cy < p.position.y + CARD_H + PAD &&
              cy + CARD_H + PAD > p.position.y
            )
          while (overlaps(nx, ny) && attempts < 12) {
            nx += CARD_W + PAD
            if (attempts % 3 === 2) { nx = x; ny += CARD_H + PAD }
            attempts++
          }
          return { projects: state.projects.map((p) => p.id === id ? { ...p, position: { x: nx, y: ny } } : p) }
        }),

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

      deleteIdea: (id) => set((state) => ({ ideas: state.ideas.filter(i => i.id !== id) })),
      setFilter: (tag) => set({ activeFilter: tag }),
      setIdeaWidgetPosition: (x, y) => set((state) => {
        const CARD_W = 280, CARD_H = 220, PAD = 16
        let nx = x, ny = y
        let attempts = 0
        const overlaps = (cx: number, cy: number) =>
          state.projects.some(p =>
            cx < p.position.x + CARD_W + PAD &&
            cx + CARD_W + PAD > p.position.x &&
            cy < p.position.y + CARD_H + PAD &&
            cy + CARD_H + PAD > p.position.y
          )
        while (overlaps(nx, ny) && attempts < 12) {
          nx += CARD_W + PAD
          if (attempts % 3 === 2) { nx = x; ny += CARD_H + PAD }
          attempts++
        }
        return { ideaWidgetPosition: { x: nx, y: ny } }
      }),

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

      setBoardName: (name) => set({ boardName: name }),
      setPrivate: (v) => {
        // When enabling private mode, auto-login the first admin so the current session isn't kicked
        if (v && !get().currentUser) {
          const admin = get().members.find(m => m.role === 'admin')
          if (admin) {
            set({ isPrivate: v, currentUser: { username: admin.username, role: admin.role } })
            return
          }
        }
        set({ isPrivate: v })
      },
      addMember: (username, passwordHash, role) => set((state) => ({
        members: [...state.members, { id: `member-${Date.now()}`, username, passwordHash, role, createdAt: Date.now() }]
      })),
      removeMember: (id) => set((state) => ({
        members: state.members.filter(m => m.id !== id)
      })),
      login: async (username, password) => {
        const hash = await sha256(password)
        const member = get().members.find(m => m.username === username && m.passwordHash === hash)
        if (member) {
          set({ currentUser: { username: member.username, role: member.role } })
          return true
        }
        return false
      },
      logout: () => set({ currentUser: null }),
      setShowSettings: (v) => set({ showSettings: v }),
      clearProjects: () => set({ projects: [], deletedIds: [], deletedProjects: [] }),

      pushOverlapping: (draggedId, dragX, dragY) => set((state) => {
        const CARD_W = 260, CARD_H = 220, PAD = 20
        const newProjects = state.projects.map(p => {
          if (p.id === draggedId) return p
          const overlapX = dragX < p.position.x + CARD_W + PAD && dragX + CARD_W + PAD > p.position.x
          const overlapY = dragY < p.position.y + CARD_H + PAD && dragY + CARD_H + PAD > p.position.y
          if (!overlapX || !overlapY) return p
          const cx = dragX + CARD_W / 2
          const cy = dragY + CARD_H / 2
          const px = p.position.x + CARD_W / 2
          const py = p.position.y + CARD_H / 2
          const dx = px - cx
          const dy = py - cy
          if (Math.abs(dx) >= Math.abs(dy)) {
            const nx = dx > 0 ? dragX + CARD_W + PAD : dragX - CARD_W - PAD
            return { ...p, position: { x: nx, y: p.position.y } }
          } else {
            const ny = dy > 0 ? dragY + CARD_H + PAD : dragY - CARD_H - PAD
            return { ...p, position: { x: p.position.x, y: ny } }
          }
        })
        return { projects: newProjects }
      }),
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
        boardName: state.boardName,
        isPrivate: state.isPrivate,
        members: state.members,
        currentUser: state.currentUser,
      }),
    }
  )
)
