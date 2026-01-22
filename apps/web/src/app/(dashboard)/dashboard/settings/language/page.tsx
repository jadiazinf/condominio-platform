import { getTranslations } from '@/libs/i18n/server'

import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'
import { LanguageSelector } from './components/LanguageSelector'

export default async function LanguageSettingsPage() {
  const { t } = await getTranslations()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings.language.title')}
        description={t('settings.language.subtitle')}
      />

      <Section
        title={t('settings.language.selectLanguage')}
        description={t('settings.language.selectLanguageDescription')}
      >
        <LanguageSelector />
      </Section>
    </div>
  )
}
