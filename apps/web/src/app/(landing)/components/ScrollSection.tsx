'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface ScrollSectionProps {
  id?: string
  className?: string
  children: React.ReactNode
}

export function ScrollSection({ id, className, children }: ScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.3 })

  return (
    <section className={`snap-section flex items-center justify-center ${className ?? ''}`} id={id}>
      <motion.div
        ref={ref}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        className="w-full h-full"
        initial={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </section>
  )
}
