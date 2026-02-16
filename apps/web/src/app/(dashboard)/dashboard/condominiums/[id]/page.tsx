import { getTranslations } from '@/libs/i18n/server'
import { getCondominiumDetail } from '@packages/http-client/hooks'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Card } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { ManagementCompaniesTable } from './components/ManagementCompaniesTable'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumGeneralPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token, session] = await Promise.all([getTranslations(), getServerAuthToken(), getFullSession()])
  const isAdmin = session?.activeRole === 'management_company'

  const condominium = await getCondominiumDetail(token, id)

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return t('superadmin.condominiums.detail.general.noData')
    return new Date(date).toLocaleDateString('es', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const noDataText = t('superadmin.condominiums.detail.general.noData')

  const getLocationParts = () => {
    if (!condominium.location) return { city: '', state: '', country: '' }

    const parts: string[] = []
    type TLocation = typeof condominium.location
    let current: TLocation | undefined = condominium.location

    while (current) {
      parts.push(current.name)
      current = current.parent as TLocation | undefined
    }

    // parts = [city, state, country]
    return {
      city: parts[0] || '',
      state: parts[1] || '',
      country: parts[2] || '',
    }
  }

  const locationParts = getLocationParts()
  const locationString = [locationParts.city, locationParts.state, locationParts.country].filter(Boolean).join(', ')

  const getCreatedByDisplay = () => {
    if (!condominium.createdByUser) return noDataText

    if (condominium.createdByUser.isSuperadmin) {
      return 'Superadmin'
    }

    return condominium.createdByUser.displayName || condominium.createdByUser.email
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.condominiums.detail.general.title')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.condominiums.detail.general.subtitle')}
        </Typography>
      </div>

      {/* Basic Information */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.condominiums.detail.general.basicInfo')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label={t('superadmin.condominiums.detail.general.name')} value={condominium.name} />
          <InfoRow
            label={t('superadmin.condominiums.detail.general.code')}
            value={condominium.code || noDataText}
          />
          <InfoRow
            label={t('superadmin.condominiums.detail.general.status')}
            value={
              condominium.isActive
                ? t('superadmin.condominiums.status.active')
                : t('superadmin.condominiums.status.inactive')
            }
            valueClassName={condominium.isActive ? 'text-success' : 'text-default'}
          />
          <InfoRow
            label={t('superadmin.condominiums.detail.general.currency')}
            value={
              condominium.defaultCurrency
                ? `${condominium.defaultCurrency.code} (${condominium.defaultCurrency.symbol})`
                : noDataText
            }
          />
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.condominiums.detail.general.contactInfo')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.condominiums.detail.general.address')}
            value={condominium.address || noDataText}
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
          <InfoRow
            label={t('superadmin.condominiums.detail.general.email')}
            value={condominium.email || noDataText}
          />
          <InfoRow
            label={t('superadmin.condominiums.detail.general.phone')}
            value={
              condominium.phone
                ? condominium.phoneCountryCode
                  ? `${condominium.phoneCountryCode} ${condominium.phone}`
                  : condominium.phone
                : noDataText
            }
          />
        </div>
      </Card>

      {/* Management Companies — superadmin only */}
      {!isAdmin && (
        <Card className="p-6">
          <Typography variant="h4" className="mb-4">
            {t('superadmin.condominiums.detail.general.managementCompanies')}
          </Typography>
          {condominium.managementCompanies && condominium.managementCompanies.length > 0 ? (
            <ManagementCompaniesTable companies={condominium.managementCompanies} />
          ) : (
            <Typography color="muted" variant="body2">
              {noDataText}
            </Typography>
          )}
        </Card>
      )}

      {/* Metadata */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.condominiums.detail.general.metadata')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.condominiums.detail.general.createdAt')}
            value={formatDate(condominium.createdAt)}
          />
          <InfoRow
            label={t('superadmin.condominiums.detail.general.updatedAt')}
            value={formatDate(condominium.updatedAt)}
          />
          {!isAdmin && (
            <InfoRow
              label={t('superadmin.condominiums.detail.general.createdBy')}
              value={getCreatedByDisplay()}
            />
          )}
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
