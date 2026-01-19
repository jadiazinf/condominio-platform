'use client'

import React from 'react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'
import { Link } from '@heroui/link'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

export function PricingSection() {
  const { t } = useTranslation()

  return (
    <section className="relative flex flex-col items-center py-24 px-4" id="pricing">
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

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col text-center mb-12">
          <Typography className="mb-3" color="primary" variant="overline">
            {t('landing.pricing.label')}
          </Typography>
          <Typography gutterBottom className="mb-4" variant="h2">
            {t('landing.pricing.title')}
          </Typography>
          <Typography className="text-lg" color="muted" variant="body1">
            {t('landing.pricing.subtitle')}
          </Typography>
        </div>

        {/* CTA Card */}
        <Card
          className="relative p-8 md:p-12 border border-primary/20 bg-background/60 backdrop-blur-xl overflow-hidden"
          shadow="lg"
        >
          {/* Artistic gradient blobs */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-primary/40 to-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-blue-500/30 to-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-primary/15 to-purple-500/15 rounded-full blur-3xl" />
          </div>
          <CardBody className="gap-8">
            <div className="flex flex-col gap-6 text-center">
              <div className="space-y-4">
                <Typography className="text-2xl font-bold" variant="h3">
                  {t('landing.pricing.processTitle')}
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="flex flex-col gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-primary">1</span>
                    </div>
                    <Typography className="font-semibold" variant="body1">
                      {t('landing.pricing.steps.schedule.title')}
                    </Typography>
                    <Typography color="muted" variant="body2">
                      {t('landing.pricing.steps.schedule.description')}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-primary">2</span>
                    </div>
                    <Typography className="font-semibold" variant="body1">
                      {t('landing.pricing.steps.negotiate.title')}
                    </Typography>
                    <Typography color="muted" variant="body2">
                      {t('landing.pricing.steps.negotiate.description')}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-primary">3</span>
                    </div>
                    <Typography className="font-semibold" variant="body1">
                      {t('landing.pricing.steps.start.title')}
                    </Typography>
                    <Typography color="muted" variant="body2">
                      {t('landing.pricing.steps.start.description')}
                    </Typography>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button
                  as={Link}
                  className="font-semibold shadow-lg shadow-primary/30"
                  color="primary"
                  href="/contact"
                  radius="md"
                  size="lg"
                  variant="solid"
                >
                  {t('landing.pricing.ctaButton')}
                </Button>
                <Typography color="muted" variant="body2">
                  {t('landing.pricing.ctaNote')}
                </Typography>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="mt-8 text-center">
          <Typography color="muted" variant="body2">
            {t('landing.pricing.questions')}{' '}
            <a
              className="text-primary font-medium underline hover:text-primary/80 transition-colors"
              href="/contact"
            >
              {t('landing.pricing.writeUs')}
            </a>{' '}
            {t('landing.pricing.helpText')}
          </Typography>
        </div>
      </div>
    </section>
  )
}
