/**
 * Shared type definitions for all Zustand store slices.
 * Centralised here to avoid circular imports between store.ts ↔ slice files.
 */
import type { Project, ListWidget, ListType, CanvasAgent, BoardMember, Capsule } from '../types'

// ── Re-exported sub-types ─────────────────────────────────────────────────

export interface CanvasObject {
  id: string
  type: 'project' | 'list' | 'idea' | 'agent'
  x: number
  y: number
  width: number
  height: number
}

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
  passwordHash: string
  role: 'admin' | 'member'
  createdAt: number
}

export interface Idea {
  id: string
  text: string
  author: string
  votes: number
  votedBy: string[]
  createdAt: string
}

export interface ActiveBuildTask {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number
  agent_key?: string | null
  step_label?: string | null
  project?: string | null
  created_at?: string | null
}

export interface ProjectMeta {
  project_id: string
  screenshot_url?: string | null
  ai_meta?: {
    summary?: string
    health_score?: number
    tags?: string[]
    suggestions?: string[]
    category?: string
  } | null
  ai_analyzed_at?: string | null
}

export type AdminTab = 'team' | 'permissions' | 'orgchart' | 'workflow' | 'appsettings' | 'collaboration'
export type AppShellTab = 'canvas' | 'dashboard' | 'agents' | 'tickets' | 'activity' | 'settings'

// ── Full store interface ──────────────────────────────────────────────────

export interface LaunchpadStore {
  // AppShell navigation tab
  activeTab: AppShellTab
  setActiveTab: (tab: AppShellTab) => void

  // Admin Panel
  adminTab: AdminTab
  setAdminTab: (tab: AdminTab) => void
  lastNewAgentId: string | null
  setLastNewAgentId: (id: string | null) => void

  // Org Settings backward compat
  showOrgSettings: boolean
  orgSettingsTab: 'agents' | 'workflow' | 'orgchart' | 'collaboration'
  setShowOrgSettings: (v: boolean) => void
  setOrgSettingsTab: (tab: 'agents' | 'workflow' | 'orgchart' | 'collaboration') => void

  // Projects
  projects: Project[]
  deletedProjects: Project[]
  deletedIds: string[]
  remoteLoaded: boolean
  fetchProjects: () => Promise<void>
  fetchPublicSettings: () => Promise<void>
  refreshAll: () => Promise<void>
  subscribeToProjects: () => () => void
  addProject: (project: Project) => Promise<void>
  removeProject: (id: string) => Promise<void>
  restoreProject: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  syncPositionToDb: (id: string, x: number, y: number, type?: string) => void
  tidyUp: () => Promise<void>
  subscribeToPositions: () => () => void
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  clearProjects: () => void

  // Ideas
  ideas: Idea[]
  ideaWidgetPosition: { x: number; y: number }
  fetchIdeas: () => Promise<void>
  subscribeToIdeas: () => () => void
  addIdea: (text: string, author: string) => Promise<void>
  deleteIdea: (id: string) => Promise<void>
  voteIdea: (id: string, sessionId: string) => Promise<void>
  setIdeaWidgetPosition: (x: number, y: number) => void

  // Filters & groups
  activeFilter: string | null
  groups: Group[]
  activeGroup: string | null
  setFilter: (tag: string | null) => void
  addGroup: (group: Omit<Group, 'id' | 'order'>) => void
  deleteGroup: (id: string) => void
  updateGroup: (id: string, updates: Partial<Omit<Group, 'id'>>) => void
  setProjectGroup: (projectId: string, groupId: string | null) => void
  setGroupFilter: (groupId: string | null) => void

  // Board settings
  boardName: string
  isPrivate: boolean
  setBoardName: (name: string) => void
  setPrivate: (v: boolean) => void

  // Auth
  currentUser: { username: string; role: 'admin' | 'member' | 'viewer' } | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>

  // Settings modal
  showSettings: boolean
  setShowSettings: (v: boolean) => void

  // Board members
  boardMembers: BoardMember[]
  fetchBoardMembers: () => Promise<void>
  inviteMember: (email: string, role: 'member' | 'viewer') => Promise<{ ok: boolean; error?: string }>
  removeMember: (email: string) => Promise<void>
  updateMemberRole: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<void>

  // Canvas helpers
  swapTarget: string | null
  setSwapTarget: (id: string | null) => void
  getAllCanvasObjects: () => CanvasObject[]
  pushOverlapping: (draggedId: string, dragX: number, dragY: number) => void

  // Build tasks
  activeBuildTasks: ActiveBuildTask[]
  subscribeToBuildTasks: () => () => void

  // Canvas agents
  canvasAgents: CanvasAgent[]
  addCanvasAgent: (name: string, tailorUrl?: string, botToken?: string, tailorConfig?: import('../types').AvatarConfig, agentMeta?: import('../types').AgentMeta | null) => Promise<void>
  updateCanvasAgent: (id: string, updates: Partial<Pick<CanvasAgent, 'name' | 'tailorUrl' | 'bot_token' | 'tailor_config' | 'agent_meta' | 'role' | 'skills' | 'model'>>) => Promise<void>
  removeCanvasAgent: (id: string) => Promise<void>
  updateAgentPosition: (id: string, x: number, y: number) => Promise<void>
  subscribeToAgents: () => () => void
  setAgentWorkingOn: (agentId: string, projectId: string | null) => Promise<void>
  returnAgentHome: (agentId: string) => Promise<void>

  // Lists
  lists: ListWidget[]
  fetchLists: () => Promise<void>
  subscribeToLists: () => () => void
  addList: (title: string, type: ListType) => Promise<void>
  removeList: (id: string) => Promise<void>
  addListItem: (listId: string, text: string, sessionId: string) => Promise<void>
  removeListItem: (listId: string, itemId: string) => Promise<void>
  toggleListItem: (listId: string, itemId: string) => Promise<void>
  voteListItem: (listId: string, itemId: string, sessionId: string) => Promise<void>
  moveListItem: (listId: string, itemId: string, direction: 'up' | 'down') => Promise<void>
  updateListPosition: (id: string, x: number, y: number) => void

  // Project metadata
  projectMetadata: Record<string, ProjectMeta>
  fetchProjectMetadata: () => Promise<void>

  // Capsules
  activeCapsuleId: string | null
  capsules: Capsule[]
  currentCapsule: Capsule | null
  switchCapsule: (id: string) => void
  fetchCapsules: () => Promise<void>
}
