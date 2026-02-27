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

export interface CanvasState {
  offsetX: number
  offsetY: number
  scale: number
}
