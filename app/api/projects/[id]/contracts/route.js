import { createClient } from '@/lib/supabase/server'
import { canAcceptProject } from '@/lib/projectAcceptance'
import { NextResponse } from 'next/server'

const COLUMNS = 'id,project_id,collective_id,created_by,splits,status,created_at,locked_at'

// GET /api/projects/[id]/contracts?collective_id=... — the split + who's signed
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const collectiveId = searchParams.get('collective_id')
  if (!collectiveId) return NextResponse.json({ error: 'collective_id is required' }, { status: 400 })

  const { data: contract, error } = await supabase
    .from('project_contracts')
    .select(COLUMNS)
    .eq('project_id', id)
    .eq('collective_id', collectiveId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!contract) return NextResponse.json({ data: null })

  const { data: signatures } = await supabase.from('contract_signatures').select('user_id').eq('contract_id', contract.id)
  return NextResponse.json({ data: { ...contract, signatures: signatures || [] } })
}

// POST /api/projects/[id]/contracts — team leader proposes the split
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { collective_id: collectiveId, splits } = await request.json()
  if (!collectiveId || !Array.isArray(splits) || splits.length === 0) {
    return NextResponse.json({ error: 'collective_id and splits are required' }, { status: 400 })
  }

  const allowed = await canAcceptProject(supabase, user.id, collectiveId)
  if (!allowed) return NextResponse.json({ error: 'Only a team owner or admin can propose the payment split' }, { status: 403 })

  const { data: members, error: memErr } = await supabase
    .from('collective_members')
    .select('user_id')
    .eq('collective_id', collectiveId)
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 })

  const memberIds = new Set(members.map((m) => m.user_id))
  const splitIds = new Set(splits.map((s) => s.user_id))
  const sameSet = memberIds.size === splitIds.size && [...memberIds].every((m) => splitIds.has(m))
  if (!sameSet) {
    return NextResponse.json({ error: 'The split must cover every current team member, exactly once' }, { status: 400 })
  }

  const total = splits.reduce((sum, s) => sum + Number(s.percent), 0)
  const allPositiveInts = splits.every((s) => Number.isInteger(Number(s.percent)) && Number(s.percent) > 0)
  if (!allPositiveInts || total !== 100) {
    return NextResponse.json({ error: 'Percentages must be whole numbers greater than 0, summing to exactly 100' }, { status: 400 })
  }

  const normalizedSplits = splits.map((s) => ({ user_id: s.user_id, percent: Number(s.percent) }))

  const { data: contract, error: insertErr } = await supabase
    .from('project_contracts')
    .insert({ project_id: id, collective_id: collectiveId, created_by: user.id, splits: normalizedSplits })
    .select(COLUMNS)
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') return NextResponse.json({ error: 'A contract already exists for this project and team' }, { status: 409 })
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ data: { ...contract, signatures: [] } }, { status: 201 })
}
