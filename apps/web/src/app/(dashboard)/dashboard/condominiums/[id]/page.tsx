import { getTranslations } from '@/libs/i18n/server'
import { getCondominiumDetail } from '@packages/http-client/hooks'
import { getServerAuthToken } from '@/libs/session'
import { Card } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumGeneralPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token] = await Promise.all([getTranslations(), getServerAuthToken()])

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

  const formatLocation = () => {
    if (!condominium.location) return ''
    // Build location hierarchy from city -> province -> country
    const names: string[] = []
    type TLocation = typeof condominium.location
    let current: TLocation | undefined = condominium.location
    while (current) {
      names.push(current.name)
      current = current.parent as TLocation | undefined
    }
    return names.join(', ')
  }

  const fullAddress = [condominium.address, formatLocation()].filter(Boolean).join(', ')

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
            value={fullAddress || noDataText}
            className="md:col-span-2"
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

      {/* Management Companies */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.condominiums.detail.general.managementCompanies')}
        </Typography>
        {condominium.managementCompanies && condominium.managementCompanies.length > 0 ? (
          <div className="space-y-4">
            {condominium.managementCompanies.map((company) => (
              <div key={company.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-default-50 rounded-lg">
                <InfoRow
                  label={t('superadmin.condominiums.detail.general.companyName')}
                  value={company.name}
                />
                <InfoRow
                  label={t('superadmin.condominiums.detail.general.companyEmail')}
                  value={company.email || noDataText}
                />
              </div>
            ))}
          </div>
        ) : (
          <Typography color="muted" variant="body2">
            {noDataText}
          </Typography>
        )}
      </Card>

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
          <InfoRow
            label={t('superadmin.condominiums.detail.general.createdBy')}
            value={
              condominium.createdByUser
                ? condominium.createdByUser.displayName || condominium.createdByUser.email
                : noDataText
            }
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
