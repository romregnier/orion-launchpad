# FORGE_DONE_RESPONSIVE.md
Date: 2026-03-01
Agent: Forge

## Build Status
- `tsc -b` → ✅ 0 erreurs
- `npm run build` → ✅ succès (built in 2.73s)

## Fixes appliqués

### B2 — BuildStatusWidget off-screen sur mobile ✅
**Fichier :** `src/components/BuildStatusWidget.tsx`
```
52: const DEFAULT_POS = { x: 20, y: 80 }
60: if (typeof window !== 'undefined' && parsed.x > window.innerWidth * 0.8) {
61:   return DEFAULT_POS
```
- DEFAULT_POS.x changé de 1050 à 20
- Viewport check ajouté : si position sauvegardée > 80% de window.innerWidth → reset

### B3 — Touch targets toolbar < 44px ✅
**Fichier :** `src/components/Toolbar.tsx`
```
345: width: isMobile ? 40 : 32,
346: height: isMobile ? 40 : 32,
```
- Taille des boutons sur mobile : 28px → 40px (hitbox min 40×40)

### B4 — isMobile non réactif au resize ✅
**Fichier :** `src/components/Toolbar.tsx`
```
152: const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640)
153: const [isVerySmall, setIsVerySmall] = useState(typeof window !== 'undefined' && window.innerWidth < 380)
157:   setIsMobile(window.innerWidth < 640)
160: window.addEventListener('resize', handleResize)
```
- isMobile converti en state React avec useEffect + resize listener

### B5 — GroupBar scroll mobile ✅
**Fichier :** `src/App.tsx`
```
305: overflowX: 'auto',
306: scrollbarWidth: 'none',
307: WebkitOverflowScrolling: 'touch',
```
- overflow: 'hidden' → overflowX: 'auto' + scrollbarWidth + touch scroll

### B6 — Color swatches trop petits ✅
**Fichier :** `src/components/SettingsPanel.tsx`
```
335: width: 28, height: 28, borderRadius: '50%', background: c,
```
- Swatches de couleur : 20px → 28px

### B7 — Navbar droite overflow ✅
**Fichier :** `src/App.tsx`
```
249: style={{ flex: '0 1 auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, pointerEvents: 'all', overflow: 'hidden', minWidth: 0 }}
```
- Section droite header : flex: '0 1 auto', overflow: 'hidden', minWidth: 0

### B8 — SettingsPanel animation hors viewport ✅
**Fichier :** `src/components/SettingsPanel.tsx`
```
109: initial={{ x: '100%' }}
111: exit={{ x: '100%' }}
```
- Animation slide-in : x: 380 → x: '100%'
