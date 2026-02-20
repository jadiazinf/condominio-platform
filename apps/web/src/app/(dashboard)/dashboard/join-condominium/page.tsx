import { getTranslations } from '@/libs/i18n/server'
import { Typography } from '@/ui/components/typography'
import { JoinCondominiumClient } from './JoinCondominiumClient'

export default async function JoinCondominiumPage() {
  const { t } = await getTranslations()

  const translations = {
    title: t('resident.joinCondominium.title'),
    subtitle: t('resident.joinCondominium.subtitle'),
    // Step 1: Enter code
    step1: {
      label: t('resident.joinCondominium.step1.label'),
      placeholder: t('resident.joinCondominium.step1.placeholder'),
      validate: t('resident.joinCondominium.step1.validate'),
      validating: t('resident.joinCondominium.step1.validating'),
      invalidCode: t('resident.joinCondominium.step1.invalidCode'),
    },
    // Step 2: Select unit
    step2: {
      condominiumInfo: t('resident.joinCondominium.step2.condominiumInfo'),
      selectUnit: t('resident.joinCondominium.step2.selectUnit'),
      ownershipType: t('resident.joinCondominium.step2.ownershipType'),
      submit: t('resident.joinCondominium.step2.submit'),
      submitting: t('resident.joinCondominium.step2.submitting'),
      back: t('resident.joinCondominium.step2.back'),
    },
    // Step 3: Confirmation
    step3: {
      title: t('resident.joinCondominium.step3.title'),
      message: t('resident.joinCondominium.step3.message'),
      viewRequests: t('resident.joinCondominium.step3.viewRequests'),
      submitAnother: t('resident.joinCondominium.step3.submitAnother'),
    },
    ownershipTypes: {
      owner: t('common.ownershipTypes.owner'),
      tenant: t('common.ownershipTypes.tenant'),
      family_member: t('common.ownershipTypes.family_member'),
      authorized: t('common.ownershipTypes.authorized'),
    },
    errors: {
      submitFailed: t('resident.joinCondominium.errors.submitFailed'),
    },
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{translations.title}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {translations.subtitle}
        </Typography>
      </div>

      <JoinCondominiumClient translations={translations} />
    </div>
  )
}
