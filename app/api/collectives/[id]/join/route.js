import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/collectives/[id]/join — self-join a team via its shared link.
// Idempotent: joining a team you're already in just confirms membership.
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: collective, error: collErr } = await supabase
    .from('collectives')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (collErr) return NextResponse.json({ error: collErr.message }, { status: 500 })
  if (!collective) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('collective_members')
    .select('collective_id')
    .eq('collective_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return NextResponse.json({ joined: true, already: true })

  const { error } = await supabase
    .from('collective_members')
    .insert({ collective_id: id, user_id: user.id, role: 'member' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ joined: true })
}
