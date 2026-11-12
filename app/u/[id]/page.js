import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import '../../teams/teams.css'
import '../../teams/[id]/team.css'

async function loadProfile(supabase, id) {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, bio, location, portfolio_url, experience_years, skills, is_freelancer')
    .eq('id', id)
    .maybeSingle()
  // Client-only accounts have no public freelancer profile
  return data?.is_freelancer && data.full_name ? data : null
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const profile = await loadProfile(await createClient(), id)
  if (!profile) return { title: 'Freelancer — CollabLance', robots: { index: false } }
  return {
    title: `${profile.full_name} — Freelancer on CollabLance`,
    description: profile.bio?.slice(0, 160) || `${profile.full_name}'s freelancer profile on CollabLance.`,
    alternates: { canonical: `/u/${id}` },
  }
}

export default async function PublicProfilePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await loadProfile(supabase, id)
  if (!profile) notFound()

  const { data: memberships } = await supabase
    .from('collective_members')
    .select('role, collectives(id, name, avatar_initial, is_public)')
    .eq('user_id', id)
  const teams = (memberships || []).map(m => m.collectives).filter(t => t?.is_public)
  // Only link out to real web addresses — the URL is user-supplied
  const portfolio = /^https?:\/\//i.test(profile.portfolio_url || '') ? profile.portfolio_url : null

  return (
    <div className="collective-detail">
      <div className="container">
        <Link href="/hire" className="collective-detail__back">← Browse teams</Link>

        <div className="collective-detail__header">
          <div className="collective-card__avatar">{profile.full_name[0].toUpperCase()}</div>
          <div className="collective-detail__info">
            <h1 className="collective-detail__name">{profile.full_name}</h1>
            {profile.bio && <p className="collective-detail__desc">{profile.bio}</p>}
            <div className="collective-detail__meta">
              {profile.location && <span className="badge badge--neutral">{profile.location}</span>}
              {profile.experience_years > 0 && (
                <span className="badge badge--neutral">{profile.experience_years} year{profile.experience_years === 1 ? '' : 's'} experience</span>
              )}
              {portfolio && <a href={portfolio} target="_blank" rel="nofollow noopener noreferrer" className="badge badge--primary">Portfolio ↗</a>}
            </div>
          </div>
        </div>

        {profile.skills?.length > 0 && (
          <div className="collective-detail__section">
            <h2 className="collective-detail__section-title">Skills</h2>
            <div className="collective-detail__meta">
              {profile.skills.map(s => <span key={s} className="badge badge--neutral">{s}</span>)}
            </div>
          </div>
        )}

        <div className="collective-detail__section">
          <h2 className="collective-detail__section-title">Teams</h2>
          {teams.length === 0 ? (
            <p className="collective-detail__empty">Not on a public team yet.</p>
          ) : (
            <div className="member-list">
              {teams.map(t => (
                <Link key={t.id} href={`/teams/${t.id}`} className="card member-item">
                  <div className="avatar avatar--sm">{t.avatar_initial || t.name[0].toUpperCase()}</div>
                  <div className="member-item__info"><span className="member-item__name">{t.name}</span></div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
