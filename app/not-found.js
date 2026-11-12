import Link from 'next/link'
import Icon from '@/components/Icon/Icon'

export default function NotFound() {
  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center', maxWidth: 480 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)', color: 'var(--cl-primary-600)' }}><Icon name="compass" size={48} /></div>
      <h1 style={{ marginBottom: 'var(--space-sm)' }}>Page not found</h1>
      <p style={{ color: 'var(--cl-text-secondary)', marginBottom: 'var(--space-xl)' }}>
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/" className="btn btn--primary btn--lg">Back to Home</Link>
    </div>
  )
}
