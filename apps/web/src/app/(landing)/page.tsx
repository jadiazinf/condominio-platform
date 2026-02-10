import type { Metadata } from 'next'

import { HeroSection } from './components/HeroSection'
import { ProblemsSection } from './components/ProblemsSection'
import { BenefitsSection } from './components/BenefitsSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { CTASection } from './components/CTASection'
import { Footer } from './components/Footer'

export const metadata: Metadata = {
  title: 'CondominioApp — Administra tu Condominio',
  description:
    'La plataforma moderna para administrar tu condominio. Cobra cuotas, comunica avisos y lleva las cuentas en orden.',
  openGraph: {
    title: 'CondominioApp — Administra tu Condominio',
    description:
      'La plataforma moderna para administrar tu condominio. Cobra cuotas, comunica avisos y lleva las cuentas en orden.',
  },
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemsSection />
      <BenefitsSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </>
  )
}
