import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { escapeLike } from '@/lib/search'
import { FOCUS, focusSlug, focusFromSlug } from '@/lib/site'
import '../../teams/teams.css'

// /hire → every public team; /hire/design-teams → one focus area
async function resolve(params) {
  const { focus } = await params
  if (!focus) return { key: null }
  const key = focus.length === 1 ? focusFromSlug(focus[0]) : null
  if (!key) notFound()
  return { key }
}

export async function generateMetadata({ params }) {
  const { key } = await resolve(params)
  const what = key ? `${FOCUS[key]} Teams` : 'Freelancer Teams'
  return {
    title: `Hire ${what} in India — CollabLance`,
    description: `Browse ready-made ${what.toLowerCase()} who already work together. Compare members, reviews and completed projects, then post your project.`,
    alternates: { canonical: key ? `/hire/${focusSlug(key)}` : '/hire' },
  }
}

export default async function HirePage({ params, searchParams }) {
  const { key } = await resolve(params)
  const { q } = await searchParams
  const search = typeof q === 'string' ? q.trim() : ''
  const supabase = await createClient()

  let query = supabase
    .from('collectives')
    .select('id, name, description, focus_area, avatar_initial, collective_members(count)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  if (key) query = query.eq('focus_area', key)
  if (search) query = query.ilike('name', `%${escapeLike(search)}%`)
  const { data: teams, error } = await query
  const path = key ? `/hire/${focusSlug(key)}` : '/hire'

  return (
    <div className="collectives-page">
      <div className="container">
        <div className="collectives-page__header">
          <div>
            <h1 className="collectives-page__title">Hire {key ? `${FOCUS[key]} teams` : 'a freelancer team'}</h1>
            <p className="collectives-page__subtitle">
              Teams who already work together. One team, one point of contact, and a payout split every member signs before work starts.
            </p>
          </div>
          <Link href="/auth/signup?role=client" className="btn btn--primary" id="hire-post-project">Post a Project</Link>
        </div>

        <nav aria-label="Team focus areas" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
          <Link href="/hire" className={`badge ${key ? 'badge--neutral' : 'badge--primary'}`}>All teams</Link>
          {Object.entries(FOCUS).map(([k, label]) => (
            <Link key={k} href={`/hire/${focusSlug(k)}`} className={`badge ${k === key ? 'badge--primary' : 'badge--neutral'}`}>{label}</Link>
          ))}
        </nav>

        <form action={path} className="collectives-page__search" role="search">
          <input type="search" name="q" className="input" placeholder="Search teams by name..." defaultValue={search} aria-label="Search teams by name" id="hire-search" />
        </form>

        {error && <div className="alert alert--error">Couldn&apos;t load teams. Please try again.</div>}

        {!teams?.length ? (
          <div className="collectives-empty">
            <h2 className="collectives-empty__title">{search ? 'No teams match your search' : 'No teams here yet'}</h2>
            <p className="collectives-empty__desc">
              Post your project and teams can send you proposals with a price and timeline.
            </p>
            <Link href="/for-freelancers" className="btn btn--secondary">Freelancer? Start a team</Link>
          </div>
        ) : (
          <div className="collectives-grid">
            {teams.map(t => {
              const members = t.collective_members?.[0]?.count ?? 0
              return (
                <Link key={t.id} href={`/teams/${t.id}`} className="collective-card" id={`collective-${t.id}`}>
                  <div className="collective-card__avatar">{t.avatar_initial || t.name[0].toUpperCase()}</div>
                  <div className="collective-card__body">
                    <h2 className="collective-card__name">{t.name}</h2>
                    <p className="collective-card__desc">{t.description}</p>
                    <div className="collective-card__meta">
                      {FOCUS[t.focus_area] && <span className="badge badge--neutral">{FOCUS[t.focus_area]}</span>}
                      <span className="collective-card__members">{members} member{members !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <span className="collective-card__arrow">→</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
