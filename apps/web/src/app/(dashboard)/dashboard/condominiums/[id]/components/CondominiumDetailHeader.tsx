'use client'

import type { TCondominium } from '@packages/domain'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'

interface ICondominiumDetailHeaderProps {
  condominium: TCondominium
}

export function CondominiumDetailHeader({ condominium }: ICondominiumDetailHeaderProps) {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <div className="mb-6">
      <Button
        className="mb-4"
        startContent={<ArrowLeft size={16} />}
        variant="light"
        onPress={() => router.push('/dashboard/condominiums')}
      >
        {t('superadmin.condominiums.detail.backToList')}
      </Button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="rounded-full bg-primary-100 p-4 shrink-0">
          <Home className="h-8 w-8 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
            <Typography className="text-2xl sm:text-3xl truncate" variant="h2">
              {condominium.name}
            </Typography>
            <div className="flex items-center gap-2 flex-wrap">
              {condominium.code && (
                <Chip color="default" size="sm" variant="flat">
                  {condominium.code}
                </Chip>
              )}
              <Chip color={condominium.isActive ? 'success' : 'default'} size="sm" variant="flat">
                {condominium.isActive
                  ? t('superadmin.condominiums.status.active')
                  : t('superadmin.condominiums.status.inactive')}
              </Chip>
            </div>
          </div>
          {condominium.managementCompanyIds && condominium.managementCompanyIds.length > 0 && (
            <Typography color="muted" variant="body2">
              {t('superadmin.condominiums.detail.managedByCount', {
                count: condominium.managementCompanyIds.length,
              })}
            </Typography>
          )}
        </div>
      </div>
    </div>
  )
}
