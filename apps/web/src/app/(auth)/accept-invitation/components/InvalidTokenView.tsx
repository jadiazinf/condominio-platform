'use client'

import { Card, CardBody } from '@heroui/card'
import { AlertCircle } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'

interface InvalidTokenViewProps {
  message: string
}

export function InvalidTokenView({ message }: InvalidTokenViewProps) {
  const { t } = useTranslation()

  return (
    <Card className="w-full max-w-md">
      <CardBody className="flex flex-col items-center text-center py-12 px-8">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-danger" />
        </div>

        <h1 className="text-2xl font-bold mb-2">{t('auth.acceptInvitation.invalidTitle')}</h1>

        <p className="text-default-500 mb-8">{message}</p>

        <div className="flex gap-3">
          <Button href="/signin" variant="flat">
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
