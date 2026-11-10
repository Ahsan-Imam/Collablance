/**
 * lib/contextEligibility.js
 *
 * Context sharing is team-scoped: a member can only post to the Team Context
 * board once they belong to a collective (team) that has at least one started
 * project. Keeps context cards meaningfully scoped instead of a free-for-all
 * global feed.
 */

export async function getContextEligibility(supabase, userId) {
  const { data: memberships, error: memErr } = await supabase
    .from('collective_members')
    .select('collective_id, collectives(id, name, avatar_initial)')
    .eq('user_id', userId)

  if (memErr) return { eligible: false, collectives: [], projects: [], error: memErr.message }

  const collectives = (memberships || []).map((m) => m.collectives).filter(Boolean)
  const collectiveIds = collectives.map((c) => c.id)

  let projects = []
  if (collectiveIds.length) {
    const { data, error: projErr } = await supabase
      .from('projects')
      .select('id, title, collective_id, status')
      .in('collective_id', collectiveIds)

    if (projErr) return { eligible: false, collectives, projects: [], error: projErr.message }
    projects = data || []
  }

  return {
    eligible: collectiveIds.length > 0 && projects.length > 0,
    collectives,
    projects,
  }
}

/** Server-side guard: confirms the user may post context under this collective/project. */
export async function verifyContextScope(supabase, userId, collectiveId, projectId) {
  if (!collectiveId || !projectId) {
    return { ok: false, error: 'Join a team and start a project before sharing context — collective_id and project_id are required.' }
  }

  const { data: membership } = await supabase
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', userId)
    .eq('collective_id', collectiveId)
    .maybeSingle()
  if (!membership) return { ok: false, error: 'You are not a member of this team.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('collective_id', collectiveId)
    .maybeSingle()
  if (!project) return { ok: false, error: 'That project does not belong to this team.' }

  return { ok: true }
}
