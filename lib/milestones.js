// Which milestone status moves a user may make. Mirrors guard_milestone_write()
// in the database — change both together. 'paid' and 'refunded' are never
// settable by a user: lib/payments and the admin ruling route set them.
export function canMoveMilestone(from, to, { isOwner, isTeamMember }) {
  return (
    (to === 'submitted' && isTeamMember && from === 'pending') ||
    (to === 'pending' && isOwner && from === 'submitted') || // sent back for changes
    (to === 'approved' && isOwner && from === 'submitted') ||
    (to === 'disputed' && (isOwner || isTeamMember) && ['submitted', 'approved'].includes(from))
  )
}
