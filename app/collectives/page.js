'use client'

import { useState } from 'react'
import Link from 'next/link'
import './collectives.css'

// Placeholder data — will be replaced with Supabase queries
const PLACEHOLDER_COLLECTIVES = []

export default function CollectivesPage() {
  const [search, setSearch] = useState('')

  return (
    <div className="collectives-page">
      <div className="container">
        <div className="collectives-page__header animate-fade-in-up">
          <div>
            <h1 className="collectives-page__title">Your Collectives</h1>
            <p className="collectives-page__subtitle">
              Manage your teams or create a new one.
            </p>
          </div>
          <Link href="/collectives/create" className="btn btn--primary" id="create-collective-btn">
            + Create Collective
          </Link>
        </div>

        <div className="collectives-page__search animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <input
            type="text"
            className="input"
            placeholder="Search collectives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="collective-search"
          />
        </div>

        {PLACEHOLDER_COLLECTIVES.length === 0 ? (
          <div className="collectives-empty animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="collectives-empty__icon">👥</div>
            <h2 className="collectives-empty__title">No collectives yet</h2>
            <p className="collectives-empty__desc">
              Create your first collective to start teaming up with other freelancers 
              and pitching clients together.
            </p>
            <Link href="/collectives/create" className="btn btn--primary btn--lg" id="empty-create-collective">
              Create Your First Collective
            </Link>
          </div>
        ) : (
          <div className="collectives-grid stagger-children">
            {/* Collective cards will render here */}
          </div>
        )}
      </div>
    </div>
  )
}
