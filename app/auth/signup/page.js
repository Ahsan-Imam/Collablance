'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleGoogleSignup = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })

      if (authError) {
        setError(authError.message)
        setGoogleLoading(false)
      }
    } catch (err) {
      setError('Google sign-up failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'freelancer', // Phase 1: Freelancer signup only
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-page__bg">
          <div className="auth-page__orb auth-page__orb--1" />
          <div className="auth-page__orb auth-page__orb--2" />
        </div>
        <div className="auth-card animate-scale-in">
          <div className="auth-card__success">
            <span className="auth-card__success-icon">✉️</span>
            <h2 className="auth-card__title">Check your email</h2>
            <p className="auth-card__subtitle">
              We've sent a confirmation link to <strong>{formData.email}</strong>. 
              Click the link to activate your account.
            </p>
            <Link href="/auth/login" className="btn btn--primary btn--lg btn--full">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-page__bg">
        <div className="auth-page__orb auth-page__orb--1" />
        <div className="auth-page__orb auth-page__orb--2" />
      </div>
      <div className="auth-card animate-scale-in">
        <div className="auth-card__header">
          <h1 className="auth-card__title">Join CollabLance</h1>
          <p className="auth-card__subtitle">
            Create your freelancer account — it's free
          </p>
        </div>

        {error && (
          <div className="alert alert--error" id="signup-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-Up */}
        <button
          onClick={handleGoogleSignup}
          className="btn btn--google btn--full"
          disabled={googleLoading}
          id="google-signup"
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
          <span>or sign up with email</span>
        </div>

        <form onSubmit={handleSignup} className="auth-form" id="signup-form">
          <div className="input-group">
            <label htmlFor="fullName" className="input-label">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="input"
              placeholder="Your full name"
              value={formData.fullName}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="signup-email" className="input-label">Email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="signup-password" className="input-label">Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              className="input"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="input"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <p className="auth-form__terms">
            By signing up, you agree to our{' '}
            <Link href="/legal/terms">Terms of Service</Link> and{' '}
            <Link href="/legal/privacy">Privacy Policy</Link>.
          </p>

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--full"
            disabled={loading}
            id="signup-submit"
          >
            {loading ? 'Creating account...' : 'Create Freelancer Account'}
          </button>
        </form>

        <div className="auth-card__footer">
          <p>
            Already have an account?{' '}
            <Link href="/auth/login" className="auth-card__link" id="signup-to-login">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
