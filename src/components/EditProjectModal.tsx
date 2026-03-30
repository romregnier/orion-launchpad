import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useLaunchpadStore } from '../store'
import { Select } from './Select'
import type { Project } from '../types'

const COLOR_OPTIONS = ['var(--accent)', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#FF6B35', '#A78BFA']

interface Props {
  project: Project
  open: boolean
  onClose: () => void
}

export function EditProjectModal({ project, open, onClose }: Props) {
  const { updateProject, groups } = useLaunchpadStore()

  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description ?? '')
  const [url, setUrl] = useState(project.url)
  const [github, setGithub] = useState(project.github ?? '')
  const [tags, setTags] = useState<string[]>(project.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [groupId, setGroupId] = useState<string | undefined>(project.groupId)
  const [color, setColor] = useState(project.color ?? 'var(--accent)')

  // Reset when project changes
  useEffect(() => {
    setTitle(project.title)
    setDescription(project.description ?? '')
    setUrl(project.url)
    setGithub(project.github ?? '')
    setTags(project.tags ?? [])
    setGroupId(project.groupId)
    setColor(project.color ?? 'var(--accent)')
  }, [project])

  const handleSave = useCallback(() => {
    if (!title.trim() || !url.trim()) return
    updateProject(project.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
      github: github.trim() || undefined,
      tags,
      groupId,
      color,
    })
    onClose()
  }, [title, description, url, github, tags, groupId, color, project.id, updateProject, onClose])

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim()
      if (!tags.includes(newTag)) setTags([...tags, newTag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const backdropRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      <div
        ref={backdropRef}
        onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 490,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          style={{
            zIndex: 500,
            maxWidth: 480,
            width: 'calc(100vw - 32px)',
            borderRadius: 20,
            background: '#1A171C',
            border: '1px solid var(--border-default)',
            padding: 28,
            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Modifier le projet</span>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Title */}
            <div>
              <label style={labelStyle}>Titre</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              />
            </div>

            {/* URL */}
            <div>
              <label style={labelStyle}>URL</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* GitHub */}
            <div>
              <label style={labelStyle}>GitHub URL (optionnel)</label>
              <input
                value={github}
                onChange={e => setGithub(e.target.value)}
                style={inputStyle}
                placeholder="https://github.com/..."
              />
            </div>

            {/* Tags */}
            <div>
              <label style={labelStyle}>Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {tags.map(tag => (
                  <span key={tag} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 999,
                    background: 'rgba(225,31,123,0.15)', color: 'var(--accent)',
                    border: '1px solid rgba(225,31,123,0.3)',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {tag}
                    <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Ajouter un tag (Entrée)"
                style={inputStyle}
              />
            </div>

            {/* Group */}
            <div>
              <label style={labelStyle}>Groupe</label>
              <Select
                value={groupId ?? ''}
                onChange={v => setGroupId(v || undefined)}
                options={[
                  { value: '', label: '— Aucun groupe —' },
                  ...groups.map(g => ({ value: g.id, label: `${g.emoji} ${g.name}` })),
                ]}
              />
            </div>

            {/* Color */}
            <div>
              <label style={labelStyle}>Couleur</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: color === c ? '3px solid white' : '3px solid transparent',
                      cursor: 'pointer', flexShrink: 0,
                      outline: color === c ? `2px solid ${c}` : 'none',
                      outlineOffset: 2,
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              style={{
                marginTop: 8,
                width: '100%', height: 44, borderRadius: 12,
                background: 'var(--accent)', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(225,31,123,0.4)',
              }}
            >
              Enregistrer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 6,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}
