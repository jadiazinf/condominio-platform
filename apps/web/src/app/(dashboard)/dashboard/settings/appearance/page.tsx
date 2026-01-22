import { getTranslations } from '@/libs/i18n/server'

import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'
import { ThemeSelector } from './components/ThemeSelector'

export default async function AppearanceSettingsPage() {
  const { t } = await getTranslations()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings.appearance.title')}
        description={t('settings.appearance.subtitle')}
      />

      <Section
        title={t('settings.appearance.theme')}
        description={t('settings.appearance.themeDescription')}
      >
        <ThemeSelector />
      </Section>
    </div>
  )
}
