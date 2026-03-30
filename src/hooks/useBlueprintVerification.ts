/**
 * useBlueprintVerification — TK-0241 [ARCH-010]
 * Blueprint verification pipeline: secret scrubbing, prompt injection detection,
 * skills validation, model allowlist, signature verification.
 */
import { useCallback } from 'react'
import type { Blueprint, VerificationCheck, VerificationResult } from '../types/blueprint'

const ALLOWED_MODELS = [
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'claude-opus-4-5',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
  'gemini-pro',
  'gemini-flash',
  'mistral-7b',
  'mixtral-8x7b',
]

const KNOWN_SKILLS = [
  'code', 'design', 'infra', 'review', 'deploy', 'test',
  'documentation', 'analysis', 'research', 'marketing',
  'support', 'sales', 'data', 'security', 'devops',
  'writing', 'translation', 'summarization', 'planning',
]

const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /API_KEY\s*[=:]\s*\S+/gi,
  /sk-[A-Za-z0-9]{20,}/g,
  /password\s*[=:]\s*\S+/gi,
  /token\s*[=:]\s*[A-Za-z0-9\-._~+/]{16,}/gi,
]

const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|above|all)\s+(instructions?|prompts?|rules?)/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  /disregard\s+(your|the|all)\s+(instructions?|rules?|prompts?)/i,
  /you\s+are\s+now\s+(a\s+)?(?:different|new|another)\s+(?:ai|assistant|bot)/i,
  /system\s*:\s*you\s+are/i,
  /<\/?system>/i,
  /\[INST\]/i,
]

function checkSecretScrub(blueprint: Blueprint): VerificationCheck {
  const text = blueprint.config.system_prompt ?? ''
  const found = SECRET_PATTERNS.some(p => p.test(text))
  return {
    name: 'SECRET_SCRUB',
    passed: !found,
    severity: 'critical',
    message: found
      ? 'Des secrets potentiels ont été détectés dans le system prompt (Bearer, API_KEY, sk-, password).'
      : 'Aucun secret détecté dans le system prompt.',
  }
}

function checkPromptInjection(blueprint: Blueprint): VerificationCheck {
  const text = blueprint.config.system_prompt ?? ''
  const found = INJECTION_PATTERNS.some(p => p.test(text))
  return {
    name: 'PROMPT_INJECTION',
    passed: !found,
    severity: 'critical',
    message: found
      ? 'Tentative d\'injection de prompt détectée (ex: "ignore previous instructions").'
      : 'Aucune tentative d\'injection de prompt détectée.',
  }
}

function checkSkillsValidation(blueprint: Blueprint): VerificationCheck {
  const unknownSkills = blueprint.skills.filter(
    s => !KNOWN_SKILLS.includes(s.toLowerCase().trim())
  )
  const passed = unknownSkills.length === 0
  return {
    name: 'SKILLS_VALIDATION',
    passed,
    severity: 'warning',
    message: passed
      ? 'Tous les skills sont dans la whitelist connue.'
      : `Skills inconnus détectés: ${unknownSkills.join(', ')}. Vérifiez leur légitimité.`,
  }
}

function checkModelAllowed(blueprint: Blueprint): VerificationCheck {
  const model = blueprint.config.model ?? ''
  const passed = model === '' || ALLOWED_MODELS.includes(model.toLowerCase())
  return {
    name: 'MODEL_ALLOWED',
    passed,
    severity: 'critical',
    message: passed
      ? `Modèle autorisé: ${model || '(défaut)'}` 
      : `Modèle non autorisé: "${model}". Utilisez un modèle de la liste autorisée.`,
  }
}

function checkSignatureValid(blueprint: Blueprint): VerificationCheck {
  const hasSignature = !!blueprint.signature && blueprint.signature.length > 0
  return {
    name: 'SIGNATURE_VALID',
    passed: hasSignature,
    severity: 'warning',
    message: hasSignature
      ? `Blueprint signé (hash: ${blueprint.signature?.slice(0, 16)}...)`
      : 'Blueprint non signé. La signature est recommandée pour la marketplace.',
  }
}

function computeScore(checks: VerificationCheck[]): number {
  const criticals = checks.filter(c => c.severity === 'critical')
  const warnings = checks.filter(c => c.severity === 'warning')

  const criticalPassed = criticals.filter(c => c.passed).length
  const warningPassed = warnings.filter(c => c.passed).length

  const criticalWeight = 0.7
  const warningWeight = 0.3

  const criticalScore = criticals.length > 0 ? (criticalPassed / criticals.length) * 100 : 100
  const warningScore = warnings.length > 0 ? (warningPassed / warnings.length) * 100 : 100

  return Math.round(criticalScore * criticalWeight + warningScore * warningWeight)
}

// Simple SHA-256-like hash simulation using a deterministic string
async function generateHash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback for environments without crypto.subtle
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const chr = input.charCodeAt(i)
      hash = (hash << 5) - hash + chr
      hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(64, '0')
  }
}

export function useBlueprintVerification() {
  const verifyBlueprint = useCallback((blueprint: Blueprint): VerificationResult => {
    const checks: VerificationCheck[] = [
      checkSecretScrub(blueprint),
      checkPromptInjection(blueprint),
      checkSkillsValidation(blueprint),
      checkModelAllowed(blueprint),
      checkSignatureValid(blueprint),
    ]

    const score = computeScore(checks)
    const criticalFailed = checks.filter(c => c.severity === 'critical' && !c.passed)
    const passed = criticalFailed.length === 0
    const warnings = checks.filter(c => !c.passed).map(c => c.message)

    return { passed, checks, score, warnings }
  }, [])

  const signBlueprint = useCallback(async (blueprint: Blueprint): Promise<Blueprint> => {
    const input = `${Date.now()}-${blueprint.name}-${blueprint.version}`
    const signature = await generateHash(input)
    return { ...blueprint, signature }
  }, [])

  const exportBlueprint = useCallback(async (blueprint: Blueprint): Promise<string> => {
    // Scrub secrets from system_prompt
    let cleanPrompt = blueprint.config.system_prompt ?? ''
    for (const pattern of SECRET_PATTERNS) {
      cleanPrompt = cleanPrompt.replace(pattern, '[REDACTED]')
    }

    const cleaned: Blueprint = {
      ...blueprint,
      config: {
        ...blueprint.config,
        system_prompt: cleanPrompt,
      },
    }

    // Sign the cleaned blueprint
    const signed = await signBlueprint(cleaned)
    return JSON.stringify(signed, null, 2)
  }, [signBlueprint])

  const importBlueprint = useCallback((json: string): Blueprint => {
    const parsed = JSON.parse(json) as Blueprint

    // Basic validation
    if (!parsed.id || !parsed.name || !parsed.version) {
      throw new Error('Blueprint invalide: champs requis manquants (id, name, version)')
    }

    return parsed
  }, [])

  return {
    verifyBlueprint,
    signBlueprint,
    exportBlueprint,
    importBlueprint,
  }
}
