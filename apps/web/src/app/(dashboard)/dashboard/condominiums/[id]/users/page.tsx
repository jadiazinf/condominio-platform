import { getTranslations } from '@/libs/i18n/server'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Users } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumUsersPage({ params }: PageProps) {
  const { id } = await params
  const { t } = await getTranslations()

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.condominiums.detail.users.title')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.condominiums.detail.users.subtitle')}
        </Typography>
      </div>

      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Users className="mb-4 text-default-300" size={48} />
          <Typography variant="h4" className="mb-2">
            {t('superadmin.condominiums.detail.users.comingSoon')}
          </Typography>
          <Typography color="muted" variant="body2">
            {t('superadmin.condominiums.detail.users.comingSoonDescription')}
          </Typography>
        </div>
      </Card>
    </div>
  )
}
