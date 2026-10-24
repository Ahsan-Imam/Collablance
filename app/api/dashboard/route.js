import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/dashboard — fetch user stats + recent activity
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Run all queries in parallel
  const [collectivesRes, projectsRes, profileRes] = await Promise.all([
    // Collectives the user is a member of
    supabase
      .from('collective_members')
      .select('collective_id, role, collectives(id, name, avatar_initial, focus_area)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false }),

    // Projects owned by user
    supabase
      .from('projects')
      .select('id, title, status, created_at, budget_min, budget_max, currency')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),

    // Profile for earnings placeholder
    supabase
      .from('profiles')
      .select('full_name, hourly_rate, is_available')
      .eq('id', user.id)
      .single(),
  ])

  return NextResponse.json({
    data: {
      collectives: collectivesRes.data || [],
      projects: projectsRes.data || [],
      profile: profileRes.data || null,
      stats: {
        collective_count: collectivesRes.data?.length || 0,
        active_projects: (projectsRes.data || []).filter(p => p.status === 'in_progress' || p.status === 'open').length,
        total_earnings: 0, // Phase 2: from payments table
        avg_rating: null,  // Phase 2: from reviews table
      },
    }
  })
}
