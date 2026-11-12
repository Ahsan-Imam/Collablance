'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_CHANGED_EVENT } from '@/lib/roles'

/**
 * Current user, their active mode and which roles they have, from the
 * profiles table. Read from profiles rather than user_metadata because
 * profiles is what the database enforces (see supabase/migrations/20261112000000_dual_role.sql).
 * Refreshes when addRole() / switchRole() change the role.
 *
 * @returns {{
 *   user: object|null,
 *   role: 'client'|'freelancer'|null,   // active mode
 *   isClient: boolean,                  // has client access
 *   isFreelancer: boolean,              // has freelancer access
 *   loading: boolean,
 * }}
 */
export function useRole() {
  const [state, setState] = useState({ user: null, role: null, isClient: false, isFreelancer: false, loading: true })

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const load = () => supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        if (!cancelled) setState({ user: null, role: null, isClient: false, isFreelancer: false, loading: false })
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('role, is_client, is_freelancer')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancelled) {
        setState({
          user,
          role: data?.role || 'freelancer',
          isClient: !!data?.is_client,
          isFreelancer: data ? !!data.is_freelancer : true,
          loading: false,
        })
      }
    })

    load()
    window.addEventListener(ROLE_CHANGED_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(ROLE_CHANGED_EVENT, load)
    }
  }, [])

  return state
}
