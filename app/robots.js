export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/client', '/profile', '/teams', '/collectives', '/projects', '/chat', '/context', '/auth', '/api'],
      },
    ],
    sitemap: 'https://collablance.vercel.app/sitemap.xml',
  }
}
