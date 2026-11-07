'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Current user + their role ('client' | 'freelancer') from the profiles table.
 * The role comes from profiles, not user_metadata, because profiles.role is the
 * locked value the database enforces (see lib/db/client_role_migration.sql).
 *
 * @returns {{ user: object|null, role: 'client'|'freelancer'|null, loading: boolean }}
 */
export function useRole() {
  const [state, setState] = useState({ user: null, role: null, loading: true })

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        if (!cancelled) setState({ user: null, role: null, loading: false })
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancelled) setState({ user, role: data?.role || 'freelancer', loading: false })
    })

    return () => { cancelled = true }
  }, [])

  return state
}
