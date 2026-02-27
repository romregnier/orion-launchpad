# NOVA_LIST_SPEC.md — Generic ListWidget System

> Spec by Nova (CPO agent) · 2026-02-27

---

## 1. Overview

Replace the single hardcoded `IdeaWidget` with a generic **ListWidget** system that supports multiple user-created lists of different types on the canvas. Each list is a draggable card — consistent with IdeaWidget and ProjectCard patterns already in the codebase.

---

## 2. List Types

| Type        | Emoji | Color accent  | Use case                                 | Item extras         |
|-------------|-------|---------------|------------------------------------------|---------------------|
| `brainstorm`| 💡    | Amber #FFC107 | Open idea collection, voting encouraged  | votes, votedBy      |
| `checklist` | ✅    | Green #22C55E | Tasks & to-dos, items can be checked off | checked (boolean)   |
| `ranking`   | 🏆    | Gold #F59E0B  | Ordered list; items can be reordered     | order (number)      |
| `notes`     | 📝    | Indigo #818CF8| Free-form notes, no structure needed     | (none extra)        |

---

## 3. Data Model

### `ListWidget`

```ts
interface ListWidget {
  id: string                  // `list-${Date.now()}-${random}`
  title: string               // custom title set at creation
  type: 'brainstorm' | 'checklist' | 'ranking' | 'notes'
  createdBy: string           // sessionId (localStorage 'launchpad_session')
  position: { x: number; y: number }
  collapsed: boolean
  createdAt: string           // ISO timestamp
  items: ListItem[]
}
```

### `ListItem`

```ts
interface ListItem {
  id: string                  // `item-${Date.now()}-${random}`
  text: string
  author: string              // display name (from 'launchpad_username')
  createdBy: string           // sessionId — item-level ownership
  createdAt: string           // ISO timestamp

  // Type-specific fields (undefined when not applicable):
  votes?: number              // brainstorm only
  votedBy?: string[]          // brainstorm only — session IDs
  checked?: boolean           // checklist only
  order?: number              // ranking only
}
```

---

## 4. Store Shape

Add to `store.ts`:

```ts
// In LaunchpadStore interface:
lists: ListWidget[]
addList: (title: string, type: ListWidget['type'], sessionId: string, position?: { x: number; y: number }) => void
deleteList: (id: string, sessionId: string) => void   // noop if sessionId !== list.createdBy
updateListPosition: (id: string, x: number, y: number) => void
addListItem: (listId: string, text: string, author: string, sessionId: string) => void
deleteListItem: (listId: string, itemId: string, sessionId: string) => void  // noop if mismatch
voteListItem: (listId: string, itemId: string, sessionId: string) => void    // brainstorm only
toggleListItemChecked: (listId: string, itemId: string) => void              // checklist only
reorderListItem: (listId: string, itemId: string, direction: 'up' | 'down') => void  // ranking only
setListCollapsed: (id: string, collapsed: boolean) => void
```

Persist `lists` alongside `ideas` in the zustand persist config.

---

## 5. Creation Flow

### Primary: Toolbar "+" button (recommended)
- Add a **"+ New List"** button in the top toolbar (next to the existing group filters or settings icon).
- On click → opens a small modal/popover with:
  - **Title** text input (required, max 40 chars)
  - **Type** selector — 4 type cards with icon + label, one click to select
  - **Create** button
- On create: widget appears at center of current canvas viewport, offset slightly from existing widgets.

### Secondary: Keyboard shortcut `Shift+L` (optional, Phase 2)

### Why toolbar, not right-click?
- Canvas already has click-drag behavior; right-click context menus are easy to miss on mobile.
- Toolbar is always visible and consistent with existing UX.
- Simpler to implement.

---

## 6. Item Addition

Same pattern as IdeaWidget:
- Footer button "**+ Ajouter**" opens inline form at bottom of card.
- Form: `author` input (pre-filled from localStorage), `text` textarea.
- Submit on Enter (not Shift+Enter), or click button.
- For **checklist**: no author shown, just text (tasks are anonymous-ish).
- For **ranking**: new item added at end of order; can be moved up/down.

---

## 7. Delete Protection

### List-level delete
- Delete (🗑) icon shown in card header **only if** `sessionId === list.createdBy`.
- On click: confirmation prompt ("Supprimer cette liste ?") before removal.
- Renders as a subtle icon on hover, consistent with IdeaWidget's X button pattern.

### Item-level delete
- Delete (×) icon on each item, visible on hover.
- **Only renders** if `sessionId === item.createdBy`.
- No confirmation needed (same as current IdeaWidget behavior).

---

## 8. Voting

- **Brainstorm** lists only: show thumbs-up + vote count per item (identical to IdeaWidget).
- All other types: no voting (clean, type-appropriate UX).
- Vote toggle: one vote per session, same logic as `voteIdea`.

---

## 9. Visual Design

- Each type has a distinct **accent color** (see table above) used for:
  - Header background tint (`rgba(color, 0.06)`)
  - Border color (`rgba(color, 0.15)`)
  - Icon color
  - Vote/action button active state
- Dark base background `rgba(26,22,30,0.97)` — same as IdeaWidget.
- Width: 280px (same as IdeaWidget).
- Checklist items: text gets `text-decoration: line-through` + opacity when `checked`.
- Ranking items: show ↑↓ buttons on hover for reordering.

---

## 10. Migration / Backward Compatibility

- The existing `IdeaWidget` and its store slice (`ideas`, `addIdea`, etc.) **stay untouched** as a special pinned widget.
- New `ListWidget` system is additive — no breaking changes.
- Future: IdeaWidget could be refactored as a `brainstorm` ListWidget, but that's Phase 2.

---

## 11. Component Structure

```
src/
  components/
    ListWidget.tsx         # Main component (replaces nothing, adds new)
    ListWidgetItem.tsx     # Single item row (handles all type variants)
    NewListModal.tsx       # Creation modal/popover
  store.ts                 # + lists slice
  types.ts                 # + ListWidget, ListItem interfaces
```

---

## 12. Implementation Priority

1. Data model + store slice
2. `ListWidget.tsx` basic card (brainstorm type first, reuse IdeaWidget patterns)
3. `NewListModal.tsx` + toolbar button
4. Checklist type
5. Notes type  
6. Ranking type (most complex — drag-to-reorder or ↑↓ buttons)

---

*Nova out ✦*
