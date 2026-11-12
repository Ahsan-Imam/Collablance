'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/Icon/Icon'

// Deliverable files for one milestone, in the private 'deliverables' bucket at
// <projectId>/<milestoneId>/. Storage policies decide who can read and upload;
// nothing can be replaced or deleted, so the files stand as dispute evidence.
export default function MilestoneFiles({ projectId, milestoneId, canUpload }) {
  const folder = `${projectId}/${milestoneId}`
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    createClient().storage.from('deliverables').list(folder, { sortBy: { column: 'created_at', order: 'asc' } })
      .then(({ data }) => setFiles(data || []))
  }, [folder])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    // Timestamp prefix: two uploads of "final.zip" must both be kept
    const name = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error: upErr } = await createClient().storage.from('deliverables').upload(`${folder}/${name}`, file)
    if (upErr) setError(upErr.message)
    else setFiles(prev => [...prev, { name }])
    setBusy(false)
  }

  const handleOpen = async (name) => {
    setError('')
    const { data, error: urlErr } = await createClient().storage.from('deliverables').createSignedUrl(`${folder}/${name}`, 60)
    if (urlErr) setError(urlErr.message)
    else window.open(data.signedUrl, '_blank', 'noopener')
  }

  if (!canUpload && files.length === 0) return null

  return (
    <div style={{ flexBasis: '100%', fontSize: '0.8125rem' }}>
      {files.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          {files.map(f => (
            <li key={f.name}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleOpen(f.name)}>
                <Icon name="clip" size={14} /> {f.name.replace(/^\d+-/, '')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <label style={{ display: 'inline-block', marginTop: files.length ? 'var(--space-sm)' : 0, color: 'var(--cl-text-secondary)' }}>
          {busy ? 'Uploading…' : 'Attach a deliverable before you submit (max 50 MB): '}
          <input type="file" onChange={handleUpload} disabled={busy} />
        </label>
      )}
      {error && <div role="alert" style={{ color: '#dc2626', marginTop: 4 }}>{error}</div>}
    </div>
  )
}
