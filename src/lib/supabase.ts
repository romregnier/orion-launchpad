import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tpbluellqgehaqmmmunp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ID4jZLGVQZ1GoyUz1DwWZA_son8WlCD'

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
