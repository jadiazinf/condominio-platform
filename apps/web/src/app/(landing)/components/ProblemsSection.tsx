'use client'

import { Card, CardBody } from '@heroui/card'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

const problemKeys = ['payments', 'meetings', 'communication', 'spreadsheets'] as const

export function ProblemsSection() {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-10">
      <div className="text-center">
        <Typography gutterBottom variant="h2">
          {t('landing.problems.title')}
        </Typography>
        <Typography className="max-w-2xl mx-auto" color="muted" variant="body1">
          {t('landing.problems.subtitle')}
        </Typography>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {problemKeys.map(key => (
          <Card key={key} className="border border-divider">
            <CardBody className="flex flex-row items-start gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                <span className="text-danger">✗</span>
              </div>
              <div className="flex-1">
                <Typography className="mb-1" variant="subtitle2" weight="semibold">
                  {t(`landing.problems.items.${key}.problem`)}
                </Typography>
                <div className="flex items-start gap-2">
                  <span className="text-secondary leading-[1.6]">→</span>
                  <Typography color="muted" variant="body2">
                    {t(`landing.problems.items.${key}.solution`)}
                  </Typography>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  )
}
