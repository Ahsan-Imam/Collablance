'use client'

import { useEffect } from 'react'

// Catches errors thrown from the root layout itself, which app/error.js
// can't — must render its own <html>/<body> since the layout failed.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: '4rem 1rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please try again.</p>
          <button onClick={() => reset()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem' }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
