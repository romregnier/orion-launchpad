# NOVA_OVERLAP_SPEC.md
## Spec Fonctionnelle — Système Anti-Overlap Avancé du Launchpad

**Auteure :** Nova (CPO)
**Date :** 2026-02-27
**Version :** 1.0
**Status :** Prêt pour implémentation

---

## Contexte & Objectifs

Le système anti-overlap actuel du Launchpad est limité : il ne gère que les `ProjectCard`, ne propage pas les poussées, et n'offre pas de swap. Cette spec définit le nouveau système unifié couvrant tous les objets du canvas, avec propagation en cascade et swap élastique.

**Objectifs :**
- Unifier tous les objets du canvas dans un seul système de collision
- Implémenter une propagation complète (A pousse B → B pousse C → … jusqu'à stabilisation)
- Introduire le swap élastique pour simplifier la réorganisation
- Maintenir une performance fluide (60fps) même avec un canvas dense

---

## 1. Types d'Objets dans le Système

### 1.1 Définition des Types

| Type | Largeur | Hauteur | Notes |
|---|---|---|---|
| `ProjectCard` | 280px | 180px | Dimensions fixes |
| `ListWidgetCard` | 260px | variable (min 180px) | Hauteur dépend du contenu |
| `IdeaWidget` | 240px | variable (min 120px) | Hauteur dépend du contenu |

### 1.2 Interface commune : `CanvasObject`

Tout objet participantau système doit exposer cette interface :

```typescript
interface CanvasObject {
  id: string;
  type: 'ProjectCard' | 'ListWidgetCard' | 'IdeaWidget';
  x: number;         // position left (px, relative au canvas)
  y: number;         // position top (px, relative au canvas)
  width: number;     // largeur effective (px)
  height: number;    // hauteur effective (px)
  locked?: boolean;  // si true, ne peut pas être poussé
  zIndex?: number;   // ordre d'affichage
}
```

### 1.3 AABB (Axis-Aligned Bounding Box)

Le système travaille avec des rectangles AABB. Pour chaque objet :

```typescript
interface AABB {
  left:   x
  top:    y
  right:  x + width
  bottom: y + height
  centerX: x + width / 2
  centerY: y + height / 2
}
```

---

## 2. Règles de Poussée Mutuelle

### 2.1 Détection d'Overlap

Deux objets A et B sont **en overlap** si leurs AABB se chevauchent :

```
overlap = (A.left < B.right) && (A.right > B.left) &&
           (A.top < B.bottom) && (A.bottom > B.top)
```

Un padding minimum de **16px** est maintenu entre tous les objets (marge de confort visuel).

Donc l'overlap est détecté dès que la distance entre deux bords est **< 0px**, et la poussée vise à atteindre un gap de **16px** dans la direction de séparation.

### 2.2 Déclenchement de la Poussée

La poussée se déclenche lorsque :
- L'objet draggé (ou un objet poussé en cascade) chevauche un autre objet d'au moins **1px**
- L'objet cible n'est pas `locked`

### 2.3 Calcul de la Direction de Poussée

La poussée s'effectue selon le **vecteur entre les centres** des deux objets :

```typescript
function getPushVector(source: CanvasObject, target: CanvasObject): Vector2D {
  const dx = target.centerX - source.centerX;
  const dy = target.centerY - source.centerY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Cas dégénéré : centres identiques → pousse vers la droite par défaut
  if (length === 0) return { x: 1, y: 0 };

  return { x: dx / length, y: dy / length }; // vecteur normalisé
}
```

### 2.4 Calcul de la Distance de Poussée

La distance minimale à maintenir est calculée comme suit :

```typescript
function getMinDistance(source: CanvasObject, target: CanvasObject): number {
  // Distance minimale = somme des demi-dimensions + padding
  // On projette sur l'axe du vecteur de poussée
  const PADDING = 16;

  // Approche simplifiée : overlap depth + padding
  const overlapX = Math.min(source.right, target.right) - Math.max(source.left, target.left);
  const overlapY = Math.min(source.bottom, target.bottom) - Math.max(source.top, target.top);

  // Pousse sur l'axe de moindre résistance (plus petit overlap)
  if (overlapX < overlapY) {
    return overlapX + PADDING; // poussée horizontale
  } else {
    return overlapY + PADDING; // poussée verticale
  }
}
```

**Note :** La poussée préfère l'axe avec le **plus petit overlap** (chemin de moindre résistance), pas nécessairement la direction centre-à-centre. Cela évite les déplacements excessifs.

### 2.5 Propagation en Cascade

La propagation utilise une **itération BFS** (Breadth-First Search) pour éviter les cycles :

```
MAX_ITERATIONS = 20   // limite absolue anti-boucle infinie
CONVERGENCE_THRESHOLD = 0.5px  // si déplacement < seuil, on considère stabilisé
```

**Algorithme :**

```
1. Créer un snapshot de toutes les positions initiales
2. Placer l'objet draggé à sa nouvelle position
3. File = [objet draggé]
4. Visités = {id: objet draggé}
5. iterations = 0

TANT QUE file non vide ET iterations < MAX_ITERATIONS :
  source = file.shift()
  POUR chaque objet target dans allObjects :
    SI target.id ∈ visités → SKIP
    SI target.locked → SKIP
    SI overlap(source, target) :
      pushVector = calcul de la poussée
      Appliquer pushVector à target
      Ajouter target à visités
      Ajouter target à la file
  iterations++

6. Appliquer les nouvelles positions (avec animation CSS transition)
```

**Important :** Les objets visités ne sont pas re-poussés pendant la même passe, ce qui garantit la terminaison. Si des cycles résiduels existent (rare), `MAX_ITERATIONS` coupe court.

---

## 3. Règles de Swap Élastique

### 3.1 Définition

Le **swap élastique** est un échange de position entre la card draggée et une card cible lorsque le curseur se rapproche suffisamment du **centre** de la cible. Plutôt que de pousser la cible hors du chemin, les deux objets échangent leurs emplacements — c'est plus intuitif pour réorganiser.

### 3.2 Déclenchement : Swap vs Push

| Condition | Comportement |
|---|---|
| Centre de la card draggée à **> 40%** de la distance vers le centre cible | **Push** (poussée classique) |
| Centre de la card draggée à **≤ 40%** de la distance vers le centre cible | **Swap élastique** |

En pratique :

```typescript
const SWAP_THRESHOLD = 0.4; // 40% de la distance entre centres

function shouldSwap(dragged: CanvasObject, target: CanvasObject): boolean {
  const draggedCenter = { x: dragged.x + dragged.width/2, y: dragged.y + dragged.height/2 };
  const targetCenter  = { x: target.x + target.width/2,  y: target.y + target.height/2 };

  const dist = distance(draggedCenter, targetCenter);
  const threshold = Math.min(dragged.width, target.width) * SWAP_THRESHOLD;

  return dist < threshold;
}
```

### 3.3 Swap Visuel

Lorsque le swap est déclenché :

1. La **position initiale** de la card draggée (avant le drag) est enregistrée comme `draggedOrigin`
2. La cible **se téléporte avec animation** vers `draggedOrigin` (transition CSS 200ms ease-out)
3. La card draggée **continue de suivre le curseur** (pas de téléportation pendant le drag)
4. Au **drop**, la card draggée se pose à la position courante du curseur (ou snappée à la grille si applicable)

```
Avant swap :
  Dragged : position curseur (libre)
  Target  : position T

Pendant swap (drag en cours) :
  Dragged : suit le curseur
  Target  : animate vers draggedOrigin (position de départ du dragged)

Si drop :
  Dragged : se pose au curseur (position finale)
  Target  : reste à draggedOrigin

Si cancel :
  Dragged : retourne à draggedOrigin
  Target  : retourne à T (position initiale)
```

### 3.4 Priorité : Swap > Push

**Le swap a priorité sur le push.** Si un swap est déclenché avec la cible, la cible n'est PAS soumise à la propagation push. Elle est réservée pour le swap.

```
SI shouldSwap(dragged, target) :
  → Appliquer swap sur target
  → Ne pas inclure target dans la propagation push
SINON :
  → Appliquer push standard avec propagation
```

### 3.5 Swap en Chaîne — Cas Limites

Le swap est **limité à 1 cible à la fois** (la plus proche du centre draggé). Il n'y a pas de swap en chaîne : seul le dragged swap avec une cible, les autres objets subissent le push.

**Raison :** un swap en chaîne (A swap B, B swap C) serait visuellement désorientant et difficile à prévoir pour l'utilisateur.

---

## 4. Intégration avec le Drag

### 4.1 Pendant le Drag (`onDragMove`)

À chaque mouvement du curseur :

```
1. Mettre à jour la position temporaire de l'objet draggé
2. Identifier le candidat swap (si applicable)
3. Si swap candidat : animer la cible vers draggedOrigin
4. Sinon : lancer la propagation push (BFS, positions temporaires)
5. Appliquer les positions temporaires à tous les objets affectés
   → Utiliser des positions "draft" dans le store, pas les positions définitives
   → CSS transition: 150ms ease-out pour les objets poussés (fluidité)
   → Pas de transition sur l'objet draggé lui-même (suit le curseur sans lag)
```

**Performance :** Throttle à **60fps** (16ms) avec `requestAnimationFrame`. Ne pas lancer le BFS sur chaque pixel de mouvement.

### 4.2 Au Drop (`onDragEnd`)

```
1. Fixer la position de l'objet draggé (snapping à la grille si applicable)
2. Confirmer le swap si en cours (target garde sa nouvelle position)
3. Lancer une passe de stabilisation finale :
   → BFS complet sur tous les objets pour résoudre les overlaps résiduels
   → MAX_ITERATIONS = 20, mais on boucle jusqu'à convergence
4. Persister toutes les nouvelles positions dans le store (positions définitives)
5. Réinitialiser les positions "draft"
```

### 4.3 Cancel du Drag (`onDragCancel`)

```
1. Restaurer la position de l'objet draggé à draggedOrigin
2. Restaurer toutes les positions "draft" à leurs valeurs initiales (snapshot pris au début du drag)
3. Animer le retour avec transition CSS 250ms ease-in-out
```

**Note :** Le snapshot des positions initiales est pris **au début du drag** (`onDragStart`) pour garantir un retour propre même après une longue session de drag.

### 4.4 Structure du Store

```typescript
interface DragState {
  draggedId: string | null;
  draggedOrigin: { x: number; y: number } | null;
  initialSnapshot: Map<string, { x: number; y: number }>; // toutes les positions au début du drag
  draftPositions: Map<string, { x: number; y: number }>;  // positions temporaires pendant le drag
  swapCandidateId: string | null;
}
```

---

## 5. Cas Limites

### 5.1 Objets en Bord de Canvas

Le canvas a des dimensions définies (`canvasWidth`, `canvasHeight`). Aucun objet ne peut être poussé en dehors des limites visibles.

**Règle :**

```typescript
const CANVAS_PADDING = 8; // marge intérieure minimale

function clampToCanvas(obj: CanvasObject): { x: number; y: number } {
  return {
    x: Math.max(CANVAS_PADDING, Math.min(obj.x, canvasWidth - obj.width - CANVAS_PADDING)),
    y: Math.max(CANVAS_PADDING, Math.min(obj.y, canvasHeight - obj.height - CANVAS_PADDING)),
  };
}
```

**Conséquence :** Si le canvas est trop dense (beaucoup d'objets), la propagation peut ne pas trouver de position valide. Dans ce cas, le système stabilise avec les meilleures positions trouvées, sans forcer les objets hors du canvas. Un léger overlap résiduel est acceptable plutôt qu'une sortie des limites.

### 5.2 Objets Verrouillés

Si la feature `locked` existe, un objet `locked: true` :
- **Ne peut pas être poussé** (ignoré par le BFS)
- **Ne peut pas être draggé** (géré par le composant drag)
- **Peut bloquer** la propagation (les autres objets s'arrêtent à sa frontière + padding)

Les objets verrouillés participent à la détection de collision mais pas au déplacement.

### 5.3 Performance — Limites et Optimisations

| Scénario | Objets | Comportement attendu |
|---|---|---|
| Canvas normal | < 50 objets | 60fps, BFS complet |
| Canvas dense | 50–150 objets | 60fps avec throttle, BFS limité à voisinage proche |
| Canvas très dense | > 150 objets | Dégradation acceptée, MAX_ITERATIONS réduit à 10 |

**Optimisations recommandées :**

1. **Spatial partitioning (quadtree ou grille)** : ne tester les collisions qu'avec les objets dans un rayon de `2 × maxObjectSize` (~560px) autour de l'objet en mouvement
2. **Dirty flag** : ne recalculer que les objets dont la position a changé depuis la dernière frame
3. **Batch updates** : mettre à jour toutes les positions en une seule passe DOM via le store (éviter les re-renders individuels)
4. **CSS transform** : utiliser `transform: translate(x, y)` plutôt que `left/top` pour les animations (compositing GPU)

**Seuil de dégradation gracieuse :**
- Si `objects.length > 100` : désactiver l'animation des objets poussés (positionnement instantané)
- Si `objects.length > 200` : désactiver la propagation au-delà de 2 niveaux de profondeur

---

## 6. API du Store — Résumé des Méthodes

```typescript
// Existant à remplacer/étendre
pushOverlapping(draggedId: string, x: number, y: number): void
// → Remplacer par les méthodes ci-dessous

// Nouvelles méthodes
startDrag(draggedId: string): void
// Prend le snapshot initial de toutes les positions

updateDragPosition(draggedId: string, x: number, y: number): void
// Calcule swap candidate + propagation push, met à jour draftPositions

commitDrop(draggedId: string, finalX: number, finalY: number): void
// Stabilisation finale + persistance

cancelDrag(draggedId: string): void
// Restaure le snapshot initial

getEffectivePositions(): Map<string, { x: number; y: number }>
// Retourne draftPositions si drag en cours, sinon positions définitives
```

---

## 7. Priorités d'Implémentation

| Phase | Scope | Effort estimé |
|---|---|---|
| **Phase 1** | Unifier les 3 types dans `pushOverlapping` existant | 0.5j |
| **Phase 2** | Propagation BFS (cascade complète) | 1j |
| **Phase 3** | Swap élastique | 1j |
| **Phase 4** | Clamp canvas + objets locked | 0.5j |
| **Phase 5** | Optimisations perf (spatial partitioning) | 1j |

**Total estimé : ~4 jours de dev.**

---

## 8. Questions Ouvertes

1. **Grille de snapping :** Le Launchpad a-t-il une grille ? Si oui, les positions après push/swap doivent-elles se snapper à la grille ?
2. **Hauteur variable des widgets :** Les `ListWidgetCard` et `IdeaWidget` ont une hauteur variable. Le store doit-il exposer la hauteur réelle (DOM) ou une hauteur estimée ?
3. **Undo/Redo :** Le drop après un swap doit-il être undoable en une seule action ?
4. **Canvas scrollable :** Si le canvas est plus grand que le viewport, faut-il auto-scroller pendant le drag quand l'objet approche du bord ?

---

*Spec rédigée par Nova — Prête pour review et implémentation. Questions → pinger Nova ou Romain directement.*
