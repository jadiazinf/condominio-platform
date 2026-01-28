import { Card, CardBody } from '@/ui/components/card'

import { getTranslations } from '@/libs/i18n/server'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'

export async function SignUpCTA() {
  const { t } = await getTranslations()

  return (
    <div className="flex justify-center lg:justify-center">
      <Card className="max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardBody className="text-center p-8">
          <Typography className="mb-4 text-white" variant="h3">
            {t('auth.signUpCTA.title')}
          </Typography>
          <Typography className="mb-6 text-white/90" variant="body1">
            {t('auth.signUpCTA.subtitle')}
          </Typography>
          <Button
            className="font-semibold text-white border-white/50 hover:bg-white/10"
            href="/signup"
            size="lg"
            variant="bordered"
          >
            {t('auth.signUpCTA.button')}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
