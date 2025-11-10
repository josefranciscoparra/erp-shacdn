import path from "path";

import { withSentryConfig } from "@sentry/nextjs";
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

// Aplicar plugins en orden: primero Sentry, luego Next-Intl
const configWithIntl = withNextIntl(nextConfig);

export default withSentryConfig(configWithIntl, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "timenow",
  project: "javascript-nextjs",

  // Upload de source maps - Solo en producción
  silent: !process.env.CI,

  // Para debuggear problemas de Sentry en desarrollo
  debug: false,

  // Configuración de upload de source maps
  widenClientFileUpload: true,

  // Transpila SDK para compatibilidad con navegadores antiguos
  transpileClientSDK: true,

  // Oculta source maps del bundle público (pero los sube a Sentry)
  hideSourceMaps: true,

  // Deshabilita telemetría del SDK de Sentry
  disableLogger: true,

  // Automatically annotate React components to show component names in Sentry
  reactComponentAnnotation: {
    enabled: true,
  },

  // Configuración de túnel para evitar adblockers (opcional)
  // tunnelRoute: "/monitoring",

  // Deshabilita instrumentación automática de Server Components
  // Lo haremos manualmente con nuestro wrapper
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
});
