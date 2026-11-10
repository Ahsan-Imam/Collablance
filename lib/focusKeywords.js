/**
 * lib/focusKeywords.js
 *
 * Lightweight keyword lists used to match a team's focus_area against
 * free-text skills (project.skills_needed, profile.skills) for
 * recommendations. Not a real taxonomy — just enough signal to rank
 * "likely relevant" above "recent".
 */
export const FOCUS_KEYWORDS = {
  web_development: ['web', 'react', 'next', 'frontend', 'html', 'css', 'javascript', 'node', 'vue', 'angular'],
  mobile_development: ['mobile', 'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin'],
  design: ['design', 'figma', 'ui', 'ux', 'photoshop', 'illustrator', 'branding'],
  content: ['content', 'writing', 'copywriting', 'seo', 'marketing', 'blog'],
  data_science: ['data', 'ml', 'ai', 'python', 'machine learning', 'analytics', 'pandas'],
  devops: ['devops', 'aws', 'docker', 'kubernetes', 'cloud', 'ci/cd', 'terraform'],
  fullstack: ['fullstack', 'full-stack', 'full stack', 'react', 'node'],
  other: [],
}
