# Forge — P0 Screenshots + Push Notifications ✅

**Date :** 2026-02-28  
**Agent :** Forge  
**Deploy :** https://orion-launchpad.surge.sh

---

## Mission A — Screenshots Projets + Supabase Storage ✅

### A1 — Script VPS `scripts/screenshot-project.js`
- Screenshot via Playwright Chromium headless (1280×800)
- Upload vers Supabase Storage bucket `screenshots`
- Upsert dans `project_metadata`
- Usage : `PLAYWRIGHT_BROWSERS_PATH=/home/clawadmin/.playwright node scripts/screenshot-project.js <url> <project_id>`

### A2 — Hook React `useProjectMeta`
- `src/hooks/useProjectMeta.ts`
- Fetch initial + subscribe Realtime `project_metadata`
- Interface : `{ project_id, screenshot_url, ai_meta, ai_analyzed_at }`

### A3 — ProjectCard amélioré
- Screenshot affiché en priorité sur l'OG image
- Badge health score circulaire (vert/orange/rouge) en haut à droite
- Bouton 📸 dans la barre d'actions hover
- `src/lib/triggerScreenshot.ts` créé (TODO: Edge Function)

### A4 — BuildStatusWidget miniature
- Si `task.screenshot_url` présent → miniature 48×32 affichée dans la liste

### ⚠️ Bucket Supabase Storage
- La clé `anon` ne peut pas créer de buckets (RLS)
- **Action manuelle requise :** créer le bucket `screenshots` (public) via https://supabase.com/dashboard/project/tpbluellqgehaqmmmunp/storage/buckets

---

## Mission B — Push Notifications ✅

### B1 — Clés VAPID générées
- Stockées dans `/home/clawadmin/.openclaw/workspace/VAPID_KEYS.md` (⚠️ ne pas committer)
- Clé publique intégrée dans `usePushNotifications.ts`

### B2 — Service Worker `public/sw.js`
- Activation immédiate (`skipWaiting` + `clients.claim`)
- Handler `push` → `showNotification`
- Handler `notificationclick` → focus tab ou ouvrir URL

### B3 — Hook `usePushNotifications`
- `src/hooks/usePushNotifications.ts`
- Register SW, request permission, subscribe PushManager
- Upsert dans `push_subscriptions` Supabase

### B4 — SettingsPanel — Section Notifications
- Bouton "Activer" → demande permission
- Affiche statut : activé / bloqué / non configuré

### B5 — Script `scripts/send-push.js`
- Envoie à tous les subscribers
- Usage : `VAPID_PUBLIC=... VAPID_PRIVATE=... node scripts/send-push.js "Titre" "Corps" "/url"`

---

## ⚠️ Actions manuelles requises

1. **Créer bucket `screenshots`** dans Supabase Storage (public)
2. **Créer table `push_subscriptions`** si pas encore faite :
   ```sql
   CREATE TABLE push_subscriptions (
     user_id TEXT PRIMARY KEY,
     subscription JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "anon can upsert" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
   ```
