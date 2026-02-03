import { getTranslations } from '@/libs/i18n/server'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Building2 } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumBuildingsPage({ params }: PageProps) {
  const { id } = await params
  const { t } = await getTranslations()

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.condominiums.detail.buildings.title')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.condominiums.detail.buildings.subtitle')}
        </Typography>
      </div>

      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Building2 className="mb-4 text-default-300" size={48} />
          <Typography variant="h4" className="mb-2">
            {t('superadmin.condominiums.detail.buildings.comingSoon')}
          </Typography>
          <Typography color="muted" variant="body2">
            {t('superadmin.condominiums.detail.buildings.comingSoonDescription')}
          </Typography>
        </div>
      </Card>
    </div>
  )
}
