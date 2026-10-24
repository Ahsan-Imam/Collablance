'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import './projects.css'

const STATUS_LABELS = { all: 'All', open: 'Open', in_progress: 'In Progress', completed: 'Completed' }
const STATUS_COLORS = { open: '#059669', in_progress: '#d97706', completed: '#6366f1', cancelled: '#dc2626' }

function ProjectCard({ project }) {
  const budgetStr = project.budget_min && project.budget_max
    ? `₹${Number(project.budget_min).toLocaleString()} – ₹${Number(project.budget_max).toLocaleString()}`
    : project.budget_min
      ? `From ₹${Number(project.budget_min).toLocaleString()}`
      : 'Budget TBD'

  return (
    <div className="project-card animate-fade-in-up" id={`project-${project.id}`}>
      <div className="project-card__header">
        <h3 className="project-card__title">{project.title}</h3>
        <span className="project-card__status" style={{ color: STATUS_COLORS[project.status] }}>
          ● {STATUS_LABELS[project.status] || project.status}
        </span>
      </div>
      <p className="project-card__desc">{project.description}</p>
      <div className="project-card__meta">
        <span className="project-card__budget">💰 {budgetStr}</span>
        {project.deadline && (
          <span className="project-card__deadline">📅 {new Date(project.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        )}
        {project.collectives?.name && (
          <span className="badge badge--neutral">👥 {project.collectives.name}</span>
        )}
      </div>
      {project.skills_needed?.length > 0 && (
        <div className="project-card__skills">
          {project.skills_needed.slice(0, 4).map(s => (
            <span key={s} className="badge badge--neutral" style={{ fontSize: '0.7rem' }}>{s}</span>
          ))}
          {project.skills_needed.length > 4 && (
            <span className="badge badge--neutral" style={{ fontSize: '0.7rem' }}>+{project.skills_needed.length - 4}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (search.trim()) params.set('q', search.trim())

    fetch(`/api/projects?${params}`)
      .then(r => r.json())
      .then(json => { setProjects(json.data || []); setLoading(false) })
      .catch(() => { setError('Failed to load projects'); setLoading(false) })
  }, [filter, search])

  return (
    <div className="projects-page">
      <div className="container">
        <div className="projects-page__header animate-fade-in-up">
          <div>
            <h1 className="projects-page__title">Projects</h1>
            <p className="projects-page__subtitle">Browse available projects or post one for your collective.</p>
          </div>
          <Link href="/projects/create" className="btn btn--primary" id="create-project-btn">
            + Post Project
          </Link>
        </div>

        <div className="projects-page__filters animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <input type="text" className="input"
            placeholder="Search projects..."
            value={search} onChange={(e) => { setSearch(e.target.value); setLoading(true) }}
            id="project-search" />
          <div className="projects-page__filter-tabs">
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
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
              {search || filter !== 'all'
                ? 'Try clearing your filters.'
                : 'Be the first to post a project!'}
            </p>
            <Link href="/projects/create" className="btn btn--primary btn--lg" id="empty-create-project">
              Post Your First Project
            </Link>
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
