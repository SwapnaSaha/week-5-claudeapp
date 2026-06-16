import { supabase } from './supabase'

export type UserRow = {
  id: string
  email: string
  password_hash: string
  created_at: string
}

export type SessionRow = {
  id: string
  user_id: string
  title: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  pinned: boolean
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type FeedbackRow = {
  id: string
  user_id: string
  session_id: string
  rating: number
  comment: string | null
  created_at: string
}

export async function getUser(email: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  if (error && error.code === 'PGRST116') return null
  if (error) throw error
  return data
}

export async function createUser(email: string, passwordHash: string): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createSession(userId: string, title = 'New session'): Promise<SessionRow> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, title })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSessions(userId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getSession(sessionId: string): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error && error.code === 'PGRST116') return null
  if (error) throw error
  return data
}

export async function updateSession(
  sessionId: string,
  fields: Partial<Pick<SessionRow, 'title' | 'status' | 'pinned'>>
): Promise<SessionRow> {
  const { data, error } = await supabase
    .from('sessions')
    .update(fields)
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
  if (error) throw error
}

export async function createMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ session_id: sessionId, role, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMessages(
  sessionId: string,
  limit = 100,
  before?: string
): Promise<MessageRow[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (before) {
    query = query.lt('created_at', before)
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createFeedback(
  userId: string,
  sessionId: string,
  rating: number,
  comment?: string
): Promise<FeedbackRow> {
  const { data, error } = await supabase
    .from('feedback')
    .insert({ user_id: userId, session_id: sessionId, rating, comment: comment ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}
