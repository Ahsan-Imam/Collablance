import Link from 'next/link'
import '../page.css'

export const metadata = {
  title: 'Hire a Freelancer Collective — CollabLance',
  description:
    'Post a project and hire a ready-made team of freelancers — designers, developers and writers who already work together.',
}

export default function ForClientsPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero" id="clients-hero">
        <div className="hero__bg">
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
          <div className="hero__orb hero__orb--3" />
          <div className="hero__grid-pattern" />
        </div>
        <div className="container hero__content">
          <div className="hero__badge animate-fade-in">
            <span className="badge badge--accent">💼 For Clients</span>
          </div>
          <h1 className="hero__title animate-fade-in-up">
            Hire a whole team,
            <span className="hero__title-gradient"> not just a freelancer</span>
          </h1>
          <p className="hero__subtitle animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Post your project once. Collectives of designers, developers and writers
            who already work together pick it up — one team, one point of contact.
          </p>
          <div className="hero__cta animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <Link href="/auth/signup?role=client" className="btn btn--primary btn--xl" id="clients-hero-cta">
              Post a Project
              <span className="hero__cta-arrow">→</span>
            </Link>
            <Link href="/for-clients#how-it-works" className="btn btn--secondary btn--xl" id="clients-hero-learn">
              How Hiring Works
            </Link>
          </div>
          <div className="hero__stats animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="hero__stat">
              <span className="hero__stat-number">₹0</span>
              <span className="hero__stat-label">To post a project</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-number">1</span>
              <span className="hero__stat-label">Team, one contact</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-number">100%</span>
              <span className="hero__stat-label">Escrow protected</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why collectives */}
      <section className="features" id="clients-features">
        <div className="container">
          <div className="section-header">
            <span className="badge badge--accent">Why Collectives</span>
            <h2 className="section-title">Skip assembling a team yourself</h2>
            <p className="section-subtitle">
              A collective brings every skill your project needs, already coordinated.
            </p>
          </div>
          <div className="features__grid stagger-children">
            <div className="card card--hover feature-card" id="clients-feature-team">
              <div className="feature-card__icon">👥</div>
              <h3 className="feature-card__title">Ready-Made Teams</h3>
              <p className="feature-card__desc">
                Design, development and content under one roof.
                No juggling five separate freelancers.
              </p>
            </div>
            <div className="card card--hover feature-card" id="clients-feature-post">
              <div className="feature-card__icon">📋</div>
              <h3 className="feature-card__title">Post in Minutes</h3>
              <p className="feature-card__desc">
                Describe the work, set a budget range and deadline,
                list the skills you need. That&apos;s it.
              </p>
            </div>
            <div className="card card--hover feature-card" id="clients-feature-track">
              <div className="feature-card__icon">📈</div>
              <h3 className="feature-card__title">Track Every Project</h3>
              <p className="feature-card__desc">
                Your Client Hub shows what&apos;s open, in progress and done,
                with your total budget at a glance.
              </p>
            </div>
            <div className="card card--hover feature-card" id="clients-feature-escrow">
              <div className="feature-card__icon">🔒</div>
              <h3 className="feature-card__title">Pay per Milestone</h3>
              <p className="feature-card__desc">
                Funds are held in escrow and released only when
                you approve each milestone.
              </p>
            </div>
            <div className="card card--hover feature-card" id="clients-feature-reputation">
              <div className="feature-card__icon">⭐</div>
              <h3 className="feature-card__title">Proven Track Records</h3>
              <p className="feature-card__desc">
                Collectives build reputation through rated projects,
                so you know who you&apos;re hiring.
              </p>
            </div>
            <div className="card card--hover feature-card" id="clients-feature-chat">
              <div className="feature-card__icon">💬</div>
              <h3 className="feature-card__title">One Conversation</h3>
              <p className="feature-card__desc">
                Talk to the whole team in one project chat instead of
                chasing people across apps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How hiring works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="badge badge--primary">How Hiring Works</span>
            <h2 className="section-title">From idea to delivered project</h2>
            <p className="section-subtitle">
              Four steps, and you only pay for approved work.
            </p>
          </div>
          <div className="steps">
            <div className="step" id="clients-step-1">
              <div className="step__number">01</div>
              <div className="step__content">
                <h3 className="step__title">Sign Up as a Client</h3>
                <p className="step__desc">
                  Create a free client account and tell collectives
                  a little about your company.
                </p>
              </div>
            </div>
            <div className="step__connector" />
            <div className="step" id="clients-step-2">
              <div className="step__number">02</div>
              <div className="step__content">
                <h3 className="step__title">Post Your Project</h3>
                <p className="step__desc">
                  Share the scope, budget range, deadline and the
                  skills the work needs.
                </p>
              </div>
            </div>
            <div className="step__connector" />
            <div className="step" id="clients-step-3">
              <div className="step__number">03</div>
              <div className="step__content">
                <h3 className="step__title">Pick a Collective</h3>
                <p className="step__desc">
                  Browse collectives, compare their members and focus,
                  and choose the team that fits.
                </p>
              </div>
            </div>
            <div className="step__connector" />
            <div className="step" id="clients-step-4">
              <div className="step__number">04</div>
              <div className="step__content">
                <h3 className="step__title">Approve &amp; Pay</h3>
                <p className="step__desc">
                  Review each milestone. Approve it, and payment is
                  released to the team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="clients-cta">
        <div className="container">
          <div className="cta-card">
            <div className="cta-card__bg">
              <div className="cta-card__orb cta-card__orb--1" />
              <div className="cta-card__orb cta-card__orb--2" />
            </div>
            <div className="cta-card__content">
              <h2 className="cta-card__title">Have a project in mind?</h2>
              <p className="cta-card__desc">
                Create a free client account and post it today.
              </p>
              <div className="cta-card__actions">
                <Link href="/auth/signup?role=client" className="btn btn--accent btn--xl" id="clients-cta-signup">
                  Create Client Account
                </Link>
                <Link href="/auth/login?role=client" className="btn btn--secondary btn--xl" id="clients-cta-login">
                  Client Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
