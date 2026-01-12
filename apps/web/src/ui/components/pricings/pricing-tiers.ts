import type { Frequency, Tier } from './pricing-types'

import { FrequencyEnum, TiersEnum } from './pricing-types'

export const frequencies: Array<Frequency> = [
  { key: FrequencyEnum.Yearly, label: 'Anual', priceSuffix: 'al año', discount: 'Ahorra 20%' },
  { key: FrequencyEnum.Monthly, label: 'Mensual', priceSuffix: 'al mes' },
]

export const tiers: Array<Tier> = [
  {
    key: TiersEnum.Basico,
    title: 'Básico',
    price: {
      yearly: '$279',
      monthly: '$29',
    },
    href: '/register?plan=basico',
    featured: false,
    mostPopular: false,
    description: 'Para condominios pequeños que quieren empezar a organizarse.',
    features: [
      'Hasta 50 unidades',
      'Genera y cobra cuotas',
      '1 administrador',
      'Avisos a residentes',
      'Soporte por email',
    ],
    buttonText: 'Empezar gratis',
    buttonColor: 'default',
    buttonVariant: 'flat',
  },
  {
    key: TiersEnum.Profesional,
    title: 'Profesional',
    description: 'Todo lo que necesitas para administrar sin complicaciones.',
    href: '/register?plan=profesional',
    mostPopular: true,
    price: {
      yearly: '$759',
      monthly: '$79',
    },
    featured: false,
    features: [
      'Hasta 200 unidades',
      'Pagos en línea',
      '5 administradores',
      'Recordatorios automáticos',
      'Reportes y estadísticas',
      'Soporte prioritario',
    ],
    buttonText: 'Comenzar ahora',
    buttonColor: 'primary',
    buttonVariant: 'solid',
  },
  {
    key: TiersEnum.Empresarial,
    title: 'Empresarial',
    href: '/contact?plan=empresarial',
    featured: true,
    mostPopular: false,
    description: 'Para administradoras profesionales con múltiples condominios.',
    price: {
      yearly: '$1,999',
      monthly: '$199',
    },
    features: [
      'Unidades ilimitadas',
      'Administradores ilimitados',
      'Todas las funcionalidades',
      'Integraciones a medida',
      'Capacitación incluida',
      'Soporte dedicado 24/7',
    ],
    buttonText: 'Hablar con ventas',
    buttonColor: 'default',
    buttonVariant: 'flat',
  },
]
