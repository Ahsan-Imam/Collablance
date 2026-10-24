'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import './collectives.css'

const FOCUS_LABELS = {
  web_development: 'Web Dev', mobile_development: 'Mobile',
  design: 'Design', content: 'Content', data_science: 'Data & AI',
  devops: 'DevOps', fullstack: 'Full-Stack', other: 'Other',
}

function CollectiveCard({ collective }) {
  const memberCount = collective.collective_members?.[0]?.count ?? collective.collective_members?.length ?? 0
  return (
    <Link href={`/collectives/${collective.id}`} className="collective-card" id={`collective-${collective.id}`}>
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
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/collectives?mine=true')
      .then(r => r.json())
      .then(json => {
        setCollectives(json.data || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load collectives')
        setLoading(false)
      })
  }, [])

  const visible = collectives.filter(c =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="collectives-page">
      <div className="container">
        <div className="collectives-page__header animate-fade-in-up">
          <div>
            <h1 className="collectives-page__title">Your Collectives</h1>
            <p className="collectives-page__subtitle">Manage your teams or create a new one.</p>
          </div>
          <Link href="/collectives/create" className="btn btn--primary" id="create-collective-btn">
            + Create Collective
          </Link>
        </div>

        <div className="collectives-page__search animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <input type="text" className="input"
            placeholder="Search collectives..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            id="collective-search" />
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
              {search ? 'No collectives match your search' : 'No collectives yet'}
            </h2>
            <p className="collectives-empty__desc">
              {search
                ? 'Try a different name.'
                : 'Create your first collective to start teaming up with other freelancers.'}
            </p>
            {!search && (
              <Link href="/collectives/create" className="btn btn--primary btn--lg" id="empty-create-collective">
                Create Your First Collective
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
