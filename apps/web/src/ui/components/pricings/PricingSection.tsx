'use client'

import React from 'react'
import { cn } from '@heroui/theme'

import { FrequencyEnum } from './pricing-types'
import { frequencies, tiers } from './pricing-tiers'
import { PricingCard } from './PricingCard'

import { Typography } from '@/ui/components/typography'

export function PricingSection() {
  const [selectedFrequency, setSelectedFrequency] = React.useState(frequencies[0])

  return (
    <section className="relative flex flex-col items-center py-16" id="pricing">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-0 h-full w-full transform-gpu overflow-hidden blur-3xl opacity-30"
      >
        <div
          className="mx-auto aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-primary/40 to-secondary/40"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex max-w-xl flex-col text-center">
        <Typography className="mb-2" color="primary" variant="overline">
          Precios claros
        </Typography>
        <Typography gutterBottom variant="h2">
          Elige el plan que necesitas
        </Typography>
        <Typography color="muted" variant="body1">
          Sin costos ocultos. Todos los planes incluyen 14 días de prueba gratis.
        </Typography>
      </div>

      <div className="h-8" />

      {/* Frequency Toggle */}
      <div className="relative z-10 flex items-center p-1 bg-default-100 dark:bg-default-50 rounded-xl border border-divider">
        {frequencies.map(freq => (
          <button
            key={freq.key}
            className={cn(
              'relative px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selectedFrequency.key === freq.key
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-default-600 hover:text-foreground hover:bg-default-200/50'
            )}
            onClick={() => setSelectedFrequency(freq)}
          >
            <span className="flex items-center gap-2">
              {freq.label}
              {freq.key === FrequencyEnum.Yearly && (
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-semibold rounded-full',
                    selectedFrequency.key === freq.key
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  -20%
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="h-12" />

      {/* Pricing Cards */}
      <div className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl px-4">
        {tiers.map(tier => (
          <PricingCard key={tier.key} selectedFrequency={selectedFrequency} tier={tier} />
        ))}
      </div>

      <div className="h-12" />

      {/* Footer note */}
      <div className="relative z-10 flex py-2">
        <Typography color="muted" variant="body2">
          ¿Tienes dudas?{' '}
          <a
            className="text-primary font-medium underline hover:text-primary/80 transition-colors"
            href="/contact"
          >
            Escríbenos y te ayudamos a elegir
          </a>
        </Typography>
      </div>
    </section>
  )
}
