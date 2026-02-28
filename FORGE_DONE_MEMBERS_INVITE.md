# FORGE_DONE_MEMBERS_INVITE.md

## Commit: `cc2e8bc`

## Statut des étapes

### ✅ ÉTAPE 1 — Table `board_members` dans Supabase
- Table créée avec UUID, email UNIQUE, role CHECK, status CHECK
- RLS activé avec 4 policies (read/insert/update/delete) pour public
- Romain (`romain@rive-studio.com`) inséré en admin/active

### ✅ ÉTAPE 2 — Actions dans `store.ts`
- `BoardMember` interface ajoutée dans `types.ts` et exportée
- `boardMembers: BoardMember[]` dans le store + partialize (cache local)
- `fetchBoardMembers()` — charge depuis Supabase
- `inviteMember(email, role)` — signUp Supabase Auth + insert board_members (JSDoc)
- `removeMember(email)` — delete board_members (JSDoc)
- `updateMemberRole(email, role)` — update board_members (JSDoc)
- `currentUser.role` étendu à `'admin' | 'member' | 'viewer'`

### ✅ ÉTAPE 3 — Section Membres dans `SettingsPanel.tsx`
- Visible uniquement si `currentUser?.role === 'admin'`
- Liste des membres avec emoji 👤/⏳, badge rôle coloré, statut actif/en attente
- Bouton ✕ pour remove (sauf admin courant)
- Formulaire : input email + Select rôle (member/viewer) + bouton "Inviter →"
- Feedback inline : spinner, "✅ Invitation envoyée !" ou erreur
- fetchBoardMembers au mount du panel

### ✅ ÉTAPE 4 — Callback invitation dans `App.tsx`
- `onAuthStateChange` mis à jour pour gérer `SIGNED_IN`
- Marque automatiquement le membre comme `active` si `status === 'pending'`

### ✅ ÉTAPE 5 — Rôles et permissions
- `isViewer` dans `ProjectCard.tsx` — drag désactivé pour viewers
- `canEdit` dans `Toolbar.tsx` — boutons +Agent, +Liste, +Ajouter masqués pour viewers

### ✅ ÉTAPE 6 — Build + Deploy
- Build TypeScript : zéro erreur
- Déployé sur https://orion-launchpad.surge.sh
- Push git : `cc2e8bc` sur `main`
