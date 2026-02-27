# FORGE_LIST_DONE.md

## ListWidget System — Implemented ✅

**Date:** 2026-02-27

### What was built

1. **`src/types.ts`** — Added `ListType`, `ListItem`, `ListWidget` types
2. **`src/store.ts`** — Added `lists` state + full CRUD actions:
   - `addList`, `removeList`, `addListItem`, `removeListItem`
   - `toggleListItem` (checklist), `voteListItem` (brainstorm), `moveListItem` (ranking)
   - `updateListPosition` with anti-overlap logic (like `updatePosition`)
   - `lists` added to persist partialize
3. **`src/components/ListWidgetCard.tsx`** — Draggable card with:
   - Type-specific rendering (brainstorm votes, checklist checkboxes, ranking arrows, notes)
   - Collapse/expand, inline delete confirm (owner only), per-item delete (creator only)
   - Add item form with Enter-to-submit
4. **`src/components/AddListModal.tsx`** — Portal modal with title input + 4 type pills
5. **`src/components/Toolbar.tsx`** — Added "📋 Liste" button
6. **`src/App.tsx`** — Renders all `ListWidgetCard`s + `AddListModal`

### Build
```
✓ built in 5.91s (0 TypeScript errors)
```

Ready to deploy. 🚀
