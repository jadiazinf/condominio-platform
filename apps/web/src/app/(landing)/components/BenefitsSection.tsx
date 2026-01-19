'use client'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

const benefitKeys = ['paperwork', 'collections', 'informed', 'transparency'] as const

const benefitIcons: Record<(typeof benefitKeys)[number], string> = {
  paperwork: '📋',
  collections: '💸',
  informed: '📱',
  transparency: '✨',
}

export function BenefitsSection() {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-10" id="beneficios">
      <div className="text-center">
        <Typography className="mb-2" color="secondary" variant="overline">
          {t('landing.benefits.label')}
        </Typography>
        <Typography gutterBottom variant="h2">
          {t('landing.benefits.title')}
        </Typography>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {benefitKeys.map(key => (
          <div key={key} className="benefit-card">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-3xl">{benefitIcons[key]}</span>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <Typography as="h3" variant="h4">
                    {t(`landing.benefits.items.${key}.title`)}
                  </Typography>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary/10 text-secondary w-fit">
                    {t(`landing.benefits.items.${key}.highlight`)}
                  </span>
                </div>
                <Typography color="muted" variant="body2">
                  {t(`landing.benefits.items.${key}.description`)}
                </Typography>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
