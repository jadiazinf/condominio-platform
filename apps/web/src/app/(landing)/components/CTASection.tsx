'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Button } from '@/ui/components/button'
import { Link } from '@/ui/components/link'
import { useTranslation } from '@/contexts'

export function CTASection() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.3 })

  return (
    <section
      id="cta"
      className="snap-section flex items-center justify-center bg-content2 dark:bg-[#1E1F22] relative overflow-hidden"
    >
      {/* Decorative elements — outside animation so they don't shift */}
      <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-brick" />
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-brick/5" />

      <div ref={ref} className="max-w-7xl mx-auto px-8 md:px-16 py-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
          {/* Left: decorative number */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="hidden md:flex md:col-span-2 justify-center"
          >
            <span className="text-[120px] md:text-[180px] font-extralight text-brick/10 leading-none select-none">
              CA
            </span>
          </motion.div>

          {/* Right: content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="md:col-span-3"
          >
            <div className="h-[2px] w-12 bg-brick mb-8" />

            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
              {t('landing.cta.title')}
            </h2>

            <p className="mt-6 text-lg text-foreground/50 font-light max-w-lg">
              {t('landing.cta.subtitle')}
            </p>

            <div className="mt-10 flex items-center gap-6">
              <Button
                as={Link}
                className="font-medium px-10"
                color="primary"
                href="/register"
                radius="none"
                size="lg"
                variant="solid"
              >
                {t('landing.cta.button')}
              </Button>
            </div>

            <p className="mt-6 text-sm text-foreground/30">
              {t('landing.hero.noCreditCard')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
