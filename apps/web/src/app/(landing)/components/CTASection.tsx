import { Button } from '@heroui/button'
import { Link } from '@heroui/link'

import { getTranslations } from '@/libs/i18n/server'
import { Typography } from '@/ui/components/typography'

export async function CTASection() {
  const { t } = await getTranslations()

  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 rounded-3xl -z-10" />

      <Typography variant="h2">{t('landing.cta.title')}</Typography>

      <Typography className="max-w-lg" color="muted" variant="body1">
        {t('landing.cta.subtitle')}
      </Typography>

      <Button
        as={Link}
        className="font-semibold px-10"
        color="primary"
        href="/register"
        radius="full"
        size="lg"
        variant="solid"
      >
        {t('landing.cta.button')}
      </Button>

      <Typography color="muted" variant="caption">
        {t('landing.cta.note')}
      </Typography>
    </section>
  )
}
