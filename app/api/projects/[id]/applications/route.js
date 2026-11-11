import { createClient } from '@/lib/supabase/server'
import { canAcceptProject } from '@/lib/projectAcceptance'
import { NextResponse } from 'next/server'

const COLUMNS = 'id,project_id,collective_id,applied_by,message,status,created_at,responded_at,collectives(id,name,avatar_initial,focus_area)'

// GET /api/projects/[id]/applications — project owner reviews applications
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle()
  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.owner_id !== user.id) return NextResponse.json({ error: 'Only the project owner can view applications' }, { status: 403 })

  const { data, error } = await supabase
    .from('project_applications')
    .select(COLUMNS)
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/projects/[id]/applications — a team lead applies for this project
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { collective_id: collectiveId, message } = await request.json()
  if (!collectiveId) return NextResponse.json({ error: 'collective_id is required' }, { status: 400 })

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, status, collective_id, owner_id')
    .eq('id', id)
    .maybeSingle()
  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.owner_id === user.id) return NextResponse.json({ error: "You can't apply to your own project" }, { status: 400 })
  if (project.status !== 'open' || project.collective_id) {
    return NextResponse.json({ error: 'This project is not open for applications' }, { status: 400 })
  }

  const allowed = await canAcceptProject(supabase, user.id, collectiveId)
  if (!allowed) return NextResponse.json({ error: 'Only a team owner or admin can apply on behalf of their team' }, { status: 403 })

  const { data, error } = await supabase
    .from('project_applications')
    .insert({ project_id: id, collective_id: collectiveId, applied_by: user.id, message: message?.trim() || null })
    .select(COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Your team already has a pending application for this project' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
