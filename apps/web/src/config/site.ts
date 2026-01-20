export type SiteConfig = typeof siteConfig

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://condominioapp.com'

export const siteConfig = {
  name: 'CondominioApp',
  description:
    'La forma más fácil de administrar tu condominio. Cobra cuotas, mantén informados a los vecinos y ten las cuentas en orden.',
  url: BASE_URL,
  ogImage: `${BASE_URL}/og-image.png`,
  keywords: [
    'condominio',
    'administración de condominios',
    'gestión de edificios',
    'cobro de cuotas',
    'comunidad de vecinos',
    'software de condominios',
    'app para condominios',
    'administrador de edificios',
  ],
  authors: [{ name: 'CondominioApp' }],
  creator: 'CondominioApp',
  twitter: {
    card: 'summary_large_image' as const,
    site: '@condominioapp',
    creator: '@condominioapp',
  },
  locale: 'es_LA',
  alternateLocales: ['en_US'],
  navItems: [
    {
      label: 'Inicio',
      href: '/',
    },
    {
      label: 'Beneficios',
      href: '#beneficios',
    },
    {
      label: 'Cómo funciona',
      href: '#como-funciona',
    },
    {
      label: 'Únete',
      href: '#pricing',
    },
  ],
  navMenuItems: [
    {
      label: 'Inicio',
      href: '/',
    },
    {
      label: 'Beneficios',
      href: '#beneficios',
    },
    {
      label: 'Cómo funciona',
      href: '#como-funciona',
    },
    {
      label: 'Únete',
      href: '#pricing',
    },
    {
      label: 'Iniciar Sesión',
      href: '/signin',
    },
    {
      label: 'Registrarse',
      href: '/signup',
    },
  ],
}
