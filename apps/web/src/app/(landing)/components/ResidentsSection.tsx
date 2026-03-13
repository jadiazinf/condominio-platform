'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from '@/contexts'
import { ScrollSection } from './ScrollSection'

const residentKeys = ['visibility', 'payments', 'communication', 'trust'] as const

const residentIcons: Record<(typeof residentKeys)[number], JSX.Element> = {
  visibility: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  payments: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  communication: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  trust: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
}

export function ResidentsSection() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.3 })

  return (
    <ScrollSection id="residents" className="bg-white dark:bg-[#1E1F22]">
      <div ref={ref} className="max-w-7xl mx-auto px-8 md:px-16 py-24">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-16 max-w-2xl"
        >
          <div className="h-[2px] w-12 bg-brick mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            {t('landing.residents.title')}
          </h2>
          <p className="mt-4 text-foreground/60 font-light leading-relaxed">
            {t('landing.residents.subtitle')}
          </p>
        </motion.div>

        {/* 2x2 grid of resident features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-foreground/10">
          {residentKeys.map((key, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.15, ease: 'easeOut' }}
              className="bg-white dark:bg-[#1E1F22] p-8 md:p-10"
            >
              <div className="w-12 h-12 rounded-lg bg-brick/10 flex items-center justify-center text-brick mb-5">
                {residentIcons[key]}
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {t(`landing.residents.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm text-foreground/60 font-light leading-relaxed">
                {t(`landing.residents.items.${key}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollSection>
  )
}
