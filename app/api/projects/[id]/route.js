import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const STATUSES = ['open', 'in_progress', 'completed', 'cancelled']

// GET /api/projects/[id] — full project details incl. collective and owner profile
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('projects')
    .select('*, collectives(id, name, avatar_initial, focus_area)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // projects.owner_id references auth.users, not profiles — fetch the owner separately
  const { data: owner } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, location, skills')
    .eq('id', data.owner_id)
    .maybeSingle()

  return NextResponse.json({ data: { ...data, owner: owner || null } })
}

// PATCH /api/projects/[id] — update (owner only)
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const updates = {}
  for (const key of ['title', 'description', 'budget_min', 'budget_max', 'currency', 'skills_needed', 'deadline', 'collective_id']) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${STATUSES.join(', ')}` }, { status: 400 })
    }
    updates.status = body.status
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('*, collectives(id, name, avatar_initial, focus_area)')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  return NextResponse.json({ data })
}

// DELETE /api/projects/[id] — delete (owner only)
export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // RLS only allows deleting before a team accepts — after that, cancel instead
  if (!data?.length) {
    return NextResponse.json({ error: 'Only an unaccepted project you own can be deleted. Cancel an accepted project instead.' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
