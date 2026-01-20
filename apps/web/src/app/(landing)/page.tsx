import type { Metadata } from 'next'
import { Divider } from '@heroui/divider'

import { HeroSection } from './components/HeroSection'

export const metadata: Metadata = {
  title: 'Administra tu Condominio Fácilmente',
  description:
    'CondominioApp es la plataforma más fácil para administrar tu condominio. Cobra cuotas, organiza asambleas, mantén informados a los vecinos y lleva las cuentas en orden.',
  openGraph: {
    title: 'CondominioApp - Administra tu Condominio Fácilmente',
    description:
      'La plataforma más fácil para administrar tu condominio. Cobra cuotas, organiza asambleas y mantén las cuentas en orden.',
  },
}
import { ProblemsSection } from './components/ProblemsSection'
import { BenefitsSection } from './components/BenefitsSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { CTASection } from './components/CTASection'

import { PricingSection } from '@/ui/components/pricings'

export default function Home() {
  return (
    <>
      <div className="relative z-10 flex flex-col gap-20 pb-16">
        <HeroSection />

        <ProblemsSection />

        <BenefitsSection />

        <HowItWorksSection />

        <Divider />

        <PricingSection />

        <Divider />

        <CTASection />
      </div>
    </>
  )
}
