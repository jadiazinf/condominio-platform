'use client'

import { Card, CardBody } from '@heroui/card'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'

export function SignInCTA() {
  const { t } = useTranslation()

  return (
    <div className="flex justify-center lg:justify-center">
      <Card className="max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardBody className="text-center p-8">
          <Typography className="mb-4 text-white" variant="h3">
            {t('auth.signInCTA.title')}
          </Typography>
          <Typography className="mb-6 text-white/90" variant="body1">
            {t('auth.signInCTA.subtitle')}
          </Typography>
          <Button
            className="font-semibold text-white border-white/50 hover:bg-white/10"
            href="/signin"
            size="lg"
            variant="bordered"
          >
            {t('auth.signInCTA.button')}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
