import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Allow the app to render without valid Supabase credentials
  if (!url || !key || !url.startsWith('http')) {
    const noop = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: noop,
        signUp: noop,
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({
        select: () => ({ data: null, error: null }),
        insert: noop,
        update: noop,
        delete: noop,
      }),
    }
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  })
}
