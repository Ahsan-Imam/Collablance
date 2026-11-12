export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/client', '/profile', '/teams/create', '/collectives', '/projects', '/chat', '/context', '/inbox', '/admin', '/auth', '/api'],
      },
    ],
    sitemap: 'https://collablance.vercel.app/sitemap.xml',
  }
}
