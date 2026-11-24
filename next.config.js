const createNextIntlPlugin = require('next-intl/plugin');

// Langue résolue par requête (cookie / navigateur) : voir src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serveur Node autonome (.next/standalone/server.js) pour l'image Docker déployée par Coolify.
  output: 'standalone',
  images: {
    domains: [],
  },
};

module.exports = withNextIntl(nextConfig);
