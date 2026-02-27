# ARIA_OVERLAP_SPEC.md
# Spec Visuelle — Système Anti-Overlap Amélioré
**Auteure :** Aria (UX/Design)
**Date :** 2026-02-27
**Scope :** Launchpad Canvas — ProjectCard, ListWidgetCard, IdeaWidget

---

## Design Tokens de Référence

```
Spring standard      → stiffness: 350, damping: 28
Spring anti-overlap  → stiffness: 300, damping: 30
Accent               → #E11F7B
Background           → #0B090D
Surface              → #2C272F
```

---

## 1. Animation du Push

### Hiérarchie des springs selon le niveau de propagation

Le push en cascade doit se ressentir comme une onde : direct = ferme, indirect = doux.

| Niveau | Rôle | Spring params | Délai |
|--------|------|---------------|-------|
| 0 — Source | La card draggée elle-même | N/A (suit le curseur) | — |
| 1 — Push direct | Card immédiatement poussée | `stiffness: 300, damping: 30` | 0ms |
| 2 — Propagation | Card poussée par une card poussée | `stiffness: 240, damping: 32` | +30ms par niveau |
| 3+ — Onde lointaine | Chaque niveau supplémentaire | `stiffness: 180, damping: 34` | +30ms cumulatif |

**Règle :** chaque niveau réduit la stiffness de ~20% et augmente le damping de ~2. Max 4 niveaux de propagation (au-delà, pas d'animation visible).

### Feel global
- **Push direct :** réactif, quasi-instantané. L'utilisateur doit sentir que sa card *commande* l'espace.
- **Propagation :** légèrement retardée, comme si les cards "prenaient conscience" qu'elles doivent bouger.
- **Pas de durée fixe** — on laisse le spring converger naturellement (typiquement 300–500ms selon le niveau).

### Indicateur visuel pendant le push

```
Card poussée (niveau 1) :
  - opacity: 0.85  (légère transparence pour signaler qu'elle "cède")
  - border: 1px solid rgba(225, 31, 123, 0.35)  (glow accent subtil)
  - transition: opacity instant, border instant

Card propagation (niveau 2+) :
  - opacity: 0.75
  - border: 1px solid rgba(225, 31, 123, 0.15)  (plus discret)
  - Pas de box-shadow pour ne pas surcharger
```

> **Rationale :** On veut que l'utilisateur *sente* la résistance sans que ça devienne visuellement bruyant. Le glow accent ancre le système dans l'identité de la marque.

---

## 2. Animation du Swap

### Visualisation de l'échange

Le swap doit être **lisible** : les deux cards doivent clairement se croiser, pas juste téléporter.

**Trajectoire recommandée :** arc léger plutôt que ligne droite.
- Card A (draggée) → suit le curseur
- Card B (cible) → animation spring vers la position d'origine de A

```
Swap spring :
  stiffness: 260, damping: 24  // Plus élastique que le push → rebond visible
```

Le `damping: 24` (sous le seuil critique) produit un léger overshoot (~5–8px) avant de se stabiliser. C'est intentionnel : ça rend le swap *satisfaisant*.

### Zone fantôme (Ghost Zone) ✅ Recommandé

Afficher une zone fantôme à la position cible **pendant le drag** :

```
Ghost zone :
  background: rgba(225, 31, 123, 0.08)
  border: 1.5px dashed rgba(225, 31, 123, 0.45)
  border-radius: identique à la card cible
  animation: pulse opacity 1.2s ease-in-out infinite
    → opacity 0.45 → 0.20 → 0.45

Apparition : fade-in 150ms ease-out quand swap devient "imminent"
             (distance card draggée < seuil swap, ex: 40% overlap)
Disparition : fade-out 100ms ease-in au drop
```

> **Rationale :** La ghost zone dit à l'utilisateur "si tu lâches ici, ça ira là". C'est un contrat visuel clair. Le pulse subtil attire l'œil sans agresser.

### Courbe du swap

Utiliser le **spring** (pas ease-in-out). Le spring est cohérent avec le reste du système et plus vivant.

```js
// Config spring swap
{ stiffness: 260, damping: 24, mass: 1 }
```

Pas de courbe Bézier custom — le spring suffit et assure la cohérence.

---

## 3. Feedback Drag

### Surbrillance de la card cible

Quand un swap est imminent (overlap > seuil) :

```
Card cible :
  box-shadow: 0 0 0 2px #E11F7B, 0 0 16px rgba(225, 31, 123, 0.30)
  background: légère teinte → mix(#2C272F, #E11F7B, 4%)  // ≈ #30272F
  transition: box-shadow 120ms ease-out, background 120ms ease-out
```

Quand le swap n'est plus imminent (card draggée s'éloigne) :
```
  transition: box-shadow 200ms ease-in, background 200ms ease-in
  → retour à l'état normal
```

> Couleur choisie : accent `#E11F7B`. Pas de vert/bleu — on reste dans la palette.

### Curseur

```
État neutre sur une card     → cursor: grab
Mousedown / début drag       → cursor: grabbing
Swap imminent (overlap > %)  → cursor: grabbing  (pas de cursor custom swap)
```

