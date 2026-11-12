export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://collablance.vercel.app'

// collectives.focus_area values → the name used on public pages
export const FOCUS = {
  web_development: 'Web Development',
  mobile_development: 'Mobile App',
  design: 'Design',
  content: 'Content',
  data_science: 'Data & AI',
  devops: 'DevOps',
  fullstack: 'Full-Stack',
}

// /hire/web-development-teams ↔ web_development
export const focusSlug = (key) => `${key.replace('_', '-')}-teams`
export const focusFromSlug = (slug) => Object.keys(FOCUS).find((key) => focusSlug(key) === slug)
