'use client'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

const stepKeys = ['register', 'invite', 'manage'] as const

export function HowItWorksSection() {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-10" id="como-funciona">
      <div className="text-center">
        <Typography className="mb-2" color="primary" variant="overline">
          {t('landing.howItWorks.label')}
        </Typography>
        <Typography gutterBottom variant="h2">
          {t('landing.howItWorks.title')}
        </Typography>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {stepKeys.map(key => (
          <div key={key} className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold">
                {t(`landing.howItWorks.steps.${key}.step`)}
              </span>
            </div>
            <Typography gutterBottom as="h3" variant="h4">
              {t(`landing.howItWorks.steps.${key}.title`)}
            </Typography>
            <Typography color="muted" variant="body2">
              {t(`landing.howItWorks.steps.${key}.description`)}
            </Typography>
          </div>
        ))}
      </div>
    </section>
  )
}
