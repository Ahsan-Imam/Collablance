import { createClient } from '@/lib/supabase/server'
import { canAcceptProject } from '@/lib/projectAcceptance'
import { loadTeamBrief } from '@/lib/ai/teamBrief'
import { suggestSplit } from '@/lib/ai/drafts'
import { AI_NOT_CONFIGURED } from '@/lib/ai/model'
import { NextResponse } from 'next/server'

export const maxDuration = 60

// POST /api/projects/[id]/split-suggestion — AI suggests a payout split.
// It only fills in the leader's form. Nothing is stored here, the contract is
// still validated by the database when proposed, and every member still signs.
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { collective_id: collectiveId } = await request.json()
  if (!collectiveId) return NextResponse.json({ error: 'collective_id is required' }, { status: 400 })
  if (!await canAcceptProject(supabase, user.id, collectiveId)) {
    return NextResponse.json({ error: 'Only a team owner or admin can propose the split' }, { status: 403 })
  }

  const brief = await loadTeamBrief(supabase, id, collectiveId)
  if (!brief) return NextResponse.json({ error: 'Project or team not found' }, { status: 404 })

  try {
    const shares = await suggestSplit(brief)
    if (!shares) return NextResponse.json({ error: AI_NOT_CONFIGURED }, { status: 503 })
    // The model only ever saw "M1, M2…" — put the real names back for the team to read
    const named = (text) => text.replace(/\bM(\d+)\b/g, (m, n) => brief.members[n - 1]?.name || m)
    return NextResponse.json({
      data: brief.members.map((m, i) => ({ user_id: m.user_id, percent: shares[i].percent, reason: named(shares[i].reason) })),
    })
  } catch (err) {
    console.error('[ai] split suggestion failed for project', id, err.message)
    return NextResponse.json({ error: 'The AI couldn’t suggest a split just now. Enter the percentages yourself.' }, { status: 502 })
  }
}
