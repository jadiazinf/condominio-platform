'use client'

import { useEffect, useState } from 'react'

import { useManagementCompany } from '@packages/http-client'
import { useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'

interface CompanyHeaderProps {
  companyId: string
}

export function CompanyHeader({ companyId }: CompanyHeaderProps) {
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
    <Typography color="muted" variant="body2">
      {company.name}
    </Typography>
  )
}
