import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only allow same-site relative paths ("/x"), never "//host" or full URLs
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'
  // Set by the Google button when the user chose Client — OAuth can't carry it otherwise
  const wantsClient = searchParams.get('role') === 'client'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (wantsClient) {
        // Adds client access (new or existing account) and switches to client mode —
        // one account can be both (see dual_role_migration.sql)
        const { error: roleErr } = await supabase.rpc('add_role', { new_role: 'client' })
        if (roleErr) {
          console.error('[auth/callback] add_role failed:', roleErr.message)
          return NextResponse.redirect(`${origin}/dashboard`)
        }
        return NextResponse.redirect(`${origin}/client`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
