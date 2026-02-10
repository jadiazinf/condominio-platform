'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from '@/contexts'

const SECTIONS = [
  { id: 'hero', labelKey: 'landing.nav.home' },
  { id: 'problems', labelKey: 'landing.nav.problems' },
  { id: 'benefits', labelKey: 'landing.nav.benefits' },
  { id: 'how-it-works', labelKey: 'landing.nav.howItWorks' },
  { id: 'cta', labelKey: 'landing.nav.cta' },
  { id: 'footer', labelKey: 'landing.nav.footer' },
]

export function SectionNav() {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState('hero')

  const handleScroll = useCallback(() => {
    const container = document.querySelector('.snap-container')
    if (!container) return

    const scrollTop = container.scrollTop
    const viewportHeight = container.clientHeight

    // Find which section is most visible
    let bestMatch = 'hero'
    let bestOverlap = 0

    for (const { id } of SECTIONS) {
      const el = document.getElementById(id)
      if (!el) continue

      const elTop = el.offsetTop - scrollTop
      const elBottom = elTop + el.offsetHeight

      // Calculate how much of the section is visible in the viewport
      const visibleTop = Math.max(0, elTop)
      const visibleBottom = Math.min(viewportHeight, elBottom)
      const overlap = Math.max(0, visibleBottom - visibleTop)

      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestMatch = id
      }
    }

    setActiveSection(bestMatch)
  }, [])

  useEffect(() => {
    const container = document.querySelector('.snap-container')
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-4">
      {SECTIONS.map(({ id, labelKey }) => {
        const isActive = activeSection === id
        return (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className="flex items-center gap-3 cursor-pointer"
          >
            {/* Label */}
            <motion.span
              className="text-[11px] font-light tracking-widest uppercase whitespace-nowrap text-right"
              animate={{
                opacity: isActive ? 1 : 0.3,
              }}
              transition={{ duration: 0.3 }}
              style={{ minWidth: 80 }}
            >
              <span className={isActive ? 'text-brick' : 'text-foreground/60'}>
                {t(labelKey)}
              </span>
            </motion.span>

            {/* Vertical line */}
            <motion.span
              className="block w-[2px] rounded-full"
              animate={{
                height: isActive ? 20 : 12,
                backgroundColor: isActive ? '#B5451B' : 'rgba(128,128,128,0.3)',
              }}
              transition={{ duration: 0.3 }}
            />
          </button>
        )
      })}
    </nav>
  )
}
