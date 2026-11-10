/**
 * lib/projectAcceptance.js
 *
 * A project posted "for a collective" stays locked until a team lead
 * (owner/admin of that collective) accepts it — that's what opens the
 * project's workspace.
 */

export async function getProjectMembership(supabase, userId, collectiveId) {
  if (!collectiveId) return null
  const { data } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('user_id', userId)
    .maybeSingle()
  return data || null
}

export async function canAcceptProject(supabase, userId, collectiveId) {
  const membership = await getProjectMembership(supabase, userId, collectiveId)
  return !!membership && ['owner', 'admin'].includes(membership.role)
}
