import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { escapeLike } from '@/lib/search'

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

  let myRoleByCollective = {}
  if (mine && user) {
    // Look up memberships first, then filter collectives by id — filtering on the
    // embedded collective_members would also limit the member count to 1.
    const { data: memberships, error: memErr } = await supabase
      .from('collective_members')
      .select('collective_id, role')
      .eq('user_id', user.id)

    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 })
    if (!memberships.length) return NextResponse.json({ data: [] })

    myRoleByCollective = Object.fromEntries(memberships.map(m => [m.collective_id, m.role]))
    query = query.in('id', memberships.map(m => m.collective_id))
  } else {
    // Browsing (e.g. clients looking for a team) only lists public collectives
    query = query.eq('is_public', true)
  }

  if (search) {
    query = query.ilike('name', `%${escapeLike(search)}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const withRole = mine && user ? data.map(c => ({ ...c, my_role: myRoleByCollective[c.id] || null })) : data
  return NextResponse.json({ data: withRole })
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
  const { error: memberErr } = await supabase.from('collective_members').insert({
    collective_id: collective.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  return NextResponse.json({ data: collective }, { status: 201 })
}
