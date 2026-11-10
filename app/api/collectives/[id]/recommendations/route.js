import { createClient } from '@/lib/supabase/server'
import { FOCUS_KEYWORDS } from '@/lib/focusKeywords'
import { NextResponse } from 'next/server'

// GET /api/collectives/[id]/recommendations
// Suggests open, unassigned projects and available freelancers that fit
// this team's focus area — a lightweight keyword match, not a real
// matching engine, just enough to give a new team a next step.
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: collective, error: collErr } = await supabase
    .from('collectives')
    .select('id, focus_area')
    .eq('id', id)
    .maybeSingle()
  if (collErr) return NextResponse.json({ error: collErr.message }, { status: 500 })
  if (!collective) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const focusWords = (FOCUS_KEYWORDS[collective.focus_area] || []).map((w) => w.toLowerCase())

  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, title, description, budget_min, budget_max, currency, skills_needed, deadline, created_at')
    .eq('status', 'open')
    .is('collective_id', null)
    .order('created_at', { ascending: false })
    .limit(20)
  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

  const scoredProjects = (projects || [])
    .map((p) => {
      const skillsLower = (p.skills_needed || []).map((s) => s.toLowerCase())
      const matches = focusWords.some((w) => skillsLower.some((s) => s.includes(w)))
      return { ...p, _matches: matches }
    })
    .sort((a, b) => (b._matches - a._matches) || (new Date(b.created_at) - new Date(a.created_at)))
    .slice(0, 6)
    .map(({ _matches, ...p }) => p)

  const { data: members } = await supabase
    .from('collective_members')
    .select('user_id')
    .eq('collective_id', id)
  const memberIds = new Set((members || []).map((m) => m.user_id))

  const { data: freelancers, error: freelErr } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, skills, hourly_rate, location, is_available')
    .eq('is_available', true)
    .order('created_at', { ascending: false })
    .limit(30)
  if (freelErr) return NextResponse.json({ error: freelErr.message }, { status: 500 })

  const scoredFreelancers = (freelancers || [])
    .filter((f) => !memberIds.has(f.id) && f.id !== user.id)
    .map((f) => {
      const skillsLower = (f.skills || []).map((s) => s.toLowerCase())
      const matches = focusWords.some((w) => skillsLower.some((s) => s.includes(w)))
      return { ...f, _matches: matches }
    })
    .sort((a, b) => b._matches - a._matches)
    .slice(0, 6)
    .map(({ _matches, ...f }) => f)

  return NextResponse.json({ projects: scoredProjects, freelancers: scoredFreelancers })
}
