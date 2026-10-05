import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Allow the app to render without valid Supabase credentials
  // (shows UI without auth functionality)
  if (!url || !key || !url.startsWith('http')) {
    // Return a mock client that won't crash the app
    const noop = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: noop,
        signUp: noop,
        signOut: () => Promise.resolve({ error: null }),
        updateUser: noop,
        onAuthStateChange: (_event, _cb) => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
      from: () => ({
        select: () => ({ data: null, error: null }),
        insert: noop,
        update: noop,
        delete: noop,
      }),
    }
  }

  return createBrowserClient(url, key)
}
