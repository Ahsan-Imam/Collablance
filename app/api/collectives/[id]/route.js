import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/collectives/[id]
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('collectives')
    .select(`
      *,
      collective_members(user_id, role, joined_at,
        profiles(id, full_name, avatar_url, skills, hourly_rate, location)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

// PATCH /api/collectives/[id] — update (owner only)
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, description, focus_area, is_public } = body

  const updates = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (focus_area !== undefined) updates.focus_area = focus_area
  if (is_public !== undefined) updates.is_public = is_public
  if (name) updates.avatar_initial = name[0].toUpperCase()

  const { data, error } = await supabase
    .from('collectives')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  return NextResponse.json({ data })
}

// DELETE /api/collectives/[id] — delete (owner only)
export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('collectives')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
