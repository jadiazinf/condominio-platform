'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/contexts'

export function HeroSection() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.3 })

  return (
    <section
      id="hero"
      className="snap-section relative flex items-center overflow-hidden bg-background"
    >
      {/* Subtle grid pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Decorative vertical line */}
      <motion.div
        initial={{ height: 0 }}
        animate={isInView ? { height: '40%' } : { height: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        className="absolute right-[20%] top-[10%] w-[1px] bg-brick/20 hidden md:block"
      />

      <div ref={ref} className="relative z-10 w-full max-w-7xl mx-auto px-8 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Main content — left */}
          <div className="md:col-span-8">
            {/* Decorative brick line */}
            <motion.div
              initial={{ width: 0 }}
              animate={isInView ? { width: 60 } : { width: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="h-[2px] bg-brick mb-10"
            />

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight"
            >
              {t('landing.hero.title')}
              <br />
              <span className="text-brick">{t('landing.hero.titleHighlight')}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
              className="mt-8 text-base md:text-lg text-foreground/50 font-light max-w-md leading-relaxed"
            >
              {t('landing.hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.7, delay: 0.7, ease: 'easeOut' }}
              className="mt-12 flex flex-wrap items-center gap-6"
            >
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-3 text-sm font-medium tracking-wider uppercase bg-brick text-white hover:bg-brick-dark transition-colors duration-300"
              >
                {t('landing.hero.cta')}
              </Link>
              <Link
                href="#how-it-works"
                className="text-xs font-light tracking-widest uppercase text-foreground/40 hover:text-foreground/80 transition-colors duration-300"
              >
                {t('landing.hero.howItWorks')} &darr;
              </Link>
            </motion.div>
          </div>

          {/* Right decorative column */}
          <div className="hidden md:flex md:col-span-4 flex-col items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
              className="text-right"
            >
              <span className="text-[120px] lg:text-[160px] font-extralight text-foreground/[0.03] leading-none select-none">
                CA
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
