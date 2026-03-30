/**
 * useSandbox — TK-0243 [ARCH-014]
 * Agent Sandbox: Landlock + seccomp simulation layer.
 */
import { useState, useCallback } from 'react'
import type {
  SandboxPolicy,
  SandboxExecution,
  SandboxViolation,
  SandboxViolationType,
} from '../types/sandbox'

// ─── Default mock policies ────────────────────────────────────────────────────
const DEFAULT_POLICIES: SandboxPolicy[] = [
  {
    id: 'policy-strict',
    name: 'Strict',
    landlock_paths: ['/tmp/agent-workspace'],
    seccomp_syscalls: ['read', 'write', 'open', 'close', 'exit'],
    network_allowed: false,
    fs_read_only: true,
    max_memory_mb: 128,
    max_cpu_percent: 10,
    timeout_ms: 5000,
  },
  {
    id: 'policy-standard',
    name: 'Standard',
    landlock_paths: ['/tmp/agent-workspace', '/tmp/shared', '/usr/local/lib'],
    seccomp_syscalls: ['read', 'write', 'open', 'close', 'exit', 'stat', 'fstat', 'mmap', 'mprotect'],
    network_allowed: true,
    fs_read_only: false,
    max_memory_mb: 512,
    max_cpu_percent: 40,
    timeout_ms: 30000,
  },
  {
    id: 'policy-permissive',
    name: 'Permissive',
    landlock_paths: ['/tmp', '/home', '/usr', '/var/log/agents'],
    seccomp_syscalls: ['read', 'write', 'open', 'close', 'exit', 'stat', 'fstat', 'mmap', 'mprotect', 'socket', 'connect', 'sendto', 'recvfrom', 'fork', 'clone'],
    network_allowed: true,
    fs_read_only: false,
    max_memory_mb: 2048,
    max_cpu_percent: 80,
    timeout_ms: 120000,
  },
]

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Simulate random violations based on policy strictness
function simulateViolations(policy: SandboxPolicy): SandboxViolation[] {
  const violations: SandboxViolation[] = []

  const violationProbability = policy.id === 'policy-strict'
    ? 0.4
    : policy.id === 'policy-standard'
    ? 0.15
    : 0.05

  if (Math.random() < violationProbability) {
    const possibleViolations: { type: SandboxViolationType; detail: string }[] = [
      { type: 'filesystem', detail: 'Tentative d\'accès à /etc/passwd (hors sandbox)' },
      { type: 'syscall', detail: 'Syscall "execve" bloqué par seccomp' },
      { type: 'network', detail: 'Connexion sortante vers 8.8.8.8:443 bloquée' },
      { type: 'memory', detail: `Utilisation mémoire dépassée: ${policy.max_memory_mb + 64}MB / ${policy.max_memory_mb}MB` },
      { type: 'timeout', detail: `Timeout dépassé: exécution >  ${policy.timeout_ms}ms` },
    ]

    // Pick 1-2 random violations
    const count = Math.floor(Math.random() * 2) + 1
    const shuffled = possibleViolations.sort(() => Math.random() - 0.5)
    violations.push(...shuffled.slice(0, count))
  }

  return violations
}

export function useSandbox() {
  const [policies, setPolicies] = useState<SandboxPolicy[]>(DEFAULT_POLICIES)
  const [executions, setExecutions] = useState<SandboxExecution[]>([])

  const getPolicies = useCallback((): SandboxPolicy[] => {
    return policies
  }, [policies])

  const createPolicy = useCallback((policy: Omit<SandboxPolicy, 'id'>): SandboxPolicy => {
    const newPolicy: SandboxPolicy = {
      ...policy,
      id: `policy-${generateId()}`,
    }
    setPolicies(prev => [...prev, newPolicy])
    return newPolicy
  }, [])

  const simulateExecution = useCallback(async (
    agent_key: string,
    policy_id: string
  ): Promise<SandboxExecution> => {
    const policy = policies.find(p => p.id === policy_id)
    if (!policy) throw new Error(`Policy not found: ${policy_id}`)

    const executionId = generateId()
    const startTime = new Date().toISOString()

    // Simulate execution time
    const execDuration = 500 + Math.random() * 2000
    await new Promise(resolve => setTimeout(resolve, Math.min(execDuration, 1500)))

    const violations = simulateViolations(policy)
    const status = violations.length > 0 ? 'violation' : 'success'

    const execution: SandboxExecution = {
      id: executionId,
      agent_key,
      policy_id,
      start_time: startTime,
      end_time: new Date().toISOString(),
      status,
      violations,
    }

    setExecutions(prev => [execution, ...prev.slice(0, 99)])
    return execution
  }, [policies])

  const getExecutionHistory = useCallback((agent_key?: string): SandboxExecution[] => {
    if (agent_key) {
      return executions.filter(e => e.agent_key === agent_key)
    }
    return executions
  }, [executions])

  const deletePolicy = useCallback((id: string) => {
    // Don't delete default policies
    if (id.startsWith('policy-strict') || id.startsWith('policy-standard') || id.startsWith('policy-permissive')) {
      throw new Error('Impossible de supprimer une policy système.')
    }
    setPolicies(prev => prev.filter(p => p.id !== id))
  }, [])

  return {
    policies,
    getPolicies,
    createPolicy,
    deletePolicy,
    simulateExecution,
    getExecutionHistory,
    executions,
  }
}
