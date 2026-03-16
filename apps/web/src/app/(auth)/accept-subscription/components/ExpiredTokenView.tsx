'use client'

import Link from 'next/link'

import { Card, CardBody, CardHeader } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { useTranslation } from '@/contexts'

export function ExpiredTokenView() {
  const { t } = useTranslation()

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center pb-0">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-center">
          {t('subscription.accept.expiredTitle')}
        </h1>
      </CardHeader>
      <CardBody className="flex flex-col items-center text-center gap-6">
        <p className="text-default-500">{t('subscription.accept.expiredDescription')}</p>
        <p className="text-sm text-default-400">{t('subscription.accept.expiredHelp')}</p>
        <div className="flex gap-4">
          <Button as={Link} href="/" variant="bordered">
            {t('common.goHome')}
          </Button>
          <Button as={Link} color="primary" href="/login">
            {t('common.login')}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
