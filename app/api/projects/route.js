import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/projects — list projects (with filters)
export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('q')
  const collectiveId = searchParams.get('collective_id')
  const mine = searchParams.get('mine')

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('projects')
    .select(`
      id, title, description, budget_min, budget_max, currency,
      status, skills_needed, deadline, created_at, owner_id, collective_id,
      collectives(name, avatar_initial)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (collectiveId) query = query.eq('collective_id', collectiveId)
  if (mine && user) query = query.eq('owner_id', user.id)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/projects — create a project
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, budget_min, budget_max, currency, skills_needed, deadline, collective_id } = body

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      title: title.trim(),
      description: description.trim(),
      budget_min: budget_min || null,
      budget_max: budget_max || null,
      currency: currency || 'INR',
      skills_needed: skills_needed || [],
      deadline: deadline || null,
      collective_id: collective_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
