'use client'

import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import { useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { useTranslation } from '@/contexts'
import { useManagementCompany } from '@packages/http-client'

interface CompanyDetailHeaderProps {
  companyId: string
}

export function CompanyDetailHeader({ companyId }: CompanyDetailHeaderProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data } = useManagementCompany({
    token,
    id: companyId,
    enabled: !!token && !!companyId,
  })

  const company = data?.data

  if (!company) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="rounded-full bg-primary-100 p-4 shrink-0">
          <Building2 className="h-8 w-8 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
            <Typography variant="h2" className="text-2xl sm:text-3xl truncate">
              {company.name}
            </Typography>
            <div className="flex items-center gap-2 flex-wrap">
              <Chip color={company.isActive ? 'success' : 'default'} size="sm" variant="flat">
                {company.isActive
                  ? t('superadmin.companies.status.active')
                  : t('superadmin.companies.status.inactive')}
              </Chip>
            </div>
          </div>
          {company.legalName && (
            <Typography color="muted" variant="body2">
              {company.legalName}
            </Typography>
          )}
        </div>
      </div>
    </div>
  )
}
