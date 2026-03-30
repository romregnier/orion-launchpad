/**
 * store.ts — Entry point for the Launchpad Zustand store.
 * Combines all slices. Public exports remain unchanged for backward compatibility.
 *
 * TK-0182: Refactored from 1364-line monolith into 5 slices:
 *   - canvasSlice   → projects, lists, ideas, groups, positions
 *   - agentsSlice   → canvasAgents, build tasks
 *   - capsuleSlice  → capsules, switchCapsule
 *   - uiSlice       → navigation tabs, modals, admin tabs
 *   - realtimeSlice → placeholder for future realtime isolation
 */
import { create } from 'zustand'
import type { Project, ListWidget, ListType, CanvasAgent, BoardMember, Capsule } from './types'
import { supabase } from './lib/supabase'

// ── Re-export public types that components import from 'store' ─────────────
export type { AdminTab, AppShellTab } from './store/sliceTypes'
export type { CanvasObject, Group, Member, Idea, ActiveBuildTask } from './store/sliceTypes'

// ── Re-export LaunchpadStore interface ────────────────────────────────────
export type { LaunchpadStore } from './store/sliceTypes'

// ── Re-export LaunchpadState as alias (for slices that reference it) ──────
export type LaunchpadState = import('./store/sliceTypes').LaunchpadStore

// ── Cache versionné ───────────────────────────────────────────────────────
declare const __BUILD_VERSION__: string
const STORAGE_KEY = 'orion-launchpad-v4'
const VERSION_KEY = 'orion-launchpad-version'
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev'

try {
  const storedVersion = localStorage.getItem(VERSION_KEY)
  if (storedVersion && storedVersion !== BUILD_VERSION) {
    ;['orion-launchpad-v3', 'orion-launchpad-v4', 'bsw-canvas-pos'].forEach(k => {
      try { localStorage.removeItem(k) } catch { /* ignore */ }
    })
  }
  localStorage.setItem(VERSION_KEY, BUILD_VERSION)
} catch { /* ignore */ }

// ── findFreePosition — exported for backward compat ───────────────────────
export { findFreePosition } from './store/canvasHelpers'
export type { CanvasObject as CanvasObj } from './store/sliceTypes'

// ── CanvasObject re-export (already exported above via sliceTypes) ─────────
// NOTE: CanvasObject is already exported above

// ── Slice creators ────────────────────────────────────────────────────────
import { createCanvasSlice } from './store/canvasSlice'
import { createAgentsSlice } from './store/agentsSlice'
import { createCapsuleSlice } from './store/capsuleSlice'
import { createUiSlice } from './store/uiSlice'
import type { LaunchpadStore } from './store/sliceTypes'

// ── Store creation ────────────────────────────────────────────────────────
export const useLaunchpadStore = create<LaunchpadStore>()(
  (set, get, store) => ({
    ...createCanvasSlice(set, get, store),
    ...createAgentsSlice(set, get, store),
    ...createCapsuleSlice(set, get, store),
    ...createUiSlice(set, get, store),
  })
)

// ── Persist manuel ────────────────────────────────────────────────────────
let _lastSaved = ''
useLaunchpadStore.subscribe((state) => {
  const toSave = JSON.stringify({
    groups: state.groups,
    boardName: state.boardName,
    isPrivate: state.isPrivate,
    activeCapsuleId: state.activeCapsuleId,
  })
  if (toSave !== _lastSaved) {
    _lastSaved = toSave
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: JSON.parse(toSave) })) } catch { /* ignore */ }
  }
})

// Keep supabase accessible for components that import it via store (none currently but safety)
export { supabase }

// Suppress unused import warnings — these types flow through the store generics
export type { Project, ListWidget, ListType, CanvasAgent, BoardMember, Capsule }
