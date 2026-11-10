const BASE_URL = 'https://collablance.vercel.app'

export default function sitemap() {
  const staticPaths = [
    '', '/for-freelancers',
    '/legal/terms', '/legal/privacy', '/legal/cookies', '/legal/refund', '/legal/ip', '/legal/disputes',
  ]

  return staticPaths.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }))
}
