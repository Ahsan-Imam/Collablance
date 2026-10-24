import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/profile — current user's profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // No profile row yet — return empty shell
  if (!data) {
    return NextResponse.json({
      data: {
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        bio: '', skills: [], hourly_rate: null,
        location: '', portfolio_url: '', experience_years: null,
        is_available: true,
      }
    })
  }

  return NextResponse.json({ data })
}

// POST /api/profile — upsert profile
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { full_name, bio, skills, hourly_rate, location, portfolio_url, experience_years, is_available } = body

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name,
      bio,
      skills: skills || [],
      hourly_rate: hourly_rate || null,
      location,
      portfolio_url,
      experience_years: experience_years || null,
      is_available: is_available ?? true,
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
