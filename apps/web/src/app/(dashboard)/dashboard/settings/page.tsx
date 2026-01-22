import { getTranslations } from '@/libs/i18n/server'

import { PageHeader } from './components/PageHeader'
import { ProfilePhotoSection } from './components/profile/ProfilePhotoSection'
import { ProfileForm } from './components/profile/ProfileForm'

export default async function ProfileSettingsPage() {
  const { t } = await getTranslations()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('settings.profile.title')}
        description={t('settings.profile.subtitle')}
      />

      <ProfilePhotoSection />

      <ProfileForm />
    </div>
  )
}
