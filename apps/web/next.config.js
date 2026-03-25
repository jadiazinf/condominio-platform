const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Minimal caching — only static assets that never change.
  // Pages, JS bundles, and data are NOT cached so deploys take effect immediately.
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'codominioapp.firebasestorage.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
}

const { withSentryConfig } = require('@sentry/nextjs')

const baseConfig = process.env.NODE_ENV === 'production' ? withPWA(nextConfig) : nextConfig

module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(baseConfig, {
      // Suppress CLI output during build
      silent: !process.env.CI,
      // Hide source maps from client bundles (uploaded to Sentry only)
      hideSourceMaps: true,
      // Source map upload: requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars
      // These are set in Vercel environment settings
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Automatically associate commits and releases
      release: {
        setCommits: {
          auto: true,
          ignoreMissing: true,
        },
      },
      // Upload source maps for all bundles
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
    })
  : baseConfig
