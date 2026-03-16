import { getCondominiumDetail } from '@packages/http-client/hooks'

import { StatusToggle } from './components/StatusToggle'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumStatusPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token] = await Promise.all([getTranslations(), getServerAuthToken()])

  const condominium = await getCondominiumDetail(token, id)

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">
          {t('superadmin.condominiums.detail.statusSection.title')}
        </Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('superadmin.condominiums.detail.statusSection.subtitle')}
        </Typography>
      </div>

      {/* Condominium Status */}
      <Card className="p-6">
        <StatusToggle
          activeLabel={t('superadmin.condominiums.status.active')}
          condominiumId={condominium.id}
          description={t(
            'superadmin.condominiums.detail.statusSection.condominiumStatusDescription'
          )}
          errorMessage={t('superadmin.condominiums.detail.statusSection.error')}
          inactiveLabel={t('superadmin.condominiums.status.inactive')}
          initialStatus={condominium.isActive}
          successMessage={t('superadmin.condominiums.detail.statusSection.success')}
          title={t('superadmin.condominiums.detail.statusSection.condominiumStatus')}
        />
      </Card>
    </div>
  )
}
