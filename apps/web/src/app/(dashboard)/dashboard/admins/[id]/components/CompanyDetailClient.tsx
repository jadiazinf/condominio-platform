'use client'

import { useState } from 'react'
import { Card } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Pencil } from 'lucide-react'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { EditCompanyForm } from './EditCompanyForm'
import type { TManagementCompany } from '@packages/domain'

interface CompanyDetailClientProps {
  company: TManagementCompany
  noDataText: string
  locationParts: {
    city: string
    state: string
    country: string
  }
  createdByDisplay: string
  formattedCreatedAt: string
}

export function CompanyDetailClient({
  company,
  noDataText,
  locationParts,
  createdByDisplay,
  formattedCreatedAt,
}: CompanyDetailClientProps) {
  const { t } = useTranslation()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">{t('superadmin.companies.detail.tabs.general')}</Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            Información básica y de contacto de la administradora
          </Typography>
        </div>
        <Button
          color="primary"
          variant="flat"
          startContent={<Pencil className="h-4 w-4" />}
          onPress={() => setIsEditModalOpen(true)}
        >
          {t('superadmin.companies.actions.edit')}
        </Button>
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
          <InfoRow
            label={t('common.country')}
            value={locationParts.country || noDataText}
          />
          <InfoRow
            label={t('common.province')}
            value={locationParts.state || noDataText}
          />
          <InfoRow
            label={t('common.city')}
            value={locationParts.city || noDataText}
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
            value={formattedCreatedAt}
          />
          <InfoRow
            label={t('superadmin.companies.detail.general.createdBy')}
            value={createdByDisplay}
          />
        </div>
      </Card>

      {/* Edit Modal */}
      <EditCompanyForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={company}
        onSuccess={() => window.location.reload()}
      />
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
