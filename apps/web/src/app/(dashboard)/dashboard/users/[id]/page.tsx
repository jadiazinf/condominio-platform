'use client'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { useUserDetail } from './context/UserDetailContext'

export default function UserGeneralPage() {
  const { t } = useTranslation()
  const { user } = useUserDetail()

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return t('superadmin.users.detail.general.never')
    return new Date(date).toLocaleDateString('es', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.users.detail.general.title')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.users.detail.general.subtitle')}
        </Typography>
      </div>

      {/* Basic Info */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.users.detail.general.basicInfo')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.users.detail.general.firstName')}
            value={user.firstName || t('superadmin.users.detail.general.noData')}
          />
          <InfoRow
            label={t('superadmin.users.detail.general.lastName')}
            value={user.lastName || t('superadmin.users.detail.general.noData')}
          />
          <InfoRow
            label={t('superadmin.users.detail.general.displayName')}
            value={user.displayName || t('superadmin.users.detail.general.noData')}
          />
          <InfoRow
            label={t('superadmin.users.detail.general.email')}
            value={user.email}
          />
          <InfoRow
            label={t('superadmin.users.detail.general.phone')}
            value={
              user.phoneCountryCode && user.phoneNumber
                ? `${user.phoneCountryCode} ${user.phoneNumber}`
                : t('superadmin.users.detail.general.noData')
            }
          />
          <InfoRow
            label={t('superadmin.users.detail.general.document')}
            value={
              user.idDocumentType && user.idDocumentNumber
                ? `${user.idDocumentType}-${user.idDocumentNumber}`
                : t('superadmin.users.detail.general.noData')
            }
          />
          <InfoRow
            label={t('superadmin.users.detail.general.address')}
            value={user.address || t('superadmin.users.detail.general.noData')}
            className="md:col-span-2"
          />
        </div>
      </Card>

      {/* Account Info */}
      <Card className="p-6">
        <Typography variant="h4" className="mb-4">
          {t('superadmin.users.detail.general.accountInfo')}
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label={t('superadmin.users.detail.general.status')}
            value={
              user.isActive
                ? t('superadmin.users.status.active')
                : t('superadmin.users.status.inactive')
            }
            valueClassName={user.isActive ? 'text-success' : 'text-danger'}
          />
          <InfoRow
            label={t('superadmin.users.detail.general.emailVerified')}
            value={
              user.isEmailVerified
                ? t('superadmin.users.detail.general.yes')
                : t('superadmin.users.detail.general.no')
            }
          />
          <InfoRow
            label={t('superadmin.users.detail.general.lastLogin')}
            value={formatDate(user.lastLogin)}
          />
          <InfoRow
            label={t('superadmin.users.detail.general.createdAt')}
            value={formatDate(user.createdAt)}
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
