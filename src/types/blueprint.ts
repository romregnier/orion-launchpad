/**
 * Blueprint types — TK-0241 [ARCH-010]
 * Blueprint Verification pipeline marketplace
 */

export interface BlueprintConfig {
  system_prompt?: string
  model?: string
  adapter?: string
  [key: string]: unknown
}

export interface Blueprint {
  id: string
  name: string
  version: string
  author: string
  skills: string[]
  config: BlueprintConfig
  signature?: string
  verified: boolean
  created_at: string
}

export type CheckSeverity = 'critical' | 'warning' | 'info'

export interface VerificationCheck {
  name: string
  passed: boolean
  severity: CheckSeverity
  message: string
}

export interface VerificationResult {
  passed: boolean
  checks: VerificationCheck[]
  score: number
  warnings: string[]
}
