import 'server-only'

// What the AI drafts need to know about a project and a team, read as the
// signed-in user. members keep user_id/name for the caller; lib/ai/drafts.js
// sends only role, experience and skills to the model.
export async function loadTeamBrief(supabase, projectId, collectiveId) {
  const [{ data: project }, { data: team }] = await Promise.all([
    supabase.from('projects').select('id, title, description, skills_needed, budget_min, budget_max, currency, deadline, status, collective_id').eq('id', projectId).maybeSingle(),
    supabase.from('collectives').select('id, name, description, collective_members(user_id, role)').eq('id', collectiveId).maybeSingle(),
  ])
  if (!project || !team) return null
  const ids = team.collective_members.map((m) => m.user_id)
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, skills, experience_years').in('id', ids)
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  const members = team.collective_members.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    name: byId[m.user_id]?.full_name || 'Member',
    skills: byId[m.user_id]?.skills || [],
    experience_years: byId[m.user_id]?.experience_years,
  }))
  return { project, team, members }
}
