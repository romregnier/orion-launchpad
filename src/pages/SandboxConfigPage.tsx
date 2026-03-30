/**
 * SandboxConfigPage — TK-0243 [ARCH-014]
 * Agent Sandbox: Landlock + seccomp config UI + execution simulation.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSandbox } from '../hooks/useSandbox'
import type { SandboxPolicy, SandboxExecution } from '../types/sandbox'

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '16px 18px',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: "'Poppins', sans-serif",
  marginBottom: 6,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#fff',
  fontSize: 12,
  fontFamily: "'Poppins', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
}

const btnStyle: React.CSSProperties = {
  padding: '9px 16px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "'Poppins', sans-serif",
  transition: 'all 0.15s',
}

// ─── Policy Indicator ──────────────────────────────────────────────────────────
function PolicyIndicator({ policy }: { policy: SandboxPolicy }) {
  const isStrict = policy.id.includes('strict') || (!policy.network_allowed && policy.fs_read_only)
  const isPermissive = policy.id.includes('permissive') || (policy.network_allowed && !policy.fs_read_only && policy.max_memory_mb >= 1024)

  const { label, color, bg, border } = isStrict
    ? { label: 'STRICT', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' }
    : isPermissive
    ? { label: 'PERMISSIVE', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' }
    : { label: 'STANDARD', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' }

  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 999,
      background: bg,
      border: `1px solid ${border}`,
      color,
      fontSize: 9,
      fontWeight: 700,
      fontFamily: "'Poppins', sans-serif",
      letterSpacing: '0.06em',
    }}>
      {label}
    </span>
  )
}

// ─── Policy Card ──────────────────────────────────────────────────────────────
function PolicyCard({
  policy,
  onSimulate,
  simulating,
}: {
  policy: SandboxPolicy
  onSimulate: (policyId: string) => void
  simulating: boolean
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
              🔒 {policy.name}
            </span>
            <PolicyIndicator policy={policy} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
            {policy.id}
          </div>
        </div>
        <button
          onClick={() => onSimulate(policy.id)}
          disabled={simulating}
          style={{
            ...btnStyle,
            background: simulating ? 'rgba(225,31,123,0.3)' : 'var(--accent, #E11F7B)',
            color: '#fff',
            padding: '7px 12px',
            fontSize: 11,
            opacity: simulating ? 0.6 : 1,
          }}
        >
          {simulating ? '⏳' : '▶'} Simuler
        </button>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Réseau', value: policy.network_allowed ? '✅ Autorisé' : '🚫 Bloqué', warn: !policy.network_allowed },
          { label: 'FS mode', value: policy.fs_read_only ? '📖 Lecture seule' : '✍️ Lecture/Écriture', warn: !policy.fs_read_only },
          { label: 'Mémoire max', value: `${policy.max_memory_mb} MB`, warn: policy.max_memory_mb > 1024 },
          { label: 'CPU max', value: `${policy.max_cpu_percent}%`, warn: policy.max_cpu_percent > 50 },
          { label: 'Timeout', value: `${(policy.timeout_ms / 1000).toFixed(0)}s`, warn: policy.timeout_ms > 60000 },
          { label: 'Syscalls', value: `${policy.seccomp_syscalls.length} autorisés`, warn: policy.seccomp_syscalls.length > 10 },
        ].map(({ label, value, warn }) => (
          <div
            key={label}
            style={{
              padding: '6px 10px',
              borderRadius: 7,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: warn ? '#F59E0B' : 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Landlock paths */}
      <div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Landlock paths
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {policy.landlock_paths.map((path, i) => (
            <span key={i} style={{
              padding: '2px 7px',
              borderRadius: 4,
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#818CF8',
              fontSize: 10,
              fontFamily: 'monospace',
            }}>
              {path}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Execution Result Card ────────────────────────────────────────────────────
function ExecutionCard({ execution, policyName }: { execution: SandboxExecution; policyName: string }) {
  const success = execution.status === 'success'
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        ...cardStyle,
        borderColor: success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
        background: success ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{success ? '✅' : '🚨'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: success ? '#10B981' : '#EF4444', fontFamily: "'Poppins', sans-serif" }}>
            {success ? 'Exécution réussie' : `${execution.violations.length} violation(s) détectée(s)`}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginTop: 1 }}>
            agent: {execution.agent_key} | policy: {policyName} | {new Date(execution.start_time).toLocaleTimeString()}
          </div>
        </div>
      </div>
      {execution.violations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {execution.violations.map((v, i) => (
            <div key={i} style={{
              padding: '5px 8px',
              borderRadius: 6,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 11,
              color: '#FCA5A5',
              fontFamily: "'Poppins', sans-serif",
            }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, marginRight: 6 }}>
                [{v.type}]
              </span>
              {v.detail}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Create Policy Form ───────────────────────────────────────────────────────
function CreatePolicyForm({ onCreated }: { onCreated: () => void }) {
  const { createPolicy } = useSandbox()
  const [name, setName] = useState('')
  const [paths, setPaths] = useState('/tmp/agent-workspace')
  const [syscalls, setSyscalls] = useState('read, write, open, close, exit')
  const [networkAllowed, setNetworkAllowed] = useState(false)
  const [fsReadOnly, setFsReadOnly] = useState(true)
  const [maxMem, setMaxMem] = useState(256)
  const [maxCpu, setMaxCpu] = useState(25)
  const [timeout, setTimeout_] = useState(10000)
  const [created, setCreated] = useState(false)

  const handleCreate = () => {
    if (!name.trim()) return
    createPolicy({
      name: name.trim(),
      landlock_paths: paths.split(',').map(p => p.trim()).filter(Boolean),
      seccomp_syscalls: syscalls.split(',').map(s => s.trim()).filter(Boolean),
      network_allowed: networkAllowed,
      fs_read_only: fsReadOnly,
      max_memory_mb: maxMem,
      max_cpu_percent: maxCpu,
      timeout_ms: timeout,
    })
    setCreated(true)
    setTimeout(() => { onCreated() }, 1000)
  }

  if (created) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#10B981', fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
        ✅ Policy créée avec succès!
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Nom de la policy</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Custom-Strict" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Landlock paths (séparés par virgules)</label>
        <input value={paths} onChange={e => setPaths(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Syscalls autorisés (séparés par virgules)</label>
        <input value={syscalls} onChange={e => setSyscalls(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Mémoire max (MB)</label>
          <input type="number" value={maxMem} onChange={e => setMaxMem(Number(e.target.value))} min={64} max={4096} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>CPU max (%)</label>
          <input type="number" value={maxCpu} onChange={e => setMaxCpu(Number(e.target.value))} min={1} max={100} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Timeout (ms)</label>
          <input type="number" value={timeout} onChange={e => setTimeout_(Number(e.target.value))} min={1000} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { key: 'network', label: '🌐 Réseau', value: networkAllowed, set: setNetworkAllowed },
          { key: 'fsro', label: '📖 FS Read-only', value: fsReadOnly, set: setFsReadOnly },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => item.set(!item.value)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 8,
              border: `1px solid ${item.value ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
              background: item.value ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              color: item.value ? '#10B981' : 'rgba(255,255,255,0.4)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {item.label}: {item.value ? 'ON' : 'OFF'}
          </button>
        ))}
      </div>
      <button
        onClick={handleCreate}
        disabled={!name.trim()}
        style={{
          ...btnStyle,
          background: 'var(--accent, #E11F7B)',
          color: '#fff',
          opacity: !name.trim() ? 0.5 : 1,
        }}
      >
        ➕ Créer la policy
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SandboxConfigPage() {
  const { getPolicies, simulateExecution, getExecutionHistory } = useSandbox()

  const [simulatingPolicy, setSimulatingPolicy] = useState<string | null>(null)
  const [latestExecution, setLatestExecution] = useState<SandboxExecution | null>(null)
  const [agentKey, setAgentKey] = useState('forge')
  const [activeTab, setActiveTab] = useState<'policies' | 'history' | 'create'>('policies')

  const policies = getPolicies()
  const history = getExecutionHistory()

  const handleSimulate = async (policyId: string) => {
    setSimulatingPolicy(policyId)
    setLatestExecution(null)
    try {
      const exec = await simulateExecution(agentKey, policyId)
      setLatestExecution(exec)
    } catch (e) {
      console.error('Simulation error:', e)
    } finally {
      setSimulatingPolicy(null)
    }
  }

  const tabs = [
    { key: 'policies', label: '🔒 Policies' },
    { key: 'history', label: `📋 Historique (${history.length})` },
    { key: 'create', label: '➕ Créer' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base, #0B090D)',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          fontFamily: "'Poppins', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          ⚙️ Agent Sandbox
          <span style={{
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 999,
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#F59E0B',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            ENTERPRISE PHASE 5
          </span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: "'Poppins', sans-serif" }}>
          Isolation kernel-level pour les exécutions agent — Landlock filesystem isolation + seccomp syscall filtering
        </p>
      </div>

      {/* Agent key selector + simulation */}
      <div style={{ ...cardStyle, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif", flexShrink: 0 }}>
          🤖 Agent cible :
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['forge', 'rex', 'aria', 'nova', 'orion'].map(key => (
            <button
              key={key}
              onClick={() => setAgentKey(key)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: `1px solid ${agentKey === key ? 'rgba(225,31,123,0.5)' : 'rgba(255,255,255,0.1)'}`,
                background: agentKey === key ? 'rgba(225,31,123,0.1)' : 'transparent',
                color: agentKey === key ? 'var(--accent, #E11F7B)' : 'rgba(255,255,255,0.4)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Latest execution result (animated) */}
      <AnimatePresence>
        {latestExecution && (
          <motion.div
            key="latest-exec"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginBottom: 16 }}
          >
            <ExecutionCard
              execution={latestExecution}
              policyName={policies.find(p => p.id === latestExecution.policy_id)?.name ?? latestExecution.policy_id}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              padding: '9px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent, #E11F7B)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent, #E11F7B)' : 'rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'policies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {policies.map(policy => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onSimulate={handleSimulate}
              simulating={simulatingPolicy === policy.id}
            />
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              Aucune exécution simulée pour l'instant
            </div>
          ) : (
            history.map(exec => (
              <ExecutionCard
                key={exec.id}
                execution={exec}
                policyName={policies.find(p => p.id === exec.policy_id)?.name ?? exec.policy_id}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Poppins', sans-serif", marginBottom: 14 }}>
            ➕ Nouvelle Sandbox Policy
          </div>
          <CreatePolicyForm onCreated={() => setActiveTab('policies')} />
        </div>
      )}
    </div>
  )
}
