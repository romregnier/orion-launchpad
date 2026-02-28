#!/usr/bin/env node
/**
 * screenshot-project.js
 * Usage: node scripts/screenshot-project.js <url> <project_id>
 * Prend un screenshot via Playwright Chromium, upload vers Supabase Storage
 */
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const SUPABASE_URL = 'https://tpbluellqgehaqmmmunp.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY

async function main() {
  const [,, url, projectId] = process.argv
  if (!url || !projectId) { console.error('Usage: node screenshot-project.js <url> <project_id>'); process.exit(1) }

  // Lance Chromium headless
  const executablePath = (process.env.PLAYWRIGHT_BROWSERS_PATH || '/home/clawadmin/.playwright') + '/chromium-1161/chrome-linux/chrome'
  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1500)
  } catch (e) {
    console.log('Page load timeout, taking screenshot anyway')
  }

  const tmpPath = `/tmp/screenshot-${projectId}.png`
  await page.screenshot({ path: tmpPath, type: 'png', clip: { x: 0, y: 0, width: 1280, height: 800 } })
  await browser.close()

  // Upload vers Supabase Storage bucket 'screenshots'
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const fileBuffer = fs.readFileSync(tmpPath)
  const filePath = `projects/${projectId}.png`

  const { error } = await supabase.storage.from('screenshots').upload(filePath, fileBuffer, {
    contentType: 'image/png',
    upsert: true
  })

  if (error) { console.error('Upload error:', error.message); process.exit(1) }

  const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(filePath)

  // Upsert dans project_metadata
  await supabase.from('project_metadata').upsert({
    project_id: projectId,
    screenshot_url: publicUrl,
    updated_at: new Date().toISOString()
  })

  console.log('OK:', publicUrl)
  fs.unlinkSync(tmpPath)
}

main().catch(e => { console.error(e); process.exit(1) })
