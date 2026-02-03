'use client'

import { Card } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { useState, useEffect } from 'react'

import { useTranslation, useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { useManagementCompany } from '@packages/http-client'

interface CompanyDetailProps {
  id: string
}

export function CompanyDetail({ id }: CompanyDetailProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading, error, refetch } = useManagementCompany({
    token,
    id,
    enabled: !!token && !!id,
  })

  const company = data?.data

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return t('superadmin.companies.detail.general.noData')
    return new Date(date).toLocaleDateString('es', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const noDataText = t('superadmin.companies.detail.general.noData')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          Error al cargar la administradora
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.companies.detail.tabs.general')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          Información básica y de contacto de la administradora
        </Typography>
      </div>

      {/* Basic Information */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.companies.detail.general.basicInfo')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.companies.detail.general.name')}
            value={company.name}
          />
          <InfoRow
            label={t('superadmin.companies.detail.general.legalName')}
            value={company.legalName || noDataText}
          />
          <InfoRow
            label={t('superadmin.companies.table.taxId')}
            value={
              company.taxIdType
                ? `${company.taxIdType}-${company.taxIdNumber || ''}`
                : company.taxIdNumber || noDataText
            }
          />
          <InfoRow
            label={t('superadmin.companies.detail.general.status')}
            value={
              company.isActive
                ? t('superadmin.companies.status.active')
                : t('superadmin.companies.status.inactive')
            }
            valueClassName={company.isActive ? 'text-success' : 'text-default'}
          />
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.companies.detail.general.contactInfo')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.companies.table.email')}
            value={company.email || noDataText}
          />
          <InfoRow
            label={t('superadmin.companies.table.phone')}
            value={
              company.phoneCountryCode
                ? `${company.phoneCountryCode} ${company.phone}`
                : company.phone || noDataText
            }
          />
          <InfoRow
            label={t('superadmin.companies.detail.general.website')}
            value={company.website || noDataText}
            className="md:col-span-2"
          />
          <InfoRow
            label={t('superadmin.companies.detail.general.address')}
            value={company.address || noDataText}
            className="md:col-span-2"
          />
        </div>
      </Card>

      {/* Metadata */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.companies.detail.general.metadata')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.companies.table.createdAt')}
            value={formatDate(company.createdAt)}
          />
        </div>
      </Card>
    </div>
  )
}

interface IInfoRowProps {
  label: string
  value: string
  valueClassName?: string
  className?: string
}

function InfoRow({ label, value, valueClassName, className }: IInfoRowProps) {
  return (
    <div className={className}>
      <Typography color="muted" variant="body2">
        {label}
      </Typography>
      <Typography variant="body1" className={valueClassName}>
        {value}
      </Typography>
    </div>
  )
}
