import Link from 'next/link'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { CLIENT_FEE_PERCENT, TEAM_COMMISSION_PERCENT } from '@/lib/payments/money'
import { FOCUS, focusSlug } from '@/lib/site'
import './home.css'

// Both are variable fonts: no weight list, one file each covers every weight used
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-figures', display: 'swap' })

export const metadata = {
  title: 'Hire a Freelancer Team — CollabLance',
  description:
    'Post a project and hire a ready-made team of freelancers — designers, developers and writers who already work together.',
}

const rupees = (n) => `₹${n.toLocaleString('en-IN')}`
const EXAMPLE = 10000

const SPLIT = [
  { role: 'Designer', percent: 40, tone: 'a' },
  { role: 'Developer', percent: 40, tone: 'b' },
  { role: 'Writer', percent: 20, tone: 'c' },
]

const STEPS = [
  ['Post your project', 'Describe the work, a budget range, a deadline and the skills you need. It costs nothing.'],
  ['Compare proposals', 'Each team replies with one price and one timeline, so you compare like with like.'],
  ['The team signs its split', 'Every member signs who gets what before the team can start. No money arguments mid-project.'],
  ['Approve each milestone', 'Review the files the team delivers. Approve, send back for changes, or raise a dispute.'],
]

// Illustration only — the figure is captioned as an example
const PROPOSALS = [
  ['Team A', 'Design, Shopify, content', 52000, 21],
  ['Team B', 'Full-stack, design', 48000, 30],
  ['Team C', 'Web development', 60000, 14],
]

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export default function HomePage() {
  const fee = (EXAMPLE * CLIENT_FEE_PERCENT) / 100
  const commission = (EXAMPLE * TEAM_COMMISSION_PERCENT) / 100

  return (
    <div className={`home ${display.variable} ${mono.variable}`}>
      {/* Hero */}
      <section className="home-band home-band--surface" id="hero">
        <div className="container home-hero">
          <div className="home-hero__copy">
            <p className="home-eyebrow">Freelancer teams, India-first</p>
            <h1 className="home-hero__title">Hire a whole team, not just a freelancer.</h1>
            <p className="home-hero__lead">
              Post your project once. Teams of designers, developers and writers who already work
              together send you a price and a timeline. You deal with one team, and pay milestone by milestone.
            </p>
            <div className="home-actions">
              <Link href="/auth/signup?role=client" className="home-btn home-btn--primary" id="clients-hero-cta">
                Post a project <Arrow />
              </Link>
              <Link href="/hire" className="home-btn home-btn--outline" id="clients-hero-browse">Browse teams</Link>
            </div>
            <p className="home-hero__note">
              Posting is free. You pay a {CLIENT_FEE_PERCENT}% service fee only on milestones you fund.
              {' '}Freelancer? <Link href="/for-freelancers" id="hero-for-freelancers">Start or join a team</Link>
            </p>
          </div>

          <figure className="home-contract" id="hero-split-example">
            <div className="home-contract__head">
              <div>
                <span className="home-label">Payout split contract</span>
                <span className="home-contract__project">Online store for a skincare brand</span>
              </div>
              <span className="home-pill home-pill--ok">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                Signed and locked
              </span>
            </div>
            <div className="home-contract__body">
              <div className="home-split-bar" role="img" aria-label={`Split: ${SPLIT.map(s => `${s.role.toLowerCase()} ${s.percent} percent`).join(', ')}`}>
                {SPLIT.map(s => <div key={s.role} className={`home-tone-${s.tone}`} style={{ width: `${s.percent}%` }} />)}
              </div>
              <ul className="home-split-rows">
                {SPLIT.map(s => (
                  <li key={s.role}>
                    <span className="home-split-rows__who"><span className={`home-dot home-tone-${s.tone}`} />{s.role}</span>
                    <span className="home-split-rows__share"><span className="home-figure">{s.percent}%</span><span className="home-signed">Signed</span></span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="home-contract__milestone">
              <span><strong>Milestone 1</strong> · Store design · <span className="home-figure">{rupees(EXAMPLE)}</span></span>
              <span className="home-pill home-pill--held">Funded, held until you approve</span>
            </div>
            <figcaption className="home-caption">Example of the split every team signs before it can take your project.</figcaption>
          </figure>
        </div>
      </section>

      {/* How hiring works */}
      <section className="container home-section" id="how-it-works">
        <div className="home-heading">
          <p className="home-eyebrow">How hiring works</p>
          <h2 className="home-title">From brief to delivered work in four steps.</h2>
        </div>
        <ol className="home-steps">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="home-step" id={`clients-step-${i + 1}`}>
              <span className="home-step__number">0{i + 1}</span>
              <h3 className="home-step__title">{title}</h3>
              <p className="home-step__text">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Proposals */}
      <section className="home-band home-band--ink" id="features">
        <div className="container home-split-layout">
          <div className="home-split-layout__copy">
            <p className="home-eyebrow home-eyebrow--on-ink">Proposals</p>
            <h2 className="home-title">See every team&apos;s price and timeline side by side.</h2>
            <p className="home-lead home-lead--on-ink">
              No hourly guesswork. Open a team&apos;s page to see its members, completed projects and client reviews before you choose.
            </p>
            <ul className="home-checks">
              <li><Check />One team, one point of contact</li>
              <li><Check />One project chat instead of five inboxes</li>
              <li><Check />Optional NDA the whole team signs</li>
            </ul>
          </div>
          <figure className="home-proposals">
            <div className="home-proposals__head">Proposals for your project</div>
            <div className="home-proposals__scroll">
              <table>
                <thead>
                  <tr><th scope="col">Team</th><th scope="col" className="home-num">Price</th><th scope="col" className="home-num">Timeline</th></tr>
                </thead>
                <tbody>
                  {PROPOSALS.map(([team, skills, price, days]) => (
                    <tr key={team}>
                      <td><strong>{team}</strong><span>{skills}</span></td>
                      <td className="home-num home-figure">{rupees(price)}</td>
                      <td className="home-num home-figure">{days} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption className="home-caption">Example figures, for illustration.</figcaption>
          </figure>
        </div>
      </section>

      {/* Browse teams */}
      <section className="container home-section" id="teams">
        <div className="home-heading home-heading--row">
          <div className="home-heading">
            <p className="home-eyebrow">Browse teams</p>
            <h2 className="home-title">Look before you sign up.</h2>
            <p className="home-lead">Every team has a public page. No account needed to browse.</p>
          </div>
          <Link href="/hire" className="home-link" id="home-all-teams">See all teams</Link>
        </div>
        <div className="home-categories">
          {Object.entries(FOCUS).map(([key, label]) => (
            <Link key={key} href={`/hire/${focusSlug(key)}`} className="home-category">{label} teams <Arrow /></Link>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="home-band home-band--surface" id="pricing">
        <div className="container home-split-layout home-split-layout--top">
          <div className="home-split-layout__copy">
            <p className="home-eyebrow">Pricing</p>
            <h2 className="home-title">Free to post. We earn only when a milestone is paid.</h2>
            <p className="home-lead">No subscriptions and no paid proposals, for clients or for teams.</p>
            <Link href="/pricing" className="home-link" id="home-pricing-link">Full pricing and questions</Link>
          </div>
          <div className="home-pricing">
            <div className="home-pricing__rates">
              <div className="home-rate">
                <span className="home-rate__who">Clients pay</span>
                <span className="home-rate__number">{CLIENT_FEE_PERCENT}%</span>
                <span className="home-rate__what">service fee on top of each milestone</span>
              </div>
              <div className="home-rate">
                <span className="home-rate__who">Teams pay</span>
                <span className="home-rate__number">{TEAM_COMMISSION_PERCENT}%</span>
                <span className="home-rate__what">commission, taken before the split</span>
              </div>
            </div>
            <div className="home-example">
              <span className="home-rate__who">On a {rupees(EXAMPLE)} milestone</span>
              <div><span>The client pays</span><span className="home-figure">{rupees(EXAMPLE + fee)}</span></div>
              <div><span>The team receives, shared by its signed split</span><span className="home-figure">{rupees(EXAMPLE - commission)}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* For freelancers */}
      <section className="container home-section" id="freelancers">
        <div className="home-freelancers">
          <div>
            <h2 className="home-freelancers__title">Freelancer? Bring your people.</h2>
            <p className="home-lead">
              Start a team with the designers, developers and writers you already work with.
              Win bigger projects together and agree the split up front.
            </p>
          </div>
          <Link href="/for-freelancers" className="home-btn home-btn--ink" id="home-freelancers-cta">Start or join a team</Link>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="home-band home-band--ink" id="clients-cta">
        <div className="container home-closing">
          <h2 className="home-closing__title">Have a project in mind?</h2>
          <p className="home-lead home-lead--on-ink">Post it today and let teams come to you with a price and a timeline.</p>
          <div className="home-actions home-actions--center">
            <Link href="/auth/signup?role=client" className="home-btn home-btn--amber" id="clients-cta-signup">Post a project, free</Link>
            <Link href="/hire" className="home-btn home-btn--on-ink" id="clients-cta-browse">Browse teams first</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
