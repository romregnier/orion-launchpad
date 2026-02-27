# FORGE_DONE_AVATAR_FIX.md

**Agent:** Forge  
**Date:** 2026-02-27  
**Mission:** Fix avatar Launchpad (cross-origin + preview réel)

---

## Grep checks

### ✅ postMessage tailor_avatar_update in the-tailor/src/
```
the-tailor/src/components/Panel.tsx:225: window.parent.postMessage(
the-tailor/src/components/Panel.tsx:226:   { type: 'tailor_avatar_update', agent: ..., config: ... }
```

### ✅ embed=1 in the-tailor/src/App.tsx
```
App.tsx:20: const isEmbed = params.get('embed') === '1'
```

### ✅ tailor_avatar_update in launchpad-repo OrionAvatar3D.tsx
```
OrionAvatar3D.tsx:13: if (e.data?.type === 'tailor_avatar_update' && e.data?.agent === 'orion')
```

### ✅ iframe the-tailor in launchpad-repo OrionAvatar3D.tsx
```
OrionAvatar3D.tsx:56: src={`https://the-tailor.surge.sh?embed=1&agent=orion&t=${ts}`}
```

---

## Build results

- `the-tailor`: ✅ tsc -b OK + npm run build OK
- `launchpad-repo`: ✅ tsc -b OK + npm run build OK

---

## Changes made

### The Tailor
- `src/components/Panel.tsx`: Added postMessage to parent after localStorage.setItem in `assignToAgent()`
- `src/App.tsx`: Added embed mode detection (`?embed=1`), loads agent config from localStorage, renders canvas-only full screen with transparent background

### Launchpad
- `src/components/OrionAvatar3D.tsx`: Replaced Three.js render with iframe pointing to `the-tailor.surge.sh?embed=1&agent=orion`. Listens to `tailor_avatar_update` postMessage to refresh iframe. Kept tooltip hover.
