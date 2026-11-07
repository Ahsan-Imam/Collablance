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
        // Only succeeds for brand-new accounts (see google_client_signup_migration.sql);
        // existing freelancers keep their role
        const { data: role, error: roleErr } = await supabase.rpc('claim_client_role')
        if (roleErr) {
          console.error('[auth/callback] claim_client_role failed:', roleErr.message)
        }
        if (role === 'client') {
          return NextResponse.redirect(`${origin}/client`)
        }
        return NextResponse.redirect(`${origin}/dashboard?notice=already_freelancer`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
