'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '../auth.css'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const authError = searchParams.get('error')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      router.push(redirect)
      router.refresh()
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
        },
      })

      if (authError) {
        setError(authError.message)
        setGoogleLoading(false)
      }
      // Browser will redirect to Google — no need to setGoogleLoading(false)
    } catch (err) {
      setError('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="auth-card animate-scale-in">
      <div className="auth-card__header">
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__subtitle">
          Log in to your CollabLance account
        </p>
      </div>

      {(error || authError) && (
        <div className="alert alert--error" id="login-error">
          <span>⚠️</span>
          <span>{error || 'Authentication failed. Please try again.'}</span>
        </div>
      )}

      {/* Google Sign-In */}
      <button
        onClick={handleGoogleLogin}
        className="btn btn--google btn--full"
        disabled={googleLoading}
        id="google-login"
      >
        {googleLoading ? (
          'Redirecting to Google...'
        ) : (
          <>
            <GoogleIcon />
            Continue with Google
          </>
        )}
      </button>

      <div className="auth-form__divider">
        <span>or sign in with email</span>
      </div>

      <form onSubmit={handleLogin} className="auth-form" id="login-form">
        <div className="input-group">
          <label htmlFor="email" className="input-label">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <label htmlFor="password" className="input-label">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            minLength={6}
          />
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--lg btn--full"
          disabled={loading}
          id="login-submit"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="auth-card__footer">
        <p>
          Don't have an account?{' '}
          <Link href="/auth/signup" className="auth-card__link" id="login-to-signup">
            Sign up as a Freelancer
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-page__bg">
        <div className="auth-page__orb auth-page__orb--1" />
        <div className="auth-page__orb auth-page__orb--2" />
      </div>
      <Suspense fallback={
        <div className="auth-card">
          <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
