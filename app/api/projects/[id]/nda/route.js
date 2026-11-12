import { createClient } from '@/lib/supabase/server'
import { getProjectAccess } from '@/lib/projectAccess'
import { buildNdaText, NDA_VERSION } from '@/lib/nda'
import { notify, teamMemberIds } from '@/lib/notify'
import { NextResponse, after } from 'next/server'

async function load(supabase, projectId) {
  const { data: nda, error } = await supabase
    .from('project_ndas')
    .select('id, project_id, collective_id, version, body, created_at, nda_signatures(user_id, signed_name, signed_at)')
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!nda) return { nda: null }

  // Who still has to sign: the client and every current member of the team
  const [{ data: project }, { data: members }] = await Promise.all([
    supabase.from('projects').select('owner_id').eq('id', projectId).maybeSingle(),
    supabase.from('collective_members').select('user_id').eq('collective_id', nda.collective_id),
  ])
  const required = [...new Set([project?.owner_id, ...(members || []).map((m) => m.user_id)].filter(Boolean))]
  const signed = new Set(nda.nda_signatures.map((s) => s.user_id))
  const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', required)
  const nameById = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name]))
  return {
    nda: {
      ...nda,
      signers: required.map((id) => ({
        user_id: id,
        name: nameById[id] || 'Member',
        signed_at: nda.nda_signatures.find((s) => s.user_id === id)?.signed_at || null,
      })),
      fully_signed: required.every((id) => signed.has(id)),
    },
  }
}

// GET /api/projects/[id]/nda — the project's NDA and who has signed (client and team only)
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { nda, error } = await load(supabase, id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: nda })
}

// POST /api/projects/[id]/nda — { action: 'create' } (client) or { action: 'sign' } (client or team member)
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await request.json()
  const { project, isOwner, isTeamMember, error: accessErr } = await getProjectAccess(supabase, user.id, id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: accessErr === 'Project not found' ? 404 : 500 })
  if (!isOwner && !isTeamMember) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const myName = me?.full_name?.trim()

  if (action === 'create') {
    if (!isOwner) return NextResponse.json({ error: 'Only the client can ask for an NDA' }, { status: 403 })
    if (!project.collective_id) return NextResponse.json({ error: 'Choose a team for this project first' }, { status: 400 })
    if (!myName) return NextResponse.json({ error: 'Add your name to your profile before creating an NDA' }, { status: 400 })

    const [{ data: details }, { data: team }] = await Promise.all([
      supabase.from('projects').select('title').eq('id', id).single(),
      supabase.from('collectives').select('name').eq('id', project.collective_id).single(),
    ])
    const body = buildNdaText({
      projectTitle: details.title,
      clientName: myName,
      teamName: team.name,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }),
    })
    const { error } = await supabase
      .from('project_ndas')
      .insert({ project_id: id, collective_id: project.collective_id, created_by: user.id, version: NDA_VERSION, body })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'This project already has an NDA' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    after(async () => notify(await teamMemberIds(supabase, project.collective_id), `NDA to sign: ${details.title}`, 'The client asked your team to sign a non-disclosure agreement for this project. Read it and sign on the project page.', `/projects/${id}`))
  } else if (action === 'sign') {
    if (!myName) return NextResponse.json({ error: 'Add your name to your profile before signing' }, { status: 400 })
    const { data: nda } = await supabase.from('project_ndas').select('id').eq('project_id', id).maybeSingle()
    if (!nda) return NextResponse.json({ error: 'This project has no NDA' }, { status: 404 })
    const { error } = await supabase.from('nda_signatures').insert({ nda_id: nda.id, user_id: user.id, signed_name: myName })
    // 23505: already signed — signing twice is harmless
    if (error && error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'action must be create or sign' }, { status: 400 })
  }

  const { nda, error } = await load(supabase, id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: nda })
}
