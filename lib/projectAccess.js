/**
 * lib/projectAccess.js
 *
 * Shared "does this user belong to this project" check — the project
 * owner (client) or any member of the project's assigned team. Used by
 * milestones, reviews, and project chat so access rules stay consistent.
 */

export async function getProjectAccess(supabase, userId, projectId) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, owner_id, collective_id, status')
    .eq('id', projectId)
    .maybeSingle()

  if (error) return { project: null, isOwner: false, isTeamMember: false, error: error.message }
  if (!project) return { project: null, isOwner: false, isTeamMember: false, error: 'Project not found' }

  const isOwner = project.owner_id === userId
  let isTeamMember = false
  if (!isOwner && project.collective_id) {
    const { data: membership } = await supabase
      .from('collective_members')
      .select('collective_id')
      .eq('collective_id', project.collective_id)
      .eq('user_id', userId)
      .maybeSingle()
    isTeamMember = !!membership
  }

  return { project, isOwner, isTeamMember, error: null }
}
