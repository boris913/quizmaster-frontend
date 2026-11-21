const createNextIntlPlugin = require('next-intl/plugin');

// Langue résolue par requête (cookie / navigateur) : voir src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
};

module.exports = withNextIntl(nextConfig);
