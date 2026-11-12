'use client'

import { useEffect } from 'react'
import Icon from '@/components/Icon/Icon'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center', maxWidth: 480 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)', color: 'var(--cl-accent-700)' }}><Icon name="alert" size={48} /></div>
      <h1 style={{ marginBottom: 'var(--space-sm)' }}>Something went wrong</h1>
      <p style={{ color: 'var(--cl-text-secondary)', marginBottom: 'var(--space-xl)' }}>
        An unexpected error occurred. Please try again.
      </p>
      <button className="btn btn--primary btn--lg" onClick={() => reset()}>Try Again</button>
    </div>
  )
}
