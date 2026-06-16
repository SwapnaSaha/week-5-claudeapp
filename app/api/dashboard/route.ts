import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required.' }, { status: 400 })

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: totalSessions },
      { count: sessionsToday },
      { count: totalMessages },
      { count: messagesThisWeek },
      { count: activeSessions },
      { count: pinnedSessions },
      { count: failedSessions },
      { data: ratingData },
      { data: recentMessages },
      { data: recentSessions },
    ] = await Promise.all([
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', todayStart),
      supabase.from('messages').select('sessions!inner(user_id)', { count: 'exact', head: true }).eq('sessions.user_id', userId).eq('role', 'user'),
      supabase.from('messages').select('sessions!inner(user_id)', { count: 'exact', head: true }).eq('sessions.user_id', userId).eq('role', 'user').gte('created_at', weekStart),
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('updated_at', weekStart),
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('pinned', true),
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'error'),
      supabase.from('feedback').select('rating').eq('user_id', userId),
      supabase.from('messages').select('id, content, created_at, role, session_id').eq('role', 'user').order('created_at', { ascending: false }).limit(25),
      supabase.from('sessions').select('id, title, created_at, status').eq('user_id', userId).order('created_at', { ascending: false }).limit(25),
    ])

    const ratings = ratingData?.map(r => r.rating) ?? []
    const avgRating = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : '—'

    // Build activity events
    type Event = { id: string; type: string; label: string; created_at: string }
    const events: Event[] = [
      ...(recentMessages?.map(m => ({
        id: `msg-${m.id}`,
        type: 'message_sent',
        label: `Query: ${m.content.slice(0, 60)}${m.content.length > 60 ? '…' : ''}`,
        created_at: m.created_at,
      })) ?? []),
      ...(recentSessions?.map(s => ({
        id: `sess-${s.id}`,
        type: s.status === 'completed' ? 'session_completed' : s.status === 'error' ? 'session_error' : 'session_created',
        label: s.status === 'completed' ? `Completed: ${s.title}` : s.status === 'error' ? `Error: ${s.title}` : `New session: ${s.title}`,
        created_at: s.created_at,
      })) ?? []),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)

    return NextResponse.json({
      kpi: {
        totalSessions: totalSessions ?? 0,
        sessionsToday: sessionsToday ?? 0,
        totalMessages: totalMessages ?? 0,
        messagesThisWeek: messagesThisWeek ?? 0,
        activeSessions: activeSessions ?? 0,
        pinnedSessions: pinnedSessions ?? 0,
        avgRating,
        failedSessions: failedSessions ?? 0,
      },
      events,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load dashboard.' }, { status: 500 })
  }
}
