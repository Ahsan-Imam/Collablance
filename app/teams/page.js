'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRole } from '@/lib/hooks/useRole'
import './teams.css'

const FOCUS_LABELS = {
  web_development: 'Web Dev', mobile_development: 'Mobile',
  design: 'Design', content: 'Content', data_science: 'Data & AI',
  devops: 'DevOps', fullstack: 'Full-Stack', other: 'Other',
}

function CollectiveCard({ collective }) {
  const memberCount = collective.collective_members?.[0]?.count ?? collective.collective_members?.length ?? 0
  return (
    <Link href={`/teams/${collective.id}`} className="collective-card" id={`collective-${collective.id}`}>
      <div className="collective-card__avatar">
        {collective.avatar_initial || collective.name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="collective-card__body">
        <h3 className="collective-card__name">{collective.name}</h3>
        <p className="collective-card__desc">{collective.description}</p>
        <div className="collective-card__meta">
          {collective.focus_area && (
            <span className="badge badge--neutral">{FOCUS_LABELS[collective.focus_area] || collective.focus_area}</span>
          )}
          <span className="collective-card__members">👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <span className="collective-card__arrow">→</span>
    </Link>
  )
}

export default function CollectivesPage() {
  const [collectives, setCollectives] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [focus, setFocus] = useState('')
  const [error, setError] = useState('')
  const { role, loading: roleLoading } = useRole()
  // Clients browse every public collective; freelancers see the ones they're in
  const isClient = role === 'client'

  useEffect(() => {
    if (roleLoading) return
    fetch(isClient ? '/api/collectives' : '/api/collectives?mine=true')
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error)
        setCollectives(json.data || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load teams')
        setLoading(false)
      })
  }, [roleLoading, isClient])

  const visible = collectives.filter(c =>
    (!search.trim() || c.name.toLowerCase().includes(search.toLowerCase()))
    && (!focus || c.focus_area === focus)
  )

  return (
    <div className="collectives-page">
      <div className="container">
        <div className="collectives-page__header animate-fade-in-up">
          <div>
            <h1 className="collectives-page__title">{isClient ? 'Find a Team' : 'Your Teams'}</h1>
            <p className="collectives-page__subtitle">
              {isClient
                ? 'Browse freelancer teams and find the right fit for your project.'
                : 'Manage your teams or create a new one.'}
            </p>
          </div>
          {isClient ? (
            <Link href="/projects/create" className="btn btn--primary" id="collectives-post-project">
              + Post Project
            </Link>
          ) : (
            <Link href="/teams/create" className="btn btn--primary" id="create-collective-btn">
              + Create Team
            </Link>
          )}
        </div>

        <div className="collectives-page__search animate-fade-in-up" style={{ animationDelay: '100ms', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <input type="text" className="input"
            placeholder="Search teams..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            id="collective-search" />
          <select className="input" style={{ maxWidth: 200 }} value={focus} onChange={(e) => setFocus(e.target.value)}
            aria-label="Filter by focus area" id="collective-focus-filter">
            <option value="">All focus areas</option>
            {Object.entries(FOCUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <div className="collectives-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="collectives-empty animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="collectives-empty__icon">👥</div>
            <h2 className="collectives-empty__title">
              {search || focus ? 'No teams match your search' : isClient ? 'No public teams yet' : 'No teams yet'}
            </h2>
            <p className="collectives-empty__desc">
              {search || focus
                ? 'Try a different name or focus area.'
                : isClient
                  ? 'Freelancer teams will show up here as they form. Post a project so they can find you.'
                  : 'Create your first team to start teaming up with other freelancers.'}
            </p>
            {!search && !focus && !isClient && (
              <Link href="/teams/create" className="btn btn--primary btn--lg" id="empty-create-collective">
                Create Your First Team
              </Link>
            )}
          </div>
        ) : (
          <div className="collectives-grid stagger-children">
            {visible.map(c => <CollectiveCard key={c.id} collective={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
