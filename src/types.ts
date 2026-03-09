export const AGENT_META: Record<string, { emoji: string; color: string; glow: string }> = {
  orion: { emoji: '🌟', color: '#E11F7B', glow: 'rgba(225,31,123,0.4)' },
  nova:  { emoji: '✦',  color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)' },
  aria:  { emoji: '🎨', color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)' },
  forge: { emoji: '🔧', color: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
  rex:   { emoji: '🛡️', color: '#10B981', glow: 'rgba(16,185,129,0.4)' },
}

export interface Capsule {
  id: string
  name: string
  description?: string
  color: string
  emoji: string
  owner_id?: string
  created_at?: string
}

export interface Project {
  id: string
  url: string
  title: string
  description?: string
  image?: string
  favicon?: string
  addedBy?: string // agent name or 'human'
  addedAt: number
  position: { x: number; y: number }
  color?: string // accent color
  github?: string // GitHub repo URL
  tags?: string[] // tags displayed as pills
  groupId?: string // assigned group
}

export type ListType = 'brainstorm' | 'checklist' | 'ranking' | 'notes'

export interface ListItem {
  id: string
  text: string
  createdBy: string
  createdAt: number
  checked?: boolean
  votes?: number
  votedBy?: string[]
  order?: number
}

export interface ListWidget {
  id: string
  title: string
  type: ListType
  createdBy: string
  createdAt: number
  position: { x: number; y: number }
  items: ListItem[]
}

export interface CanvasState {
  offsetX: number
  offsetY: number
  scale: number
}

export interface AvatarConfig {
  bodyShape?: string
  color?: { h: number; s: number; l: number }
  eyes?: string
  eyeColor?: string
  blush?: string
  mouth?: string
  armor?: string
  headgear?: string
  earPiece?: string
  animation?: string
  skinPattern?: string
  ambiance?: string
  bodyScale?: number
  celShading?: boolean
}

export interface BoardMember {
  id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  invitedBy?: string
  invitedAt: string
  joinedAt?: string
  status: 'pending' | 'active' | 'revoked'
}

export interface AgentMeta {
  role?: string
  personality?: string
  system_prompt?: string
  permissions?: string[]
  authorized_projects?: string[]
  model?: string  // LLM model override (ex: 'claude-haiku-4-5', 'claude-sonnet-4-6')
}

export interface CanvasAgent {
  id: string
  owner: string
  name: string
  tailorUrl?: string
  bot_token?: string
  agent_key?: string
  is_system?: boolean
  position: { x: number; y: number }
  working_on_project?: string | null
  home_x?: number | null
  home_y?: number | null
  tailor_config?: AvatarConfig | null
  agent_meta?: AgentMeta | null
  // Org Settings extensions
  role?: string | null
  skills?: string[] | null
  model?: string | null
  can_spawn?: string[] | null
  can_be_spawned_by?: string[] | null
  status?: 'online' | 'idle' | 'offline' | null
  entity_type?: 'ai' | 'human' | null
  telegram_chat_id?: string | null
}

export interface WorkflowRule {
  id: string
  name: string
  trigger_event: string
  trigger_agent: string | null
  action_type: 'spawn' | 'notify' | 'deploy' | 'update_ticket' | 'add_label' | 'send_summary'
  action_agent: string | null
  conditions: Record<string, unknown>
  project: string | null
  priority: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface OrgRelationship {
  id: string
  from_agent: string
  to_agent: string
  relationship_type: 'reports_to' | 'spawns' | 'collaborates' | 'reviews'
  channel: 'telegram' | 'sessions_send' | 'file' | 'direct' | null
  project: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Chat — TK-0208
// ─────────────────────────────────────────────────────────────────────────────

/** Message stocké dans la table `agent_chat_messages` (utilisée par AgentChatPanel) */
export interface AgentChatMessage {
  id: string
  agent_key: string
  role: 'user' | 'agent' | 'system'
  message: string
  user_id?: string | null
  read_by_agent: boolean
  created_at: string
}

/** Session de conversation agent↔user ou agent↔agent (`agent_conversations`) */
export interface AgentConversation {
  id: string
  agent_key: string
  title?: string | null
  project?: string | null
  status: 'active' | 'archived' | 'closed'
  created_at: string
  updated_at: string
}

/** Message dans une conversation structurée (`agent_direct_messages`) */
export interface AgentDirectMessage {
  id: string
  conversation_id: string
  role: 'user' | 'agent' | 'system'
  content: string
  agent_key: string
  metadata: Record<string, unknown>
  created_at: string
}
