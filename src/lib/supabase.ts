import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Détection build sans variables d'env (évite l'écran noir silencieux)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0B090D;color:#E11F7B;font-family:sans-serif;font-size:16px;text-align:center;padding:24px">
    ⚠️ Erreur de configuration — variables d'environnement manquantes.<br><br>
    <span style="color:rgba(255,255,255,0.4);font-size:13px">Hard refresh (Cmd+Shift+R) pour recharger la dernière version.</span>
  </div>`
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants dans le build')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface DbMessage {
  id?: string
  author: string
  text: string
  created_at?: string
}

export interface DbComment {
  id?: string
  project_id: string
  author: string
  text: string
  created_at?: string
}

// Chat — fetch + realtime
export async function fetchMessages(): Promise<DbMessage[]> {
  const { data, error } = await supabase
    .from('launchpad_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) { console.warn('Supabase:', error.message); return [] }
  return data ?? []
}

export async function sendMessage(author: string, text: string): Promise<void> {
  await supabase.from('launchpad_messages').insert({ author, text })
}

// Comments
export async function fetchComments(projectId: string): Promise<DbComment[]> {
  const { data, error } = await supabase
    .from('launchpad_comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) { console.warn('Supabase:', error.message); return [] }
  return data ?? []
}

export async function postComment(projectId: string, author: string, text: string): Promise<void> {
  await supabase.from('launchpad_comments').insert({ project_id: projectId, author, text })
}
