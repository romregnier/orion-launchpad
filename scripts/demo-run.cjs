#!/usr/bin/env node
/**
 * demo-run.js — Simule le mouvement des agents sur le canvas Launchpad
 *
 * Usage : node scripts/demo-run.js
 *
 * Ce script :
 * 1. Récupère les projets et agents depuis Supabase
 * 2. Crée des build_tasks "running" pour chaque agent
 * 3. Met à jour working_on_project pour faire bouger les agents sur le canvas
 * 4. Simule la progression des tâches (0→100%)
 * 5. Nettoie tout à la fin (agents en veille, tâches terminées)
 */

const { Client } = require('/tmp/node_modules/pg')

const DB = {
  host: 'db.dkctapjhtyjmieolyfqk.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'pA@e?xjRX9dLz5z8',
  ssl: { rejectUnauthorized: false },
}

const AGENTS = [
  { key: 'orion',  name: 'Orion',  label: 'Analyse globale',    emoji: '🌟' },
  { key: 'nova',   name: 'Nova',   label: 'Rédaction spec CPO',  emoji: '✦' },
  { key: 'aria',   name: 'Aria',   label: 'Design UI/UX',        emoji: '🎨' },
  { key: 'forge',  name: 'Forge',  label: 'Implémentation',      emoji: '🔧' },
  { key: 'rex',    name: 'Rex',    label: 'QA & Tests E2E',      emoji: '🛡️' },
]

const STEP_LABELS = [
  'Lecture contexte…',
  'Analyse du projet…',
  'Exécution en cours…',
  'Vérification…',
  'Finalisation…',
  'Terminé',
]

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  const db = new Client(DB)
  await db.connect()
  console.log('🚀 Demo Run démarré')

  // 1. Récupère les projets (prend les 5 premiers avec une URL)
  const { rows: projects } = await db.query(
    "SELECT id, title FROM projects ORDER BY position_x LIMIT 5"
  )

  if (projects.length === 0) {
    console.error('❌ Aucun projet trouvé')
    await db.end()
    return
  }

  console.log(`📂 ${projects.length} projets trouvés`)

  // 2. Nettoie les tâches stale
  await db.query("UPDATE build_tasks SET status='failed' WHERE status='running'")
  await db.query("UPDATE canvas_agents SET working_on_project=NULL")

  // 3. Crée les tâches demo + assigne les agents aux projets
  const taskIds = []
  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i]
    const project = projects[i % projects.length]

    const { rows } = await db.query(
      `INSERT INTO build_tasks (label, agent, agent_key, status, project, progress, step_label)
       VALUES ($1, $2, $3, 'running', $4, 0, $5)
       RETURNING id`,
      [agent.label, agent.name, agent.key, project.id, STEP_LABELS[0]]
    )
    const taskId = rows[0].id
    taskIds.push({ taskId, agent, project })

    await db.query(
      "UPDATE canvas_agents SET working_on_project=$1 WHERE agent_key=$2",
      [project.id, agent.key]
    )

    console.log(`  ${agent.emoji} ${agent.name} → "${project.title}" (task ${taskId})`)
    await sleep(400) // stagger les départs
  }

  console.log('\n⏳ Simulation de progression (20s)…\n')

  // 4. Simule la progression
  const TOTAL_STEPS = 6
  for (let step = 1; step <= TOTAL_STEPS; step++) {
    const progress = Math.round((step / TOTAL_STEPS) * 100)
    const label = STEP_LABELS[Math.min(step, STEP_LABELS.length - 1)]

    for (const { taskId, agent } of taskIds) {
      await db.query(
        "UPDATE build_tasks SET progress=$1, step_label=$2 WHERE id=$3",
        [progress, label, taskId]
      )
    }

    console.log(`  📊 Étape ${step}/${TOTAL_STEPS} — ${progress}% — ${label}`)
    await sleep(3500)
  }

  // 5. Marque tout done et reset agents
  console.log('\n✅ Finalisation…')
  for (const { taskId, agent } of taskIds) {
    await db.query(
      "UPDATE build_tasks SET status='done', progress=100, step_label='Terminé', finished_at=now() WHERE id=$1",
      [taskId]
    )
    await db.query(
      "UPDATE canvas_agents SET working_on_project=NULL WHERE agent_key=$1",
      [agent.key]
    )
    console.log(`  ${agent.emoji} ${agent.name} → retour en veille`)
    await sleep(300)
  }

  console.log('\n🎉 Demo Run terminé ! Tous les agents sont en veille.')
  await db.end()
}

run().catch(err => {
  console.error('Erreur demo-run:', err.message)
  process.exit(1)
})
