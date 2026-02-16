'use client'

import { Card, CardBody } from '@/ui/components/card'
import { Clock } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'

interface ExpiredTokenViewProps {
  companyName: string
  email: string
}

export function ExpiredTokenView({ companyName, email }: ExpiredTokenViewProps) {
  const { t } = useTranslation()

  return (
    <Card className="w-full max-w-md">
      <CardBody className="flex flex-col items-center text-center py-12 px-8">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-6">
          <Clock className="w-8 h-8 text-warning" />
        </div>

        <h1 className="text-2xl font-bold mb-2">{t('auth.acceptInvitation.expiredTitle')}</h1>

        <p className="text-default-500 mb-4">
          {t('auth.acceptInvitation.expiredDescription', { companyName })}
        </p>

        <p className="text-sm text-default-400 mb-8">
          {t('auth.acceptInvitation.expiredContact', { email })}
        </p>

        <div className="flex gap-3">
          <Button href="/auth" variant="flat">
            {t('auth.acceptInvitation.goToSignIn')}
          </Button>
          <Button href="/" color="primary">
            {t('auth.acceptInvitation.goToHome')}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
