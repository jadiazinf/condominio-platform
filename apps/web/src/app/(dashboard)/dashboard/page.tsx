import { Typography } from '@/ui/components/typography'
import { getAuthenticatedSession } from '@/libs/firebase/server'
import { getTranslations } from '@/libs/i18n/server'

export default async function DashboardPage() {
  const { t } = await getTranslations()
  const { user } = await getAuthenticatedSession()

  const displayName = user?.displayName || user?.firstName || user?.email || ''

  return (
    <div className="py-8">
      <Typography variant="h1">{t('dashboard.welcome', { name: displayName })}</Typography>
      <Typography className="mt-4" color="muted" variant="body1">
        {t('dashboard.title')}
      </Typography>
    </div>
  )
}
