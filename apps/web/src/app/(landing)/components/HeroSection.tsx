import { Button } from '@/ui/components/button'
import { Link } from '@/ui/components/link'

import { getTranslations } from '@/libs/i18n/server'
import { Typography } from '@/ui/components/typography'

export async function HeroSection() {
  const { t } = await getTranslations()

  return (
    <section className="dark relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-8 pt-16 md:pt-24 pb-20 text-center px-6 text-white">
      <Typography className="max-w-3xl leading-tight" variant="h1">
        {t('landing.hero.title')}{' '}
        <span className="text-gradient-primary">{t('landing.hero.titleHighlight')}</span>
      </Typography>

      <Typography className="max-w-xl text-lg md:text-xl text-white/80" variant="body1">
        {t('landing.hero.subtitle')}
      </Typography>

      <div className="flex flex-wrap justify-center gap-4 mt-4">
        <Button
          as={Link}
          className="font-semibold px-8"
          color="primary"
          href="/register"
          radius="full"
          size="lg"
          variant="solid"
        >
          {t('landing.hero.cta')}
        </Button>
        <Button
          as={Link}
          className="font-semibold px-8 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
          href="#como-funciona"
          radius="full"
          size="lg"
          variant="bordered"
        >
          {t('landing.hero.howItWorks')}
        </Button>
      </div>

      <Typography className="mt-2 text-white/60" variant="caption">
        {t('landing.hero.noCreditCard')}
      </Typography>
    </section>
  )
}
