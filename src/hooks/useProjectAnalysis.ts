/**
 * useProjectAnalysis
 * Déclenche l'analyse IA d'un projet et rafraîchit les métadonnées.
 * Utilise un appel direct à Jina + Gemini depuis le navigateur (MVP).
 */
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY as string

interface AiMeta {
  summary: string
  health_score: number
  tags: string[]
  suggestions: string[]
  category: string
  language?: string
}

export function useProjectAnalysis() {
  const [analyzing, setAnalyzing] = useState<string | null>(null) // project_id en cours

  const analyze = useCallback(async (projectId: string, url: string) => {
    if (!url || analyzing) return
    setAnalyzing(projectId)

    try {
      // 1. Jina Reader API
      let content = ''
      try {
        const jinaRes = await fetch(`https://r.jina.ai/${url}`)
        content = (await jinaRes.text()).slice(0, 6000)
      } catch {
        content = `Site: ${url}`
      }

      // 2. Gemini Flash
      const prompt = `Analyse ce site. Retourne UNIQUEMENT du JSON valide sans backticks :
{"summary":"...","health_score":85,"tags":["tag"],"suggestions":["tip1","tip2","tip3"],"category":"SaaS"}
Critères score: SEO 25pts + UX 25pts + Contenu 25pts + Technique 25pts.
Contenu: ${content.slice(0, 4000)}`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
          }),
        }
      )
      const data = await res.json()
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      const aiMeta: AiMeta = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { summary: '', health_score: 0, tags: [], suggestions: [], category: 'Other' }

      // 3. Save
      await supabase.from('project_metadata').upsert({
        project_id: projectId,
        ai_meta: aiMeta,
        ai_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Analysis error:', err)
    } finally {
      setAnalyzing(null)
    }
  }, [analyzing])

  return { analyze, analyzing }
}
