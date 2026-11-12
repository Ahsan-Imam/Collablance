import { createClient } from '@/lib/supabase/server'
import { canAcceptProject } from '@/lib/projectAcceptance'
import { notify } from '@/lib/notify'
import { NextResponse, after } from 'next/server'

const COLUMNS = 'id,project_id,collective_id,applied_by,message,quote_amount,timeline_days,status,created_at,responded_at,collectives(id,name,avatar_initial,focus_area)'

// GET /api/projects/[id]/applications — the project owner sees every
// application; anyone else sees only the applications from a team they
// belong to (enforced by RLS — this query doesn't filter by role itself).
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
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
  const { collective_id: collectiveId, message, quote_amount, timeline_days } = await request.json()
  if (!collectiveId) return NextResponse.json({ error: 'collective_id is required' }, { status: 400 })
  const quote = Number(quote_amount)
  const days = Number(timeline_days)
  if (!(quote > 0) || !Number.isInteger(days) || days < 1) {
    return NextResponse.json({ error: 'A proposal needs your price (₹) and a timeline in whole days' }, { status: 400 })
  }

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, title, status, collective_id, owner_id')
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
    .insert({ project_id: id, collective_id: collectiveId, applied_by: user.id, message: message?.trim() || null, quote_amount: quote, timeline_days: days })
    .select(COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Your team already has a pending application for this project' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  after(() => notify([project.owner_id], `New proposal for ${project.title}`, `${data.collectives?.name || 'A team'} sent a proposal: ₹${quote.toLocaleString('en-IN')}, ${days} day${days === 1 ? '' : 's'}.`, `/projects/${id}`))
  return NextResponse.json({ data }, { status: 201 })
}
