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
    <section
      id={id}
      className={`snap-section flex items-center justify-center ${className ?? ''}`}
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </section>
  )
}
