'use client'

import { useState } from 'react'
import { addRole } from '@/lib/roles'

/**
 * Adds a role to the signed-in account (same email, same login) and switches
 * to it. Pages using useRole() re-render automatically once it succeeds.
 */
export default function AddRoleButton({ role, className = 'btn btn--primary btn--lg', children }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setBusy(true)
    setError('')
    try {
      await addRole(role)
    } catch (err) {
      setError(err.message || `Couldn't add ${role} access`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={handleClick} disabled={busy} id={`add-role-${role}`}>
        {busy ? 'Adding...' : children || `Add ${role} access`}
      </button>
      {error && <div className="alert alert--error" style={{ marginTop: 'var(--space-sm)' }}>{error}</div>}
    </>
  )
}
