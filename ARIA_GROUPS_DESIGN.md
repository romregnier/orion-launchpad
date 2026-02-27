# ARIA_GROUPS_DESIGN.md
> Design spec by Aria — UX/UI Agent ✦

---

## Overview

A group/category system layered on top of the existing Launchpad infinite canvas. Groups are first-class objects: each has a name, emoji, and a custom color. They sit one level above tags in the filter hierarchy.

---

## 1. Group Pills Row

**Position:** Fixed, top of screen, just above the existing tag pills row. Same horizontal alignment (centered).

**Container:** Same glass pill style as the tag row — `background: rgba(15,12,20,0.85)`, `backdropFilter: blur(16px)`, `border: 1px solid rgba(255,255,255,0.07)`, `borderRadius: 999px`.

**Individual pill specs:**
- Height: 28px
- Border radius: 999px
- Padding: 4px 12px
- Font: Poppins, 11px, weight 600
- Gap between pills: 6px

**Inactive state:**
- Background: `{groupColor}33` (20% opacity)
- Border: `1px solid {groupColor}`
- Text: `{groupColor}`

**Active state:**
- Background: `{groupColor}` (full)
- Text: white
- Box-shadow: `0 0 12px {groupColor}66`

**Pill content:** `{emoji} {name}` — e.g. "🚀 Mangas.io"

**"+" button** sits at the very start (left) of the group row. Style: 28px circle, `background: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.12)`, icon `+` in white 60%. On hover: border color → accent `#E11F7B`.

---

## 2. Group Badge on Cards

A colored dot overlaid on each ProjectCard to signal group membership.

**Position:** `position: absolute`, `top: 12px`, `left: 12px`, `z-index: 10`

**Size:** 10px × 10px circle

**Style:**
```css
width: 10px;
height: 10px;
border-radius: 50%;
background: {groupColor};
border: 2px solid #2C272F; /* surface color */
box-shadow: 0 0 6px {groupColor}80;
```

**Multi-group:** If a project belongs to multiple groups, show up to 3 stacked dots (offset by 6px each) — like notification badges.

**Tooltip:** Hover over the dot → small tooltip shows the group name(s).

---

## 3. Group Assignment UX

**Primary flow — Right-click context menu:**

Right-clicking a ProjectCard opens a floating context menu:

```
┌─────────────────────────┐
│  📁 Assigner au groupe  │
│  ─────────────────────  │
│  🚀 Mangas.io       ✓  │
│  🎨 Design              │
│  🔧 Dev                 │
│  ─────────────────────  │
│  + Nouveau groupe       │
└─────────────────────────┘
```

- Menu style: `background: #3E3742`, `border: 1px solid rgba(255,255,255,0.1)`, `borderRadius: 12px`, `padding: 6px`
- Each group row: 32px height, emoji + name + checkmark if active
- Clicking a group toggles assignment (supports multi-group)
- Animation: scale from 0.9 → 1 + fade, spring stiffness:350 damping:28

**Secondary flow — Card action bar:**

When hovering a card and the action bar appears (bottom of card), add a small group icon button (folder icon) that opens the same context menu anchored to the button.

---

## 4. Create Group Flow

Triggered by the "+" button at the start of the group pills row.

**Animation:** An inline form expands from the "+" button using spring:
- Initial: `scale: 0, width: 28px, opacity: 0`
- Animate: `scale: 1, width: 260px, opacity: 1`
- Spring: `stiffness: 350, damping: 28`

**Form layout (inline, pill-shaped container):**
```
[ 😀 ] [ Group name...        ] [ ● ● ● ● ● ● ● ● ] [✓]
 emoji    text input              color swatches     confirm
```

- Emoji picker: clicking the emoji opens a small popover with a grid of 40 common emojis
- Name input: `font: Poppins 11px`, transparent background, white text, placeholder in white/30
- Color swatches: 8 small circles (12px), click to select, selected shows white ring
- Confirm: ✓ button with accent fill `#E11F7B`, or press Enter

**Validation:** Name required, color defaults to first in palette if none selected.

**On confirm:** New group pill appears with a spring entry animation (from scale 0.5 → 1).

---

## 5. Empty Group State

When filtering by a group that has no projects:

```
        {emoji}

   Aucun projet dans ce groupe

   [ + Ajouter un projet ]
```

- Emoji: 64px, centered
- Title: 17px, weight 600, `rgba(255,255,255,0.25)`
- Subtitle: 13px, `rgba(255,255,255,0.15)`: "Glissez un projet ici ou ajoutez-en un"
- CTA button: pill shape, `background: #E11F7B22`, `border: 1px solid #E11F7B`, text `#E11F7B`, "Ajouter un projet"
- CTA click → opens AddProjectModal with the group pre-selected

---

## 6. Group Color Palette

8 predefined colors, all vibrant enough to read on dark `#0B090D` background:

| # | Hex | Name |
|---|-----|------|
| 1 | `#E11F7B` | Magenta (accent) |
| 2 | `#7C3AED` | Violet |
| 3 | `#0EA5E9` | Sky blue |
| 4 | `#10B981` | Emerald |
| 5 | `#F59E0B` | Amber |
| 6 | `#EF4444` | Red |
| 7 | `#FF6B35` | Orange |
| 8 | `#A78BFA` | Lavender |

---

## 7. Data Model

```typescript
interface Group {
  id: string
  name: string
  emoji: string
  color: string // hex
  createdAt: number
}

// Project model extension
interface Project {
  // ...existing fields
  groupIds?: string[] // supports multi-group
}
```

---

## 8. Store Updates

```typescript
// Zustand store additions
groups: Group[]
activeGroupFilter: string | null
addGroup: (group: Omit<Group, 'id' | 'createdAt'>) => void
removeGroup: (id: string) => void
assignGroup: (projectId: string, groupId: string) => void
removeFromGroup: (projectId: string, groupId: string) => void
setGroupFilter: (groupId: string | null) => void
```

---

## 9. Filter Logic

Groups and tags are independent filters. Both can be active simultaneously:

```typescript
const visibleProjects = projects.filter(p => {
  const groupMatch = !activeGroupFilter || p.groupIds?.includes(activeGroupFilter)
  const tagMatch = !activeFilter || p.tags?.includes(activeFilter)
  return groupMatch && tagMatch
})
```

---

## 10. Accessibility

- Group pills: `role="tab"`, `aria-selected`, `aria-label="{name} group"`
- Badge dot: `aria-label="Group: {name}"`, `title="{name}"`
- Context menu: `role="menu"`, keyboard navigable (arrow keys + Enter)
- Color swatches: `aria-label="{colorName}"` + sufficient contrast on dark bg ✓

---

*Design by Aria ✦ — for Forge to implement*
