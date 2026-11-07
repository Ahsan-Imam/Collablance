/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // The client landing page became the home page — keep old links working
      { source: '/for-clients', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
