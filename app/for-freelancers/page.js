import Link from 'next/link'
import Icon from '@/components/Icon/Icon'
import { TEAM_COMMISSION_PERCENT } from '@/lib/payments/money'
import '../home.css'

export const metadata = {
  title: 'For Freelancers — CollabLance',
  description:
    'Form freelancer teams, pitch clients together, and agree payment splits before work starts.',
}

const FEATURES = [
  ['users', 'Named teams', 'A team page with your members, completed projects and client reviews, shareable and public.'],
  ['send', 'Proposals with a price', 'Send one price and one timeline per project. AI can draft the first version for you to edit.'],
  ['wallet', 'Signed payout splits', 'Your lead proposes who gets what, every member signs, and it locks before work starts.'],
  ['lock', 'Milestone payments', 'The client funds each milestone first. It is held until they approve, then paid out per your split.'],
  ['star', 'Reputation', 'Clients rate your team after each project. Your track record shows on your team page.'],
  ['chat', 'One project chat', 'Talk to the client and your team in one place, next to the milestones and files.'],
]

const STEPS = [
  ['Create your profile', 'Add your skills, experience and portfolio link.'],
  ['Form or join a team', 'Mix designers, developers and writers — whatever your projects need.'],
  ['Send proposals', 'Pick open projects and reply as a team with a price and a timeline.'],
  ['Deliver and get paid', 'Upload each milestone, the client approves, and everyone is paid their signed share.'],
]

export default function ForFreelancersPage() {
  return (
    <div className="home">
      <section className="home-band home-band--surface" id="hero">
        <div className="container home-hero">
          <div className="home-hero__copy">
            <p className="home-eyebrow">For freelancers</p>
            <h1 className="home-hero__title">Freelancers are stronger together.</h1>
            <p className="home-hero__lead">
              Form a named team with people you trust. Pitch bigger projects together,
              and agree the payout split before any work starts.
            </p>
            <div className="home-actions">
              <Link href="/auth/signup" className="home-btn home-btn--primary" id="hero-cta">
                Start your team <Icon name="arrow" />
              </Link>
              <Link href="/open-projects" className="home-btn home-btn--outline" id="hero-open-projects">See open projects</Link>
            </div>
            <p className="home-hero__note">
              Free to join and to send proposals. Teams pay {TEAM_COMMISSION_PERCENT}% only on milestones that get paid.
              {' '}Hiring instead? <Link href="/" id="hero-for-clients">Post a project</Link>
            </p>
          </div>

          <figure className="home-contract" id="hero-split-example">
            <div className="home-contract__head">
              <div>
                <span className="home-label">Your team</span>
                <span className="home-contract__project">Pixel &amp; Prose</span>
              </div>
              <span className="home-pill home-pill--held">3 members</span>
            </div>
            <div className="home-contract__body">
              <ul className="home-split-rows">
                <li><span className="home-split-rows__who"><span className="home-dot home-tone-a" />Designer · Team lead</span><span className="home-signed">Signed</span></li>
                <li><span className="home-split-rows__who"><span className="home-dot home-tone-b" />Developer</span><span className="home-signed">Signed</span></li>
                <li><span className="home-split-rows__who"><span className="home-dot home-tone-c" />Writer</span><span className="home-signed">Signed</span></li>
              </ul>
            </div>
            <div className="home-contract__milestone">
              <span>Proposal sent · <span className="home-figure">₹52,000</span> · 21 days</span>
              <span className="home-pill home-pill--ok">Accepted</span>
            </div>
            <figcaption className="home-caption">Example team, for illustration.</figcaption>
          </figure>
        </div>
      </section>

      <section className="container home-section" id="features">
        <div className="home-heading">
          <p className="home-eyebrow">What you get</p>
          <h2 className="home-title">Everything a team needs, from first pitch to payout.</h2>
        </div>
        <ul className="home-steps">
          {FEATURES.map(([icon, title, text]) => (
            <li key={title} className="home-step">
              <span className="home-step__number"><Icon name={icon} size={22} /></span>
              <h3 className="home-step__title">{title}</h3>
              <p className="home-step__text">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-band home-band--surface" id="how-it-works">
        <div className="container home-section">
          <div className="home-heading">
            <p className="home-eyebrow">How it works</p>
            <h2 className="home-title">Four steps to your first paid project.</h2>
          </div>
          <ol className="home-steps">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="home-step" id={`step-${i + 1}`}>
                <span className="home-step__number">0{i + 1}</span>
                <h3 className="home-step__title">{title}</h3>
                <p className="home-step__text">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-band home-band--ink" id="cta">
        <div className="container home-closing">
          <h2 className="home-closing__title">Ready to team up?</h2>
          <p className="home-lead home-lead--on-ink">Create a free account, then start a team or accept an invite.</p>
          <div className="home-actions home-actions--center">
            <Link href="/auth/signup" className="home-btn home-btn--amber" id="cta-signup">Create free account</Link>
            <Link href="/hire" className="home-btn home-btn--on-ink" id="cta-browse">See other teams</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
