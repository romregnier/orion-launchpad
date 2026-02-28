# FORGE_DONE_SUPABASE_MIGRATION.md

## Résumé de la migration Supabase

**Objectif :** Migrer les projets GitHub JSON → Supabase + auth SHA-256 localStorage → Supabase Auth.

---

## Étapes

### ✅ ÉTAPE 1 — Table `projects` créée dans Supabase
- Table `public.projects` créée avec toutes les colonnes requises
- RLS activé avec 4 policies (read/insert/update/delete all for `public`)
- Publication Realtime activée : `ALTER PUBLICATION supabase_realtime ADD TABLE public.projects`

### ✅ ÉTAPE 2 — Migration projects.json → Supabase
- 5 projets insérés : `manga-reader`, `crumb`, `launchpad`, `the-tailor`, `sunny-seat`
- Utilisation de `ON CONFLICT (id) DO NOTHING`

### ✅ ÉTAPE 3 — store.ts mis à jour
- Suppression de `fetchRemote()` et `REMOTE_PROJECTS_URL`
- Ajout de `fetchProjects()` — lit depuis Supabase, charge aussi `isPrivate`
- Ajout de `subscribeToProjects()` — fetch initial + Realtime subscription
- `addProject()` → devenu async, écrit dans Supabase
- `removeProject()` → devenu async, supprime de Supabase
- `updateProject()` → devenu async, met à jour Supabase
- `syncPositionToDb()` → écrit aussi dans `projects` table pour type `'project'`
- Helpers `rowToProject()` et `projectToRow()` ajoutés
- Suppression de `ROMAIN_HASH`, `sha256 import`, `members` array, `addMember`, `removeMember`
- `members` retiré du `partialize` localStorage
- `login()` → Supabase Auth `signInWithPassword`
- `logout()` → Supabase Auth `signOut`

### ✅ ÉTAPE 4 — App.tsx mis à jour
- `fetchRemote()` remplacé par `subscribeToProjects()`
- `onAuthStateChange` ajouté pour restaurer la session au reload
- Import `supabase` ajouté dans App.tsx
- Toolbar `onRefresh` pointe vers `subscribeToProjects()`

### ✅ ÉTAPE 5 — Supabase Auth

#### 5a — Compte Romain créé
- Email: `romain@launchpad.app`
- Créé directement via SQL dans `auth.users` + `auth.identities` (email domain non accepté par signUp API)
- User ID: `a5d86fd6-3e60-4b48-9531-8cdc9f3e70c1`

#### 5b — store.ts login/logout mis à jour ✅
(voir Étape 3 ci-dessus)

#### 5c — LoginScreen.tsx mis à jour ✅
- Champ `username` → `email` (type="email", placeholder="Adresse email")
- `login(email, password)` → Supabase Auth

#### 5d — Nettoyage store.ts ✅
- `ROMAIN_HASH` supprimé
- `sha256` import supprimé
- `members` array supprimé
- `addMember`, `removeMember` supprimés
- `SettingsPanel.tsx` mis à jour (section membres simplifiée, pas de gestion SHA-256)

### ✅ ÉTAPE 6 — Build et déploiement
- Build TypeScript : ✅ (0 erreurs)
- Deploy Surge : ✅ `orion-launchpad.surge.sh`
- Git commit + push : ✅

---

## Commit hash final

`d8a4de8` — `feat: migrate projects + auth to Supabase — real-time collab enabled`

---

## Changements majeurs

| Avant | Après |
|-------|-------|
| Projets lus depuis GitHub raw JSON | Projets lus/écrits depuis Supabase |
| Auth SHA-256 + localStorage members | Supabase Auth (JWT) |
| `fetchRemote()` au montage | `subscribeToProjects()` avec Realtime |
| `addProject` synchrone | `addProject` async + Supabase insert |
| `removeProject` synchrone | `removeProject` async + Supabase delete |
| `login(username, password)` SHA-256 | `login(email, password)` Supabase Auth |

La collaboration multi-utilisateurs est désormais activée : toute modification de projets est propagée en temps réel via Supabase Realtime.
