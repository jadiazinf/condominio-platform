import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { getMyCompanyDetail } from '@packages/http-client'

export async function MyCompanyDetail() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const managementCompanyId = session.managementCompanies?.[0]?.managementCompanyId

  if (!managementCompanyId || !session.sessionToken) {
    return (
      <div className="text-center py-8">
        <Typography color="muted">{t('admin.company.myCompany.general.noData')}</Typography>
      </div>
    )
  }

  const company = await getMyCompanyDetail(session.sessionToken, managementCompanyId)
  const noData = t('admin.company.myCompany.general.noData')

  // Extract location parts
  const location = company.location
  const city = (location as { name?: string })?.name || ''
  const state = (location as { parent?: { name?: string } })?.parent?.name || ''
  const country = (location as { parent?: { parent?: { name?: string } } })?.parent?.parent?.name || ''

  const formattedCreatedAt = company.createdAt
    ? new Date(company.createdAt).toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : noData

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('admin.company.myCompany.tabs.general')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('admin.company.myCompany.subtitle')}
        </Typography>
      </div>

      {/* Basic Information */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.company.myCompany.general.basicInfo')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.companies.detail.general.name')}
            value={company.name}
          />
          <InfoRow
            label={t('superadmin.companies.detail.general.legalName')}
            value={company.legalName || noData}
          />
          <InfoRow
            label={t('superadmin.companies.table.taxId')}
            value={
              company.taxIdType
                ? `${company.taxIdType}-${company.taxIdNumber || ''}`
                : company.taxIdNumber || noData
            }
          />
          <div>
            <Typography color="muted" variant="body2">
              {t('superadmin.companies.detail.general.status')}
            </Typography>
            <Chip
              color={company.isActive ? 'success' : 'default'}
              size="sm"
              variant="flat"
              className="mt-1"
            >
              {company.isActive
                ? t('superadmin.companies.status.active')
                : t('superadmin.companies.status.inactive')}
            </Chip>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.company.myCompany.general.contactInfo')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.companies.table.email')}
            value={company.email || noData}
          />
          <InfoRow
            label={t('superadmin.companies.table.phone')}
            value={
              company.phoneCountryCode
                ? `${company.phoneCountryCode} ${company.phone}`
                : company.phone || noData
            }
          />
          <InfoRow
            label={t('superadmin.companies.detail.general.website')}
            value={company.website || noData}
            className="md:col-span-2"
          />
          <InfoRow
            label={t('superadmin.companies.detail.general.address')}
            value={company.address || noData}
            className="md:col-span-2"
          />
          <InfoRow label={t('common.country')} value={country || noData} />
          <InfoRow label={t('common.province')} value={state || noData} />
          <InfoRow label={t('common.city')} value={city || noData} />
        </div>
      </Card>

      {/* Metadata */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.company.myCompany.general.metadata')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.companies.table.createdAt')}
            value={formattedCreatedAt}
          />
        </div>
      </Card>
    </div>
  )
}

interface IInfoRowProps {
  label: string
  value: string
  className?: string
}

function InfoRow({ label, value, className }: IInfoRowProps) {
  return (
    <div className={className}>
      <Typography color="muted" variant="body2">
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </div>
  )
}
