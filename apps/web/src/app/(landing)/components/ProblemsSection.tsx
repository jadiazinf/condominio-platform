'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from '@/contexts'
import { ScrollSection } from './ScrollSection'

const problemKeys = ['payments', 'meetings', 'communication', 'spreadsheets'] as const

export function ProblemsSection() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.3 })

  return (
    <ScrollSection id="problems" className="bg-white dark:bg-[#1E1F22]">
      <div ref={ref} className="max-w-7xl mx-auto px-8 md:px-16 py-24">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16">
          {/* Left column — title */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="h-[2px] w-12 bg-brick mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                {t('landing.problems.title')}
              </h2>
              <p className="mt-4 text-foreground/60 font-light">
                {t('landing.problems.subtitle')}
              </p>
            </motion.div>
          </div>

          {/* Right column — problems list */}
          <div className="md:col-span-3">
            <div className="space-y-0">
              {problemKeys.map((key, index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1, ease: 'easeOut' }}
                  className="border-t border-foreground/10 py-6 first:border-t-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-[3px] h-12 bg-brick shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {t(`landing.problems.items.${key}.problem`)}
                      </p>
                      <p className="mt-1 text-foreground/50 text-sm font-light">
                        {t(`landing.problems.items.${key}.solution`)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollSection>
  )
}
