import { createClient } from '@/lib/supabase/server'
import { getProjectAccess } from '@/lib/projectAccess'
import { paymentsEnabled } from '@/lib/payments/razorpay'
import { NextResponse } from 'next/server'

const COLUMNS = 'id,project_id,title,description,amount,currency,order_index,status,due_date,submitted_at,approved_at,approved_by,funded_at,created_at,updated_at'

// GET /api/projects/[id]/milestones
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { isOwner, isTeamMember, error: accessErr } = await getProjectAccess(supabase, user.id, id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: accessErr === 'Project not found' ? 404 : 500 })
  if (!isOwner && !isTeamMember) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { data, error } = await supabase
    .from('milestones')
    .select(COLUMNS)
    .eq('project_id', id)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, paymentsEnabled: paymentsEnabled() })
}

// POST /api/projects/[id]/milestones — client defines a milestone
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { isOwner, error: accessErr } = await getProjectAccess(supabase, user.id, id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: accessErr === 'Project not found' ? 404 : 500 })
  if (!isOwner) return NextResponse.json({ error: 'Only the project owner can add milestones' }, { status: 403 })

  const body = await request.json()
  const { title, description, amount, due_date, order_index } = body

  if (!title?.trim() || amount === undefined || amount === null || Number(amount) <= 0) {
    return NextResponse.json({ error: 'title and a positive amount are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('milestones')
    .insert({
      project_id: id,
      title: title.trim(),
      description: description?.trim() || null,
      amount: Number(amount),
      due_date: due_date || null,
      order_index: order_index ?? 0,
    })
    .select(COLUMNS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
