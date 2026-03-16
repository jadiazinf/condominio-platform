import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'

import { LanguageSelector } from './components/LanguageSelector'

import { getTranslations } from '@/libs/i18n/server'

export default async function LanguageSettingsPage() {
  const { t } = await getTranslations()

  return (
    <div className="space-y-6">
      <PageHeader
        description={t('settings.language.subtitle')}
        title={t('settings.language.title')}
      />

      <Section
        description={t('settings.language.selectLanguageDescription')}
        title={t('settings.language.selectLanguage')}
      >
        <LanguageSelector />
      </Section>
    </div>
  )
}
