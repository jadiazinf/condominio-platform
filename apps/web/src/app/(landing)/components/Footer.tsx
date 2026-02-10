'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from '@/ui/components/link'
import { useTranslation } from '@/contexts'

export function Footer() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.2 })
  const year = new Date().getFullYear()

  return (
    <footer
      id="footer"
      className="snap-section flex flex-col justify-end bg-background border-t border-divider"
    >
      <div ref={ref} className="w-full max-w-7xl mx-auto px-8 md:px-16 py-16">
        {/* Top: Logo + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-16"
        >
          <div className="h-[2px] w-12 bg-brick mb-6" />
          <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            CondominioApp
          </h3>
          <p className="mt-3 text-sm text-foreground/40 font-light max-w-md">
            {t('footer.description')}
          </p>
        </motion.div>

        {/* Middle: Links grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-16"
        >
          {/* Product */}
          <div>
            <h4 className="text-[11px] font-medium text-foreground/40 uppercase tracking-widest mb-4">
              {t('footer.product')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link className="text-sm text-foreground/60 hover:text-brick transition-colors font-light" href="#benefits">
                  {t('footer.benefits')}
                </Link>
              </li>
              <li>
                <Link className="text-sm text-foreground/60 hover:text-brick transition-colors font-light" href="#how-it-works">
                  {t('footer.howItWorks')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[11px] font-medium text-foreground/40 uppercase tracking-widest mb-4">
              {t('footer.support')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link className="text-sm text-foreground/60 hover:text-brick transition-colors font-light" href="/help">
                  {t('footer.helpCenter')}
                </Link>
              </li>
              <li>
                <Link className="text-sm text-foreground/60 hover:text-brick transition-colors font-light" href="/contact">
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[11px] font-medium text-foreground/40 uppercase tracking-widest mb-4">
              {t('footer.legal')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link className="text-sm text-foreground/60 hover:text-brick transition-colors font-light" href="/privacy">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link className="text-sm text-foreground/60 hover:text-brick transition-colors font-light" href="/terms">
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Bottom: Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="border-t border-foreground/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="text-xs text-foreground/25 font-light">
            {t('footer.copyright', { year })}
          </p>
          <p className="text-xs text-foreground/25 font-light">
            {t('footer.madeWith')}
          </p>
        </motion.div>
      </div>
    </footer>
  )
}
