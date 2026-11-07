'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '../collectives.css'
import './collective.css'

const FOCUS_LABELS = {
  web_development: 'Web Dev', mobile_development: 'Mobile',
  design: 'Design', content: 'Content', data_science: 'Data & AI',
  devops: 'DevOps', fullstack: 'Full-Stack', other: 'Other',
}

export default function CollectiveDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [collective, setCollective] = useState(null)
  const [projects, setProjects] = useState([])
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      .catch(() => setError('Failed to load collective'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/collectives/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push('/collectives')
    } catch (err) {
      setError(err.message || 'Failed to delete collective')
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
          <Link href="/collectives" className="collective-detail__back">← Back to collectives</Link>
          <div className="collectives-empty">
            <div className="collectives-empty__icon">🔍</div>
            <h2 className="collectives-empty__title">Collective not found</h2>
            <p className="collectives-empty__desc">{error || 'It may have been deleted.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = userId && userId === collective.owner_id
  const members = collective.collective_members || []

  return (
    <div className="collective-detail">
      <div className="container">
        <Link href="/collectives" className="collective-detail__back">← Back to collectives</Link>

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
                  Delete collective
                </button>
              )}
            </div>
          )}
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
            <p className="collective-detail__empty">No projects posted for this collective yet.</p>
          ) : (
            <div className="member-list">
              {projects.map(p => (
                <div key={p.id} className="card member-item">
                  <div className="member-item__info">
                    <span className="member-item__name">{p.title}</span>
                    <span className="member-item__sub">{p.status.replace('_', ' ')}</span>
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
