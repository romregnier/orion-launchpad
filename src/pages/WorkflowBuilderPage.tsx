/**
 * WorkflowBuilderPage — TK-0231
 * Page dédiée à l'édition d'un workflow visuel node-based.
 * Route : /workflows/:id/edit
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { WorkflowBuilder } from '../components/WorkflowBuilder'
import type { WorkflowNode, WorkflowEdge } from '../components/WorkflowBuilder'
import { useLaunchpadStore } from '../store'

interface WorkflowDefinition {
  id: string
  capsule_id: string
  name: string
  description: string | null
  enabled: boolean
  trigger_type: string | null
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  created_at: string
  updated_at: string
}

export function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentCapsule } = useLaunchpadStore()

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null)
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tableExists, setTableExists] = useState(true)

  // ── Load workflow ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)

      if (id === 'new') {
        // New workflow
        setName('Nouveau Workflow')
        setNodes([])
        setEdges([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation')) {
          setTableExists(false)
          setName('Démo Workflow')
          // Mock demo
          setNodes([
            { id: 'n1', type: 'trigger', label: 'Trigger 1', x: 60, y: 160, config: {} },
            { id: 'n2', type: 'action', label: 'Action 1', x: 300, y: 100, config: {} },
            { id: 'n3', type: 'condition', label: 'Condition 1', x: 300, y: 240, config: {} },
            { id: 'n4', type: 'agent', label: 'Agent 1', x: 540, y: 160, config: {} },
          ])
          setEdges([
            { id: 'e1', source: 'n1', target: 'n2' },
            { id: 'e2', source: 'n1', target: 'n3' },
            { id: 'e3', source: 'n2', target: 'n4' },
          ])
        } else {
          console.warn('[WorkflowBuilderPage] Load error:', error.message)
        }
        setLoading(false)
        return
      }

      if (data) {
        setWorkflow(data as WorkflowDefinition)
        setName(data.name)
        setNodes((data.nodes as WorkflowNode[]) ?? [])
        setEdges((data.edges as WorkflowEdge[]) ?? [])
      }
      setLoading(false)
    }

    load()
  }, [id])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!tableExists) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return
    }
    setSaving(true)

    if (id === 'new') {
      const { data, error } = await supabase.from('workflow_definitions').insert({
        capsule_id: currentCapsule?.id,
        name,
        nodes,
        edges,
        enabled: workflow?.enabled ?? false,
      }).select().single()

      if (!error && data) {
        navigate(`/workflows/${data.id}/edit`, { replace: true })
      }
    } else {
      await supabase.from('workflow_definitions').update({
        name,
        nodes,
        edges,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [id, name, nodes, edges, workflow, currentCapsule, navigate, tableExists])

  // ── Toggle enabled ────────────────────────────────────────────────────────

  const handleToggleEnabled = useCallback(async () => {
    if (!workflow || !tableExists) return
    const newEnabled = !workflow.enabled
    await supabase.from('workflow_definitions').update({ enabled: newEnabled }).eq('id', workflow.id)
    setWorkflow(prev => prev ? { ...prev, enabled: newEnabled } : prev)
  }, [workflow, tableExists])

  const handleNodesEdgesChange = useCallback((n: WorkflowNode[], e: WorkflowEdge[]) => {
    setNodes(n)
    setEdges(e)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-base)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg-base)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 18, padding: '4px 8px',
          }}
          title="Retour"
        >
          ←
        </button>

        {/* Workflow name */}
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingName(false) }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6, padding: '6px 12px',
              color: 'var(--text-primary)', fontSize: 16, fontWeight: 600,
              outline: 'none', minWidth: 200,
            }}
          />
        ) : (
          <h1
            onClick={() => setEditingName(true)}
            style={{
              margin: 0, fontSize: 16, fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'text',
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid transparent',
              transition: 'border-color 0.15s',
            }}
            title="Cliquer pour renommer"
          >
            ⚡ {name}
          </h1>
        )}

        {!tableExists && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 6,
            background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
          }}>
            Démo (table non créée)
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.6 }}>
            {nodes.length} nœud{nodes.length !== 1 ? 's' : ''} · {edges.length} connexion{edges.length !== 1 ? 's' : ''}
          </span>

          {/* Enable/disable toggle */}
          {workflow && (
            <button
              onClick={handleToggleEnabled}
              style={{
                padding: '7px 14px',
                background: workflow.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${workflow.enabled ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 8, cursor: 'pointer',
                color: workflow.enabled ? '#22c55e' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600,
              }}
            >
              {workflow.enabled ? '✅ Actif' : '⏸ Inactif'}
            </button>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 18px',
              background: saved ? 'rgba(34,197,94,0.2)' : 'var(--accent)',
              color: saved ? '#22c55e' : '#fff',
              border: saved ? '1px solid rgba(34,197,94,0.35)' : 'none',
              borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '⏳ Sauvegarde…' : saved ? '✅ Sauvegardé' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Builder */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <WorkflowBuilder
          nodes={nodes}
          edges={edges}
          onChange={handleNodesEdgesChange}
        />
      </div>
    </div>
  )
}
