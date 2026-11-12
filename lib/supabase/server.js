import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Allow the app to render without valid Supabase credentials
  if (!url || !key || !url.startsWith('http')) {
    // Any query chain (.from().select().eq()…) resolves to this instead of
    // crashing — e.g. Vercel preview builds, which have no Supabase variables.
    const result = { data: null, count: null, error: { message: 'Supabase not configured' } }
    const query = new Proxy(function () {}, {
      get: (_, prop) => (prop === 'then' ? (resolve) => resolve(result) : () => query),
    })
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => query,
        signUp: () => query,
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => query,
      rpc: () => query,
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
