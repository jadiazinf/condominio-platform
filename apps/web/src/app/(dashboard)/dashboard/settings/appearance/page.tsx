import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'

import { ThemeSelector } from './components/ThemeSelector'

import { getTranslations } from '@/libs/i18n/server'

export default async function AppearanceSettingsPage() {
  const { t } = await getTranslations()

  return (
    <div className="space-y-6">
      <PageHeader
        description={t('settings.appearance.subtitle')}
        title={t('settings.appearance.title')}
      />

      <Section
        description={t('settings.appearance.themeDescription')}
        title={t('settings.appearance.theme')}
      >
        <ThemeSelector />
      </Section>
    </div>
  )
}
