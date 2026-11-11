import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/invites — the current user's team invites (their inbox)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('team_invites')
    .select('id, status, created_at, responded_at, collectives(id, name, avatar_initial, focus_area)')
    .eq('invited_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
