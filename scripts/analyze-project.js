#!/usr/bin/env node
/**
 * analyze-project.js
 * Usage: node scripts/analyze-project.js <project_id> <url>
 * Analyse un projet via Jina Reader + Gemini Flash → health score + suggestions
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tpbluellqgehaqmmmunp.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY
const GEMINI_KEY = process.env.GEMINI_KEY

if (!SUPABASE_KEY || !GEMINI_KEY) {
  console.error('Missing required env vars: SUPABASE_KEY, GEMINI_KEY')
  process.exit(1)
}

async function main() {
  const [,, projectId, url] = process.argv
  if (!projectId || !url) { console.error('Usage: node analyze-project.js <project_id> <url>'); process.exit(1) }

  console.log('Fetching content via Jina Reader...')

  // 1. Jina Reader API → markdown propre
  let content = ''
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' }
    })
    content = await jinaRes.text()
    content = content.slice(0, 8000) // Limiter pour l'API
    console.log('Jina OK, content length:', content.length)
  } catch (e) {
    content = `URL: ${url}\nErreur de fetch: ${e.message}`
    console.log('Jina fallback:', e.message)
  }

  // 2. Gemini Flash → analyse
  console.log('Analyzing with Gemini...')
  const prompt = `Tu es un expert en product & UX. Analyse ce site web et retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks).

Contenu extrait du site :
${content}

Retourne ce JSON strict :
{
  "summary": "Description du site en 1-2 phrases",
  "health_score": <number 0-100>,
  "tags": ["tag1", "tag2", "tag3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "category": "SaaS|E-commerce|Blog|Portfolio|App|Media|Other",
  "language": "fr|en|other"
}

Le health_score évalue : SEO (25pts) + UX/clarté (25pts) + contenu/valeur (25pts) + technique/performance (25pts).`

  let aiMeta = null
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
        })
      }
    )
    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    // Extraire le JSON (enlever backticks si présents)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) aiMeta = JSON.parse(jsonMatch[0])
    console.log('Gemini OK, score:', aiMeta?.health_score)
  } catch (e) {
    console.error('Gemini error:', e.message)
    aiMeta = { summary: 'Analyse indisponible', health_score: 0, tags: [], suggestions: [], category: 'Other' }
  }

  // 3. Upsert dans project_metadata
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { error } = await supabase.from('project_metadata').upsert({
    project_id: projectId,
    ai_meta: aiMeta,
    ai_analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  if (error) { console.error('Supabase error:', error.message); process.exit(1) }
  console.log('Saved to project_metadata. Score:', aiMeta?.health_score)
}

main().catch(e => { console.error(e); process.exit(1) })
