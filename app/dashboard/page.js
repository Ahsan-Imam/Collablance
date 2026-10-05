'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import './dashboard.css'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="dashboard__loading">
            <div className="skeleton" style={{ width: '200px', height: '32px' }} />
            <div className="skeleton" style={{ width: '300px', height: '20px', marginTop: '8px' }} />
            <div className="dashboard__grid" style={{ marginTop: '32px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '16px' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Freelancer'

  return (
    <div className="dashboard">
      <div className="container">
        {/* Welcome header */}
        <div className="dashboard__header animate-fade-in-up">
          <div>
            <h1 className="dashboard__title">
              Welcome back, <span className="dashboard__name">{userName}</span>
            </h1>
            <p className="dashboard__subtitle">
              Here's what's happening with your collectives and projects.
            </p>
          </div>
          <Link href="/profile" className="btn btn--secondary" id="dash-edit-profile">
            Edit Profile
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="dashboard__stats stagger-children">
          <div className="stat-card" id="stat-collectives">
            <div className="stat-card__icon">👥</div>
            <div className="stat-card__data">
              <span className="stat-card__number">0</span>
              <span className="stat-card__label">Collectives</span>
            </div>
          </div>
          <div className="stat-card" id="stat-projects">
            <div className="stat-card__icon">📋</div>
            <div className="stat-card__data">
              <span className="stat-card__number">0</span>
              <span className="stat-card__label">Active Projects</span>
            </div>
          </div>
          <div className="stat-card" id="stat-earnings">
            <div className="stat-card__icon">💰</div>
            <div className="stat-card__data">
              <span className="stat-card__number">₹0</span>
              <span className="stat-card__label">Total Earnings</span>
            </div>
          </div>
          <div className="stat-card" id="stat-rating">
            <div className="stat-card__icon">⭐</div>
            <div className="stat-card__data">
              <span className="stat-card__number">—</span>
              <span className="stat-card__label">Avg Rating</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard__section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h2 className="dashboard__section-title">Quick Actions</h2>
          <div className="dashboard__actions">
            <Link href="/profile" className="action-card" id="action-profile">
              <div className="action-card__icon">🎯</div>
              <div className="action-card__content">
                <h3 className="action-card__title">Complete Your Profile</h3>
                <p className="action-card__desc">Add skills, bio, and portfolio to stand out</p>
              </div>
              <span className="action-card__arrow">→</span>
            </Link>
            <Link href="/collectives/create" className="action-card" id="action-create-collective">
              <div className="action-card__icon">🚀</div>
              <div className="action-card__content">
                <h3 className="action-card__title">Create a Collective</h3>
                <p className="action-card__desc">Form your first team and start pitching</p>
              </div>
              <span className="action-card__arrow">→</span>
            </Link>
            <Link href="/projects" className="action-card" id="action-browse-projects">
              <div className="action-card__icon">🔍</div>
              <div className="action-card__content">
                <h3 className="action-card__title">Browse Projects</h3>
                <p className="action-card__desc">Find projects that match your team's skills</p>
              </div>
              <span className="action-card__arrow">→</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity — empty state */}
        <div className="dashboard__section animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h2 className="dashboard__section-title">Recent Activity</h2>
          <div className="dashboard__empty">
            <span className="dashboard__empty-icon">📭</span>
            <p className="dashboard__empty-text">No activity yet</p>
            <p className="dashboard__empty-hint">
              Start by completing your profile and joining a collective.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
