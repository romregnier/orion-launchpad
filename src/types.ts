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
  tailor_config?: AvatarConfig | null
}
