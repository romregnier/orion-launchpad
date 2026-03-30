/**
 * Shared helper functions and row types used across store slices.
 */
import type { Project, ListWidget, CanvasAgent } from '../types'
import type { CanvasObject, Group } from './sliceTypes'

// ── Row types for DB mapping ─────────────────────────────────────────────────

export interface ProjectRow {
  id: string
  url: string
  title: string
  description: string | null
  image: string | null
  favicon: string | null
  added_by: string | null
  added_at: number | null
  position_x: number
  position_y: number
  color: string | null
  github: string | null
  tags: string[] | null
  group_id: string | null
}

/** Convert a DB row to a Project */
export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description ?? undefined,
    image: row.image ?? undefined,
    favicon: row.favicon ?? undefined,
    addedBy: row.added_by ?? undefined,
    addedAt: row.added_at ?? Date.now(),
    position: { x: row.position_x, y: row.position_y },
    color: row.color ?? undefined,
    github: row.github ?? undefined,
    tags: row.tags ?? [],
    groupId: row.group_id ?? undefined,
  }
}

/** Convert a Project to a DB row */
export function projectToRow(p: Project): Omit<ProjectRow, 'added_at'> & { added_at: number } {
  return {
    id: p.id,
    url: p.url,
    title: p.title,
    description: p.description ?? null,
    image: p.image ?? null,
    favicon: p.favicon ?? null,
    added_by: p.addedBy ?? 'human',
    added_at: p.addedAt,
    position_x: p.position.x,
    position_y: p.position.y,
    color: p.color ?? null,
    github: p.github ?? null,
    tags: p.tags ?? [],
    group_id: p.groupId ?? null,
  }
}

/** Build the list of canvas objects from store state slices */
export function getAllCanvasObjectsFromState(state: {
  projects: Project[]
  lists: ListWidget[]
  ideaWidgetPosition: { x: number; y: number }
  canvasAgents?: CanvasAgent[]
}): CanvasObject[] {
  const objects: CanvasObject[] = []
  state.projects.forEach(p => objects.push({ id: p.id, type: 'project', x: p.position.x, y: p.position.y, width: 280, height: 180 }))
  state.lists.forEach(l => objects.push({ id: l.id, type: 'list', x: l.position.x, y: l.position.y, width: 260, height: 200 }))
  objects.push({ id: 'idea-widget', type: 'idea', x: state.ideaWidgetPosition.x, y: state.ideaWidgetPosition.y, width: 240, height: 160 })
  state.canvasAgents?.forEach(a => objects.push({ id: a.id, type: 'agent', x: a.position.x, y: a.position.y, width: 80, height: 100 }))
  return objects
}

export const DEFAULT_GROUPS: Group[] = [
  { id: 'group-prod', name: 'En prod', color: '#22c55e', emoji: '🚀', order: 0 },
  { id: 'group-dev', name: 'En dev', color: '#3b82f6', emoji: '🔧', order: 1 },
  { id: 'group-ideas', name: 'Idées', color: '#f59e0b', emoji: '💡', order: 2 },
  { id: 'group-archived', name: 'Archivé', color: '#6b7280', emoji: '📦', order: 3 },
]
