'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * lib/roles.js
 *
 * One account can be both a client and a freelancer (Supabase allows one
 * account per email). These call the add_role / switch_role SQL functions —
 * the only way roles can change (see lib/db/dual_role_migration.sql).
 */

export const ROLE_CHANGED_EVENT = 'collablance:role-changed'

async function callRoleRpc(fn, role) {
  const { data, error } = await createClient().rpc(fn, { new_role: role })
  if (error) throw new Error(error.message)
  // Lets useRole() and the navbar refresh without a full page reload
  window.dispatchEvent(new Event(ROLE_CHANGED_EVENT))
  return data
}

/** Grant a role the account doesn't have yet, and switch to it. */
export function addRole(role) {
  return callRoleRpc('add_role', role)
}

/** Switch the active mode to a role the account already has. */
export function switchRole(role) {
  return callRoleRpc('switch_role', role)
}

/** Where each mode's home is. */
export const ROLE_HOME = { client: '/client', freelancer: '/dashboard' }
