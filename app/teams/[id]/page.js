import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FOCUS } from '@/lib/site'
import TeamClient from './TeamClient'
import '../teams.css'
import './team.css'

async function loadTeam(supabase, id) {
  const { data } = await supabase
    .from('collectives')
    .select('id, name, description, focus_area, avatar_initial, is_public, collective_members(user_id, role)')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const team = await loadTeam(await createClient(), id)
  if (!team?.is_public) return { title: 'Team — CollabLance', robots: { index: false } }
  return {
    title: `${team.name} — Freelancer Team on CollabLance`,
    description: team.description?.slice(0, 160) || `Hire ${team.name}, a freelancer team on CollabLance.`,
    alternates: { canonical: `/teams/${id}` },
  }
}

// Signed-in users get the full team page (join, invite, manage). Visitors and
// search engines get this server-rendered public profile.
export default async function TeamPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return <TeamClient />

  const team = await loadTeam(supabase, id)
  if (!team) notFound()
  if (!team.is_public) redirect(`/auth/login?redirect=/teams/${id}`)

  const memberIds = team.collective_members.map(m => m.user_id)
  const [{ data: profiles }, { data: reviews }, { count: completed }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, skills, location').in('id', memberIds),
    supabase.from('reviews').select('id, rating, comment, created_at').eq('collective_id', id).eq('direction', 'client_to_team').order('created_at', { ascending: false }),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('collective_id', id).eq('status', 'completed'),
  ])
  const profileById = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  const ratings = reviews || []
  const avg = ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null

  return (
    <div className="collective-detail">
      <div className="container">
        <Link href="/hire" className="collective-detail__back">← Browse teams</Link>

        <div className="collective-detail__header">
          <div className="collective-card__avatar">{team.avatar_initial || team.name[0].toUpperCase()}</div>
          <div className="collective-detail__info">
            <h1 className="collective-detail__name">{team.name}</h1>
            {team.description && <p className="collective-detail__desc">{team.description}</p>}
            <div className="collective-detail__meta">
              {FOCUS[team.focus_area] && <span className="badge badge--neutral">{FOCUS[team.focus_area]}</span>}
              <span className="badge badge--neutral">{memberIds.length} member{memberIds.length !== 1 ? 's' : ''}</span>
              <span className="badge badge--neutral">{completed || 0} completed project{completed === 1 ? '' : 's'}</span>
              {avg !== null && (
                <span className="badge badge--neutral">★ {avg.toFixed(1)} ({ratings.length} review{ratings.length !== 1 ? 's' : ''})</span>
              )}
            </div>
          </div>
          <div className="collective-detail__owner-actions">
            <Link href="/auth/signup?role=client" className="btn btn--primary" id="team-hire-cta">Hire this team</Link>
            <Link href={`/auth/login?redirect=/teams/${id}`} className="btn btn--ghost btn--sm">Invited? Log in to join</Link>
          </div>
        </div>

        <div className="collective-detail__section">
          <h2 className="collective-detail__section-title">Members</h2>
          <div className="member-list">
            {team.collective_members.map(m => {
              const p = profileById[m.user_id]
              const name = p?.full_name || 'Member'
              return (
                <Link key={m.user_id} href={`/u/${m.user_id}`} className="card member-item">
                  <div className="avatar avatar--sm">{name[0].toUpperCase()}</div>
                  <div className="member-item__info">
                    <span className="member-item__name">{name}</span>
                    <span className="member-item__sub">
                      {[p?.skills?.slice(0, 4).join(', '), p?.location].filter(Boolean).join(' · ') || 'Team member'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="collective-detail__section">
          <h2 className="collective-detail__section-title">Client reviews</h2>
          {ratings.length === 0 ? (
            <p className="collective-detail__empty">No reviews yet. Reviews appear here after a client completes a project with this team.</p>
          ) : (
            <div className="member-list">
              {ratings.map(r => (
                <div key={r.id} className="card member-item">
                  <div className="member-item__info">
                    <span className="member-item__name" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    {r.comment && <span className="member-item__sub">{r.comment}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
