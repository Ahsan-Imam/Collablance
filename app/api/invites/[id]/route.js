import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/invites/[id] — accept or decline an invite sent to you
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await request.json()
  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 })
  }

  const { data: invite, error: fetchErr } = await supabase
    .from('team_invites')
    .select('id, collective_id, invited_user_id, status')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.invited_user_id !== user.id) return NextResponse.json({ error: 'Not your invite' }, { status: 403 })
  if (invite.status !== 'pending') return NextResponse.json({ error: 'This invite was already responded to' }, { status: 400 })

  const status = action === 'accept' ? 'accepted' : 'declined'

  // Join before marking the invite accepted, so a failed join can be retried
  if (action === 'accept') {
    const { error: joinErr } = await supabase
      .from('collective_members')
      .insert({ collective_id: invite.collective_id, user_id: user.id, role: 'member' })
    // Already a member (e.g. joined via link meanwhile) is fine — not a failure
    if (joinErr && joinErr.code !== '23505') {
      return NextResponse.json({ error: joinErr.message }, { status: 500 })
    }
  }

  const { data, error } = await supabase
    .from('team_invites')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, responded_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
