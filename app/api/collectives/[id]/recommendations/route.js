import { createClient } from '@/lib/supabase/server'
import { FOCUS_KEYWORDS } from '@/lib/focusKeywords'
import { vectorsEnabled, syncVectors, searchVectors } from '@/lib/ai/vectors'
import { NextResponse } from 'next/server'

// GET /api/collectives/[id]/recommendations
// Suggests open, unassigned projects and available freelancers that fit this
// team. Supabase picks the candidates (so access rules and "open / available"
// stay the source of truth); Chroma ranks them by how close their text is to
// the team's own description and skills. Falls back to a keyword match on the
// team's focus area when the vector store is off or fails.

// Rank candidates against the team text, best first. null → use the fallback.
async function rankByMeaning(collection, teamText, rows, toText) {
  if (!vectorsEnabled() || !rows.length) return null
  await syncVectors(collection, rows.map((r) => ({ id: r.id, text: toText(r), stamp: r.updated_at || r.created_at })))
  const hits = await searchVectors(collection, teamText, { ids: rows.map((r) => r.id), limit: 6 })
  if (!hits?.length) return null
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
  return hits.filter((h) => byId[h.id]).map((h) => ({ ...byId[h.id], match: Math.round(h.similarity * 100) }))
}

export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: collective, error: collErr } = await supabase
    .from('collectives')
    .select('id, name, description, focus_area')
    .eq('id', id)
    .maybeSingle()
  if (collErr) return NextResponse.json({ error: collErr.message }, { status: 500 })
  if (!collective) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const focusWords = (FOCUS_KEYWORDS[collective.focus_area] || []).map((w) => w.toLowerCase())

  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, title, description, budget_min, budget_max, currency, skills_needed, deadline, created_at, updated_at')
    .eq('status', 'open')
    .is('collective_id', null)
    .order('created_at', { ascending: false })
    .limit(50)
  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

  const keywordProjects = () => (projects || [])
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
  const { data: memberProfiles } = await supabase.from('profiles').select('skills').in('id', [...memberIds])
  const teamSkills = [...new Set((memberProfiles || []).flatMap((p) => p.skills || []))]
  const teamText = [collective.name, collective.description, `focus: ${focusWords.join(', ')}`, `skills: ${teamSkills.join(', ')}`].filter(Boolean).join('\n')

  const scoredProjects = await rankByMeaning('projects', teamText, projects || [],
    (p) => `${p.title}\n${p.description}\nskills needed: ${(p.skills_needed || []).join(', ')}`) || keywordProjects()

  const { data: freelancers, error: freelErr } = await supabase
    .from('profiles')
    .select('id, full_name, bio, avatar_url, skills, hourly_rate, location, is_available, updated_at')
    .eq('is_available', true)
    .eq('is_freelancer', true)
    .order('created_at', { ascending: false })
    .limit(60)
  if (freelErr) return NextResponse.json({ error: freelErr.message }, { status: 500 })

  const candidates = (freelancers || []).filter((f) => !memberIds.has(f.id) && f.id !== user.id)
  // Only profiles with something to match on are worth ranking
  const describable = candidates.filter((f) => f.skills?.length || f.bio)
  const scoredFreelancers = await rankByMeaning('profiles', teamText, describable,
    (f) => `skills: ${(f.skills || []).join(', ')}\n${f.bio || ''}`) || candidates
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
