/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile HeroUI packages for proper SSR/SSG support
  transpilePackages: [
    '@heroui/button',
    '@heroui/card',
    '@heroui/chip',
    '@heroui/divider',
    '@heroui/link',
    '@heroui/navbar',
    '@heroui/system',
    '@heroui/theme',
  ],
}

module.exports = nextConfig
