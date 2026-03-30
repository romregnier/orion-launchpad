/**
 * Sandbox types — TK-0243 [ARCH-014]
 * Agent Sandbox — Landlock + seccomp (UI/config layer)
 */

export interface SandboxPolicy {
  id: string
  name: string
  landlock_paths: string[]
  seccomp_syscalls: string[]
  network_allowed: boolean
  fs_read_only: boolean
  max_memory_mb: number
  max_cpu_percent: number
  timeout_ms: number
}

export type SandboxViolationType = 'filesystem' | 'syscall' | 'network' | 'memory' | 'timeout'

export interface SandboxViolation {
  type: SandboxViolationType
  detail: string
}

export type SandboxExecutionStatus = 'running' | 'success' | 'violation' | 'timeout'

export interface SandboxExecution {
  id: string
  agent_key: string
  policy_id: string
  start_time: string
  end_time?: string
  status: SandboxExecutionStatus
  violations: SandboxViolation[]
}
