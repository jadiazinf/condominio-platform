import { Divider } from '@heroui/divider'

import { HeroSection } from './components/HeroSection'
import { ProblemsSection } from './components/ProblemsSection'
import { BenefitsSection } from './components/BenefitsSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { CTASection } from './components/CTASection'

import { PricingSection } from '@/ui/components/pricings'

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pb-16">
      <HeroSection />

      <ProblemsSection />

      <BenefitsSection />

      <HowItWorksSection />

      <Divider />

      <PricingSection />

      <Divider />

      <CTASection />
    </div>
  )
}
