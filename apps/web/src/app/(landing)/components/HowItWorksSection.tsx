'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from '@/contexts'
import { ScrollSection } from './ScrollSection'

const stepKeys = ['register', 'invite', 'manage'] as const

export function HowItWorksSection() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.3 })

  return (
    <ScrollSection id="how-it-works" className="bg-white dark:bg-[#1E1F22]">
      <div ref={ref} className="max-w-7xl mx-auto px-8 md:px-16 py-24">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-20"
        >
          <div className="h-[2px] w-12 bg-brick mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            {t('landing.howItWorks.title')}
          </h2>
        </motion.div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:block relative">
          {/* Connecting line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="absolute top-5 left-0 right-0 h-[1px] bg-brick origin-left"
          />

          <div className="grid grid-cols-3 gap-12">
            {stepKeys.map((key, index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.2, ease: 'easeOut' }}
              >
                {/* Circle with number */}
                <div className="relative z-10 w-10 h-10 rounded-full border-2 border-brick bg-white dark:bg-[#1E1F22] flex items-center justify-center mb-6">
                  <span className="text-sm font-semibold text-brick">
                    {t(`landing.howItWorks.steps.${key}.step`)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t(`landing.howItWorks.steps.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm text-foreground/50 font-light">
                  {t(`landing.howItWorks.steps.${key}.description`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden relative pl-8">
          {/* Vertical line */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="absolute left-[19px] top-0 bottom-0 w-[1px] bg-brick origin-top"
          />

          <div className="space-y-12">
            {stepKeys.map((key, index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.2, ease: 'easeOut' }}
                className="relative"
              >
                {/* Circle */}
                <div className="absolute -left-8 top-0 w-10 h-10 rounded-full border-2 border-brick bg-white dark:bg-[#1E1F22] flex items-center justify-center">
                  <span className="text-sm font-semibold text-brick">
                    {t(`landing.howItWorks.steps.${key}.step`)}
                  </span>
                </div>
                <div className="ml-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    {t(`landing.howItWorks.steps.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm text-foreground/50 font-light">
                    {t(`landing.howItWorks.steps.${key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </ScrollSection>
  )
}
