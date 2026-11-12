'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRole } from '@/lib/hooks/useRole'
import ProjectCard from '@/components/ProjectCard/ProjectCard'
import './projects.css'

const FILTER_LABELS = { all: 'All', open: 'Open', in_progress: 'In Progress', completed: 'Completed' }

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [skill, setSkill] = useState('')
  const [minBudget, setMinBudget] = useState('')
  const [error, setError] = useState('')
  const { role } = useRole()
  const isClient = role === 'client'

  useEffect(() => {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (search.trim()) params.set('q', search.trim())
    if (skill.trim()) params.set('skill', skill.trim())
    if (minBudget) params.set('min_budget', minBudget)

    fetch(`/api/projects?${params}`)
      .then(r => r.json())
      .then(json => { setError(json.error || ''); setProjects(json.data || []); setLoading(false) })
      .catch(() => { setError('Failed to load projects'); setLoading(false) })
  }, [filter, search, skill, minBudget])

  return (
    <div className="projects-page">
      <div className="container">
        <div className="projects-page__header animate-fade-in-up">
          <div>
            <h1 className="projects-page__title">Projects</h1>
            <p className="projects-page__subtitle">
              {isClient ? 'Browse projects or post a new one for teams to pick up.' : 'Browse projects open to your team.'}
            </p>
          </div>
          {isClient && (
            <Link href="/projects/create" className="btn btn--primary" id="create-project-btn">
              + Post Project
            </Link>
          )}
        </div>

        <div className="projects-page__filters animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <input type="text" className="input"
            placeholder="Search projects..."
            value={search} onChange={(e) => { setSearch(e.target.value); setLoading(true) }}
            id="project-search" />
          <input type="text" className="input" style={{ maxWidth: 180 }}
            placeholder="Skill, e.g. Shopify" aria-label="Filter by skill"
            value={skill} onChange={(e) => { setSkill(e.target.value); setLoading(true) }}
            id="project-skill-filter" />
          <input type="number" min="0" className="input" style={{ maxWidth: 160 }}
            placeholder="Min budget (₹)" aria-label="Minimum budget in rupees"
            value={minBudget} onChange={(e) => { setMinBudget(e.target.value); setLoading(true) }}
            id="project-budget-filter" />
          <div className="projects-page__filter-tabs">
            {Object.entries(FILTER_LABELS).map(([val, label]) => (
              <button key={val}
                className={`filter-tab ${filter === val ? 'filter-tab--active' : ''}`}
                onClick={() => { setFilter(val); setLoading(true) }}
                id={`filter-${val}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <div className="projects-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-empty animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="projects-empty__icon">📋</div>
            <h2 className="projects-empty__title">No projects found</h2>
            <p className="projects-empty__desc">
              {search || skill || minBudget || filter !== 'all'
                ? 'Try clearing your filters.'
                : isClient ? 'Be the first to post a project!' : 'Check back soon — clients post new projects here.'}
            </p>
            {isClient && (
              <Link href="/projects/create" className="btn btn--primary btn--lg" id="empty-create-project">
                Post Your First Project
              </Link>
            )}
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