**Note :** Un "swap cursor" custom serait fun mais risque d'être incohérent entre OS/navigateurs. On garde `grabbing` et on laisse le feedback visuel de la card cible faire le travail.

### Card draggée (état lifted)

```
Card draggée :
  transform: scale(1.04)
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(225, 31, 123, 0.20)
  opacity: 1.0  (pleine opacité — c'est la "vraie" card)
  z-index: élevé (au-dessus de tout)
  transition: transform 120ms ease-out, box-shadow 120ms ease-out  (au pickup)
```

Le scale `1.04` signale que la card est "tenue". L'ombre profonde la détache du canvas. Le border accent subtil la rattache au système de couleurs.

---

## 4. État de Stabilisation (Post-Drop)

### Animation "settle"

Au moment du drop, toutes les cards en mouvement doivent converger vers leur position finale.

**Phase 1 — Drop immédiat (0–50ms) :**
- La card draggée "claque" en position avec son spring propre
- Les cards poussées continuent leur spring naturellement

**Phase 2 — Settle global (50–400ms) :**
- Toutes les cards en état `pushed` ou `swapped` terminent leur animation spring
- Chaque card repasse en opacité 1.0 (fade-in 150ms ease-out)
- Le border glow s'efface (150ms ease-in)
- La ghost zone disparaît (100ms ease-in)

**Phase 3 — Stabilisation visuelle (400–500ms) :**
```
Card nouvellement positionnée :
  micro-pulse : scale 1.0 → 1.015 → 1.0
  duration: 200ms, spring { stiffness: 400, damping: 20 }
```

Ce micro-pulse dit "je suis arrivée, je suis là". Optionnel mais recommandé pour ProjectCard et IdeaWidget (les cards "nobles"). ListWidgetCard peut l'avoir aussi si elle est suffisamment grande.

### Durées totales recommandées

| Action | Durée perçue | Notes |
|--------|-------------|-------|
| Push simple (1 card) | ~250ms | Snappy |
| Push cascade (3 cards) | ~350ms | Fluide |
| Swap | ~400ms | Satisfaisant |
| Settle global post-drop | ~500ms max | Au-delà = trop lent |

> **Règle d'or :** Si l'animation dure plus de 600ms, l'utilisateur perçoit une *latence*, pas une *fluidité*. Les springs trop lents ou trop peu dampés peuvent dépasser ce seuil — surveiller en dev.

---

## 5. Cohérence Entre Types d'Objets

### Principe : même feel, même langage

ProjectCard, ListWidgetCard et IdeaWidget partagent **exactement les mêmes spring params et états visuels**. Le système ne distingue pas les types d'objets — il distingue les *rôles* (dragged / pushed / target).

### Gestion des tailles différentes pour le swap

Si deux cards ont des tailles différentes (ex: IdeaWidget petit vs ProjectCard grand) :

**Règle 1 — La ghost zone s'adapte**
```
Ghost zone = dimensions de la card cible, pas de la card draggée
→ L'utilisateur voit exactement où sa card va "atterrir"
```

**Règle 2 — L'échange de positions, pas de tailles**
Le swap échange les *positions (x, y)* uniquement. Les dimensions restent inchangées. Il n'y a pas d'animation de resize.

**Règle 3 — Overlap asymétrique accepté**
Après un swap entre cards de tailles différentes, un overlap visuel est possible temporairement. Le système anti-overlap se re-déclenche automatiquement pour résoudre en cascade. C'est feature, pas bug — ça crée un effet domino satisfaisant.

**Règle 4 — Z-index cohérent**
```
Dragging  → z: 1000
Swapping  → z: 100
Pushed    → z: 50
Idle      → z: 1  (ou défini par l'ordre d'ajout)
```

### Tokens visuels partagés (résumé)

```css
/* État idle */
--card-opacity-idle: 1.0;
--card-shadow-idle: 0 2px 8px rgba(0,0,0,0.3);

/* État pushed */
--card-opacity-pushed: 0.85;
--card-border-pushed: 1px solid rgba(225, 31, 123, 0.35);

/* État dragging */
--card-scale-dragging: 1.04;
--card-shadow-dragging: 0 12px 40px rgba(0,0,0,0.55);

/* État swap-target */
--card-shadow-swap-target: 0 0 0 2px #E11F7B, 0 0 16px rgba(225,31,123,0.30);

/* Ghost zone */
--ghost-bg: rgba(225, 31, 123, 0.08);
--ghost-border: 1.5px dashed rgba(225, 31, 123, 0.45);
```

---

## Annexe — Spring Params Recap

| Usage | stiffness | damping | Effet |
|-------|-----------|---------|-------|
| Standard (référence) | 350 | 28 | Snappy, critique |
| Push direct | 300 | 30 | Légèrement plus doux |
| Push niveau 2 | 240 | 32 | Doux |
| Push niveau 3+ | 180 | 34 | Très doux |
| Swap | 260 | 24 | Élastique, overshoot léger |
| Micro-pulse settle | 400 | 20 | Vif, rebond mini |

---

*Spec rédigée par Aria — Pour questions ou itérations, ping Aria.*
