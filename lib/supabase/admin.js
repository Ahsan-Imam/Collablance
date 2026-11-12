import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Only for lib/payments: the Razorpay
// webhook has no user session, and the payments ledger is write-protected
// from users. Callers must check permissions themselves first.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
