export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: 'CondominioApp',
  description:
    'La forma más fácil de administrar tu condominio. Cobra cuotas, mantén informados a los vecinos y ten las cuentas en orden.',
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
      href: '/login',
    },
    {
      label: 'Registrarse',
      href: '/register',
    },
  ],
}
