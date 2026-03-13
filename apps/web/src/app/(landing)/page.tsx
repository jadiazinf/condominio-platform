import type { Metadata } from 'next'

import { HeroSection } from './components/HeroSection'
import { ProblemsSection } from './components/ProblemsSection'
import { BenefitsSection } from './components/BenefitsSection'
import { ResidentsSection } from './components/ResidentsSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { CTASection } from './components/CTASection'
import { Footer } from './components/Footer'

export const metadata: Metadata = {
  title: 'CondominioApp — Administradores y Residentes, Conectados',
  description:
    'La plataforma que conecta a administradores y residentes para gestionar tu condominio de forma eficiente, transparente y en comunidad.',
  openGraph: {
    title: 'CondominioApp — Administradores y Residentes, Conectados',
    description:
      'La plataforma que conecta a administradores y residentes para gestionar tu condominio de forma eficiente, transparente y en comunidad.',
  },
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemsSection />
      <BenefitsSection />
      <ResidentsSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </>
  )
}
