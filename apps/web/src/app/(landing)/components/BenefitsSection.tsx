'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from '@/contexts'
import { ScrollSection } from './ScrollSection'

const benefitKeys = ['paperwork', 'collections', 'informed', 'transparency'] as const

const benefitNumbers: Record<(typeof benefitKeys)[number], string> = {
  paperwork: '01',
  collections: '02',
  informed: '03',
  transparency: '04',
}

export function BenefitsSection() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.3 })

  return (
    <ScrollSection id="benefits" className="bg-content2 dark:bg-[#1E1F22]">
      <div ref={ref} className="max-w-7xl mx-auto px-8 md:px-16 py-24">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-16"
        >
          <div className="h-[2px] w-12 bg-brick mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            {t('landing.benefits.title')}
          </h2>
        </motion.div>

        {/* 2x2 grid with cross dividers */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {benefitKeys.map((key, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.15, ease: 'easeOut' }}
              className={`p-8 md:p-10 ${
                index % 2 === 0 ? 'md:border-r border-foreground/10' : ''
              } ${index < 2 ? 'border-b border-foreground/10' : ''}`}
            >
              <span className="text-5xl md:text-6xl font-extralight text-brick/30 leading-none">
                {benefitNumbers[key]}
              </span>
              <h3 className="mt-4 text-xl font-semibold text-foreground">
                {t(`landing.benefits.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm text-foreground/60 font-light leading-relaxed">
                {t(`landing.benefits.items.${key}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollSection>
  )
}
