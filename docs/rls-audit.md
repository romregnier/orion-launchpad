# RLS Audit — Orion Launchpad Supabase

> **Audit Date:** 2026-03-30  
> **Auditor:** Forge (TK-0192 / SEC-002)  
> **Supabase Project:** `dkctapjhtyjmieolyfqk`

---

## Méthodologie

Chaque table a été testée avec la clé `anon` (sans authentification) via l'API REST Supabase :
- **READ** : `GET /rest/v1/{table}?select=id&limit=1`
- **WRITE** : `POST /rest/v1/{table}` avec payload vide `{}`

Un HTTP 200/400 (contrainte DB) = accès RLS autorisé  
Un HTTP 401/403 = RLS bloque l'accès ✅

---

## Tableau d'audit

| Table | Anon READ | Anon WRITE | RLS Status | Risque | Justification |
|-------|-----------|------------|------------|--------|---------------|
| `build_tasks` | ✅ Ouvert | ✅ Ouvert | ⚠️ RLS permissif | Intentionnel | Nécessaire pour le pipeline CI/CD (Forge, Rex, Nova lisent et écrivent les statuts) |
| `tickets` | ✅ Ouvert | ✅ Ouvert | ⚠️ RLS permissif | Intentionnel | Nécessaire pour le pipeline CI (création/update de tickets par les agents) |
| `canvas_agents` | ✅ Ouvert | ✅ Ouvert | 🔴 Sur-exposé | **Élevé** | Données d'agents (config, prompts) accessibles en écriture sans auth — risque de pollution |
| `canvas_objects` | ❌ Table inexistante | — | N/A | — | Table non trouvée dans le schema cache |
| `lists` | ✅ Ouvert | ✅ Ouvert | 🔴 Sur-exposé | **Élevé** | Listes de tasks/boards accessibles sans auth |
| `profiles` | ❌ Table inexistante | — | N/A | — | Table non trouvée dans le schema cache (peut-être `board_members` ou `users`) |
| `capsules` | ✅ Ouvert | ✅ Ouvert | 🔴 Sur-exposé | **Élevé** | Espaces de travail (capsules org) lisibles et modifiables sans auth |
| `goals` | ✅ Ouvert | ✅ Ouvert | 🔴 Sur-exposé | **Moyen** | OKRs/objectifs lisibles sans auth |
| `automations` | ✅ Ouvert | ✅ Ouvert | 🔴 Sur-exposé | **Élevé** | Règles d'automatisation lisibles et modifiables sans auth |

---

## Détail des tests

### `build_tasks` — READ ouvert, WRITE ouvert
```
GET  → HTTP 200, retourne des données
POST {} → HTTP 400 "null value in column 'label'" (contrainte DB, pas RLS)
```
**Verdict :** RLS en mode `USING (true)` — accès total anon. Intentionnel pour le pipeline CI.

### `tickets` — READ ouvert, WRITE ouvert
```
GET  → HTTP 200, retourne des données
POST {} → HTTP 400 "null value in column 'title'" (contrainte DB, pas RLS)
```
**Verdict :** RLS permissif. Intentionnel pour le pipeline CI (agents créent des tickets).

### `canvas_agents` — READ ouvert, WRITE ouvert
```
GET  → HTTP 200, retourne des données
POST {} → HTTP 400 "null value in column 'name'" (contrainte DB, pas RLS)
```
**Verdict :** ⚠️ Sur-exposé. Les configs d'agents (prompts, modèles, clés) sont accessibles et modifiables sans auth.

### `lists` — READ ouvert, WRITE ouvert
```
GET  → HTTP 200, retourne des données
POST {} → HTTP 400 "null value in column 'id'" (contrainte DB, pas RLS)
```
**Verdict :** ⚠️ Sur-exposé. Les listes (type Kanban) devraient être liées à une auth capsule.

### `capsules` — READ ouvert, WRITE ouvert
```
GET  → HTTP 200, retourne des données
POST {} → HTTP 400 "Failing row contains... null" (contrainte DB, pas RLS)
```
**Verdict :** ⚠️ Critique. Les espaces de travail entiers sont accessibles sans auth.

