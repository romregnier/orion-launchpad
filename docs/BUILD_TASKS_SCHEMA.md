# Schéma `build_tasks` — Synchronisation agents ↔ Launchpad

## Pour que les agents apparaissent en mouvement sur le canvas, ils doivent écrire dans cette table.

### Colonnes obligatoires

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `agent` | text | Nom affiché dans le widget | `"Forge"` |
| `agent_key` | text | **Clé de matching avec canvas_agents** | `"forge"` |
| `label` | text | Description de la tâche | `"Implémentation feature X"` |
| `status` | text | `"running"` \| `"done"` \| `"failed"` | `"running"` |
| `project` | text | **ID du projet** (correspond à `projects.id`) | `"manga-reader"` |
| `progress` | int | 0-100 | `42` |
| `step_label` | text | Étape actuelle | `"Analyse du code..."` |

### agent_key → canvas_agents

| agent_key | Agent |
|-----------|-------|
| `orion` | Orion |
| `nova` | Nova |
| `aria` | Aria |
| `forge` | Forge |
| `rex` | Rex |

### project IDs

| project | Titre |
|---------|-------|
| `manga-reader` | Manga Reader |
| `launchpad` | Launchpad |
| `the-tailor` | The Tailor |
| `crumb` | Crumb |
| `sunny-seat` | Sunny Seat |

### Flow complet

```
Bot reçoit tâche
  → INSERT build_tasks (status: "running", agent_key: "forge", project: "manga-reader", progress: 0)
  → Launchpad détecte via Realtime → Forge se déplace vers la carte "Manga Reader"

Bot update en cours
  → PATCH build_tasks?id=eq.{id} (progress: 60, step_label: "Tests...")
  → Launchpad met à jour la barre de progression en RT

Bot termine
  → PATCH build_tasks?id=eq.{id} (status: "done", progress: 100, step_label: "Terminé")
  → Launchpad ramène Forge à sa position initiale
```

### Exemple curl (pour tests)

```bash
# Démarrer une tâche
curl -X POST "https://dkctapjhtyjmieolyfqk.supabase.co/rest/v1/build_tasks" \
  -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent":"Forge","agent_key":"forge","label":"Fix bug","status":"running","project":"manga-reader","progress":0,"step_label":"Démarrage..."}'

# Mettre à jour
curl -X PATCH "https://dkctapjhtyjmieolyfqk.supabase.co/rest/v1/build_tasks?id=eq.{ID}" \
  -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"progress":75,"step_label":"En cours..."}'

# Terminer
curl -X PATCH "https://dkctapjhtyjmieolyfqk.supabase.co/rest/v1/build_tasks?id=eq.{ID}" \
  -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"done","progress":100,"step_label":"Terminé"}'
```
