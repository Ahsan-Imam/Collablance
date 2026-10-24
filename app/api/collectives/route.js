import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/collectives — list all collectives (with member count)
export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const mine = searchParams.get('mine') // ?mine=true → only current user's
  const search = searchParams.get('q')

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('collectives')
    .select(`
      id, name, description, focus_area, avatar_initial, is_public, owner_id, created_at,
      collective_members(count)
    `)
    .order('created_at', { ascending: false })

  if (mine && user) {
    // return collectives the user owns OR is a member of
    query = supabase
      .from('collectives')
      .select(`
        id, name, description, focus_area, avatar_initial, is_public, owner_id, created_at,
        collective_members!inner(user_id, role)
      `)
      .eq('collective_members.user_id', user.id)
      .order('created_at', { ascending: false })
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/collectives — create a collective
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, description, focus_area } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const avatar_initial = name.trim()[0].toUpperCase()

  // Create collective
  const { data: collective, error: collErr } = await supabase
    .from('collectives')
    .insert({ owner_id: user.id, name: name.trim(), description, focus_area, avatar_initial })
    .select()
    .single()

  if (collErr) return NextResponse.json({ error: collErr.message }, { status: 500 })

  // Auto-add creator as owner member
  await supabase.from('collective_members').insert({
    collective_id: collective.id,
    user_id: user.id,
    role: 'owner',
  })

  return NextResponse.json({ data: collective }, { status: 201 })
}
