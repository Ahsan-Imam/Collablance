/**
 * lib/contracts.js
 *
 * Payment split contracts: a team's leader proposes an integer % split of
 * a project's payout among the team's current members; the project can't
 * be accepted/started until every one of those members has signed.
 */

export async function getSignedContract(supabase, projectId, collectiveId) {
  const { data } = await supabase
    .from('project_contracts')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('collective_id', collectiveId)
    .maybeSingle()
  return data?.status === 'signed' ? data : null
}

export const CONTRACT_REQUIRED_ERROR =
  "All team members must sign the payment split contract for this project before it can be accepted."
