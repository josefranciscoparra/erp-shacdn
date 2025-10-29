import path from "path";

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
  experimental: {
    optimizePackageImports: ['lucide-react'],
    turbo: {
      resolveAlias: {
        '@radix-ui/react-id': './src/lib/radix/stable-use-id.ts',
      },
    },
    serverActions: {
      bodySizeLimit: '2.2mb', // 2.2MB (margen de seguridad sobre límite de 2MB en cliente)
    },
  },
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = config.resolve.alias ?? {};
    config.resolve.alias['@radix-ui/react-id'] = path.resolve('./src/lib/radix/stable-use-id.ts');
    return config;
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