### `goals` — READ ouvert, WRITE ouvert
```
GET  → HTTP 200, retourne des données
POST {} → HTTP 400 "null value in column 'capsule_id'" (contrainte DB, pas RLS)
```
**Verdict :** ⚠️ Sur-exposé. Les OKRs sont visibles sans auth.

### `automations` — READ ouvert, WRITE ouvert
```
GET  → HTTP 200, retourne des données
POST {} → HTTP 400 "null value in column 'capsule_id'" (contrainte DB, pas RLS)
```
**Verdict :** ⚠️ Critique. Les règles d'automatisation sont accessibles sans auth.

---

## Analyse des risques

### ✅ Acceptable (intentionnel)

| Table | Raison |
|-------|--------|
| `build_tasks` | Pipeline CI/CD nécessite l'écriture sans JWT (agents Forge/Rex/Nova) |
| `tickets` | Agents créent et mettent à jour des tickets en CI |

### 🔴 À corriger (sur-exposé)

| Table | Risque | Action recommandée |
|-------|--------|--------------------|
| `canvas_agents` | Modification des prompts/configs d'agents sans auth | Ajouter `USING (auth.uid() IS NOT NULL)` + policy de ownership |
| `capsules` | Lecture/écriture des espaces de travail sans auth | `USING (auth.uid() IS NOT NULL)` minimum |
| `automations` | Modification des règles d'automatisation sans auth | Auth required sur INSERT/UPDATE/DELETE |
| `lists` | Pollution des boards sans auth | Auth required sur INSERT/UPDATE/DELETE |
| `goals` | Lecture des OKRs sans auth (sensibilité business) | Auth required sur SELECT au minimum |

---

## Recommandations SQL

### Correction minimale pour les tables sur-exposées
```sql
-- Pour chaque table sur-exposée, appliquer :
-- 1. Activer RLS si pas déjà fait
ALTER TABLE canvas_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- 2. Policy de lecture pour utilisateurs authentifiés
CREATE POLICY "auth_read" ON canvas_agents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_read" ON capsules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_read" ON automations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_read" ON lists FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_read" ON goals FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Policy d'écriture restrictive
CREATE POLICY "auth_write" ON canvas_agents FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write" ON capsules FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write" ON automations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write" ON lists FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write" ON goals FOR ALL USING (auth.uid() IS NOT NULL);
```

### Maintenir l'accès CI pour build_tasks et tickets
```sql
-- Ces tables doivent rester accessibles à anon pour le pipeline CI
-- Vérifier qu'elles ont bien une policy USING (true) :
CREATE POLICY "ci_pipeline_read" ON build_tasks FOR SELECT USING (true);
CREATE POLICY "ci_pipeline_write" ON build_tasks FOR ALL USING (true);

CREATE POLICY "ci_pipeline_read" ON tickets FOR SELECT USING (true);
CREATE POLICY "ci_pipeline_write" ON tickets FOR ALL USING (true);
```

---

## Priorité d'action

| Priorité | Table | Impact |
|----------|-------|--------|
| 🔴 P0 | `automations` | Règles d'automatisation modifiables sans auth — risque exécution arbitraire |
| 🔴 P0 | `canvas_agents` | Prompts et configs d'agents modifiables — risque de manipulation comportementale |
| 🔴 P1 | `capsules` | Espaces de travail entiers exposés |
| 🟡 P2 | `lists` | Pollution des boards Kanban |
| 🟡 P2 | `goals` | OKRs lisibles (sensibilité business modérée) |

---

## Notes

- L'accès anon en **lecture** est moins critique que l'accès en **écriture** — priorité aux INSERT/UPDATE/DELETE
- Le pipeline CI (Forge/Rex) utilise une **clé anon** et non un service role key — à terme, envisager un service role JWT dédié pour les agents CI afin de restreindre `build_tasks`/`tickets` aux agents authentifiés
- Tables `canvas_objects` et `profiles` non trouvées dans le schema cache — à vérifier si elles existent sous d'autres noms

---

*Audit généré automatiquement par Forge — TK-0192 / SEC-002*
