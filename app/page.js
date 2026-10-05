import Link from 'next/link'
import './page.css'

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero" id="hero">
        <div className="hero__bg">
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
          <div className="hero__orb hero__orb--3" />
          <div className="hero__grid-pattern" />
        </div>
        <div className="container hero__content">
          <div className="hero__badge animate-fade-in">
            <span className="badge badge--primary">🇮🇳 Made for India</span>
          </div>
          <h1 className="hero__title animate-fade-in-up">
            Freelancers are stronger
            <span className="hero__title-gradient"> together</span>
          </h1>
          <p className="hero__subtitle animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Form named collectives. Pitch clients as a team. 
            Split payments automatically with transparent escrow. 
            No more solo hustle.
          </p>
          <div className="hero__cta animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <Link href="/auth/signup" className="btn btn--primary btn--xl" id="hero-cta">
              Start Your Collective
              <span className="hero__cta-arrow">→</span>
            </Link>
            <Link href="/#how-it-works" className="btn btn--secondary btn--xl" id="hero-learn">
              See How It Works
            </Link>
          </div>
          <div className="hero__stats animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="hero__stat">
              <span className="hero__stat-number">3-5%</span>
              <span className="hero__stat-label">Platform fee only</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-number">₹0</span>
              <span className="hero__stat-label">To get started</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-number">100%</span>
              <span className="hero__stat-label">Escrow protected</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <span className="badge badge--accent">Features</span>
            <h2 className="section-title">Everything your team needs</h2>
            <p className="section-subtitle">
              From forming your collective to getting paid — all in one place.
            </p>
          </div>
          <div className="features__grid stagger-children">
            <div className="card card--hover feature-card" id="feature-collectives">
              <div className="feature-card__icon">👥</div>
              <h3 className="feature-card__title">Named Collectives</h3>
              <p className="feature-card__desc">
                Create a branded team identity. Invite freelancers by skill. 
                Pitch clients as a credible, organized unit.
              </p>
            </div>
            <div className="card card--hover feature-card" id="feature-projects">
              <div className="feature-card__icon">📋</div>
              <h3 className="feature-card__title">Milestone Tracking</h3>
              <p className="feature-card__desc">
                Break projects into clear milestones. Track progress. 
                Get paid per milestone — no waiting for the full project.
              </p>
            </div>
            <div className="card card--hover feature-card" id="feature-payments">
              <div className="feature-card__icon">💰</div>
              <h3 className="feature-card__title">Auto Payment Splits</h3>
              <p className="feature-card__desc">
                Define splits upfront. When a client approves, 
                Razorpay distributes funds automatically. No chasing.
              </p>
            </div>
            <div className="card card--hover feature-card" id="feature-escrow">
              <div className="feature-card__icon">🔒</div>
              <h3 className="feature-card__title">Escrow Protection</h3>
              <p className="feature-card__desc">
                Client funds held in escrow until milestones are approved. 
                Fair for everyone. Disputes handled on-platform.
              </p>
            </div>
            <div className="card card--hover feature-card" id="feature-reputation">
              <div className="feature-card__icon">⭐</div>
              <h3 className="feature-card__title">Reputation System</h3>
              <p className="feature-card__desc">
                Build credibility through project ratings. 
                Your collective's track record speaks louder than resumes.
              </p>
            </div>
            <div className="card card--hover feature-card" id="feature-chat">
              <div className="feature-card__icon">💬</div>
              <h3 className="feature-card__title">Team Chat</h3>
              <p className="feature-card__desc">
                Built-in project chat. Keep discussions, files, and decisions 
                in one place. No switching between apps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="badge badge--primary">How It Works</span>
            <h2 className="section-title">Four steps to your first project</h2>
            <p className="section-subtitle">
              From signup to payday, in less time than you'd think.
            </p>
          </div>
          <div className="steps">
            <div className="step" id="step-1">
              <div className="step__number">01</div>
              <div className="step__content">
                <h3 className="step__title">Create Your Profile</h3>
                <p className="step__desc">
                  Sign up as a freelancer. Add your skills, experience, 
                  and portfolio. Stand out with skill tags.
                </p>
              </div>
            </div>
            <div className="step__connector" />
            <div className="step" id="step-2">
              <div className="step__number">02</div>
              <div className="step__content">
                <h3 className="step__title">Form a Collective</h3>
                <p className="step__desc">
                  Create a named collective or join one. Mix designers, 
                  developers, writers — whatever the project needs.
                </p>
              </div>
            </div>
            <div className="step__connector" />
            <div className="step" id="step-3">
              <div className="step__number">03</div>
              <div className="step__content">
                <h3 className="step__title">Take on Projects</h3>
                <p className="step__desc">
                  Browse and bid on projects as a team. Set milestones, 
                  define splits, and agree on timelines.
                </p>
              </div>
            </div>
            <div className="step__connector" />
            <div className="step" id="step-4">
              <div className="step__number">04</div>
              <div className="step__content">
                <h3 className="step__title">Get Paid Fairly</h3>
                <p className="step__desc">
                  Client approves milestones. Funds released from escrow 
                  and split automatically. Razorpay handles the rest.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="cta">
        <div className="container">
          <div className="cta-card">
            <div className="cta-card__bg">
              <div className="cta-card__orb cta-card__orb--1" />
              <div className="cta-card__orb cta-card__orb--2" />
            </div>
            <div className="cta-card__content">
              <h2 className="cta-card__title">Ready to team up?</h2>
              <p className="cta-card__desc">
                Join CollabLance today. It's free to start, and you only 
                pay a small platform fee when you get paid.
              </p>
              <div className="cta-card__actions">
                <Link href="/auth/signup" className="btn btn--accent btn--xl" id="cta-signup">
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
