import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/collectives/[id]/members/[userId] — owner promotes a member to
// Team Leader (admin role) or demotes back to member. The owner's own role
// can't be changed here — there's always exactly one owner.
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, userId } = await params
  const { role } = await request.json()
  if (!['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'role must be admin or member' }, { status: 400 })
  }

  const { data: collective, error: collErr } = await supabase
    .from('collectives')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle()
  if (collErr) return NextResponse.json({ error: collErr.message }, { status: 500 })
  if (!collective) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (collective.owner_id !== user.id) return NextResponse.json({ error: 'Only the team owner can set roles' }, { status: 403 })
  if (userId === collective.owner_id) return NextResponse.json({ error: "The owner's role can't be changed" }, { status: 400 })

  const { data, error } = await supabase
    .from('collective_members')
    .update({ role })
    .eq('collective_id', id)
    .eq('user_id', userId)
    .select('collective_id, user_id, role')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'That person is not a member of this team' }, { status: 404 })
  return NextResponse.json({ data })
}
