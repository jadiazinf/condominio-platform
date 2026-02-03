import { getTranslations } from '@/libs/i18n/server'
import { getCondominiumDetail } from '@packages/http-client/hooks'
import { getServerAuthToken } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { StatusToggle } from './components/StatusToggle'

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
        <Typography variant="h3">{t('superadmin.condominiums.detail.statusSection.title')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.condominiums.detail.statusSection.subtitle')}
        </Typography>
      </div>

      {/* Condominium Status */}
      <Card className="p-6">
        <StatusToggle
          condominiumId={condominium.id}
          initialStatus={condominium.isActive}
          activeLabel={t('superadmin.condominiums.status.active')}
          inactiveLabel={t('superadmin.condominiums.status.inactive')}
          title={t('superadmin.condominiums.detail.statusSection.condominiumStatus')}
          description={t('superadmin.condominiums.detail.statusSection.condominiumStatusDescription')}
          successMessage={t('superadmin.condominiums.detail.statusSection.success')}
          errorMessage={t('superadmin.condominiums.detail.statusSection.error')}
        />
      </Card>
    </div>
  )
}
