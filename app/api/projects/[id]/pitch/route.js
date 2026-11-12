import { createClient } from '@/lib/supabase/server'
import { canAcceptProject } from '@/lib/projectAcceptance'
import { loadTeamBrief } from '@/lib/ai/teamBrief'
import { draftPitch } from '@/lib/ai/drafts'
import { AI_NOT_CONFIGURED } from '@/lib/ai/model'
import { NextResponse } from 'next/server'

export const maxDuration = 60

// POST /api/projects/[id]/pitch — AI drafts a proposal for the team lead to edit.
// Nothing is saved or sent: the lead still submits the proposal form themselves.
// shortcut: no per-user rate limit, only team leads can call it; add one if AI costs grow
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { collective_id: collectiveId } = await request.json()
  if (!collectiveId) return NextResponse.json({ error: 'collective_id is required' }, { status: 400 })
  if (!await canAcceptProject(supabase, user.id, collectiveId)) {
    return NextResponse.json({ error: 'Only a team owner or admin can draft a proposal for their team' }, { status: 403 })
  }

  const brief = await loadTeamBrief(supabase, id, collectiveId)
  if (!brief) return NextResponse.json({ error: 'Project or team not found' }, { status: 404 })

  try {
    const draft = await draftPitch(brief)
    if (!draft) return NextResponse.json({ error: AI_NOT_CONFIGURED }, { status: 503 })
    return NextResponse.json({ data: draft })
  } catch (err) {
    console.error('[ai] pitch draft failed for project', id, err.message)
    return NextResponse.json({ error: 'The AI couldn’t draft a proposal just now. Try again, or write it yourself.' }, { status: 502 })
  }
}
