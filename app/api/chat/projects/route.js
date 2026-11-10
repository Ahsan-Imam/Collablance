import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/chat/projects — projects this user can chat in: ones they own,
// plus ones belonging to a team they're a member of.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberships, error: memErr } = await supabase
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', user.id)
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 })
  const collectiveIds = (memberships || []).map((m) => m.collective_id)

  const orFilter = collectiveIds.length
    ? `owner_id.eq.${user.id},collective_id.in.(${collectiveIds.join(',')})`
    : `owner_id.eq.${user.id}`

  const { data, error } = await supabase
    .from('projects')
    .select('id, title, status, owner_id, collective_id, collectives(name)')
    .or(orFilter)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
