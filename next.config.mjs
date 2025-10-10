import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/me",
        permanent: true,
      },
      {
        source: "/dashboard/default",
        destination: "/dashboard/me",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
