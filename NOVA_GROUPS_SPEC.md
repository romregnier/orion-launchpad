# NOVA_GROUPS_SPEC.md — Système de groupes pour le Launchpad

> Spec rédigée par Nova (CPO agent) — 2026-02-27

---

## 1. Qu'est-ce qu'un groupe ?

Un groupe est un **bucket nommé et coloré** permettant de classifier les projets selon leur statut ou nature. Contrairement aux tags (libres, multiples, descriptifs), un projet appartient à **un seul groupe** (exclusif).

Exemples : "En prod", "En dev", "Idées", "Archivé"

---

## 2. Affichage recommandé

### ✅ Approche choisie : Pill bar + badge sur carte

**Pourquoi pas les swimlanes ?**
Le Launchpad est un canvas libre (drag & drop positionnel). Les swimlanes briseraient ce paradigme et forceraient une grille rigide.

**Pourquoi pas les zones colorées ?**
Complexe à implémenter, difficile à maintenir quand les cartes bougent.

**Pourquoi la pill bar + badge ?**
- Cohérent avec l'UX des tags déjà en place
- Non-destructif : le canvas reste libre
- Badge coloré sur la carte = indication visuelle immédiate
- Pill bar au-dessus des tags = hiérarchie claire (groupe > tag)

### Layout

```
[ 🚀 En prod ] [ 🔧 En dev ] [ 💡 Idées ] [ 📦 Archivé ]  ← groupe filter row
[ react ] [ design ] [ ios ] [ backend ] ...               ← tag filter row (existant)
```

Chaque carte affiche un petit badge coloré (emoji + nom court) en haut à gauche ou en footer.

---

## 3. Groupes par défaut

| Emoji | Nom       | Couleur suggérée |
|-------|-----------|-----------------|
| 🚀    | En prod   | #22c55e (vert)  |
| 🔧    | En dev    | #3b82f6 (bleu)  |
| 💡    | Idées     | #f59e0b (ambre) |
| 📦    | Archivé   | #6b7280 (gris)  |

Les groupes sont modifiables : création, renommage, suppression, changement de couleur/emoji.

---

## 4. Assignment UX

**Option A (recommandée) :** Clic droit sur une carte → menu contextuel → "Déplacer vers..." → picker de groupe

**Option B :** Dans la modale d'édition du projet → champ "Groupe" avec dropdown

Les deux peuvent coexister. Option A est plus rapide pour les power users.

---

## 5. Logique de filtrage

- **Filtre groupe** : sélection exclusive (un seul groupe actif ou "Tous")
- **Filtre tag** : sélection multiple (existant)
- **Combinaison** : AND logic — seuls les projets du groupe sélectionné ET avec le tag sélectionné sont visibles
- Si groupe = "Tous" et tag = null → tout est visible (état par défaut)

---

## 6. Gestion des groupes

- **Créer** : bouton "+" à côté des pills de groupe → modal avec nom + couleur + emoji
- **Renommer** : double-clic sur la pill (ou menu contextuel)
- **Supprimer** : menu contextuel → confirmation → les projets du groupe passent en "Sans groupe"
- **Réordonner** : drag & drop des pills (ordre visuel seulement)

---

## 7. Data Model

### Type `Group`

```typescript
export interface Group {
  id: string
  name: string
  color: string   // hex color, e.g. "#22c55e"
  emoji: string   // e.g. "🚀"
  order: number   // for pill bar ordering
}
```

### Mise à jour de `Project`

```typescript
export interface Project {
  id: string
  title: string
  description: string
  url: string
  tags: string[]
  color: string
  position: { x: number; y: number }
  groupId?: string  // ← nouveau champ, optionnel
}
```

### Mise à jour du Store Zustand

```typescript
interface LaunchpadStore {
  // ... existing fields ...

  // Groups
  groups: Group[]
  activeGroup: string | null

  // Group actions
  addGroup: (group: Omit<Group, 'id'>) => void
  renameGroup: (id: string, name: string) => void
  deleteGroup: (id: string) => void
  updateGroup: (id: string, updates: Partial<Group>) => void
  setProjectGroup: (projectId: string, groupId: string | null) => void
  setGroupFilter: (groupId: string | null) => void
}
```

### Persistance

Groups persistés dans zustand `partialize` (comme projects) :

```typescript
partialize: (state) => ({
  projects: state.projects,
  groups: state.groups,
  deletedIds: state.deletedIds,
  deletedProjects: state.deletedProjects,
  ideas: state.ideas,
})
```

### Groupes par défaut (initialisation)

```typescript
groups: [
  { id: 'group-prod', name: 'En prod', color: '#22c55e', emoji: '🚀', order: 0 },
  { id: 'group-dev', name: 'En dev', color: '#3b82f6', emoji: '🔧', order: 1 },
  { id: 'group-ideas', name: 'Idées', color: '#f59e0b', emoji: '💡', order: 2 },
  { id: 'group-archived', name: 'Archivé', color: '#6b7280', emoji: '📦', order: 3 },
],
activeGroup: null,
```

---

## 8. Résumé des fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/types.ts` | Ajouter `Group` interface, `groupId?` sur `Project` |
| `src/store.ts` | Ajouter `groups`, `activeGroup`, actions groupe |
| `src/App.tsx` | Ajouter pill bar groupe au-dessus des tags, combiner filtres |
| `src/components/ProjectCard.tsx` | Afficher badge groupe, ajouter menu contextuel |
| `src/components/GroupBar.tsx` | Nouveau composant : pill bar des groupes |
| `src/components/GroupPicker.tsx` | Nouveau composant : picker groupe (dropdown/menu) |

---

*Nova CPO Agent ✦ — Handoff to Aria for design*
