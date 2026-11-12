'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRole } from '@/lib/hooks/useRole'
import AddRoleButton from '@/components/AddRoleButton/AddRoleButton'
import ProjectCard from '@/components/ProjectCard/ProjectCard'
import '../projects/projects.css'
import './client.css'
import Icon from '@/components/Icon/Icon'

const FILTER_LABELS = { all: 'All', open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }

export default function ClientPage() {
  // The hub shows for any account with client access, whichever mode is active
  const { user, isClient, loading: roleLoading } = useRole()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')


  useEffect(() => {
    if (!isClient) return
    fetch('/api/projects?mine=true')
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error)
        setProjects(json.data || [])
      })
      .catch(() => setError('Failed to load your projects'))
      .finally(() => setLoading(false))
  }, [isClient])

  if (roleLoading || (isClient && loading)) {
    return (
      <div className="client-page">
        <div className="container">
          <div className="skeleton" style={{ width: 260, height: 32 }} />
          <div className="client-stats" style={{ marginTop: 32 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 16 }} />)}
          </div>
        </div>
      </div>
    )
  }

  if (!isClient) {
    return (
      <div className="client-page">
        <div className="container container--narrow">
          <div className="card client-page__notice animate-fade-in-up">
            <div className="client-page__notice-icon"><Icon name="briefcase" size={28} /></div>
            <h1 className="client-page__title">Hire with this account too</h1>
            <p className="client-page__subtitle">
              Your account is set up for freelancing. Add client access to post projects and hire
              teams — same email, same login. Switch modes from the top bar anytime.
            </p>
            <AddRoleButton role="client">Add client access</AddRoleButton>
            <Link href="/dashboard" className="btn btn--ghost">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  const count = (status) => projects.filter(p => p.status === status).length
  // Budget committed = upper end of each live project's range (or the minimum if that's all there is)
  const committed = projects
    .filter(p => p.status !== 'cancelled')
    .reduce((sum, p) => sum + Number(p.budget_max || p.budget_min || 0), 0)

  const visible = filter === 'all' ? projects : projects.filter(p => p.status === filter)
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="client-page">
      <div className="container">
        <div className="client-page__header animate-fade-in-up">
          <div>
            <h1 className="client-page__title">
              Welcome, <span className="client-page__name">{userName}</span>
            </h1>
            <p className="client-page__subtitle">Post projects and track how your teams are doing.</p>
          </div>
          <div className="client-page__actions">
            <Link href="/teams" className="btn btn--secondary btn--lg" id="client-find-teams">
              Find Teams
            </Link>
            <Link href="/projects/create" className="btn btn--primary btn--lg" id="client-post-project">
              + Post Project
            </Link>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="client-stats stagger-children">
          <div className="card client-stat" id="client-stat-open">
            <span className="client-stat__number">{count('open')}</span>
            <span className="client-stat__label">Open projects</span>
          </div>
          <div className="card client-stat" id="client-stat-progress">
            <span className="client-stat__number">{count('in_progress')}</span>
            <span className="client-stat__label">In progress</span>
          </div>
          <div className="card client-stat" id="client-stat-completed">
            <span className="client-stat__number">{count('completed')}</span>
            <span className="client-stat__label">Completed</span>
          </div>
          <div className="card client-stat" id="client-stat-budget">
            <span className="client-stat__number">₹{committed.toLocaleString()}</span>
            <span className="client-stat__label">Budget committed</span>
          </div>
        </div>

        <div className="client-page__section-header">
          <h2 className="client-page__section-title">Your Projects ({projects.length})</h2>
          {projects.length > 0 && (
            <div className="client-page__tabs">
              {Object.entries(FILTER_LABELS).map(([val, label]) => (
                <button key={val}
                  className={`filter-tab ${filter === val ? 'filter-tab--active' : ''}`}
                  onClick={() => setFilter(val)}
                  id={`client-filter-${val}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="projects-empty animate-fade-in-up">
            <div className="projects-empty__icon"><Icon name="file" size={40} /></div>
            <h2 className="projects-empty__title">No projects yet</h2>
            <p className="projects-empty__desc">Post your first project and teams will be able to find it.</p>
            <Link href="/projects/create" className="btn btn--primary btn--lg" id="client-empty-post">
              Post Your First Project
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="projects-empty__desc">No {FILTER_LABELS[filter].toLowerCase()} projects.</p>
        ) : (
          <div className="projects-grid">
            {visible.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
