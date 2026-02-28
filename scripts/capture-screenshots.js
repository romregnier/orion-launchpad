#!/usr/bin/env node
/**
 * capture-screenshots.js
 * Capture automatique de screenshots pour tous les projets Launchpad.
 * 
 * Usage: node scripts/capture-screenshots.js
 * Env: SUPABASE_KEY (service role key)
 * 
 * Flow:
 * 1. Fetch tous les projets depuis Supabase qui ont une `url`
 * 2. Pour chaque projet, prend un screenshot via Playwright Chromium
 * 3. Upload dans Supabase Storage bucket 'project-screenshots'
 * 4. Update project_metadata table avec screenshot_url
 */

const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const os = require('os')

const SUPABASE_URL = 'https://dkctapjhtyjmieolyfqk.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrY3RhcGpodHlqbWllb2x5ZnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODQ3MjUsImV4cCI6MjA4Nzg2MDcyNX0.AySNbRt3lgE5vtLMzJHkBgaPgJZI-4cL6EK6EyQ9y8E'
const BUCKET = 'project-screenshots'
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/home/clawadmin/.playwright'

// Détecte le chemin de Chromium selon l'environnement
function getChromiumPath() {
  const base = PLAYWRIGHT_PATH
  // Cherche dans les sous-dossiers chromium
  try {
    const dirs = fs.readdirSync(base).filter(d => d.startsWith('chromium'))
    for (const dir of dirs) {
      const p = path.join(base, dir, 'chrome-linux', 'chrome')
      if (fs.existsSync(p)) return p
    }
  } catch { /* ignore */ }
  return undefined // laisse Playwright trouver automatiquement
}

async function ensureBucket(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = (buckets ?? []).some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) console.warn('⚠️  Bucket creation error (maybe already exists):', error.message)
    else console.log(`✅ Bucket '${BUCKET}' créé`)
  }
}

async function screenshotUrl(url, projectId, browser) {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  const tmpFile = path.join(os.tmpdir(), `screenshot-${projectId}.png`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: tmpFile, fullPage: false })
    console.log(`  📸 Screenshot OK: ${url}`)
    return tmpFile
  } catch (e) {
    console.warn(`  ⚠️  Screenshot failed for ${url}: ${e.message}`)
    return null
  } finally {
    await page.close()
  }
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Crée le bucket si nécessaire
  await ensureBucket(supabase)

  // Fetch projets avec une URL
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, url')
    .not('url', 'is', null)

  if (error) { console.error('❌ Erreur fetch projets:', error.message); process.exit(1) }
  
  const projectsWithUrl = (projects || []).filter(p => p.url && p.url.trim() !== '')
  console.log(`🚀 ${projectsWithUrl.length} projets à screenshotter`)

  if (projectsWithUrl.length === 0) {
    console.log('Aucun projet avec URL trouvé.')
    return
  }

  // Lance Chromium
  const executablePath = getChromiumPath()
  const launchOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(executablePath ? { executablePath } : {}),
  }
  const browser = await chromium.launch(launchOptions)

  for (const project of projectsWithUrl) {
    console.log(`\n→ ${project.title} (${project.id})`)
    const tmpFile = await screenshotUrl(project.url, project.id, browser)
    if (!tmpFile) continue

    // Upload vers Supabase Storage
    const storagePath = `${project.id}/latest.png`
    const fileBuffer = fs.readFileSync(tmpFile)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.warn(`  ⚠️  Upload failed: ${uploadError.message}`)
      fs.unlinkSync(tmpFile)
      continue
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const screenshotUrl = urlData?.publicUrl

    // Upsert project_metadata
    const { error: metaError } = await supabase
      .from('project_metadata')
      .upsert({
        project_id: project.id,
        screenshot_url: screenshotUrl,
      }, { onConflict: 'project_id' })

    if (metaError) {
      console.warn(`  ⚠️  Metadata update failed: ${metaError.message}`)
    } else {
      console.log(`  ✅ Screenshot URL: ${screenshotUrl}`)
    }

    // Cleanup
    fs.unlinkSync(tmpFile)
  }

  await browser.close()
  console.log('\n🎉 Capture terminée!')
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
