'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { CreateUserForm } from './components'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'

export default function CreateUserPage() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          isIconOnly
          className="mt-1"
          variant="light"
          onPress={() => router.push('/dashboard/users')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <Typography variant="h2">{t('superadmin.users.create.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.users.create.subtitle')}
          </Typography>
        </div>
      </div>

      {/* Multi-step Form */}
      <CreateUserForm />
    </div>
  )
}
