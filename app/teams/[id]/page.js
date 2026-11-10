'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '../teams.css'
import './team.css'

const FOCUS_LABELS = {
  web_development: 'Web Dev', mobile_development: 'Mobile',
  design: 'Design', content: 'Content', data_science: 'Data & AI',
  devops: 'DevOps', fullstack: 'Full-Stack', other: 'Other',
}

export default function TeamDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [collective, setCollective] = useState(null)
  const [projects, setProjects] = useState([])
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [joining, setJoining] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [recs, setRecs] = useState({ projects: [], freelancers: [] })

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id || null))

    Promise.all([
      fetch(`/api/collectives/${id}`).then(r => r.json()),
      fetch(`/api/projects?collective_id=${id}`).then(r => r.json()),
    ])
      .then(([collJson, projJson]) => {
        if (collJson.error) setError(collJson.error)
        setCollective(collJson.data || null)
        setProjects(projJson.data || [])
      })
      .catch(() => setError('Failed to load team'))
      .finally(() => setLoading(false))

    fetch(`/api/collectives/${id}/recommendations`)
      .then(r => r.json())
      .then(json => setRecs({ projects: json.projects || [], freelancers: json.freelancers || [] }))
      .catch(() => {})
  }, [id])

  const handleJoin = async () => {
    setJoining(true)
    setError('')
    try {
      const res = await fetch(`/api/collectives/${id}/join`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCollective(prev => ({
        ...prev,
        collective_members: [...(prev.collective_members || []), { user_id: userId, role: 'member', profiles: null }],
      }))
    } catch (err) {
      setError(err.message || 'Failed to join team')
    } finally {
      setJoining(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      setError('Could not copy link — copy it from the address bar instead.')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/collectives/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push('/teams')
    } catch (err) {
      setError(err.message || 'Failed to delete team')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="collective-detail">
        <div className="container">
          <div className="skeleton" style={{ height: 40, width: 280 }} />
          <div className="skeleton" style={{ height: 200, marginTop: 24, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!collective) {
    return (
      <div className="collective-detail">
        <div className="container">
          <Link href="/teams" className="collective-detail__back">← Back to teams</Link>
          <div className="collectives-empty">
            <div className="collectives-empty__icon">🔍</div>
            <h2 className="collectives-empty__title">Team not found</h2>
            <p className="collectives-empty__desc">{error || 'It may have been deleted.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = userId && userId === collective.owner_id
  const members = collective.collective_members || []
  const isMember = isOwner || members.some(m => m.user_id === userId)

  return (
    <div className="collective-detail">
      <div className="container">
        <Link href="/teams" className="collective-detail__back">← Back to teams</Link>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="collective-detail__header animate-fade-in-up">
          <div className="collective-card__avatar">
            {collective.avatar_initial || collective.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="collective-detail__info">
            <h1 className="collective-detail__name">{collective.name}</h1>
            {collective.description && (
              <p className="collective-detail__desc">{collective.description}</p>
            )}
            <div className="collective-detail__meta">
              {collective.focus_area && (
                <span className="badge badge--neutral">{FOCUS_LABELS[collective.focus_area] || collective.focus_area}</span>
              )}
              <span className="badge badge--neutral">👥 {members.length} member{members.length !== 1 ? 's' : ''}</span>
              {!collective.is_public && <span className="badge badge--warning">Private</span>}
            </div>
          </div>
          {isOwner && (
            <div className="collective-detail__owner-actions">
              {confirmDelete ? (
                <>
                  <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    Cancel
                  </button>
                  <button className="btn btn--danger btn--sm" onClick={handleDelete} disabled={deleting} id="collective-delete-confirm">
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                </>
              ) : (
                <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(true)} id="collective-delete">
                  Delete team
                </button>
              )}
            </div>
          )}
        </div>

        <div className="collective-detail__section animate-fade-in-up card" style={{ animationDelay: '50ms', padding: 'var(--space-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div>
            <h2 className="collective-detail__section-title" style={{ marginBottom: 4 }}>Invite teammates</h2>
            <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem' }}>
              Share this page&apos;s link — anyone who opens it can join {collective.name}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn--secondary" onClick={handleCopyLink} id="copy-invite-link">
              {linkCopied ? '✅ Copied!' : '🔗 Copy Invite Link'}
            </button>
            {!isMember && (
              <button className="btn btn--primary" onClick={handleJoin} disabled={joining} id="join-team-btn">
                {joining ? 'Joining…' : '➕ Join Team'}
              </button>
            )}
          </div>
        </div>

        <div className="collective-detail__section animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="collective-detail__section-title">Members</h2>
          {members.length === 0 ? (
            <p className="collective-detail__empty">No members yet.</p>
          ) : (
            <div className="member-list">
              {members.map(m => {
                const name = m.profiles?.full_name || 'Member'
                return (
                  <div key={m.user_id} className="card member-item">
                    <div className="avatar avatar--sm">{name[0].toUpperCase()}</div>
                    <div className="member-item__info">
                      <span className="member-item__name">{name}</span>
                      <span className="member-item__sub">
                        {m.role}{m.profiles?.location ? ` · ${m.profiles.location}` : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="collective-detail__section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h2 className="collective-detail__section-title">Projects</h2>
          {projects.length === 0 ? (
            <p className="collective-detail__empty">No projects posted for this team yet.</p>
          ) : (
            <div className="member-list">
              {projects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} className="card member-item">
                  <div className="member-item__info">
                    <span className="member-item__name">{p.title}</span>
                    <span className="member-item__sub">{p.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {recs.projects.length > 0 && (
          <div className="collective-detail__section animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <h2 className="collective-detail__section-title">Recommended Projects</h2>
            <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
              Open projects that fit {collective.name}&apos;s focus — post for one from the project page.
            </p>
            <div className="member-list">
              {recs.projects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} className="card member-item">
                  <div className="member-item__info">
                    <span className="member-item__name">{p.title}</span>
                    <span className="member-item__sub">
                      {p.skills_needed?.slice(0, 3).join(', ') || 'Open project'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {recs.freelancers.length > 0 && (
          <div className="collective-detail__section animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <h2 className="collective-detail__section-title">Recommended Freelancers to Invite</h2>
            <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
              Available freelancers whose skills fit this team. There&apos;s no in-app invite yet — copy the link and send it to them directly.
            </p>
            <div className="member-list">
              {recs.freelancers.map(f => (
                <div key={f.id} className="card member-item">
                  <div className="avatar avatar--sm">{(f.full_name || '?')[0].toUpperCase()}</div>
                  <div className="member-item__info" style={{ flex: 1 }}>
                    <span className="member-item__name">{f.full_name || 'Freelancer'}</span>
                    <span className="member-item__sub">
                      {f.skills?.slice(0, 3).join(', ') || f.location || 'Available'}
                    </span>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={handleCopyLink}>
                    {linkCopied ? '✅' : '🔗 Invite'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
