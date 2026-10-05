'use client'

import { useState } from 'react'
import Link from 'next/link'
import './projects.css'

export default function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  return (
    <div className="projects-page">
      <div className="container">
        <div className="projects-page__header animate-fade-in-up">
          <div>
            <h1 className="projects-page__title">Projects</h1>
            <p className="projects-page__subtitle">
              Browse available projects or post one for your collective.
            </p>
          </div>
          <Link href="/projects/create" className="btn btn--primary" id="create-project-btn">
            + Post Project
          </Link>
        </div>

        <div className="projects-page__filters animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <input
            type="text"
            className="input"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="project-search"
          />
          <div className="projects-page__filter-tabs">
            {['all', 'open', 'in_progress', 'completed'].map(status => (
              <button
                key={status}
                className={`filter-tab ${filter === status ? 'filter-tab--active' : ''}`}
                onClick={() => setFilter(status)}
                id={`filter-${status}`}
              >
                {status === 'all' ? 'All' : 
                 status === 'in_progress' ? 'In Progress' :
                 status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        <div className="projects-empty animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="projects-empty__icon">📋</div>
          <h2 className="projects-empty__title">No projects yet</h2>
          <p className="projects-empty__desc">
            Projects will appear here once your collective posts one, or when 
            clients start posting. Be the first to get started!
          </p>
          <Link href="/projects/create" className="btn btn--primary btn--lg" id="empty-create-project">
            Post Your First Project
          </Link>
        </div>
      </div>
    </div>
  )
}
