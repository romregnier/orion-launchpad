/**
 * deckGenerator.ts — Pipeline de génération IA pour les decks
 * TK-0033
 *
 * Utilise @google/generative-ai (Gemini) pour générer les slides
 * puis insère le résultat dans Supabase.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from './supabase'
import type { DeckBrief, DeckJSON, SlideJSON } from '../types/deck'

const GOOGLE_AI_KEY = 'AIzaSyAmLCREMg8cL856Wx3bhp9iQw7baj_f6r0'

const SYSTEM_PROMPT = `Tu es un expert en présentation professionnelle. Génère un deck de présentation au format JSON strict.
Le deck doit être visuellement impactant avec du VRAI contenu (pas de placeholders Lorem Ipsum).
Chaque slide doit avoir du contenu réel, concret et adapté au sujet donné.
La première slide est toujours de type "hero", la dernière toujours de type "cta".
Entre les deux: alterne content, stats, quote selon ce qui fait sens pour le sujet.
Retourne UNIQUEMENT le JSON, sans markdown, sans commentaires.`

export type GenerationProgress = {
  step: 'structuring' | 'writing' | 'finalizing' | 'saving'
  pct: number
  message: string
}

export type ProgressCallback = (progress: GenerationProgress) => void

/**
 * Génère un deck complet via Gemini et l'insère dans Supabase.
 * Retourne l'ID du deck créé.
 */
export async function generateDeck(
  brief: DeckBrief,
  onProgress?: ProgressCallback
): Promise<string> {
  const themeMap: Record<string, string> = {
    dark_premium: 'DARK_PREMIUM',
    light_clean: 'LIGHT_CLEAN',
    gradient_bold: 'GRADIENT_BOLD',
    corporate: 'CORPORATE',
  }

  onProgress?.({ step: 'structuring', pct: 10, message: 'Structuration du contenu...' })

  const userPrompt = `Génère un deck de présentation professionnel sur le sujet suivant:

Titre: ${brief.title}
Description: ${brief.description}
Audience: ${brief.audience}
Tonalité: ${brief.tonality}
Langue: ${brief.lang}
Nombre de slides: ${brief.slideCount}
Thème visuel: ${themeMap[brief.theme] || 'DARK_PREMIUM'}

Structure JSON attendue:
{
  "title": "string",
  "theme": "${themeMap[brief.theme] || 'DARK_PREMIUM'}",
  "slides": [
    {
      "type": "hero",
      "position": 1,
      "content": {
        "eyebrow": "string (catégorie/accroche courte)",
        "title": "string (titre principal)",
        "subtitle": "string (sous-titre)"
      }
    },
    {
      "type": "content",
      "position": 2,
      "content": {
        "label": "string",
        "title": "string",
        "body": "string",
        "bullets": ["point 1", "point 2", "point 3"]
      }
    },
    {
      "type": "stats",
      "position": 3,
      "content": {
        "title": "string",
        "metrics": [
          {"value": "chiffre", "label": "label"},
          {"value": "chiffre", "label": "label"},
          {"value": "chiffre", "label": "label"},
          {"value": "chiffre", "label": "label"}
        ]
      }
    },
    {
      "type": "quote",
      "position": 4,
      "content": {
        "text": "citation inspirante",
        "author": "Nom Auteur",
        "role": "Titre/Rôle"
      }
    },
    {
      "type": "cta",
      "position": ${brief.slideCount},
      "content": {
        "title": "string",
        "subtitle": "string",
        "buttonText": "string"
      }
    }
  ]
}

Génère exactement ${brief.slideCount} slides. Assure-toi que le contenu est réel, concret et pertinent pour le sujet.`

  onProgress?.({ step: 'writing', pct: 30, message: 'Rédaction des slides...' })

  // Appel Gemini
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: userPrompt },
  ])

  const rawText = result.response.text()

  onProgress?.({ step: 'finalizing', pct: 60, message: 'Finalisation...' })

  // Parse JSON — nettoyer les éventuels blocs markdown
  let deckJSON: DeckJSON
  try {
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()
    deckJSON = JSON.parse(cleaned) as DeckJSON
  } catch (e) {
    console.error('[deckGenerator] JSON parse error:', e)
    console.error('[deckGenerator] Raw response:', rawText)
    throw new Error('La génération IA a retourné un format invalide. Réessayez.')
  }

  // Valider la structure
  if (!deckJSON.slides || !Array.isArray(deckJSON.slides)) {
    throw new Error('Structure JSON invalide: slides manquants.')
  }

  onProgress?.({ step: 'saving', pct: 80, message: 'Sauvegarde dans la base...' })

  // Insert présentation dans Supabase
  const { data: presentation, error: presError } = await supabase
    .from('presentations')
    .insert({
      title: deckJSON.title || brief.title,
      description: brief.description,
      theme_json: JSON.stringify({ theme: deckJSON.theme || themeMap[brief.theme] }),
      status: 'draft',
      slide_count: deckJSON.slides.length,
    })
    .select()
    .single()

  if (presError || !presentation) {
    console.error('[deckGenerator] Supabase insert error:', presError)
    throw new Error(`Erreur de sauvegarde: ${presError?.message || 'inconnue'}`)
  }

  const deckId = presentation.id as string

  // Insert les slides
  const slidesPayload = deckJSON.slides.map((slide: SlideJSON, idx: number) => ({
    deck_id: deckId,
    position: slide.position ?? idx + 1,
    type: slide.type,
    content_json: slide.content,
  }))

  const { error: slidesError } = await supabase
    .from('slides')
    .insert(slidesPayload)

  if (slidesError) {
    console.error('[deckGenerator] Slides insert error:', slidesError)
    throw new Error(`Erreur d'insertion des slides: ${slidesError.message}`)
  }

  onProgress?.({ step: 'saving', pct: 100, message: 'Deck créé !' })

  return deckId
}

/**
 * Régénère une slide individuelle via Gemini.
 */
export async function regenerateSlide(
  deckTitle: string,
  slideType: string,
  currentContent: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })

  const prompt = `Pour le deck "${deckTitle}", régénère le contenu de cette slide de type "${slideType}".
Contenu actuel: ${JSON.stringify(currentContent, null, 2)}

Génère un contenu amélioré au format JSON pour ce type de slide.
Retourne UNIQUEMENT le JSON de la propriété "content", sans markdown.`

  const result = await model.generateContent(prompt)
  const rawText = result.response.text()

  try {
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    throw new Error('Régénération échouée — format invalide.')
  }
}
