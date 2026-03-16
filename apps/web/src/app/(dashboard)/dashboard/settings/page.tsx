import { PageHeader } from './components/PageHeader'
import { ProfilePhotoSection } from './components/profile/ProfilePhotoSection'
import { ProfileForm } from './components/profile/ProfileForm'

import { getTranslations } from '@/libs/i18n/server'

export default async function ProfileSettingsPage() {
  const { t } = await getTranslations()

  return (
    <div className="space-y-8">
      <PageHeader
        description={t('settings.profile.subtitle')}
        title={t('settings.profile.title')}
      />

      <ProfilePhotoSection />

      <ProfileForm />
    </div>
  )
}
