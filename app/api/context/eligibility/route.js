import { createClient } from '@/lib/supabase/server'
import { getContextEligibility } from '@/lib/contextEligibility'
import { NextResponse } from 'next/server'

// GET /api/context/eligibility — can this user share context yet?
// (member of a team that has at least one started project)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await getContextEligibility(supabase, user.id)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}
